// Fullscreen "flip-dot board" shader — Kodaxa wolf reveal.
//
// The hero is a wall of dark mechanical dots. A slow signal sweep resolves the
// wolf, then the mark holds as a living display before organically decaying to a
// ghost state. Only the wolf tiles become bright; empty board space remains a
// quiet instrument surface for the terminal overlay.
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

vec4 wolfAt(vec2 uv){
  vec2 luv = (uv - uLogoRect.xy) / uLogoRect.zw;
  if(luv.x < 0.0 || luv.x > 1.0 || luv.y < 0.0 || luv.y > 1.0) return vec4(0.0);
  return texture2D(uLogo, luv);
}

float windowPulse(float x, float a, float b, float feather){
  return smoothstep(a, a + feather, x) * (1.0 - smoothstep(b - feather, b, x));
}

void main(){
  aspect = uRes.x / max(uRes.y, 1.0);
  vec2 uv = vUv;

  vec2 grid = vec2(uTiles, uTiles / aspect);
  vec2 cell = uv * grid;
  vec2 tileId = floor(cell);
  vec2 tileUv = fract(cell) - 0.5;
  vec2 tileCenter = (tileId + 0.5) / grid;
  float grain = hash21(tileId);
  float grain2 = hash21(tileId + vec2(19.7, 41.2));

  vec4 wolf = wolfAt(tileCenter);
  float raw = wolf.a;
  float coverage = smoothstep(0.26, 0.56, raw);

  vec2 texel = vec2(1.5 / max(uLogoRect.z * grid.x, 1.0), 1.5 / max(uLogoRect.w * grid.y, 1.0));
  float n1 = wolfAt(tileCenter + vec2(texel.x, 0.0)).a;
  float n2 = wolfAt(tileCenter - vec2(texel.x, 0.0)).a;
  float n3 = wolfAt(tileCenter + vec2(0.0, texel.y)).a;
  float n4 = wolfAt(tileCenter - vec2(0.0, texel.y)).a;
  float edge = coverage * smoothstep(0.08, 0.42, abs(raw - n1) + abs(raw - n2) + abs(raw - n3) + abs(raw - n4));

  vec3 wc = wolf.rgb;
  float lum = dot(wc, vec3(0.299, 0.587, 0.114));
  vec3 chroma = wc - lum;
  float lift = 0.26 + lum * 1.05;
  vec3 wolfCol = clamp(chroma * 1.18 + lift, 0.0, 1.6);
  float cyanAccent = smoothstep(0.36, 0.82, wc.b - wc.r);
  wolfCol += vec3(0.0, 0.33, 0.62) * cyanAccent;
  wolfCol += vec3(0.45, 0.72, 0.95) * edge * 0.34;
  wolfCol = floor(wolfCol * 16.0 + 0.5) / 16.0;

  float on;
  float flip;
  float sweep;
  if(uReduced > 0.5){
    on = coverage;
    flip = 0.0;
    sweep = 0.0;
  } else {
    float cycle = 12.0;
    float t = mod(uTime, cycle);
    float rowWaver = (hash21(vec2(floor(tileCenter.y * 42.0), 3.0)) - 0.5) * 0.026;
    float jitter = (grain - 0.5) * 0.055;
    float x = clamp(tileCenter.x + rowWaver + jitter * 0.22, 0.0, 1.0);

    float head = smoothstep(0.65, 2.65, t) * 1.18 - 0.08;
    float revealWave = 1.0 - smoothstep(0.0, 0.085, abs(head - x));
    float revealed = smoothstep(x * 2.05 + 0.36, x * 2.05 + 0.68, t);
    float hold = 1.0 - smoothstep(7.55 + grain * 0.65, 9.9 + grain2 * 0.85, t);
    float ghost = 0.16 + edge * 0.18 + cyanAccent * 0.08;
    float living = 0.018 * sin(uTime * (2.1 + grain * 2.6) + grain * 6.2831);
    on = coverage * max(ghost, revealed * hold + living);
    sweep = coverage * revealWave * smoothstep(0.45, 2.6, t) * (1.0 - smoothstep(3.25, 4.4, t));
    flip = coverage * revealWave * smoothstep(0.0, 0.38, t) * (1.0 - smoothstep(3.15, 3.8, t));
  }

  float squash = mix(1.0, 0.14, flip);
  vec2 dp = tileUv / 0.5;
  dp.y /= max(squash, 0.04);
  float aa = 2.6 * grid.y / max(uRes.y, 1.0);
  float radius = 0.76 + grain * 0.08;
  float disc = 1.0 - smoothstep(radius - aa, radius + aa, length(dp));

  float dead = step(0.018, grain2);
  float boardNoise = 0.72 + grain * 0.22;
  vec3 offCol = vec3(0.018, 0.023, 0.035) * boardNoise;
  vec3 idleCol = vec3(0.045, 0.064, 0.085) * (0.38 + grain * 0.22);
  float idle = 0.22 * smoothstep(0.16, 0.62, uv.x) * (1.0 - smoothstep(1.02, 1.18, uv.x));

  float edgeBoost = 0.36 * edge;
  float resolve = clamp(on + sweep * 0.68 + edgeBoost, 0.0, 1.35);
  vec3 dotCol = mix(offCol, idleCol, idle);
  dotCol = mix(dotCol, wolfCol, resolve);
  dotCol += wolfCol * flip * 0.58;
  dotCol += vec3(0.18, 0.56, 0.95) * sweep * (0.5 + cyanAccent * 0.7);

  float stage = smoothstep(0.0, 0.34, uv.x) * (1.0 - smoothstep(0.96, 1.08, uv.x));
  vec3 col = dotCol * disc * stage * dead;

  float eye = coverage * cyanAccent * smoothstep(0.68, 1.05, lum + cyanAccent);
  float eyeCore = eye * (0.72 + 0.28 * sin(uTime * 2.2));
  col += vec3(0.22, 0.72, 1.0) * eyeCore * disc * (0.55 + sweep * 0.9);

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;

export const dotboardVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
