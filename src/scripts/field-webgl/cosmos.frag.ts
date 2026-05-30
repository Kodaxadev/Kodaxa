// Fullscreen "tile wall" shader.
//
// Model: there is ONE hidden target image (a cosmic cloud). Every tile has a
// fixed colour it needs to be to form that image. A single slow wavefront
// sweeps left→right; as it passes, tiles flip to their target colour, then
// fade slowly behind the front — tuned so that as the right edge lights up,
// the left edge has just gone dark. A scanning reveal of the whole picture.
//
// cosmosTarget() is the swappable "world" (cosmos now; mountains/forest later).
export const cosmosFrag = /* glsl */ `
precision highp float;
varying vec2 vUv;

uniform vec2  uRes;
uniform float uTime;
uniform float uTiles;
uniform float uReduced;   // 1.0 = freeze: show full image, no sweep

float aspect;

// ---------- hashing / value noise / fbm ----------
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
float fbmWarp(vec2 p){
  vec2 w = vec2(fbm(p), fbm(p + 5.2));
  return fbm(p + w * 1.9);
}

// ---------- COSMOS target image: the colour each tile needs to be ----------
vec3 cosmosTarget(vec2 uv){
  vec2 p = vec2(uv.x * aspect, uv.y);

  // Irregular "cliff" horizon dividing warm dust (below) from blue sky (above).
  float ridge = 0.50 + 0.12*fbm(vec2(uv.x*2.4, 1.7)) + 0.05*fbm(vec2(uv.x*6.5, 4.0)) - 0.06;
  float sky = smoothstep(ridge - 0.015, ridge + 0.05, uv.y);

  // --- Blue sky: teal near the crest deepening to navy at the top ---
  vec3 skyCol = mix(vec3(0.12,0.40,0.72), vec3(0.02,0.05,0.16), smoothstep(ridge, 1.05, uv.y));
  float wisp = fbm(p*3.2 + 9.0);
  skyCol += vec3(0.06,0.16,0.30) * smoothstep(0.55,0.95,wisp);

  // --- Warm dust: turbulent, billowing cloud with dark crevices, gold crests,
  // and pink/magenta accents (JWST Carina palette). ---
  float t1 = fbmWarp(p*2.4 + 3.0);
  float t2 = fbmWarp(p*5.0 + t1*2.0 + 11.0);   // warped again → billows
  float t3 = fbm(p*11.0 + t2*1.5 + 21.0);      // fine filament detail
  float dust = clamp(t1*0.7 + t2*0.45 + t3*0.18, 0.0, 1.0);

  vec3 crev  = vec3(0.05, 0.02, 0.03);          // dark crevice
  vec3 rust  = vec3(0.30, 0.10, 0.05);
  vec3 amber = vec3(0.72, 0.32, 0.11);
  vec3 gold  = vec3(0.98, 0.68, 0.32);
  vec3 dustCol = mix(crev, rust, smoothstep(0.1, 0.45, dust));
  dustCol = mix(dustCol, amber, smoothstep(0.4, 0.72, dust));
  dustCol = mix(dustCol, gold, pow(smoothstep(0.66, 1.0, dust), 1.8));
  // magenta/pink emission where mid-density dust catches starlight
  dustCol += vec3(0.42, 0.10, 0.22) * smoothstep(0.45, 0.8, t3) * (1.0 - dust*0.5) * 0.6;
  // self-shadow: darken downward-facing folds (gradient of the field)
  float shade = fbm(p*5.0 + 11.3 + vec2(0.0, 0.12)) - t2;
  dustCol *= 1.0 + clamp(shade, -0.4, 0.4) * 0.7;

  // golden rim light along the crest
  float rim = smoothstep(0.1, 0.0, abs(uv.y - ridge));
  dustCol += vec3(1.0, 0.62, 0.28) * rim * 0.85;
  dustCol *= mix(0.4, 1.15, smoothstep(0.0, ridge, uv.y)); // darker at the base

  return mix(dustCol, skyCol, sky);
}

// Per-tile stars (each tile can independently be a star) + a few hero stars
// with diffraction spikes (the JWST signature).
vec3 starLayer(vec2 uv, vec2 tileId){
  vec3 c = vec3(0.0);
  vec3 h = hash23(tileId + 3.1);
  // density rises toward the top (the open sky)
  float thresh = mix(0.985, 0.90, smoothstep(0.3, 1.0, uv.y));
  float tw = 0.55 + 0.45*sin(uTime*(1.0 + h.y*3.0) + h.z*6.28);
  float star = step(thresh, h.x) * pow(h.y, 1.6) * (0.6 + tw);
  c += mix(vec3(0.85,0.92,1.0), vec3(0.75,0.82,1.0), h.z) * star * 2.0;

  for(int i=0;i<5;i++){
    float fi = float(i);
    vec2 sp = vec2(hash21(vec2(fi,1.0)), 0.40 + hash21(vec2(fi,2.0))*0.55);
    vec2 dd = (uv - sp); dd.x *= aspect;
    float dist = length(dd);
    float core = exp(-dist*150.0);
    float hsp = exp(-abs(dd.y)*90.0) * exp(-abs(dd.x)*3.5);
    float vsp = exp(-abs(dd.x)*90.0) * exp(-abs(dd.y)*3.5);
    float bril = 0.7 + 0.3*sin(uTime*1.5 + fi);
    c += vec3(0.92,0.96,1.0) * (core*2.4 + (hsp+vsp)*0.7) * bril;
  }
  return c;
}

float bayer(vec2 px){
  int x = int(mod(px.x,4.0)); int y = int(mod(px.y,4.0)); int idx = x + y*4;
  float m[16];
  m[0]=0.0;m[1]=8.0;m[2]=2.0;m[3]=10.0;m[4]=12.0;m[5]=4.0;m[6]=14.0;m[7]=6.0;
  m[8]=3.0;m[9]=11.0;m[10]=1.0;m[11]=9.0;m[12]=15.0;m[13]=7.0;m[14]=13.0;m[15]=5.0;
  float v=0.0; for(int k=0;k<16;k++){ if(k==idx) v=m[k]; }
  return v/16.0 - 0.5;
}

void main(){
  vec2 uv = vUv;
  aspect = uRes.x / max(uRes.y, 1.0);

  vec2 grid = vec2(uTiles, uTiles / aspect);
  vec2 cell = uv * grid;
  vec2 tileId = floor(cell);
  vec2 tileUv = fract(cell);
  vec2 tileCenter = (tileId + 0.5) / grid;

  // --- left→right sweep reveal ---
  // head travels 0 → (1 + trail + pause); a tile lights when the head reaches
  // its x, then fades over 'trail'. trail≈1 so the left edge goes dark exactly
  // as the head hits the right edge.
  float reveal;
  float front = 0.0;
  if (uReduced > 0.5){
    reveal = 0.9;
  } else {
    float speed = 0.135;          // cycle-units / second (slow)
    float trail = 1.0;
    float pause = 0.4;
    float cycle = 1.0 + trail + pause;
    float head = mod(uTime * speed, cycle);
    // organic waver so the front isn't a dead-straight line
    float fx = tileCenter.x + (fbm(vec2(tileCenter.y*5.0, 2.0)) - 0.5)*0.05;
    float d = head - fx;
    reveal = d >= 0.0 ? clamp(1.0 - d/trail, 0.0, 1.0) : 0.0;
    reveal = pow(reveal, 1.3);    // hold brightness then fall off
    front = smoothstep(0.045, 0.0, abs(d)); // bright advancing edge
    reveal = clamp(reveal + front*0.7, 0.0, 1.7);
  }

  vec3 target = cosmosTarget(tileCenter);
  vec3 stars = starLayer(tileCenter, tileId);

  // Nebula is hidden until the wave reveals it; stars persist faintly so the
  // wall is never fully dead. The advancing front gets a cool-white kick.
  vec3 col = target * reveal;
  col += stars * (0.10 + reveal*1.05);
  col += vec3(0.55,0.78,1.0) * front * 0.5;

  // Crisp dark gaps → reads as discrete lights. AA from grid/resolution.
  vec2 aa = grid / uRes * 1.3;
  float gap = 0.08;
  vec2 lo = smoothstep(gap - aa, gap + aa, tileUv);
  vec2 hi = smoothstep(gap - aa, gap + aa, 1.0 - tileUv);
  col *= mix(0.04, 1.0, lo.x*lo.y*hi.x*hi.y);

  // Headline legibility + focus vignette.
  col *= mix(0.14, 1.0, smoothstep(0.0, 0.44, uv.x));
  col *= mix(0.6, 1.0, smoothstep(1.3, 0.3, length((uv-0.5)*vec2(1.05,1.4))));

  // Tone-map + dither.
  col = col / (col + vec3(0.72));
  col *= 1.36;
  col += bayer(gl_FragCoord.xy) * (1.5/255.0);
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`;

export const cosmosVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
