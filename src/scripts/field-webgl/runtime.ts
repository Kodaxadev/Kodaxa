// WebGL hero runtime: a fullscreen "tile wall" shader + UnrealBloom. The
// left→right reveal sweep is driven entirely by uTime inside the shader, so
// this just owns the canvas, uniforms, bloom, resize, and lifecycle.
// Lazy-loaded by evidence-field.ts only when WebGL is available.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { cosmosFrag, cosmosVert } from './cosmos.frag';

export type FieldHandle = { destroy: () => void };

export function startWebglField(canvas: HTMLCanvasElement, ambient: boolean): FieldHandle {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x06090d, 1);
  renderer.toneMapping = THREE.NoToneMapping; // we tone-map in the shader
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();

  // ?reveal=full freezes the fully-revealed target image (design/debug aid).
  const frozen = reduced || new URLSearchParams(location.search).get('reveal') === 'full';
  const uniforms: Record<string, THREE.IUniform> = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uTiles: { value: ambient ? 120 : 200 },
    uReduced: { value: frozen ? 1 : 0 },
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
  // Flip-dot board = matte discrete dots, NOT a glow. Keep bloom minimal and
  // high-threshold so only the brightest star-dots get a faint halo; the dot
  // field itself stays crisp instead of bleeding into a continuous overlay.
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.5, 0.82);
  composer.addPass(bloom);

  let raf = 0;
  let running = true;

  const resize = () => {
    const w = canvas.clientWidth || canvas.parentElement?.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || canvas.parentElement?.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, w > 1100 ? 1.5 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    bloom.setSize(w * dpr, h * dpr);
    (uniforms.uRes.value as THREE.Vector2).set(w * dpr, h * dpr);
    // Tile density = image "resolution"; smaller tiles → sharper reveal.
    const px = ambient ? 8 : 5;
    uniforms.uTiles.value = Math.min(ambient ? 220 : 380, Math.round(w / px));
  };

  const clock = new THREE.Clock();
  const loop = () => {
    if (!running) return;
    uniforms.uTime.value = clock.getElapsedTime();
    composer.render();
    raf = requestAnimationFrame(loop);
  };

  resize();
  window.addEventListener('resize', resize, { passive: true });
  if (frozen) {
    composer.render(); // single resolved frame, no animation loop
  } else {
    loop();
  }

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
