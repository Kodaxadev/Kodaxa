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

// Heater-shield SDF (one continuous field, no waist seam). r = half width.
// Top at y=+top; flat shoulders + vertical upper sides; lower half is a smooth
// parabola-like taper to a point at y=-bot. Distance approximated from the
// boundary curve so a single stroke() gives a clean even outline.
float sdShield(vec2 p, float r){
  float top = 0.78 * r;     // shoulder height
  float bot = 1.18 * r;     // tip depth
  float x = abs(p.x);
  // Boundary half-width as a function of y:
  //  - above 0: vertical sides at x = r (flat top handled separately)
  //  - below 0: width eases to 0 at the tip via a smooth curve
  float wy;
  if(p.y >= 0.0){
    wy = r;
  } else {
    float t = clamp(-p.y / bot, 0.0, 1.0);    // 0 waist → 1 tip
    wy = r * sqrt(max(1.0 - t * t, 0.0));     // circular-ish ogee, smooth at waist
  }
  // signed distance: combine the side curve, the flat top, and the tip.
  float dSide = x - wy;                        // <0 inside horizontally
  float dTop  = p.y - top;                     // <0 below the top edge
  float dBot  = (-bot) - p.y;                  // <0 above the tip
  return max(max(dSide, dTop), dBot);
}

// ---------- FrontierWarden: proof-backed trust shield + gate + check ----------
// Trust + Reputation + Credit → a SHIELD (standing/protection) containing a
// GATE aperture (the allow/deny decision) and a VERIFIED check (proof-backed).
vec2 glyphFrontierWarden(vec2 p){
  float cov = 0.0;
  float acc = 0.0;

  float r = 0.36;
  // Single clean bold shield outline (no inner line — it read as a stray bar).
  cov = max(cov, stroke(sdShield(p, r), 0.016));

  // One bold verified check centred in the shield → proof-backed trust. The
  // check is the focal/energy element (cyan pulse). Sized to sit comfortably
  // inside the shield body with even margins.
  float c1 = sdSegment(p, vec2(-0.155, -0.05), vec2(-0.035, -0.19));
  float c2 = sdSegment(p, vec2(-0.035, -0.19), vec2(0.175, 0.13));
  acc = max(acc, stroke(min(c1, c2), 0.024));

  return vec2(clamp(cov, 0.0, 1.0), clamp(acc, 0.0, 1.0));
}

// Dispatch: id → glyph. Returns vec2(coverage, accent). id 0 = none.
vec2 glyphMask(int id, vec2 p){
  if(id == 1) return glyphFrontierWarden(p);
  return vec2(0.0);
}
`;
