// Pulse-revealed "hidden world" silhouettes. Nothing is visible at rest; a
// passing pulse briefly resolves a procedural form — the brand metaphor of
// evidence resolving context. Pass 3 ships the mountain ridge.
import { smoothstep } from './core';
import type { PulseSystem } from './pulses';

const gaussian = (x: number, mu: number, sig: number) =>
  Math.exp(-((x - mu) ** 2) / (2 * sig * sig));

// Normalised ridge height (0..1 of canvas) at horizontal position xNorm.
const ridgeY = (x: number) =>
  0.6 -
  0.11 * Math.sin(x * 5.0 + 0.4) -
  0.05 * Math.sin(x * 12.0) -
  0.13 * gaussian(x, 0.64, 0.05) -
  0.07 * gaussian(x, 0.42, 0.06);

// Draw the ridge as a soft glowing edge, sampled in columns, with brightness
// gated by local pulse intensity so it only appears inside passing waves.
export const drawMountainReveal = (
  ctx: CanvasRenderingContext2D,
  pulses: PulseSystem,
  width: number,
  height: number,
) => {
  if (pulses.list.length === 0) return;
  const step = Math.max(4, Math.round(width / 240));
  ctx.globalCompositeOperation = 'lighter';

  for (let px = 0; px <= width; px += step) {
    const xN = px / width;
    const ry = ridgeY(xN);
    const edgeY = ry * height;
    const inten = pulses.intensityAt(px, edgeY, width);
    if (inten < 0.04) continue;

    // Snow-lit crest line.
    const a = Math.min(0.5, inten * 0.6);
    const grad = ctx.createLinearGradient(px, edgeY - 12, px, edgeY + 26);
    grad.addColorStop(0, `rgba(208, 234, 255, ${a})`);
    grad.addColorStop(0.5, `rgba(150, 200, 236, ${a * 0.5})`);
    grad.addColorStop(1, 'rgba(120, 170, 210, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(px - step / 2 - 0.5, edgeY - 12, step + 1, 38);

    // Bright crest pixel.
    ctx.fillStyle = `rgba(224, 244, 255, ${Math.min(0.7, inten * 0.85)})`;
    ctx.fillRect(px - step / 2, edgeY - 1, step, 2);
  }
};
