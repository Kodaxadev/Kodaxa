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

// Shield SDF: a crest — flat top, straight sides, curving to a point. r = half
// width, the body runs roughly y∈[-1.15r, 0.95r].
float sdShield(vec2 p, float r){
  float top = 0.95 * r;
  float d;
  if(p.y > 0.0){
    // upper body: rounded rectangle-ish (flat shoulders)
    vec2 q = abs(vec2(p.x, p.y)) - vec2(r, top);
    d = min(max(q.x, q.y), 0.0) + length(max(q, 0.0));
  } else {
    // lower body tapers to a point at y = -1.15r
    float tip = -1.15 * r;
    float t = clamp(p.y / tip, 0.0, 1.0);     // 0 at waist → 1 at tip
    float halfW = r * (1.0 - t * t);          // width shrinks toward the point
    d = abs(p.x) - halfW;
    d = max(d, p.y - 0.0);
    d = max(d, tip - p.y);
  }
  return d;
}

// ---------- FrontierWarden: proof-backed trust shield + gate + check ----------
// Trust + Reputation + Credit → a SHIELD (standing/protection) containing a
// GATE aperture (the allow/deny decision) and a VERIFIED check (proof-backed).
vec2 glyphFrontierWarden(vec2 p){
  float cov = 0.0;
  float acc = 0.0;

  float r = 0.34;
  float sh = sdShield(p, r);
  // Shield outline (bold) + a faint inner outline for depth.
  cov = max(cov, stroke(sh, 0.015));
  cov = max(cov, stroke(sdShield(p, r * 0.80), 0.008) * 0.65);

  // One bold verified check centred in the shield → proof-backed trust. Kept
  // simple (no gate posts) so it reads unmistakably at dot resolution. The
  // check is the focal/energy element (cyan pulse).
  float c1 = sdSegment(p, vec2(-0.15, -0.04), vec2(-0.02, -0.20));
  float c2 = sdSegment(p, vec2(-0.02, -0.20), vec2(0.18, 0.16));
  acc = max(acc, stroke(min(c1, c2), 0.026));

  return vec2(clamp(cov, 0.0, 1.0), clamp(acc, 0.0, 1.0));
}

// Dispatch: id → glyph. Returns vec2(coverage, accent). id 0 = none.
vec2 glyphMask(int id, vec2 p){
  if(id == 1) return glyphFrontierWarden(p);
  return vec2(0.0);
}
`;
