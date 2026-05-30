// Fullscreen fragment shader for the hero "tile wall".
//
// Concept: the screen is a wall of near-invisible tiles. Each tile is an
// independent light. Travelling colour-waves (evidence pulses) sweep across
// the wall and light up the tiles whose CONTENT they pass over — resolving an
// image out of darkness. content() is swappable per world; this file ships
// COSMOS (nebula + stars + constellation glints). No grid lines, no geometry.
export const cosmosFrag = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform vec2  uRes;        // canvas px
uniform float uTime;
uniform float uTiles;      // tiles across the width
uniform float uReduced;    // 1.0 = reduced motion (freeze waves)
uniform vec3  uWaveOrigin[5];
uniform vec3  uWaveColor[5];
uniform float uWaveActive;  // count of live waves

// ---------- hashing / value noise / fbm ----------
float hash21(vec2 p){
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}
vec3 hash23(vec2 p){
  float n = hash21(p);
  return vec3(n, hash21(p + 11.3), hash21(p + 47.7));
}
float vnoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for(int i = 0; i < 6; i++){ v += a * vnoise(p); p = m * p; a *= 0.5; }
  return v;
}

// 3-octave ridged/with-warp fbm for richer, filamentary nebula structure.
float fbmWarp(vec2 p, float drift){
  vec2 w = vec2(fbm(p + drift * 0.05), fbm(p + 5.2 - drift * 0.03));
  return fbm(p + w * 1.8);
}

// ---------- COSMOS content: returns emitted colour at a tile centre ----------
// Independent of waves — waves only decide how MUCH of it shows. Returns HDR
// colour (can exceed 1.0) so only true cores bloom and nebula stays saturated.
vec3 cosmosContent(vec2 uv, vec2 tileId, float drift){
  // Domain-warped nebula → filaments and voids instead of a smooth gradient.
  vec2 q = uv * 3.0 + vec2(drift * 0.03, drift * 0.012);
  float base = fbmWarp(q, drift);
  float fil = fbmWarp(q * 2.1 + 13.0, drift * 0.7);
  float density = clamp(base * 0.7 + fil * 0.55 - 0.18, 0.0, 1.0);
  density = pow(density, 1.9);

  // Saturated cosmic palette; deep navy void → teal → electric blue → violet,
  // with a hot magenta-white core only at the densest filaments.
  vec3 voidc  = vec3(0.03, 0.06, 0.16);
  vec3 teal   = vec3(0.10, 0.42, 0.62);
  vec3 blue   = vec3(0.18, 0.50, 0.95);
  vec3 violet = vec3(0.48, 0.28, 0.85);
  vec3 hot    = vec3(1.05, 0.78, 0.95);
  vec3 col = mix(voidc, teal, smoothstep(0.05, 0.5, base));
  col = mix(col, blue, smoothstep(0.35, 0.8, fil));
  col = mix(col, violet, smoothstep(0.55, 1.0, base * fil + 0.1));
  col = mix(col, hot, pow(smoothstep(0.72, 1.0, density), 2.2));
  col *= density * 1.6;

  // Stars: sparse bright points keyed off the tile id (each tile can be its
  // own star). HDR so they bloom into crisp points, not gray smudges.
  vec3 h = hash23(tileId + 3.1);
  float starGate = step(0.93, h.x);
  float tw = 0.55 + 0.45 * sin(uTime * (1.0 + h.y * 3.0) + h.z * 6.28);
  float star = starGate * pow(h.y, 2.0) * (0.6 + tw);
  vec3 starCol = mix(vec3(0.85, 0.92, 1.0), vec3(0.75, 0.82, 1.0), h.z);
  col += starCol * star * 2.2;

  // Constellation glints: rare extra-bright anchor tiles.
  float glint = step(0.988, h.x) * (0.9 + tw);
  col += vec3(0.9, 0.97, 1.0) * glint * 3.2;

  return col;
}

