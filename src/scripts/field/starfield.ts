// Independent starfield layer rendered behind the terrain mesh. Density is
// biased: sparse on the far left (behind hero copy), dense toward top/mid
// right, with extra micro-stars near the ridge crest for depth.
import type { RGB, Star } from './core';

const STAR_COLOURS: RGB[] = [
  [200, 216, 234],
  [150, 196, 236],
  [176, 170, 240],
  [224, 236, 248],
];

export const buildStars = (width: number, height: number, ambient: boolean): Star[] => {
  const stars: Star[] = [];
  const target = Math.round((width * height) / 5400) * (ambient ? 0.6 : 1);

  let placed = 0;
  let guard = 0;
  while (placed < target && guard < target * 8) {
    guard += 1;
    const x = Math.random() * width;
    const y = Math.random() * height;
    const tx = x / width;
    const ty = y / height;

    // Density bias: fade out on the left third (copy) for the hero variant,
    // concentrate toward the upper-right sky.
    let keep = 0.25 + tx * 0.75;
    if (!ambient && tx < 0.32) keep *= tx / 0.32;
    keep *= 1 - ty * 0.35;
    if (Math.random() > keep) continue;

    placed += 1;
    const micro = Math.random() < 0.6;
    stars.push({
      x,
      y,
      r: micro ? 0.45 + Math.random() * 0.55 : 0.9 + Math.random() * 1.1,
      alpha: micro ? 0.18 + Math.random() * 0.3 : 0.4 + Math.random() * 0.45,
      twinkle: 0.6 + Math.random() * 2.4,
      phase: Math.random() * Math.PI * 2,
      col: STAR_COLOURS[Math.floor(Math.random() * STAR_COLOURS.length)],
    });
  }
  return stars;
};

export const drawStars = (
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  time: number,
  reducedMotion: boolean,
) => {
  ctx.globalCompositeOperation = 'source-over';
  for (const s of stars) {
    const tw = reducedMotion ? 1 : 0.72 + Math.sin(time * s.twinkle + s.phase) * 0.28;
    const a = s.alpha * tw;
    ctx.fillStyle = `rgba(${s.col[0]}, ${s.col[1]}, ${s.col[2]}, ${a})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
};
