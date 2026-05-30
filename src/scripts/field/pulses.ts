// Shockwave pulses: spawning, advancing, and their atmospheric haze wake.
import { type Pulse, type RGB, TAU, pickColour } from './core';
import type { Mesh } from './mesh';

export class PulseSystem {
  list: Pulse[] = [];
  private nextSpawn = 24;

  constructor(private ambient: boolean) {}

  reset() {
    this.list.length = 0;
  }

  spawn(mesh: Mesh, width: number) {
    if (this.list.length >= (this.ambient ? 3 : 5)) return;
    let n = mesh.focal();
    if (Math.random() > 0.42) {
      let best = -1;
      for (let k = 0; k < 6; k += 1) {
        const c = Math.floor(Math.random() * mesh.cells.length);
        if (mesh.cells[c].h0 > best) {
          best = mesh.cells[c].h0;
          n = c;
        }
      }
    }
    if (mesh.sx[n] === undefined) n = Math.floor(Math.random() * mesh.cells.length);
    this.list.push({
      x: mesh.sx[n],
      y: mesh.sy[n],
      r: 0,
      speed: 2.4 + Math.random() * 1.9,
      maxR: width * (0.42 + Math.random() * 0.3),
      col: pickColour(),
    });
  }

  advance(mesh: Mesh, width: number, frame: number) {
    if (frame >= this.nextSpawn) {
      this.spawn(mesh, width);
      this.nextSpawn =
        frame + (this.ambient ? 64 : 34) + Math.floor(Math.random() * (this.ambient ? 80 : 56));
    }
    for (let p = this.list.length - 1; p >= 0; p -= 1) {
      this.list[p].r += this.list[p].speed;
      if (this.list[p].r > this.list[p].maxR) this.list.splice(p, 1);
    }
  }

  // Broad, soft, jittered haze wake — 'screen' blend for cosmic-cloud softness
  // (distinct from the 'lighter' node bloom). Multiple offset gradients keep
  // the cloud from reading as a perfect circle.
  drawHaze(ctx: CanvasRenderingContext2D) {
    ctx.globalCompositeOperation = 'screen';
    for (const p of this.list) {
      const life = 1 - p.r / p.maxR;
      if (life <= 0) continue;
      const lobes = 7;
      for (let i = 0; i < lobes; i += 1) {
        const ang = (i / lobes) * TAU + p.r * 0.01;
        const jx = Math.cos(ang) * p.r * 0.16;
        const jy = Math.sin(ang) * p.r * 0.16;
        const rr = p.r * (0.62 + (i % 3) * 0.16);
        const cx = p.x + jx;
        const cy = p.y + jy;
        const haze = ctx.createRadialGradient(cx, cy, rr * 0.12, cx, cy, rr);
        const base = 0.05 * life;
        haze.addColorStop(0, `rgba(${p.col[0]}, ${p.col[1]}, ${p.col[2]}, ${base})`);
        haze.addColorStop(0.6, `rgba(${p.col[0]}, ${p.col[1]}, ${p.col[2]}, ${base * 1.4})`);
        haze.addColorStop(1, `rgba(${p.col[0]}, ${p.col[1]}, ${p.col[2]}, 0)`);
        ctx.fillStyle = haze;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, TAU);
        ctx.fill();
      }
    }
  }

  // Max pulse intensity at a point, for reveal masks (0..~1).
  intensityAt(x: number, y: number, width: number) {
    const band = Math.max(46, width * 0.058);
    let inten = 0;
    for (const p of this.list) {
      const d = Math.hypot(x - p.x, y - p.y);
      let infl = 1 - Math.abs(d - p.r) / (band * 1.6);
      if (infl <= 0) continue;
      infl *= 1 - p.r / p.maxR;
      if (infl > inten) inten = infl;
    }
    return inten;
  }
}

export const drawAnchorGlow = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  power: number,
  col: RGB,
) => {
  const r = radius * (0.7 + power * 0.6);
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${0.85 * power})`);
  g.addColorStop(0.22, `rgba(${col[0]}, ${col[1]}, ${col[2]}, ${0.28 * power})`);
  g.addColorStop(1, `rgba(${col[0]}, ${col[1]}, ${col[2]}, 0)`);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
};
