// Hero "living image" field — a layered 2D-canvas pipeline:
//   starfield → terrain mesh → constellation links → pulse haze →
//   energised mesh → anchor glows → pulse-revealed silhouette → focal anchor.
// Heavy lifting lives in ./field/* to stay under the per-file line gate.
import { type RGB, type Star, TAU } from './field/core';
import { buildStars, drawStars } from './field/starfield';
import { Mesh } from './field/mesh';
import { PulseSystem, drawAnchorGlow } from './field/pulses';
import { drawMountainReveal } from './field/reveal';

const canvas = document.querySelector<HTMLCanvasElement>('#evidence-canvas');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (canvas) {
  const ctx = canvas.getContext('2d');
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const ambient = canvas.dataset.variant === 'ambient';
  const mesh = new Mesh(ambient);
  const pulses = new PulseSystem(ambient);
  let stars: Star[] = [];
  let width = 0;
  let height = 0;
  let animationId = 0;
  let time = 0;
  let flowT = 0;
  let frame = 0;

  // 3-5 dominant light sources anchoring the composition.
  const anchorTargets: { ti: number; tj: number; r: number; col: RGB; base: number }[] = [
    { ti: 0.79, tj: 0.42, r: 40, col: [150, 206, 248], base: 0.62 }, // primary electric blue
    { ti: 0.63, tj: 0.34, r: 30, col: [120, 224, 236], base: 0.4 }, // summit cyan
    { ti: 0.48, tj: 0.55, r: 26, col: [196, 224, 248], base: 0.32 }, // left ridge white
    { ti: 0.91, tj: 0.3, r: 22, col: [158, 150, 244], base: 0.26 }, // distant violet
  ];
  let anchors: { node: number; r: number; col: RGB; base: number }[] = [];

  const build = () => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    ctx?.setTransform(ratio, 0, 0, ratio, 0, 0);

    mesh.build(width, height);
    mesh.project(width, height, 0, true);
    mesh.buildLinks(width);
    stars = buildStars(width, height, ambient);
    pulses.reset();

    anchors = anchorTargets.map((t) => ({
      node: mesh.idx(Math.round(mesh.cols * t.ti), Math.round(mesh.rows * t.tj)),
      r: t.r,
      col: t.col,
      base: t.base,
    }));
  };

  const render = () => {
    if (!ctx) return;
    frame += 1;
    if (!reducedMotion) {
      time += 0.0045;
      flowT += 0.011;
      pulses.advance(mesh, width, frame);
    }

    mesh.project(width, height, flowT, reducedMotion);
    mesh.applyPulses(pulses.list, width);

    ctx.clearRect(0, 0, width, height);

    // 1 · starfield
    drawStars(ctx, stars, time, reducedMotion);
    // 2 · pulse haze (broad, screen-blended cloud wake)
    pulses.drawHaze(ctx);
    // 3 · resting terrain mesh
    mesh.drawResting(ctx);
    // 4 · constellation cross-links
    mesh.drawConstellation(ctx);
    // 5 · pulse-revealed silhouette (mountain ridge)
    drawMountainReveal(ctx, pulses, width, height);
    // 6 · energised mesh (bright pulse edges + node bloom)
    mesh.drawEnergised(ctx);

    // 7 · anchor glows + breathing primary focal
    for (let i = 0; i < anchors.length; i += 1) {
      const an = anchors[i];
      if (mesh.sx[an.node] === undefined) continue;
      const breathe = reducedMotion ? 0.8 : 0.78 + Math.sin(time * (5 + i) + i) * 0.22;
      const activity = Math.min(0.6, mesh.pi[an.node] || 0);
      drawAnchorGlow(ctx, mesh.sx[an.node], mesh.sy[an.node], an.r, (an.base + activity) * breathe, an.col);
      if (i === 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(212, 240, 252, ${0.85 * breathe})`;
        ctx.beginPath();
        ctx.arc(mesh.sx[an.node], mesh.sy[an.node], 2.6, 0, TAU);
        ctx.fill();
      }
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
