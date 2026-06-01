// Procedural project glyphs for the ambient flip-dot boards.
//
// Each glyph is a bold, schematic SDF composition — NOT a detailed illustration
// — because flip-dot boards only read large silhouettes cleanly. glyph() maps a
// project id to a mask: returns vec2(coverage, accent) where coverage is 0..1
// "is this dot part of the glyph" and accent is 0..1 "is this a focal/energy
// part" (gets the cyan pulse, like the wolf's eye).
//
// Coordinates: p is centred (-0.5..0.5-ish) and aspect-corrected by the caller,
// so 1 unit ≈ canvas height. Line thickness ~0.012-0.02 reads as ~1-2 dots.
export const glyphsFrag = /* glsl */ `
// ---- SDF primitives (all return signed distance; <0 inside) ----
float sdCircle(vec2 p, float r){ return length(p) - r; }
float sdSegment(vec2 p, vec2 a, vec2 b){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
float sdHexagon(vec2 p, float r){
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p = abs(p);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}
// stroke an SDF into a 0..1 mask of given half-thickness
float stroke(float d, float t){ return 1.0 - smoothstep(t, t + 0.014, abs(d)); }
// fill an SDF (inside) into a 0..1 mask
float solid(float d){ return 1.0 - smoothstep(0.0, 0.014, d); }

// Composite a coloured body into an accumulating (rgb, lit) result, keeping the
// brightest contributor per dot (max over lit so nearer/brighter bodies win).
void put(inout vec4 dst, float m, vec3 col){
  if(m > dst.a){ dst = vec4(col, m); }
}

// ---------- FrontierWarden: living solar system + comets ----------
// FrontierWarden is the trust/credit core of an ecosystem: tools orbit it
// (planets) while intel/evidence streaks in as comets. Colour-aware: returns
// vec4(rgb, lit). Animated continuously via uTime.
vec4 glyphFrontierWardenColor(vec2 p){
  vec4 o = vec4(0.0);
  float t = uTime;

  // Faint dotted orbit rings (cool slate).
  put(o, stroke(sdCircle(p, 0.17), 0.006) * 0.30, vec3(0.40, 0.52, 0.66));
  put(o, stroke(sdCircle(p, 0.27), 0.006) * 0.26, vec3(0.40, 0.52, 0.66));
  put(o, stroke(sdCircle(p, 0.38), 0.006) * 0.22, vec3(0.40, 0.52, 0.66));

  // Burnt-red sun: dim ember corona + hot core, gently pulsing.
  float sunR = 0.052 + 0.006 * sin(t * 1.5);
  put(o, solid(sdCircle(p, sunR * 1.8)) * 0.55, vec3(0.55, 0.12, 0.05));   // corona
  put(o, solid(sdCircle(p, sunR)), vec3(1.05, 0.30, 0.12));                // burnt-red core

  // Planets — bolder, each its own colour.
  float a1 = t * 0.55;
  put(o, solid(sdCircle(p - vec2(cos(a1), sin(a1)) * 0.17, 0.028)), vec3(0.30, 0.80, 0.95)); // cyan
  float a2 = t * 0.34 + 2.1;
  vec2 pc2 = vec2(cos(a2), sin(a2)) * 0.27;
  put(o, solid(sdCircle(p - pc2, 0.034)), vec3(0.95, 0.62, 0.20));         // amber
  put(o, solid(sdCircle(p - pc2 - vec2(cos(t*2.2), sin(t*2.2)) * 0.06, 0.013)), vec3(0.80, 0.84, 0.92)); // moon
  float a3 = t * 0.22 + 4.0;
  put(o, solid(sdCircle(p - vec2(cos(a3), sin(a3)) * 0.38, 0.026)), vec3(0.62, 0.45, 0.95)); // violet

  // Comets — three, each a distinct colour, bright head + fading tail.
  vec3 cc[3];
  cc[0] = vec3(0.45, 0.85, 1.0);    // ice blue
  cc[1] = vec3(0.55, 1.0, 0.65);    // green
  cc[2] = vec3(1.0, 0.55, 0.85);    // magenta
  for(int i = 0; i < 3; i++){
    float fi = float(i);
    float ct = fract(t * (0.075 + fi * 0.018) + fi * 0.37);
    vec2 a = vec2(-1.3, 0.5 - fi * 0.42);
    vec2 b = vec2(1.3, -0.4 + fi * 0.36);
    vec2 head = mix(a, b, ct);
    vec2 dir = normalize(b - a);
    vec2 rel = p - head;
    float along = dot(rel, -dir);
    float perp = dot(rel, vec2(-dir.y, dir.x));
    float tail = step(0.0, along) * (1.0 - smoothstep(0.0, 0.5, along));
    tail *= 1.0 - smoothstep(0.0, 0.016 + along * 0.03, abs(perp));
    put(o, tail * 0.8, cc[i] * 0.85);
    put(o, solid(sdCircle(rel, 0.018)), cc[i] + 0.15);    // bright head
  }

  return o;
}

// ---------- Signal Vault: live spectrum analyzer ----------
// Field intelligence = a live signal. A row of frequency bars rises and falls
// (layered sines per bar) with a bright travelling cap; a faint baseline grid
// grounds it. Colour shifts cool→hot with amplitude.
vec4 glyphSignalVaultColor(vec2 p){
  vec4 o = vec4(0.0);
  float t = uTime;

  const int N = 13;              // number of bars
  float spanX = 0.86;           // total width
  float bw = spanX / float(N);  // bar pitch
  float halfBar = bw * 0.30;    // bar half-width (gap between bars)
  float baseY = -0.30;          // floor
  float maxH = 0.62;            // max bar height

  // Baseline grid line.
  put(o, stroke(p.y - baseY, 0.006) * 0.25 * step(abs(p.x), spanX*0.5), vec3(0.35,0.46,0.58));

  for(int i = 0; i < N; i++){
    float fi = float(i);
    float cx = -spanX*0.5 + bw*(fi + 0.5);
    // Per-bar amplitude from layered sines (pseudo spectrum).
    float a = 0.5
      + 0.30 * sin(t * (1.4 + fi*0.20) + fi*1.7)
      + 0.18 * sin(t * (2.7 - fi*0.11) + fi*0.6);
    a = clamp(a, 0.05, 1.0);
    float h = a * maxH;
    float topY = baseY + h;

    // Within this bar's column?
    float inCol = step(abs(p.x - cx), halfBar);
    // Filled column from base to top.
    float fill = inCol * step(baseY, p.y) * step(p.y, topY);
    // Colour: cool at the base → hot at the peak.
    vec3 lowC = vec3(0.22, 0.55, 0.85);
    vec3 hiC  = vec3(1.0, 0.45, 0.30);
    vec3 barC = mix(lowC, hiC, clamp((p.y - baseY)/maxH + a*0.25, 0.0, 1.0));
    put(o, fill * 0.85, barC);
    // Bright cap dot riding the top.
    put(o, inCol * (1.0 - smoothstep(0.0, halfBar*1.2, abs(p.y - topY))), mix(hiC, vec3(1.0,0.9,0.6), a));
  }

  return o;
}

// vec2 fallback (coverage, accent) — kept for non-coloured glyphs later.
vec2 glyphMask(int id, vec2 p){ return vec2(0.0); }

// Colour-aware dispatch: returns vec4(rgb, lit). id 0 = none.
vec4 glyphColor(int id, vec2 p){
  if(id == 1) return glyphFrontierWardenColor(p);
  if(id == 3) return glyphSignalVaultColor(p);
  return vec4(0.0);
}

// Does this glyph supply its own colour (use glyphColor, not the slate base)?
bool glyphColored(int id){ return id == 1 || id == 3; }
// Is this glyph an animated scene (shown continuously, no reveal sweep)?
bool glyphAnimated(int id){ return id == 1 || id == 3; }
`;
