type Point = {
  x: number;
  y: number;
  baseY: number;
  speed: number;
  phase: number;
  emphasis: 'quiet' | 'proof' | 'policy';
};

const canvas = document.querySelector<HTMLCanvasElement>('#evidence-canvas');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (canvas) {
  const ctx = canvas.getContext('2d');
  const points: Point[] = [];
  let frame = 0;
  let width = 0;
  let height = 0;
  let animationId = 0;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);

  const seeded = (seed: number) => {
    const value = Math.sin(seed * 9187.23) * 43758.5453;
    return value - Math.floor(value);
  };

  const resize = () => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);
    points.length = 0;
    const count = Math.max(40, Math.min(76, Math.floor(width / 26)));
    for (let i = 0; i < count; i += 1) {
      const x = (i / (count - 1)) * width;
      const ridge = height * .66 - Math.sin(i * .16) * height * .075;
      const baseY = ridge + (seeded(i + 11) - .5) * height * .13;
      const proof = i === Math.floor(count * .52) || i === Math.floor(count * .76);
      const policy = i === Math.floor(count * .64);
      points.push({
        x,
        y: baseY,
        baseY,
        speed: .0015 + seeded(i + 101) * .0022,
        phase: seeded(i + 47) * Math.PI * 2,
        emphasis: policy ? 'policy' : proof ? 'proof' : 'quiet',
      });
    }
  };

  const render = () => {
    if (!ctx) return;
    frame += 1;
    ctx.clearRect(0, 0, width, height);

    for (const point of points) {
      point.y = reducedMotion ? point.baseY : point.baseY + Math.sin(frame * point.speed + point.phase) * 4.2;
    }

    ctx.lineWidth = .65;
    for (let layer = 0; layer < 4; layer += 1) {
      ctx.beginPath();
      points.forEach((point, index) => {
        const y = point.y + layer * 22 + Math.sin(index * .38 + layer) * 5;
        if (index === 0) ctx.moveTo(point.x, y);
        else ctx.lineTo(point.x, y);
      });
      ctx.strokeStyle = `rgba(111, 137, 143, ${.18 - layer * .032})`;
      ctx.stroke();
    }

    points.forEach((point, index) => {
      const neighbor = points[index + 1];
      const bridge = points[index + 4];
      if (neighbor) {
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(neighbor.x, neighbor.y);
        ctx.strokeStyle = 'rgba(126, 149, 154, .12)';
        ctx.stroke();
      }
      if (bridge && index % 3 === 0) {
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(bridge.x, bridge.y + 42);
        ctx.strokeStyle = 'rgba(126, 149, 154, .065)';
        ctx.stroke();
      }

      const isPolicy = point.emphasis === 'policy';
      const isProof = point.emphasis === 'proof';
      ctx.beginPath();
      ctx.arc(point.x, point.y, isPolicy || isProof ? 2.15 : .72, 0, Math.PI * 2);
      ctx.fillStyle = isPolicy ? '#bd966d' : isProof ? '#83afba' : 'rgba(194, 198, 193, .48)';
      ctx.fill();
      if (isPolicy || isProof) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 14, 0, Math.PI * 2);
        ctx.fillStyle = isPolicy ? 'rgba(166, 114, 66, .07)' : 'rgba(78, 132, 150, .08)';
        ctx.fill();
      }
    });

    if (!reducedMotion) animationId = requestAnimationFrame(render);
  };

  const onResize = () => {
    if (animationId) cancelAnimationFrame(animationId);
    resize();
    render();
  };

  resize();
  render();
  window.addEventListener('resize', onResize, { passive: true });
}
