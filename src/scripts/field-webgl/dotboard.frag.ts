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
import { glyphsFrag } from './glyphs.frag';

export const dotboardFrag = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform vec2      uRes;
uniform float     uTime;
uniform float     uTiles;
uniform float     uReduced;     // 1.0 = freeze fully-revealed mark
uniform sampler2D uLogo;        // wolf mark (RGBA, alpha = coverage)
uniform vec4      uLogoRect;    // x, y, w, h in uv space
uniform int       uGlyph;       // 0 = wolf texture; >0 = procedural project glyph
uniform int       uReveal;      // 0 = rotate reveal style each cycle; >0 = fixed style
uniform int       uWordmark;    // 1 = uLogo is the KODAXA wordmark (palette treatment)
uniform sampler2D uCode;        // Code-Warden: scrolling code-diff strip (glyph 5)
uniform sampler2D uAtlasWord;   // EF-Atlas: "ATLAS" wordmark texture (glyph 4)

float aspect;

float hash21(vec2 p){
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}
` + glyphsFrag + /* glsl */ `

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

  float pulse = 0.85 + 0.55 * sin(uTime * 2.2);            // ~0.3..1.4, slow
  vec2 tstep = 1.0 / grid;
  float coverage;
  vec3 wolfCol;

  // Shared cycle index (matches the reveal lifecycle) so the wordmark palette
  // and the reveal style change together each presentation.
  float CYCLE_TOTAL = 12.3;
  float cyc = floor(uTime / CYCLE_TOTAL);
  float cycRnd = hash21(vec2(cyc, 7.3));     // per-cycle random 0..1

  if(uWordmark > 0){
    // --- KODAXA wordmark: wolf-palette dot treatment, randomised per cycle ---
    // Colour comes ONLY from smooth low-frequency PATTERN functions of position
    // (+ slow time), never per-dot randomness — so neighbours always share
    // colour and transitions read as coherent bands, not speckle.
    vec4 wm = wolfAt(tileCenter);
    coverage = smoothstep(0.4, 0.6, wm.a);

    // Wolf palette stops.
    vec3 navy   = vec3(0.10, 0.16, 0.34);
    vec3 slate  = vec3(0.34, 0.45, 0.62);
    vec3 silver = vec3(0.74, 0.82, 0.92);
    vec3 ice    = vec3(0.86, 0.95, 1.05);
    vec3 cyan   = vec3(0.25, 0.78, 1.05);

    // A primary gradient axis that rotates per cycle (smooth across the field).
    float ang = cycRnd * 6.2831;
    vec2 dir = vec2(cos(ang), sin(ang));
    float g = clamp(dot(tileCenter - 0.5, dir) + 0.5, 0.0, 1.0);
    // A second, lower-frequency flowing wave for variation within the gradient.
    float wave = 0.5 + 0.5 * sin((tileCenter.x + tileCenter.y) * 5.0 + uTime * 0.5 + cyc);

    int mode = int(mod(cyc, 4.0));
    vec3 wc;
    if(mode == 0){
      // navy → silver → ice along the rotating axis (smooth ramp)
      wc = mix(navy, silver, smoothstep(0.0, 0.8, g));
      wc = mix(wc, ice, smoothstep(0.75, 1.0, g));
    } else if(mode == 1){
      // duotone bands: navy↔slate↔silver driven by the flowing wave
      wc = mix(slate, silver, wave);
      wc = mix(wc, navy, smoothstep(0.6, 1.0, 1.0 - g) * 0.6);
    } else if(mode == 2){
      // icy silver body, navy settling toward the lower edge (vertical ramp)
      wc = mix(navy, silver, smoothstep(0.0, 0.9, tileCenter.y));
      wc = mix(wc, ice, smoothstep(0.6, 1.0, wave));
    } else {
      // cool steel: slate base with broad silver sheen sweeping across
      wc = mix(slate, silver, smoothstep(0.2, 0.9, g * 0.6 + wave * 0.4));
    }

    // Cyan energy: a single smooth travelling band sweeping along the gradient
    // axis (a wide soft highlight, not sparkles). Coherent across neighbours.
    float bandPos = fract(uTime * 0.10 + cyc * 0.37);
    float cyanBand = smoothstep(0.16, 0.0, abs(g - bandPos));
    wc = mix(wc, cyan, cyanBand * (0.45 + 0.2 * pulse));

    wolfCol = floor(wc * 16.0 + 0.5) / 16.0;
  } else if(uGlyph == 5){
    // --- Code-Warden: scrolling REAL code diff sampled from uCode ---
    // Map the tile into a centred code panel; scroll V over time. The texture
    // already carries diff tints + gutter marks + coloured text.
    float panelW = 0.92, panelH = 0.66;          // fraction of the field
    vec2 q = (tileCenter - 0.5) / vec2(panelW, panelH) + 0.5;   // 0..1 in panel
    if(q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0){
      coverage = 0.0; wolfCol = vec3(0.0);
    } else {
      // scroll upward; wrapT=repeat makes it seamless
      vec2 cuv = vec2(q.x, fract(q.y + uTime * 0.045));
      vec4 cs = texture2D(uCode, cuv);
      vec3 cc = cs.rgb;
      float lit = max(max(cc.r, cc.g), cc.b);    // text/marks brightness
      coverage = smoothstep(0.18, 0.5, lit);
      // scan-review highlight: a soft horizontal bar sweeping down the panel
      float scanY = fract(uTime * 0.08);
      float scan = smoothstep(0.06, 0.0, abs(q.y - scanY));
      wolfCol = cc * (1.0 + scan * 0.8) + vec3(0.10, 0.30, 0.45) * scan * coverage;
      wolfCol = floor(wolfCol * 16.0 + 0.5) / 16.0;
    }
  } else if(uGlyph > 0 && glyphColored(uGlyph)){
    // --- colour-aware procedural glyph (e.g. solar system): each body its
    // own colour. glyphColor returns vec4(rgb, lit). ---
    vec2 gp = vec2((tileCenter.x - 0.5) * aspect, tileCenter.y - 0.5);
    vec4 g = glyphColor(uGlyph, gp);
    coverage = g.a;
    wolfCol = g.rgb;
    wolfCol = floor(wolfCol * 16.0 + 0.5) / 16.0;
  } else if(uGlyph > 0){
    // --- procedural project glyph: schematic cool-toned mask ---
    vec2 gp = vec2((tileCenter.x - 0.5) * aspect, tileCenter.y - 0.5);
    vec2 g = glyphMask(uGlyph, gp);
    coverage = max(g.x, g.y);   // accent dots are lit too (g.y = focal check)
    // Cool slate base; accent (focal) parts pulse cyan like the wolf's eye.
    vec3 base = vec3(0.46, 0.60, 0.74);
    wolfCol = base;
    wolfCol += vec3(0.0, 0.40, 0.7) * g.y * (0.7 + 0.6 * pulse);
    // Edge glow: neighbour outside the glyph → rim light (combined coverage).
    vec2 gnL = glyphMask(uGlyph, gp - vec2(tstep.x*aspect,0.0));
    vec2 gnR = glyphMask(uGlyph, gp + vec2(tstep.x*aspect,0.0));
    vec2 gnD = glyphMask(uGlyph, gp - vec2(0.0,tstep.y));
    vec2 gnU = glyphMask(uGlyph, gp + vec2(0.0,tstep.y));
    float gnb = min(min(max(gnL.x,gnL.y), max(gnR.x,gnR.y)),
                    min(max(gnD.x,gnD.y), max(gnU.x,gnU.y)));
    wolfCol += vec3(0.32, 0.46, 0.62) * coverage * (1.0 - smoothstep(0.18, 0.5, gnb)) * 0.6;
    wolfCol = floor(wolfCol * 14.0 + 0.5) / 14.0;
  } else {
    // --- wolf-mark texture: lifted so dark facets read against black ---
    vec4 wolf = wolfAt(tileCenter);
    coverage = smoothstep(0.34, 0.6, wolf.a);
    vec3 wc = wolf.rgb;
    float lum = dot(wc, vec3(0.299, 0.587, 0.114));
    vec3 chroma = wc - lum;
    float lift = 0.34 + lum * 0.92;
    wolfCol = clamp(chroma * 1.25 + lift, 0.0, 1.7);
    float cyan = smoothstep(0.45, 0.85, wc.b - wc.r);
    wolfCol += vec3(0.0, 0.34, 0.6) * cyan * (0.7 + 0.6 * pulse);
    float nb = min(min(wolfAt(tileCenter + vec2(tstep.x, 0.0)).a,
                       wolfAt(tileCenter - vec2(tstep.x, 0.0)).a),
                   min(wolfAt(tileCenter + vec2(0.0, tstep.y)).a,
                       wolfAt(tileCenter - vec2(0.0, tstep.y)).a));
    float edge = coverage * (1.0 - smoothstep(0.18, 0.5, nb));
    wolfCol += vec3(0.32, 0.46, 0.62) * edge * 0.7;
    wolfCol = floor(wolfCol * 14.0 + 0.5) / 14.0;
  }

  // --- left→right flip sweep, then HOLD, then decay ---
  // Lifecycle in seconds: SWEEP_DUR reveal → HOLD_DUR steady → DECAY_DUR fade →
  // PAUSE_DUR dark. A tile lights when the moving front reaches its x and then
  // stays on through the hold (it no longer dims the instant the front passes),
  // so the resolved wolf reads as a brand anchor rather than a scan demo.
  float on, flip;
  if(uGlyph > 0 && glyphAnimated(uGlyph)){
    // Animated scene glyphs (e.g. solar system) play continuously — no reveal
    // sweep; the motion lives inside the glyph via uTime.
    on = coverage; flip = 0.0;
  } else if(uReduced > 0.5){
    on = coverage; flip = 0.0;
  } else {
    const float SWEEP_DUR = 4.0;   // front travels across (s)
    const float HOLD_DUR  = 3.0;   // fully-resolved hold (s)
    const float DECAY_DUR = 3.5;   // organic fade-out (s)
    const float PAUSE_DUR = 1.8;   // dark gap before restart (s)
    const float TOTAL = SWEEP_DUR + HOLD_DUR + DECAY_DUR + PAUSE_DUR;

    float cycle = floor(uTime / TOTAL);
    float t = mod(uTime, TOTAL);
    float waver = (hash21(vec2(floor(tileCenter.y * 36.0), 3.0)) - 0.5) * 0.02;

    // litT in 0..1 = WHEN this tile lights. The ordering function rotates each
    // cycle so the board reveals with a different style every time (the wordmark
    // wants this; the wolf benefits too). uReveal!=0 forces a fixed style.
    int style = (uReveal > 0) ? uReveal : int(mod(cycle, 6.0));
    vec2 c = tileCenter - 0.5;            // centred (-0.5..0.5), x already *aspect upstream? no
    float litT;
    if(style == 0){            // left → right
      litT = tileCenter.x;
    } else if(style == 1){     // top → down
      litT = 1.0 - tileCenter.y;
    } else if(style == 2){     // radial out from centre
      litT = clamp(length(vec2(c.x * aspect, c.y)) / 0.75, 0.0, 1.0);
    } else if(style == 3){     // diagonal ↘
      litT = (tileCenter.x + (1.0 - tileCenter.y)) * 0.5;
    } else if(style == 4){     // random dissolve
      litT = hash21(tileId + 4.2);
    } else {                   // bottom → up
      litT = tileCenter.y;
    }
    litT = clamp(litT + waver, 0.0, 1.0);
    float flipW = 0.06;

    float head = (t / SWEEP_DUR);
    float reveal = smoothstep(litT - flipW, litT + flipW, head);

    float decayT = clamp((t - (SWEEP_DUR + HOLD_DUR)) / DECAY_DUR, 0.0, 1.0);
    float fade = 1.0 - smoothstep(0.0, 1.0, decayT + waver * 4.0);

    on = (t < SWEEP_DUR + HOLD_DUR) ? reveal : (t < SWEEP_DUR + HOLD_DUR + DECAY_DUR ? fade : 0.0);
    on = clamp(on, 0.0, 1.0) * coverage;

    // Flip pop at the advancing front during the sweep.
    flip = (t < SWEEP_DUR) ? (1.0 - smoothstep(0.0, flipW, abs(head - litT))) * coverage : 0.0;
  }

  // --- subtle per-dot variance (stable per tile): a whisper of size and
  // brightness jitter for a physical feel — no dead cells (they read as
  // missing pixels on the logo). ---
  float rnd = hash21(tileId + 1.7);
  float rnd2 = hash21(tileId + 9.3);
  float sizeVar = 0.84 + rnd * 0.05;            // dot radius threshold ~0.84..0.89 (fuller dots)
  float bright = 0.94 + rnd2 * 0.10;            // ~0.94..1.04, gentle

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
