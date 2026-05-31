// Fullscreen "flip-dot board" shader — Kodaxa wolf reveal.
//
// The hero is a wall of dark dots. A single slow wavefront sweeps left→right;
// as it reaches each column the wolf-mark dots FLIP (disc rotates edge-on,
// snaps to colour), hold, then dim back to dark behind the front — tuned so
// the left edge goes dark just as the right edge finishes lighting. Only tiles
// inside the wolf ever light; everything else stays a faint dark board.
//
// The target image is sampled from the wolf-mark texture (uLogo) placed in the
// uLogoRect region of UV space. No starfield, no nebula — just the board.
export const dotboardFrag = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform vec2      uRes;
uniform float     uTime;
uniform float     uTiles;
uniform float     uReduced;     // 1.0 = freeze fully-revealed mark
uniform sampler2D uLogo;        // wolf mark (RGBA, alpha = coverage)
uniform vec4      uLogoRect;    // x, y, w, h in uv space

float aspect;

float hash21(vec2 p){
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

// Sample the wolf mark at a uv point → rgb + coverage(alpha).
vec4 wolfAt(vec2 uv){
  vec2 luv = (uv - uLogoRect.xy) / uLogoRect.zw;
  if(luv.x < 0.0 || luv.x > 1.0 || luv.y < 0.0 || luv.y > 1.0) return vec4(0.0);
  return texture2D(uLogo, luv);
}

void main(){
  aspect = uRes.x / max(uRes.y, 1.0);
  vec2 uv = vUv;

  vec2 grid = vec2(uTiles, uTiles / aspect);
  vec2 cell = uv * grid;
  vec2 tileId = floor(cell);
  vec2 tileUv = fract(cell) - 0.5;
  vec2 tileCenter = (tileId + 0.5) / grid;

  // --- this dot's target: the wolf-mark colour, lifted so dark facets still
  // read clearly against black while keeping the facet shading (3D form) ---
  vec4 wolf = wolfAt(tileCenter);
  float coverage = smoothstep(0.34, 0.6, wolf.a);
  vec3 wc = wolf.rgb;
  float lum = dot(wc, vec3(0.299, 0.587, 0.114));
  vec3 chroma = wc - lum;                       // hue/colour, luminance removed
  float lift = 0.34 + lum * 0.92;               // floor dark facets ~0.34
  vec3 wolfCol = clamp(chroma * 1.25 + lift, 0.0, 1.7);
  // Cyan eye/K regions act as focal energy: a slow breathing pulse keeps them
  // the strongest anchor on the board.
  float cyan = smoothstep(0.45, 0.85, wc.b - wc.r);
  float pulse = 0.85 + 0.55 * sin(uTime * 2.2);            // ~0.3..1.4, slow
  wolfCol += vec3(0.0, 0.34, 0.6) * cyan * (0.7 + 0.6 * pulse);
  wolfCol = floor(wolfCol * 14.0 + 0.5) / 14.0; // pixel-art quantise

  // --- left→right flip sweep, then HOLD, then decay ---
  // Lifecycle in seconds: SWEEP_DUR reveal → HOLD_DUR steady → DECAY_DUR fade →
  // PAUSE_DUR dark. A tile lights when the moving front reaches its x and then
  // stays on through the hold (it no longer dims the instant the front passes),
  // so the resolved wolf reads as a brand anchor rather than a scan demo.
  float on, flip;
  if(uReduced > 0.5){
    on = coverage; flip = 0.0;
  } else {
    const float SWEEP_DUR = 4.0;   // front travels across (s)
    const float HOLD_DUR  = 3.0;   // fully-resolved hold (s)
    const float DECAY_DUR = 3.5;   // organic fade-out (s)
    const float PAUSE_DUR = 1.8;   // dark gap before restart (s)
    const float TOTAL = SWEEP_DUR + HOLD_DUR + DECAY_DUR + PAUSE_DUR;

    float t = mod(uTime, TOTAL);
    float waver = (hash21(vec2(floor(tileCenter.y * 36.0), 3.0)) - 0.5) * 0.02;
    float litX = tileCenter.x + waver;          // when (0..1) this column's front arrives
    float flipW = 0.05;

    // Reveal: front position 0→1 over SWEEP_DUR; tile turns on as it passes.
    float head = (t / SWEEP_DUR);
    float reveal = smoothstep(litX - flipW, litX + flipW, head);

    // Decay: during the decay window all tiles fade, slightly staggered.
    float decayT = clamp((t - (SWEEP_DUR + HOLD_DUR)) / DECAY_DUR, 0.0, 1.0);
    float fade = 1.0 - smoothstep(0.0, 1.0, decayT + waver * 4.0);

    on = (t < SWEEP_DUR + HOLD_DUR) ? reveal : (t < SWEEP_DUR + HOLD_DUR + DECAY_DUR ? fade : 0.0);
    on = clamp(on, 0.0, 1.0) * coverage;

    // Flip pop only at the advancing front during the sweep.
    flip = (t < SWEEP_DUR) ? (1.0 - smoothstep(0.0, flipW, abs(head - litX))) * coverage : 0.0;
  }

  // --- per-dot physical variance (stable per tile): size, brightness, and
  // the occasional dim/dead cell, so it reads as an engineered display wall
  // rather than a flat raster ---
  float rnd = hash21(tileId + 1.7);
  float rnd2 = hash21(tileId + 9.3);
  float sizeVar = 0.78 + rnd * 0.09;            // dot radius threshold ~0.78..0.87
  float dimDot = step(0.965, rnd2);             // ~3.5% of cells are dim/dead
  float bright = (0.82 + rnd2 * 0.26) * (1.0 - dimDot * 0.72);

  // --- dot geometry: a disc that squashes vertically while flipping ---
  float squash = mix(1.0, 0.12, flip);          // edge-on at the flip instant
  vec2 dp = tileUv / 0.5;                        // -1..1
  dp.y /= max(squash, 0.04);
  float aa = 2.6 * grid.y / max(uRes.y, 1.0);
  float disc = 1.0 - smoothstep(sizeVar - aa, sizeVar + aa, length(dp));

  // Faint dark board at rest; wolf tiles flip to their colour with a snap pop.
  vec3 offCol = vec3(0.026, 0.030, 0.044);
  vec3 dotCol = mix(offCol, wolfCol * bright, on);
  dotCol += wolfCol * flip * 0.55;
  vec3 col = dotCol * disc;

  // Keep the board faint on the far left so the headline stays legible.
  col *= mix(0.28, 1.0, smoothstep(0.0, 0.34, uv.x));

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;

export const dotboardVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
