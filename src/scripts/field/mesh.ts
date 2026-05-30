// Terrain mesh: the projected elevation grid, its flowing-cloth motion,
// non-local constellation cross-links, the resting wireframe, and the
// additive pulse-energised layer.
import { type Cell, type Link, TAU, elevation, clamp01 } from './core';

export class Mesh {
  cols = 0;
  rows = 0;
  cells: Cell[] = [];
  sx: number[] = [];
  sy: number[] = [];
  pi: number[] = []; // per-node pulse intensity
  pr: number[] = [];
  pg: number[] = [];
  pb: number[] = [];
  links: Link[] = [];

  constructor(private ambient: boolean) {}

  idx(i: number, j: number) {
    return j * this.cols + i;
  }
  focal() {
    return this.idx(Math.round(this.cols * 0.79), Math.round(this.rows * 0.42));
  }

  build(width: number, height: number) {
    this.cols = Math.max(20, Math.min(40, Math.floor(width / 46)));
    this.rows = Math.max(13, Math.min(26, Math.floor(height / 40)));
    this.cells = [];
    for (let j = 0; j < this.rows; j += 1) {
      for (let i = 0; i < this.cols; i += 1) {
        const ti = i / (this.cols - 1);
        const tj = j / (this.rows - 1);
        this.cells.push({ ti, tj, h0: elevation(ti, tj) });
      }
    }
  }

  // Cache non-local diagonal links between high, mostly-right-side peaks so
  // the field reads as a constellation rather than graph paper.
  buildLinks(width: number) {
    this.links = [];
    const cap = Math.min(150, Math.round(width / 12));
    const peaks: number[] = [];
    for (let n = 0; n < this.cells.length; n += 1) {
      const c = this.cells[n];
      if (c.h0 > 0.62 && c.ti > 0.34) peaks.push(n);
    }
    for (let a = 0; a < peaks.length && this.links.length < cap; a += 1) {
      for (let b = a + 1; b < peaks.length && this.links.length < cap; b += 1) {
        const dx = this.sx[peaks[a]] - this.sx[peaks[b]];
        const dy = this.sy[peaks[a]] - this.sy[peaks[b]];
        const dist = Math.hypot(dx, dy);
        if (dist > 72 && dist < 250 && Math.random() < 0.32) {
          this.links.push({ a: peaks[a], b: peaks[b], strength: 1 - dist / 250 });
        }
      }
    }
  }

  project(width: number, height: number, flowT: number, reducedMotion: boolean) {
    const fieldLeft = this.ambient ? width * -0.02 : width * 0.27;
    const fieldRight = this.ambient ? width * 1.02 : width * 1.04;
    const fieldW = fieldRight - fieldLeft;
    const centre = fieldLeft + fieldW * 0.5;
    const frontY = height * 0.98;
    const backY = height * 0.22;
    const amp = height * 0.46;
    const swayX = width * 0.007;

    for (let n = 0; n < this.cells.length; n += 1) {
      const { ti, tj, h0 } = this.cells[n];
      let h = h0;
      let lateral = 0;
      if (!reducedMotion) {
        const edge = 0.55 + 0.45 * ti;
        const flow =
          Math.sin(ti * 3.0 - flowT * 1.0 + tj * 0.9) * 0.06 +
          Math.sin(ti * 6.2 - flowT * 1.7 + tj * 1.6) * 0.028 +
          Math.sin(tj * 3.6 + flowT * 0.8) * 0.026 +
          Math.sin((ti + tj) * 5.0 - flowT * 1.35) * 0.018;
        h = clamp01(h + flow * edge);
        lateral = Math.sin(tj * 3.0 - flowT * 0.8 + ti * 2.2) * swayX * edge;
      }
      const persp = 1 - tj * 0.16;
      this.sx[n] = centre + (ti - 0.5) * fieldW * persp + lateral;
      this.sy[n] = frontY + (backY - frontY) * tj - h * amp;
    }
  }

  // Accumulate wavefront influence + colour from active pulses into per-node
  // intensity (pi) and colour (pr/pg/pb).
  applyPulses(pulses: { x: number; y: number; r: number; maxR: number; col: number[] }[], width: number) {
    const band = Math.max(46, width * 0.058);
    for (let n = 0; n < this.cells.length; n += 1) {
      let inten = 0;
      let cr = 0;
      let cg = 0;
      let cb = 0;
      for (const p of pulses) {
        const d = Math.hypot(this.sx[n] - p.x, this.sy[n] - p.y);
        let infl = 1 - Math.abs(d - p.r) / band;
        if (infl <= 0) continue;
        infl *= 1 - p.r / p.maxR;
        if (infl <= 0) continue;
        inten += infl;
        cr += p.col[0] * infl;
        cg += p.col[1] * infl;
        cb += p.col[2] * infl;
      }
      this.pi[n] = inten;
      if (inten > 0) {
        this.pr[n] = cr / inten;
        this.pg[n] = cg / inten;
        this.pb[n] = cb / inten;
      }
    }
  }