// Ordered 4x4 Bayer dither to kill banding on the dark gradients.
float bayer(vec2 px){
  int x = int(mod(px.x, 4.0));
  int y = int(mod(px.y, 4.0));
  int i = x + y * 4;
  float m[16];
  m[0]=0.0;m[1]=8.0;m[2]=2.0;m[3]=10.0;
  m[4]=12.0;m[5]=4.0;m[6]=14.0;m[7]=6.0;
  m[8]=3.0;m[9]=11.0;m[10]=1.0;m[11]=9.0;
  m[12]=15.0;m[13]=7.0;m[14]=13.0;m[15]=5.0;
  float v = 0.0;
  for(int k=0;k<16;k++){ if(k==i) v = m[k]; }
  return v / 16.0 - 0.5;
}

void main(){
  // Aspect-correct UV; tile the wall.
  vec2 uv = vUv;
  float aspect = uRes.x / max(uRes.y, 1.0);
  vec2 auv = vec2(uv.x * aspect, uv.y);

  vec2 grid = vec2(uTiles, uTiles / aspect);
  vec2 cell = uv * grid;
  vec2 tileId = floor(cell);
  vec2 tileUv = fract(cell);
  vec2 tileCenter = (tileId + 0.5) / grid;

  float drift = uReduced > 0.5 ? 0.0 : uTime;

  // --- Per-tile (FLAT) reveal: each tile is one addressable light. Everything
  // here is sampled at the tile centre, so the whole tile face shares a single
  // brightness/colour — the wave switches tiles ON, it is not a glow on top. ---
  float reveal = 0.0;
  vec3 waveCol = vec3(0.0);
  for(int i = 0; i < 5; i++){
    if(float(i) >= uWaveActive) break;
    vec2 o = uWaveOrigin[i].xy;
    float r = uWaveOrigin[i].z;          // current radius (uv space)
    float d = distance(tileCenter, o);
    float front = 1.0 - abs(d - r) / 0.17;
    front = clamp(front, 0.0, 1.0);
    front *= front;                      // sharpen the ring
    front *= smoothstep(1.25, 0.0, r);   // fade as the wave expands out
    reveal += front;
    waveCol += uWaveColor[i] * front;
  }
  reveal = clamp(reveal, 0.0, 1.5);
  if(reveal > 0.001) waveCol /= reveal;  // normalised tint of the lighting wave

  // Idle: a faint breathing ember keyed to nebula density, so even at rest the
  // wall hints at hidden structure (uncertain signal field).
  float idleNoise = fbm(tileCenter * 3.0 + drift * 0.05);
  float idle = 0.03 + 0.05 * idleNoise * (0.6 + 0.4 * sin(uTime * 0.6 + idleNoise * 6.28));

  vec3 content = cosmosContent(tileCenter, tileId, drift);

  // The tile's OWN emitted colour: its cosmos content, brightened by how lit
  // the tile is, tinted by the wave currently lighting it. Flat across the
  // whole tile face — this is the light source.
  float lit = idle + reveal;
  vec3 tileColor = content * lit + waveCol * reveal * 0.5;

  // Crisp dark gap around each tile so the wall always reads as discrete
  // lights. AA width derived from grid/resolution (no fwidth dependency).
  vec2 aa = grid / uRes * 1.3;
  float gap = 0.085;
  vec2 lo = smoothstep(gap - aa, gap + aa, tileUv);
  vec2 hi = smoothstep(gap - aa, gap + aa, 1.0 - tileUv);
  float cellMask = lo.x * lo.y * hi.x * hi.y;

  vec3 col = tileColor * mix(0.04, 1.0, cellMask);

  // Left-side darkening so headline copy stays legible.
  float copyMask = smoothstep(0.0, 0.44, uv.x);
  col *= mix(0.14, 1.0, copyMask);

  // Vignette toward edges for focus.
  float vig = smoothstep(1.3, 0.3, length((uv - 0.5) * vec2(1.05, 1.4)));
  col *= mix(0.62, 1.0, vig);

  // Tone-map (keeps highlights from clipping to flat white pre-bloom) + dither.
  col = col / (col + vec3(0.72));              // Reinhard-ish
  col *= 1.35;
  col += bayer(gl_FragCoord.xy) * (1.5 / 255.0);

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;

export const cosmosVert = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;
