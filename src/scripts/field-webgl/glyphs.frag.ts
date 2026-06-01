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

// ---------- FrontierWarden: living solar system + comets ----------
// FrontierWarden is the trust/credit core of an ecosystem: tools orbit it
// (planets) while intel/evidence streaks in as comets. Animated continuously
// via uTime (the dotboard shows this glyph without the reveal sweep).
// Returns vec2(coverage, accent): accent = bright bodies (sun core, comet
// heads) that pulse; coverage = dimmer bodies, orbits, comet tails.
vec2 glyphFrontierWarden(vec2 p){
  float cov = 0.0;
  float acc = 0.0;
  float t = uTime;

  // Sun: pulsing core + dim corona at centre.
  float sunR = 0.05 + 0.006 * sin(t * 1.5);
  acc = max(acc, solid(sdCircle(p, sunR)));
  cov = max(cov, solid(sdCircle(p, sunR * 1.7)) * 0.55);

  // Faint dotted orbit rings.
  cov = max(cov, stroke(sdCircle(p, 0.17), 0.006) * 0.30);
  cov = max(cov, stroke(sdCircle(p, 0.27), 0.006) * 0.26);
  cov = max(cov, stroke(sdCircle(p, 0.38), 0.006) * 0.22);

  // Planets orbiting (different radii, speeds, phases).
  float a1 = t * 0.55;
  cov = max(cov, solid(sdCircle(p - vec2(cos(a1), sin(a1)) * 0.17, 0.020)));
  float a2 = t * 0.34 + 2.1;
  vec2 pc2 = vec2(cos(a2), sin(a2)) * 0.27;
  cov = max(cov, solid(sdCircle(p - pc2, 0.024)));
  // a moon on planet 2
  cov = max(cov, solid(sdCircle(p - pc2 - vec2(cos(t * 2.2), sin(t * 2.2)) * 0.055, 0.010)));
  float a3 = t * 0.22 + 4.0;
  cov = max(cov, solid(sdCircle(p - vec2(cos(a3), sin(a3)) * 0.38, 0.018)));

  // Comets streaking across the field (bright head = accent, fading tail = cov).
  for(int i = 0; i < 2; i++){
    float fi = float(i);
    float ct = fract(t * (0.075 + fi * 0.02) + fi * 0.55);
    vec2 a = vec2(-1.3, 0.46 - fi * 0.55);
    vec2 b = vec2(1.3, -0.34 + fi * 0.42);
    vec2 head = mix(a, b, ct);
    vec2 dir = normalize(b - a);
    vec2 rel = p - head;
    float along = dot(rel, -dir);                       // distance behind head
    float perp = dot(rel, vec2(-dir.y, dir.x));
    float tail = step(0.0, along) * (1.0 - smoothstep(0.0, 0.45, along));
    tail *= 1.0 - smoothstep(0.0, 0.016 + along * 0.03, abs(perp));
    cov = max(cov, tail * 0.85);
    acc = max(acc, solid(sdCircle(rel, 0.017)));        // bright comet head
  }

  return vec2(clamp(cov, 0.0, 1.0), clamp(acc, 0.0, 1.0));
}

// Dispatch: id → glyph. Returns vec2(coverage, accent). id 0 = none.
vec2 glyphMask(int id, vec2 p){
  if(id == 1) return glyphFrontierWarden(p);
  return vec2(0.0);
}

// Is this glyph an animated scene (shown continuously, no reveal sweep)?
bool glyphAnimated(int id){ return id == 1; }
`;
