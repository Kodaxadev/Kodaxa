type Cell = {
  ti: number;
  tj: number;
  h0: number;
};

type Pulse = {
  x: number;
  y: number;
  r: number;
  speed: number;
  maxR: number;
  col: [number, number, number];
};

const canvas = document.querySelector<HTMLCanvasElement>('#evidence-canvas');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const TAU = Math.PI * 2;

if (canvas) {
  const ctx = canvas.getContext('2d');
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const ambient = canvas.dataset.variant === 'ambient';
  let width = 0;
  let height = 0;
  let cols = 0;
  let rows = 0;
  let cells: Cell[] = [];
  const sx: number[] = [];
  const sy: number[] = [];
  const pi: number[] = []; // per-node pulse intensity
  const pr: number[] = []; // per-node accumulated colour
  const pg: number[] = [];
  const pb: number[] = [];
  const pulses: Pulse[] = [];
  let animationId = 0;
  let time = 0;
  let flowT = 0;
  let frame = 0;
  let nextSpawn = 24;

  // Vibrant, cool-leaning palette; warm gold appears rarely for surprise.
  const palette: [number, number, number][] = [
    [96, 178, 255],
    [78, 222, 236],
    [72, 214, 188],
    [150, 138, 248],
    [188, 228, 255],
    [240, 196, 120],
  ];
  const pickColour = (): [number, number, number] =>
    Math.random() < 0.07 ? palette[5] : palette[Math.floor(Math.random() * 5)];

  // Static mountain-range elevation field, normalised 0..1.
  const elevation = (ti: number, tj: number) => {
    const a = Math.sin(ti * 5.2 + tj * 1.6 + 0.6);
    const b = Math.sin(ti * 9.9 - tj * 2.3 + 1.9);
    const c = Math.cos(tj * 4.1 + ti * 2.7);
    let h = 0.44 + 0.24 * a + 0.16 * b + 0.12 * c;
    h += 0.32 * Math.exp(-(((ti - 0.72) ** 2) / 0.010 + ((tj - 0.46) ** 2) / 0.045));
    h += 0.22 * Math.exp(-(((ti - 0.44) ** 2) / 0.016 + ((tj - 0.62) ** 2) / 0.05));
    h += 0.15 * Math.exp(-(((ti - 0.89) ** 2) / 0.012 + ((tj - 0.33) ** 2) / 0.04));
    return Math.max(0, Math.min(1, h));
  };

  const build = () => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);

    cols = Math.max(18, Math.min(34, Math.floor(width / 54)));
    rows = Math.max(12, Math.min(22, Math.floor(height / 44)));
    cells = [];
    for (let j = 0; j < rows; j += 1) {
      for (let i = 0; i < cols; i += 1) {
        const ti = i / (cols - 1);
        const tj = j / (rows - 1);
        cells.push({ ti, tj, h0: elevation(ti, tj) });
      }
    }
    pulses.length = 0;
  };

  const idx = (i: number, j: number) => j * cols + i;
  const focal = () => idx(Math.round(cols * 0.79), Math.round(rows * 0.42));

  const projectAll = () => {
    const fieldLeft = ambient ? width * -0.02 : width * 0.27;
    const fieldRight = ambient ? width * 1.02 : width * 1.04;
    const fieldW = fieldRight - fieldLeft;
    const centre = fieldLeft + fieldW * 0.5;
    const frontY = height * 0.98;
    const backY = height * 0.22;
    const amp = height * 0.46;
    const swayX = width * 0.007;

    for (let n = 0; n < cells.length; n += 1) {
      const cell = cells[n];
      const ti = cell.ti;
      const tj = cell.tj;
      let h = cell.h0;
      let lateral = 0;
      if (!reducedMotion) {
        // Travelling waves make the whole sheet undulate like cloth in a
        // slow breeze; amplitude grows toward the open right edge.
        const edge = 0.55 + 0.45 * ti;
        const flow =
          Math.sin(ti * 3.0 - flowT * 1.0 + tj * 0.9) * 0.06 +
          Math.sin(ti * 6.2 - flowT * 1.7 + tj * 1.6) * 0.028 +
          Math.sin(tj * 3.6 + flowT * 0.8) * 0.026 +
          Math.sin((ti + tj) * 5.0 - flowT * 1.35) * 0.018;
        h = Math.max(0, Math.min(1.1, h + flow * edge));
        lateral = Math.sin(tj * 3.0 - flowT * 0.8 + ti * 2.2) * swayX * edge;
      }
      const persp = 1 - tj * 0.16;
      sx[n] = centre + (ti - 0.5) * fieldW * persp + lateral;
      sy[n] = frontY + (backY - frontY) * tj - h * amp;
    }
  };

  const spawnPulse = () => {
    if (pulses.length >= (ambient ? 3 : 5)) return;
    let n = focal();
    if (Math.random() > 0.42) {
      // Bias toward an elevated node so waves break over the ridges.
      let best = -1;
      for (let k = 0; k < 6; k += 1) {
        const c = Math.floor(Math.random() * cells.length);
        if (cells[c].h0 > best) { best = cells[c].h0; n = c; }
      }
    }
    if (sx[n] === undefined) n = Math.floor(Math.random() * cells.length);
    pulses.push({
      x: sx[n],
      y: sy[n],
      r: 0,
      speed: 2.4 + Math.random() * 1.9,
      maxR: width * (0.42 + Math.random() * 0.3),
      col: pickColour(),
    });
  };

  const line = (a: number, b: number, alpha: number, hue: string) => {
    if (!ctx) return;
    ctx.strokeStyle = `rgba(${hue}, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(sx[a], sy[a]);
    ctx.lineTo(sx[b], sy[b]);
    ctx.stroke();
  };

  const render = () => {
    if (!ctx) return;
    frame += 1;
    if (!reducedMotion) { time += 0.0045; flowT += 0.011; }
    projectAll();
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 0.7;

    // Advance shockwaves.
    if (!reducedMotion) {
      if (frame >= nextSpawn) {
        spawnPulse();
        nextSpawn = frame + (ambient ? 64 : 34) + Math.floor(Math.random() * (ambient ? 80 : 56));
      }
      for (let p = pulses.length - 1; p >= 0; p -= 1) {
        pulses[p].r += pulses[p].speed;
        if (pulses[p].r > pulses[p].maxR) pulses.splice(p, 1);
      }
    }

    // Per-node wavefront influence + accumulated colour.
    const band = Math.max(46, width * 0.058);
    for (let n = 0; n < cells.length; n += 1) {
      let inten = 0;
      let cr = 0;
      let cg = 0;
      let cb = 0;
      for (const p of pulses) {
        const d = Math.hypot(sx[n] - p.x, sy[n] - p.y);
        let infl = 1 - Math.abs(d - p.r) / band;
        if (infl <= 0) continue;
        infl *= 1 - p.r / p.maxR;
        if (infl <= 0) continue;
        inten += infl;
        cr += p.col[0] * infl;
        cg += p.col[1] * infl;
        cb += p.col[2] * infl;
      }
      pi[n] = inten;
      if (inten > 0) { pr[n] = cr / inten; pg[n] = cg / inten; pb[n] = cb / inten; }
    }

    // Resting mesh.
    for (let j = 0; j < rows; j += 1) {
      for (let i = 0; i < cols; i += 1) {
        const n = idx(i, j);
        const depth = 0.45 + (1 - cells[n].tj) * 0.55;
        const h = cells[n].h0;
        const a = (0.06 + h * 0.42) * depth;
        if (i < cols - 1) line(n, idx(i + 1, j), a, '122, 165, 184');
        if (j < rows - 1) line(n, idx(i, j + 1), a, '122, 165, 184');
        if (i < cols - 1 && j < rows - 1 && h > 0.54) {
          line(n, idx(i + 1, j + 1), a * 0.6, '150, 196, 212');
        }
      }
    }
    for (let n = 0; n < cells.length; n += 1) {
      const h = cells[n].h0;
      const depth = 0.5 + (1 - cells[n].tj) * 0.5;
      const peak = h > 0.7;
      const a = (0.24 + h * 0.66) * depth;
      ctx.beginPath();
      ctx.arc(sx[n], sy[n], peak ? 2 : 0.8 + h * 0.7, 0, TAU);
      ctx.fillStyle = peak
        ? `rgba(156, 208, 228, ${Math.min(1, a + 0.18)})`
        : `rgba(190, 204, 208, ${a})`;
      ctx.fill();
    }

    // Energised layer — additive so colour blooms against the dark.
    ctx.globalCompositeOperation = 'lighter';
    for (let j = 0; j < rows; j += 1) {
      for (let i = 0; i < cols; i += 1) {
        const n = idx(i, j);
        const links = i < cols - 1 ? [idx(i + 1, j)] : [];
        if (j < rows - 1) links.push(idx(i, j + 1));
        for (const m of links) {
          const sum = pi[n] + pi[m];
          if (sum < 0.12) continue;
          const cr = (pr[n] * pi[n] + pr[m] * pi[m]) / sum;
          const cg = (pg[n] * pi[n] + pg[m] * pi[m]) / sum;
          const cb = (pb[n] * pi[n] + pb[m] * pi[m]) / sum;
          ctx.strokeStyle = `rgba(${cr | 0}, ${cg | 0}, ${cb | 0}, ${Math.min(0.62, sum * 0.42)})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(sx[n], sy[n]);
          ctx.lineTo(sx[m], sy[m]);
          ctx.stroke();
        }
      }
    }
    for (let n = 0; n < cells.length; n += 1) {
      const k = pi[n];
      if (k < 0.05) continue;
      const cr = pr[n] | 0;
      const cg = pg[n] | 0;
      const cb = pb[n] | 0;
      const kk = Math.min(1, k);
      const gr = 5 + kk * 22;
      const glow = ctx.createRadialGradient(sx[n], sy[n], 0, sx[n], sy[n], gr);
      glow.addColorStop(0, `rgba(${cr}, ${cg}, ${cb}, ${0.74 * kk})`);
      glow.addColorStop(0.5, `rgba(${cr}, ${cg}, ${cb}, ${0.22 * kk})`);
      glow.addColorStop(1, `rgba(${cr}, ${cg}, ${cb}, 0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sx[n], sy[n], gr, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `rgba(${Math.min(255, cr + 80)}, ${Math.min(255, cg + 80)}, ${Math.min(255, cb + 80)}, ${Math.min(1, 0.55 + kk * 0.45)})`;
      ctx.beginPath();
      ctx.arc(sx[n], sy[n], 1.1 + kk * 2.3, 0, TAU);
      ctx.fill();
    }

    // Breathing focal anchor.
    const hero = focal();
    if (sx[hero] !== undefined) {
      const breathe = reducedMotion ? 0.7 : 0.62 + Math.sin(time * 7) * 0.26;
      const glow = ctx.createRadialGradient(sx[hero], sy[hero], 0, sx[hero], sy[hero], 34);
      glow.addColorStop(0, `rgba(170, 224, 248, ${0.72 * breathe})`);
      glow.addColorStop(0.32, `rgba(110, 182, 212, ${0.26 * breathe})`);
      glow.addColorStop(1, 'rgba(92, 158, 178, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sx[hero], sy[hero], 34, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(206, 238, 250, 0.95)';
      ctx.beginPath();
      ctx.arc(sx[hero], sy[hero], 2.6, 0, TAU);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    if (!reducedMotion) animationId = requestAnimationFrame(render);
  };

  const onResize = () => {
    if (animationId) cancelAnimationFrame(animationId);
    build();
    render();
  };

  build();
  render();
  window.addEventListener('resize', onResize, { passive: true });
}
