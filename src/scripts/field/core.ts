// Shared types, constants, and lightweight value-noise for the hero field.
export type RGB = [number, number, number];

export type Cell = {
  ti: number;
  tj: number;
  h0: number;
};

export type Pulse = {
  x: number;
  y: number;
  r: number;
  speed: number;
  maxR: number;
  col: RGB;
};

export type Star = {
  x: number;
  y: number;
  r: number;
  alpha: number;
  twinkle: number;
  phase: number;
  col: RGB;
};

export type Link = { a: number; b: number; strength: number };

export const TAU = Math.PI * 2;

// Vibrant, cool-leaning palette; warm gold appears rarely for surprise.
export const palette: RGB[] = [
  [96, 178, 255],
  [78, 222, 236],
  [72, 214, 188],
  [150, 138, 248],
  [188, 228, 255],
  [240, 196, 120],
];

export const pickColour = (): RGB =>
  Math.random() < 0.07 ? palette[5] : palette[Math.floor(Math.random() * 5)];

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

const fract = (n: number) => n - Math.floor(n);
const hash = (x: number, y: number) =>
  fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);

// 2D value noise (smooth, seamless enough for slow-moving cloud masks).
export const noise2D = (x: number, y: number) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};

// Static mountain-range elevation field, normalised 0..1.
export const elevation = (ti: number, tj: number) => {
  const a = Math.sin(ti * 5.2 + tj * 1.6 + 0.6);
  const b = Math.sin(ti * 9.9 - tj * 2.3 + 1.9);
  const c = Math.cos(tj * 4.1 + ti * 2.7);
  let h = 0.44 + 0.24 * a + 0.16 * b + 0.12 * c;
  h += 0.32 * Math.exp(-(((ti - 0.72) ** 2) / 0.010 + ((tj - 0.46) ** 2) / 0.045));
  h += 0.22 * Math.exp(-(((ti - 0.44) ** 2) / 0.016 + ((tj - 0.62) ** 2) / 0.05));
  h += 0.15 * Math.exp(-(((ti - 0.89) ** 2) / 0.012 + ((tj - 0.33) ** 2) / 0.04));
  return clamp01(h);
};
