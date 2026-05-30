// WebGL hero runtime: fullscreen cosmos shader + UnrealBloom. Lazy-loaded by
// evidence-field.ts only when WebGL is available and motion is allowed.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { cosmosFrag, cosmosVert } from './cosmos.frag';

type Wave = { x: number; y: number; r: number; speed: number; max: number; col: THREE.Vector3 };

const MAX_WAVES = 5;
const PALETTE: [number, number, number][] = [
  [0.38, 0.70, 1.0],
  [0.31, 0.87, 0.93],
  [0.28, 0.84, 0.74],
  [0.59, 0.54, 0.97],
  [0.74, 0.89, 1.0],
  [0.95, 0.77, 0.47], // rare warm
];

export type FieldHandle = { destroy: () => void };

export function startWebglField(canvas: HTMLCanvasElement, ambient: boolean): FieldHandle {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x06090d, 1);
  renderer.toneMapping = THREE.NoToneMapping; // we tone-map in the shader
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();

  const originArr = Array.from({ length: MAX_WAVES }, () => new THREE.Vector3());
  const colorArr = Array.from({ length: MAX_WAVES }, () => new THREE.Vector3());

  const uniforms: Record<string, THREE.IUniform> = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uTiles: { value: ambient ? 64 : 96 },
    uReduced: { value: reduced ? 1 : 0 },
    uWaveOrigin: { value: originArr },
    uWaveColor: { value: colorArr },
    uWaveActive: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: cosmosVert,
    fragmentShader: cosmosFrag,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  scene.add(quad);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // strength, radius, threshold — threshold ~0.5 so only true highlights bloom
  // (nebula stays saturated instead of washing to milky gray).
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), ambient ? 0.6 : 0.95, 0.7, 0.5);
  composer.addPass(bloom);

  const waves: Wave[] = [];
  let nextSpawn = 30;
  let frame = 0;
  let raf = 0;
  let running = true;
  let dpr = 1;

  const resize = () => {
    const w = canvas.clientWidth || canvas.parentElement?.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || canvas.parentElement?.clientHeight || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, w > 1100 ? 1.5 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    bloom.setSize(w * dpr, h * dpr);
    (uniforms.uRes.value as THREE.Vector2).set(w * dpr, h * dpr);
    // Tile density = "resolution" of the image. Smaller tiles → more pixels →
    // higher-fidelity reveal. ~5px/tile on the hero (measured 200+fps headroom).
    const px = ambient ? 8 : 5;
    uniforms.uTiles.value = Math.min(ambient ? 220 : 380, Math.round(w / px));
  };

  const spawnWave = () => {
    if (waves.length >= (ambient ? 3 : MAX_WAVES)) return;
    // Bias origins toward the right/upper field (where copy isn't).
    const x = 0.4 + Math.random() * 0.62;
    const y = 0.2 + Math.random() * 0.6;
    const warm = Math.random() < 0.07;
    const p = warm ? PALETTE[5] : PALETTE[Math.floor(Math.random() * 5)];
    waves.push({
      x, y, r: 0,
      speed: 0.0022 + Math.random() * 0.0019,
      max: 0.9 + Math.random() * 0.7,
      col: new THREE.Vector3(p[0], p[1], p[2]),
    });
  };

  const clock = new THREE.Clock();
  const loop = () => {
    if (!running) return;
    frame += 1;
    uniforms.uTime.value = clock.getElapsedTime();

    if (!reduced) {
      if (frame >= nextSpawn) {
        spawnWave();
        nextSpawn = frame + (ambient ? 90 : 48) + Math.floor(Math.random() * (ambient ? 90 : 70));
      }
      for (let i = waves.length - 1; i >= 0; i -= 1) {
        waves[i].r += waves[i].speed * (1 + waves[i].r * 1.4);
        if (waves[i].r > waves[i].max) waves.splice(i, 1);
      }
    } else if (waves.length === 0) {
      // One frozen wave so the still frame shows a resolved image.
      spawnWave();
      if (waves[0]) waves[0].r = 0.5;
    }

    for (let i = 0; i < MAX_WAVES; i += 1) {
      const w = waves[i];
      if (w) {
        originArr[i].set(w.x, w.y, w.r);
        colorArr[i].copy(w.col);
      } else {
        originArr[i].set(0, 0, 99);
      }
    }
    uniforms.uWaveActive.value = Math.min(waves.length, MAX_WAVES);

    composer.render();
    if (!reduced) raf = requestAnimationFrame(loop);
  };

  resize();
  window.addEventListener('resize', resize, { passive: true });
  loop();
  if (reduced) composer.render();

  return {
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      material.dispose();
      quad.geometry.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