  private line(ctx: CanvasRenderingContext2D, a: number, b: number, alpha: number, hue: string) {
    ctx.strokeStyle = `rgba(${hue}, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(this.sx[a], this.sy[a]);
    ctx.lineTo(this.sx[b], this.sy[b]);
    ctx.stroke();
  }

  drawResting(ctx: CanvasRenderingContext2D) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = 0.7;
    const { cols, rows, cells } = this;
    for (let j = 0; j < rows; j += 1) {
      for (let i = 0; i < cols; i += 1) {
        const n = this.idx(i, j);
        const depth = 0.45 + (1 - cells[n].tj) * 0.55;
        const a = (0.06 + cells[n].h0 * 0.42) * depth;
        if (i < cols - 1) this.line(ctx, n, this.idx(i + 1, j), a, '122, 165, 184');
        if (j < rows - 1) this.line(ctx, n, this.idx(i, j + 1), a, '122, 165, 184');
        if (i < cols - 1 && j < rows - 1 && cells[n].h0 > 0.54) {
          this.line(ctx, n, this.idx(i + 1, j + 1), a * 0.6, '150, 196, 212');
        }
      }
    }
    for (let n = 0; n < cells.length; n += 1) {
      const depth = 0.5 + (1 - cells[n].tj) * 0.5;
      const peak = cells[n].h0 > 0.7;
      const a = (0.24 + cells[n].h0 * 0.66) * depth;
      ctx.beginPath();
      ctx.arc(this.sx[n], this.sy[n], peak ? 2 : 0.8 + cells[n].h0 * 0.7, 0, TAU);
      ctx.fillStyle = peak
        ? `rgba(156, 208, 228, ${Math.min(1, a + 0.18)})`
        : `rgba(190, 204, 208, ${a})`;
      ctx.fill();
    }
  }

  // Faint constellation web (additive); brightens near pulse activity.
  drawConstellation(ctx: CanvasRenderingContext2D) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 0.55;
    for (const link of this.links) {
      const activity = Math.max(this.pi[link.a] || 0, this.pi[link.b] || 0);
      const alpha = 0.04 + link.strength * 0.1 + activity * 0.3;
      ctx.strokeStyle = `rgba(140, 205, 255, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(this.sx[link.a], this.sy[link.a]);
      ctx.lineTo(this.sx[link.b], this.sy[link.b]);
      ctx.stroke();
    }
  }

  // Bright pulse-energised edges + node bloom (additive).
  drawEnergised(ctx: CanvasRenderingContext2D) {
    ctx.globalCompositeOperation = 'lighter';
    const { cols, rows } = this;
    for (let j = 0; j < rows; j += 1) {
      for (let i = 0; i < cols; i += 1) {
        const n = this.idx(i, j);
        const links = i < cols - 1 ? [this.idx(i + 1, j)] : [];
        if (j < rows - 1) links.push(this.idx(i, j + 1));
        for (const m of links) {
          const sum = (this.pi[n] || 0) + (this.pi[m] || 0);
          if (sum < 0.12) continue;
          const cr = (this.pr[n] * this.pi[n] + this.pr[m] * this.pi[m]) / sum;
          const cg = (this.pg[n] * this.pi[n] + this.pg[m] * this.pi[m]) / sum;
          const cb = (this.pb[n] * this.pi[n] + this.pb[m] * this.pi[m]) / sum;
          ctx.strokeStyle = `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, ${Math.min(0.62, sum * 0.42)})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(this.sx[n], this.sy[n]);
          ctx.lineTo(this.sx[m], this.sy[m]);
          ctx.stroke();
        }
      }
    }
    for (let n = 0; n < this.cells.length; n += 1) {
      const k = this.pi[n];
      if (!k || k < 0.05) continue;
      const cr = this.pr[n] | 0;
      const cg = this.pg[n] | 0;
      const cb = this.pb[n] | 0;
      const kk = Math.min(1, k);
      const gr = 5 + kk * 22;
      const glow = ctx.createRadialGradient(this.sx[n], this.sy[n], 0, this.sx[n], this.sy[n], gr);
      glow.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${0.74 * kk})`);
      glow.addColorStop(0.5, `rgba(${cr}, ${cg}, ${cb}, ${0.22 * kk})`);
      glow.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(this.sx[n], this.sy[n], gr, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `rgba(${Math.min(255, cr + 80)}, ${Math.min(255, cg + 80)}, ${Math.min(255, cb + 80)}, ${Math.min(1, 0.55 + kk * 0.45)})`;
      ctx.beginPath();
      ctx.arc(this.sx[n], this.sy[n], 1.1 + kk * 2.3, 0, TAU);
      ctx.fill();
    }
  }
}
