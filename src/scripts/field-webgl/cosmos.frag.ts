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

// ---------- COSMOS content: returns emitted colour at a tile centre ----------
// Independent of waves — waves only decide how MUCH of it shows.
vec3 cosmosContent(vec2 uv, vec2 tileId, float drift){
  // Nebula: layered fbm in cool blues/violets with a warm rim.
  vec2 q = uv * 2.4 + vec2(drift * 0.04, drift * 0.018);
  float n1 = fbm(q);
  float n2 = fbm(q * 2.3 + n1 * 1.4 + 7.0);
  float neb = pow(clamp(n1 * 0.65 + n2 * 0.5, 0.0, 1.0), 1.7);

  vec3 deep   = vec3(0.10, 0.22, 0.46);
  vec3 mid    = vec3(0.16, 0.55, 0.78);
  vec3 violet = vec3(0.42, 0.32, 0.78);
  vec3 warm   = vec3(0.95, 0.62, 0.42);
  vec3 col = mix(deep, mid, smoothstep(0.2, 0.7, n1));
  col = mix(col, violet, smoothstep(0.45, 0.95, n2));
  col = mix(col, warm, pow(smoothstep(0.7, 1.0, neb), 3.0) * 0.5);
  col *= neb * 1.35;

  // Stars: sparse bright points keyed off the tile id (so each tile can be a
  // star independently). Rarer tiles burn brightest.
  vec3 h = hash23(tileId + 3.1);
  float starGate = step(0.91, h.x);
  float tw = 0.6 + 0.4 * sin(uTime * (1.0 + h.y * 3.0) + h.z * 6.28);
  float star = starGate * pow(h.y, 1.5) * (0.7 + tw);
  vec3 starCol = mix(vec3(0.8, 0.9, 1.0), vec3(0.7, 0.78, 1.0), h.z);
  col += starCol * star * 1.4;

  // Constellation glints: a few extra-bright anchor tiles.
  float glint = step(0.985, h.x) * (0.9 + tw);
  col += vec3(0.85, 0.95, 1.0) * glint * 2.2;

  return col;
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

  // --- wave reveal: how lit is this tile? plus the wave's colour wash ---
  float reveal = 0.0;
  vec3 waveTint = vec3(0.0);
  for(int i = 0; i < 5; i++){
    if(float(i) >= uWaveActive) break;
    vec2 o = uWaveOrigin[i].xy;
    float r = uWaveOrigin[i].z;          // current radius (0..1.x in uv space)
    float d = distance(tileCenter, o);
    float band = 0.16;
    float front = 1.0 - abs(d - r) / band;
    front = clamp(front, 0.0, 1.0);
    front *= smoothstep(1.2, 0.0, r);    // fade as the wave expands out
    reveal += front;
    waveTint += uWaveColor[i] * front;
  }
  reveal = clamp(reveal, 0.0, 1.4);

  // Idle shimmer so the wall is alive even between waves (very faint).
  float idle = 0.05 + 0.05 * fbm(tileCenter * 3.0 + drift * 0.05);

  vec3 content = cosmosContent(tileCenter, tileId, drift);

  // Tile shaping: soft rounded cell so the wall reads as discrete lights,
  // not a continuous image. Gap between tiles stays dark.
  vec2 g = smoothstep(0.0, 0.12, tileUv) * smoothstep(0.0, 0.12, 1.0 - tileUv);
  float tileMask = g.x * g.y;

  float lit = idle + reveal;
  vec3 col = content * lit;
  col += waveTint * 0.35 * tileMask;     // colour wash from the passing wave
  col *= mix(0.35, 1.0, tileMask);       // tile gaps

  // Left-side darkening so headline copy stays legible.
  float copyMask = smoothstep(0.0, 0.42, uv.x);
  col *= mix(0.18, 1.0, copyMask);

  // Vignette toward edges for focus.
  float vig = smoothstep(1.25, 0.35, length((uv - 0.5) * vec2(1.1, 1.4)));
  col *= mix(0.7, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`;

export const cosmosVert = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;
