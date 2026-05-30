type Cell = {
  ti: number;
  tj: number;
  h0: number;
};

const canvas = document.querySelector<HTMLCanvasElement>('#evidence-canvas');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (canvas) {
  const ctx = canvas.getContext('2d');
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0;
  let height = 0;
  let cols = 0;
  let rows = 0;
  let cells: Cell[] = [];
  const sx: number[] = [];
  const sy: number[] = [];
  let animationId = 0;
  let time = 0;

  // Static mountain-range elevation field, normalised 0..1.
  const elevation = (ti: number, tj: number) => {
    const a = Math.sin(ti * 5.2 + tj * 1.6 + 0.6);
    const b = Math.sin(ti * 9.9 - tj * 2.3 + 1.9);
    const c = Math.cos(tj * 4.1 + ti * 2.7);
    let h = 0.44 + 0.24 * a + 0.16 * b + 0.12 * c;
    // Deliberate ridges so the range reads as a mountain silhouette.
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

    cols = Math.max(18, Math.min(38, Math.floor(width / 50)));
    rows = Math.max(12, Math.min(24, Math.floor(height / 40)));
    cells = [];
    for (let j = 0; j < rows; j += 1) {
      for (let i = 0; i < cols; i += 1) {
        const ti = i / (cols - 1);
        const tj = j / (rows - 1);
        cells.push({ ti, tj, h0: elevation(ti, tj) });
      }
    }
  };

  const idx = (i: number, j: number) => j * cols + i;

  const projectAll = () => {
    // The field lives in the right portion of the canvas; the left is reserved
    // for the headline and stays dark behind the copy.
    const fieldLeft = width * 0.27;
    const fieldRight = width * 1.04;
    const fieldW = fieldRight - fieldLeft;
    const centre = fieldLeft + fieldW * 0.5;
    const frontY = height * 0.98;
    const backY = height * 0.22;
    const amp = height * 0.46;

    for (let n = 0; n < cells.length; n += 1) {
      const cell = cells[n];
      const wobble = reducedMotion
        ? 0
        : Math.sin(time + cell.ti * 4 + cell.tj * 2.4) * 0.045;
      const h = Math.max(0, Math.min(1, cell.h0 + wobble));
      const persp = 1 - cell.tj * 0.16;
      sx[n] = centre + (cell.ti - 0.5) * fieldW * persp;
      sy[n] = frontY + (backY - frontY) * cell.tj - h * amp;
    }
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
    if (!reducedMotion) time += 0.0045;
    projectAll();
    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 0.7;

    // Triangulated mesh — brighter at the peaks, receding into the dark.
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

    // Vertices — quiet dots in the valleys, glowing markers on the ridges.
    for (let n = 0; n < cells.length; n += 1) {
      const h = cells[n].h0;
      const depth = 0.5 + (1 - cells[n].tj) * 0.5;
      const peak = h > 0.7;
      const r = peak ? 2 : 0.8 + h * 0.7;
      const a = (0.24 + h * 0.66) * depth;
      ctx.beginPath();
      ctx.arc(sx[n], sy[n], r, 0, Math.PI * 2);
      ctx.fillStyle = peak
        ? `rgba(156, 208, 228, ${Math.min(1, a + 0.18)})`
        : `rgba(190, 204, 208, ${a})`;
      ctx.fill();
      if (peak) {
        ctx.beginPath();
        ctx.arc(sx[n], sy[n], r + 7, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(92, 158, 178, ${0.05 + h * 0.05})`;
        ctx.fill();
      }
    }

    // One bright anchor node, the focal point of the field.
    const hero = idx(Math.round(cols * 0.79), Math.round(rows * 0.42));
    if (sx[hero] !== undefined) {
      const glow = ctx.createRadialGradient(sx[hero], sy[hero], 0, sx[hero], sy[hero], 30);
      glow.addColorStop(0, 'rgba(156, 212, 236, 0.8)');
      glow.addColorStop(0.32, 'rgba(108, 176, 202, 0.26)');
      glow.addColorStop(1, 'rgba(92, 158, 178, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sx[hero], sy[hero], 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(198, 234, 248, 0.95)';
      ctx.beginPath();
      ctx.arc(sx[hero], sy[hero], 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

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
