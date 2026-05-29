type Point = {
  x: number;
  y: number;
  baseY: number;
  speed: number;
  phase: number;
  glow: number;
};

const canvas = document.querySelector<HTMLCanvasElement>('#evidence-canvas');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (canvas) {
  const ctx = canvas.getContext('2d');
  const points: Point[] = [];
  let frame = 0;
  let width = 0;
  let height = 0;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);

  const resize = () => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
    points.length = 0;
    const count = Math.max(54, Math.floor(width / 18));
    for (let i = 0; i < count; i += 1) {
      const x = (i / (count - 1)) * width;
      const ridge = height * 0.72 - Math.sin(i * 0.18) * height * 0.09;
      const baseY = ridge + (Math.random() - 0.5) * height * 0.18;
      points.push({
        x,
        y: baseY,
        baseY,
        speed: 0.004 + Math.random() * 0.008,
        phase: Math.random() * Math.PI * 2,
        glow: Math.random(),
      });
    }
  };

  const render = () => {
    if (!ctx) return;
    frame += 1;
    ctx.clearRect(0, 0, width, height);

    for (const point of points) {
      if (!reducedMotion) {
        point.y = point.baseY + Math.sin(frame * point.speed + point.phase) * 14;
      }
    }

    ctx.lineWidth = 0.7;
    for (let layer = 0; layer < 5; layer += 1) {
      ctx.beginPath();
      for (let i = 0; i < points.length; i += 1) {
        const point = points[i];
        const y = point.y + layer * 19 + Math.sin(i * 0.5 + layer) * 8;
        if (i === 0) ctx.moveTo(point.x, y);
        else ctx.lineTo(point.x, y);
      }
      ctx.strokeStyle = `rgba(72, 138, 198, ${0.28 - layer * 0.035})`;
      ctx.stroke();
    }

    points.forEach((point, index) => {
      for (let jump = 1; jump < 5; jump += 1) {
        const next = points[index + jump];
        if (!next) continue;
        const alpha = 0.14 - jump * 0.022;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(next.x, next.y + ((jump % 2) * 36));
        ctx.strokeStyle = `rgba(126, 167, 209, ${alpha})`;
        ctx.stroke();
      }
      const bright = point.glow > 0.93;
      ctx.beginPath();
      ctx.arc(point.x, point.y, bright ? 2.1 : 0.8, 0, Math.PI * 2);
      ctx.fillStyle = bright ? '#248eff' : 'rgba(186, 217, 238, .62)';
      ctx.fill();
      if (bright) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(20, 125, 255, .13)';
        ctx.fill();
      }
    });

    if (!reducedMotion) requestAnimationFrame(render);
  };

  resize();
  render();
  window.addEventListener('resize', resize, { passive: true });
}
