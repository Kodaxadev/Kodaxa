// WebGL hero runtime: a fullscreen flip-dot board that reveals the Kodaxa wolf
// mark with a left→right sweep. The sweep is driven by uTime inside the shader,
// so this just owns the canvas, uniforms, resize, and lifecycle. No bloom — a
// flip-dot board is matte; glow is what made earlier versions read as overlay.
// Lazy-loaded by evidence-field.ts only when WebGL is available.
import * as THREE from 'three';
import { dotboardFrag, dotboardVert } from './dotboard.frag';

export type FieldHandle = { destroy: () => void };

const LOGO_ASPECT = 248 / 340; // w/h of the mark texture

// Render "KODAXA / INNOVATIONS" to a canvas → texture. White on transparent so
// the dotboard samples it like the wolf (alpha = coverage).
function makeWordmarkTexture(): THREE.CanvasTexture {
  const W = 1024, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  x.clearRect(0, 0, W, H);
  x.fillStyle = '#ffffff';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  // KODAXA — large, wide tracking
  x.font = '700 188px Inter, system-ui, sans-serif';
  drawTracked(x, 'KODAXA', W / 2, H * 0.36, 24);
  // INNOVATIONS — smaller, matched width via heavier tracking
  x.font = '500 86px Inter, system-ui, sans-serif';
  drawTracked(x, 'INNOVATIONS', W / 2, H * 0.66, 22);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}
// Canvas has no letter-spacing on fillText cross-browser; draw glyph by glyph.
function drawTracked(x: CanvasRenderingContext2D, s: string, cx: number, cy: number, tracking: number) {
  const widths = [...s].map((ch) => x.measureText(ch).width + tracking);
  const total = widths.reduce((a, b) => a + b, 0) - tracking;
  let px = cx - total / 2;
  for (let i = 0; i < s.length; i++) {
    x.fillText(s[i], px + (widths[i] - tracking) / 2, cy);
    px += widths[i];
  }
}

export function startWebglField(canvas: HTMLCanvasElement, ambient: boolean, glyph = 0, wordmark = false): FieldHandle {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // ?reveal=full freezes the fully-revealed mark (design/debug aid).
  const frozen = reduced || new URLSearchParams(location.search).get('reveal') === 'full';

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x06080b, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();

  // /work shows the brand wordmark; other boards show the wolf mark.
  const logoTex = wordmark
    ? makeWordmarkTexture()
    : new THREE.TextureLoader().load('/assets/brand/kodaxa-mark-hero.png', () => {
        if (frozen) renderer.render(scene, camera);
      });
  if (!wordmark) {
    logoTex.colorSpace = THREE.SRGBColorSpace;
    logoTex.minFilter = THREE.LinearFilter;
    logoTex.magFilter = THREE.LinearFilter;
  }
  const WORDMARK_ASPECT = 1024 / 512;

  const uniforms: Record<string, THREE.IUniform> = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uTiles: { value: 200 },
    uReduced: { value: frozen ? 1 : 0 },
    uLogo: { value: logoTex },
    uLogoRect: { value: new THREE.Vector4(0.55, 0.13, 0.3, 0.74) },
    uGlyph: { value: glyph },
    // 0 = rotate reveal style each cycle; ?style=N forces one style (QA aid).
    uReveal: { value: Number(new URLSearchParams(location.search).get('style')) || 0 },
  };

  // Place the mark, preserving aspect. Wordmark = wide, centred, sized by width.
  const placeLogo = (w: number, h: number) => {
    const canvasAspect = w / Math.max(h, 1);
    if (wordmark) {
      const wFrac = 0.82;                                   // wordmark width fraction
      const hFrac = (wFrac / WORDMARK_ASPECT) * canvasAspect;
      (uniforms.uLogoRect.value as THREE.Vector4).set(0.5 - wFrac / 2, 0.5 - hFrac / 2, wFrac, hFrac);
      return;
    }
    const hFrac = ambient ? 0.6 : 0.78;             // mark height as fraction of canvas
    const wFrac = (hFrac * LOGO_ASPECT) / canvasAspect;
    const cx = ambient ? 0.5 : 0.68;                // centre x
    (uniforms.uLogoRect.value as THREE.Vector4).set(cx - wFrac / 2, 0.5 - hFrac / 2, wFrac, hFrac);
  };

  const material = new THREE.ShaderMaterial({
    vertexShader: dotboardVert,
    fragmentShader: dotboardFrag,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  scene.add(quad);

  let raf = 0;
  let running = true;

  const resize = () => {
    const w = canvas.clientWidth || canvas.parentElement?.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || canvas.parentElement?.clientHeight || window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, w > 1100 ? 1.5 : 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    (uniforms.uRes.value as THREE.Vector2).set(w * dpr, h * dpr);
    placeLogo(w, h);
    // Tile density = board "resolution"; smaller tiles → finer board. Hero
    // pushes high for an HD wolf; ambient is denser now too so the side panels
    // read fine and schematic rather than toy-like.
    const px = ambient ? 4.5 : 4;
    uniforms.uTiles.value = Math.min(ambient ? 420 : 480, Math.round(w / px));
  };

  const clock = new THREE.Clock();
  const loop = () => {
    if (!running) return;
    uniforms.uTime.value = clock.getElapsedTime();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  };

  resize();
  window.addEventListener('resize', resize, { passive: true });
  if (frozen) {
    renderer.render(scene, camera); // single resolved frame, no loop
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
      logoTex.dispose();
      renderer.dispose();
    },
  };
}
