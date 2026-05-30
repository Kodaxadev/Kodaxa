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
vec3 cosmosTarget(vec2 uv){
  vec2 p = vec2(uv.x * aspect, uv.y);

  // Cliff horizon dividing warm dust (below) from blue sky (above).
  float ridge = 0.50 + 0.12*fbm(vec2(uv.x*2.4, 1.7)) + 0.05*fbm(vec2(uv.x*6.5, 4.0)) - 0.06;
  float sky = smoothstep(ridge - 0.02, ridge + 0.06, uv.y);

  // Blue sky: teal near the crest deepening to navy up top.
  vec3 skyCol = mix(vec3(0.12,0.42,0.74), vec3(0.02,0.05,0.16), smoothstep(ridge, 1.05, uv.y));
  skyCol += vec3(0.05,0.14,0.28) * smoothstep(0.55,0.95, fbm(p*3.2 + 9.0));

  // Warm dust: turbulent billows, dark crevices → amber → gold, magenta accents.
  float t1 = fbmWarp(p*2.4 + 3.0);
  float t2 = fbmWarp(p*5.0 + t1*2.0 + 11.0);
  float t3 = fbm(p*11.0 + t2*1.5 + 21.0);
  float dust = clamp(t1*0.7 + t2*0.45 + t3*0.18, 0.0, 1.0);
  vec3 dustCol = mix(vec3(0.05,0.02,0.03), vec3(0.30,0.10,0.05), smoothstep(0.1,0.45,dust));
  dustCol = mix(dustCol, vec3(0.72,0.32,0.11), smoothstep(0.4,0.72,dust));
  dustCol = mix(dustCol, vec3(0.98,0.70,0.34), pow(smoothstep(0.66,1.0,dust),1.8));
  dustCol += vec3(0.42,0.10,0.22) * smoothstep(0.45,0.8,t3) * (1.0-dust*0.5) * 0.6;
  float shade = fbm(p*5.0 + 11.3 + vec2(0.0,0.12)) - t2;
  dustCol *= 1.0 + clamp(shade,-0.4,0.4)*0.7;
  dustCol += vec3(1.0,0.62,0.28) * smoothstep(0.1,0.0,abs(uv.y-ridge)) * 0.85;
  dustCol *= mix(0.4, 1.15, smoothstep(0.0, ridge, uv.y));

  return mix(dustCol, skyCol, sky);
}

// Per-dot stars: an individual dot can simply BE a star (no multi-tile spikes,
// which would read as a continuous overlay). Density rises toward the sky.
vec3 starDot(vec2 uv, vec2 tileId){
  vec3 h = hash23(tileId + 3.1);
  float thresh = mix(0.988, 0.93, smoothstep(0.25, 1.0, uv.y));
  float tw = 0.6 + 0.4*sin(uTime*(1.0 + h.y*3.0) + h.z*6.28);
  float star = step(thresh, h.x) * pow(h.y, 1.6) * (0.7 + tw);
  return mix(vec3(0.9,0.95,1.0), vec3(0.78,0.84,1.0), h.z) * star;
}

void main(){
  aspect = uRes.x / max(uRes.y, 1.0);
  vec2 uv = vUv;

  vec2 grid = vec2(uTiles, uTiles / aspect);
  vec2 cell = uv * grid;
  vec2 tileId = floor(cell);
  vec2 tileUv = fract(cell) - 0.5;          // -0.5..0.5 within the dot cell
  vec2 tileCenter = (tileId + 0.5) / grid;

  // --- the dot's fixed colour in the target image, QUANTISED (pixel-art) ---
  vec3 neb = cosmosTarget(tileCenter);
  neb = floor(neb * 5.0 + 0.5) / 5.0;       // posterise nebula → discrete steps
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
