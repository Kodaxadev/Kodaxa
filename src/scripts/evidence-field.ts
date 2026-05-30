// Hero field selector. Prefers the WebGL "tile wall" (cosmos shader + bloom);
// falls back to the 2D-canvas field when WebGL is unavailable. The WebGL
// runtime + three.js are lazy-imported after first paint so they never block
// the homepage LCP, and only on the page that actually hosts a field.
import { start2dField } from './field';

const canvas = document.querySelector<HTMLCanvasElement>('#evidence-canvas');

const hasWebgl = () => {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
};

if (canvas) {
  const ambient = canvas.dataset.variant === 'ambient';
  let handle: { destroy: () => void } | null = null;
  let disposed = false;

  const startFallback = () => {
    if (disposed || handle) return;
    handle = start2dField(canvas, ambient);
  };

  if (hasWebgl()) {
    // Defer the heavy module past first paint.
    const boot = () =>
      import('./field-webgl/runtime')
        .then((m) => {
          if (disposed) return;
          handle = m.startWebglField(canvas, ambient);
        })
        .catch(startFallback);
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(boot, { timeout: 800 });
    } else {
      setTimeout(boot, 200);
    }
  } else {
    startFallback();
  }

  window.addEventListener(
    'pagehide',
    () => {
      disposed = true;
      handle?.destroy();
    },
    { once: true },
  );
}
