// Fullscreen "flip-dot board" shader.
//
// The screen is a mechanical dot board: a wall of discrete circular dots, each
// matte and dark at rest. There is ONE hidden target image (a cosmic cloud);
// every dot has a fixed quantised colour it needs to show. A single slow
// wavefront sweeps left→right — as it reaches each column the dots FLIP (the
// disc rotates edge-on, then snaps to its colour), hold, then slowly flip back
// to dark behind the front. Kinetic pixel art, not a glow over a grid.
//
// cosmosTarget() is the swappable "world" (cosmos now; mountains/forest later).
export const cosmosFrag = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform vec2  uRes;
uniform float uTime;
uniform float uTiles;
uniform float uReduced;   // 1.0 = freeze fully-revealed image, no sweep

float aspect;

float hash21(vec2 p){
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}
vec3 hash23(vec2 p){ float n = hash21(p); return vec3(n, hash21(p+11.3), hash21(p+47.7)); }
float vnoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  float a = hash21(i), b = hash21(i+vec2(1,0)), c = hash21(i+vec2(0,1)), d = hash21(i+vec2(1,1));
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
float fbm(vec2 p){
  float v=0.0, a=0.5; mat2 m = mat2(1.6,1.2,-1.2,1.6);
  for(int i=0;i<6;i++){ v += a*vnoise(p); p = m*p; a*=0.5; }
  return v;
}
float fbmWarp(vec2 p){ vec2 w = vec2(fbm(p), fbm(p + 5.2)); return fbm(p + w * 1.9); }

// ---------- COSMOS target image: the colour each dot needs to show ----------
// A full-frame violet/blue/magenta nebula with a hot glowing core, billowing
// clouds, dark voids, and cyan accents — wide gamut for colour depth.
vec3 cosmosTarget(vec2 uv){
  vec2 p = vec2(uv.x * aspect, uv.y);

  // Glowing core biased to the right (clear of the headline copy).
  vec2 core = vec2(0.72 * aspect, 0.6);
  float coreGlow = exp(-length(p - core) * 2.3);

  // Billowing, domain-warped density.
  float w  = fbmWarp(p * 1.7 + 2.0);
  float d  = fbmWarp(p * 3.1 + w * 1.6 + 7.0);
  float fn = fbm(p * 8.0 + d * 2.0 + 21.0);          // fine filaments
  float density = clamp(w * 0.6 + d * 0.5 + fn * 0.2, 0.0, 1.0);
  density = mix(density, 1.0, coreGlow * 0.65);       // core blooms outward

  // Large-scale hue field → some regions lean blue, others magenta (breadth).
  float hue = fbm(p * 1.1 + 30.0);

  // Wide colour ramp.
  vec3 voidc  = vec3(0.030, 0.022, 0.090);  // near-black indigo
  vec3 deep   = vec3(0.110, 0.085, 0.330);  // deep indigo
  vec3 blue   = vec3(0.170, 0.255, 0.760);  // royal blue
  vec3 violet = vec3(0.430, 0.230, 0.720);  // violet
  vec3 mag    = vec3(0.760, 0.340, 0.860);  // magenta
  vec3 pink   = vec3(0.950, 0.600, 0.880);  // pink lavender
  vec3 hot    = vec3(1.000, 0.930, 0.820);  // warm white core

  vec3 col = mix(voidc, deep, smoothstep(0.04, 0.30, density));
  vec3 mid = mix(blue, violet, hue);
  mid = mix(mid, mag, smoothstep(0.55, 0.9, hue));
  col = mix(col, mid, smoothstep(0.24, 0.6, density));
  col = mix(col, pink, smoothstep(0.62, 0.88, density));
  col = mix(col, hot, smoothstep(0.86, 1.0, density) * (0.45 + coreGlow));

  // Cyan accents in the blue-leaning filaments.
  col += vec3(0.05, 0.42, 0.55) * smoothstep(0.45, 0.8, fn) * (1.0 - hue) * 0.32;
  // Magenta lightning filaments.
  col += vec3(0.55, 0.12, 0.42) * smoothstep(0.62, 0.78, fn) * hue * 0.4;

  return col;
}

// Per-dot stars: an individual dot can simply BE a star. Denser in the voids.
vec3 starDot(vec2 uv, vec2 tileId){
  vec3 h = hash23(tileId + 3.1);
  float tw = 0.6 + 0.4*sin(uTime*(1.0 + h.y*3.0) + h.z*6.28);
  float star = step(0.93, h.x) * pow(h.y, 1.7) * (0.7 + tw);
  return mix(vec3(0.92,0.95,1.0), vec3(0.80,0.86,1.0), h.z) * star;
}

void main(){
  aspect = uRes.x / max(uRes.y, 1.0);
  vec2 uv = vUv;

  vec2 grid = vec2(uTiles, uTiles / aspect);
  vec2 cell = uv * grid;
  vec2 tileId = floor(cell);
  vec2 tileUv = fract(cell) - 0.5;          // -0.5..0.5 within the dot cell
  vec2 tileCenter = (tileId + 0.5) / grid;

  // --- the dot's fixed colour in the target image ---
  // Light posterise (16 levels/channel) keeps a pixel-art step between dots
  // while preserving the colour DEPTH/BREADTH the nebula needs.
  vec3 neb = cosmosTarget(tileCenter);
  neb = floor(neb * 16.0 + 0.5) / 16.0;
  vec3 target = neb + starDot(tileCenter, tileId) * 1.6;

  // --- left→right flip sweep ---
  float on;       // 0..1 how lit the dot is
  float flip;     // 1.0 at the instant of flipping (drives the squash)
  if (uReduced > 0.5){
    on = 1.0; flip = 0.0;
  } else {
    float speed = 0.13;
    float trail = 1.0;                       // dim length behind the front
    float cycle = 1.0 + trail + 0.5;         // +pause of darkness
    float head = mod(uTime * speed, cycle);
    float waver = (fbm(vec2(tileCenter.y*6.0, 3.0)) - 0.5) * 0.04;
    float phase = head - (tileCenter.x + waver);
    float flipW = 0.05;                      // width of the flipping band
    float onAmt  = smoothstep(0.0, flipW, phase);
    float offAmt = 1.0 - smoothstep(flipW, trail, phase);
    on = clamp(onAmt * offAmt, 0.0, 1.0);
    // mid-flip when the front is right at this column (and only going on)
    flip = (1.0 - smoothstep(0.0, flipW, abs(phase))) * step(-flipW, phase);
  }

  // --- dot geometry: a disc that squashes vertically while flipping ---
  float squash = mix(1.0, 0.1, flip);        // edge-on → thin horizontal sliver
  vec2 dp = tileUv / 0.5;                     // -1..1
  dp.y /= max(squash, 0.04);
  float rr = length(dp);
  float aa = 2.6 * grid.y / max(uRes.y, 1.0);
  float disc = 1.0 - smoothstep(0.82 - aa, 0.82 + aa, rr);

  // Matte dark face when off; flip to the quantised colour. A small extra pop
  // of brightness right as it flips gives the mechanical "snap".
  vec3 offCol = vec3(0.020, 0.026, 0.038);
  vec3 dotCol = mix(offCol, target, on);
  dotCol += target * flip * 0.6;
  vec3 col = dotCol * disc;

  // Headline legibility + focus vignette.
  col *= mix(0.10, 1.0, smoothstep(0.0, 0.44, uv.x));
  col *= mix(0.6, 1.0, smoothstep(1.3, 0.3, length((uv-0.5)*vec2(1.05,1.4))));

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;

export const cosmosVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
