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
  wolfCol += vec3(0.0, 0.32, 0.55) * smoothstep(0.45, 0.85, wc.b - wc.r); // cyan eye/K pop
  wolfCol = floor(wolfCol * 14.0 + 0.5) / 14.0; // pixel-art quantise

  // --- left→right flip sweep ---
  float on, flip;
  if(uReduced > 0.5){
    on = coverage; flip = 0.0;
  } else {
    float speed = 0.12;
    float trail = 0.6;                          // ≈ wolf width: left clears as right lights
    float cycle = 1.0 + trail + 0.55;           // + dark pause before looping
    float head = mod(uTime * speed, cycle);
    float waver = (hash21(vec2(floor(tileCenter.y * 36.0), 3.0)) - 0.5) * 0.02;
    float phase = head - (tileCenter.x + waver);
    float flipW = 0.05;
    on = clamp(smoothstep(0.0, flipW, phase) * (1.0 - smoothstep(flipW, trail, phase)), 0.0, 1.0);
    flip = (1.0 - smoothstep(0.0, flipW, abs(phase))) * step(-flipW, phase);
    on *= coverage;
    flip *= coverage;
  }

  // --- dot geometry: a disc that squashes vertically while flipping ---
  float squash = mix(1.0, 0.12, flip);          // edge-on at the flip instant
  vec2 dp = tileUv / 0.5;                        // -1..1
  dp.y /= max(squash, 0.04);
  float aa = 2.6 * grid.y / max(uRes.y, 1.0);
  float disc = 1.0 - smoothstep(0.82 - aa, 0.82 + aa, length(dp));

  // Faint dark board at rest; wolf tiles flip to their colour with a snap pop.
  vec3 offCol = vec3(0.026, 0.030, 0.044);
  vec3 dotCol = mix(offCol, wolfCol, on);
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
