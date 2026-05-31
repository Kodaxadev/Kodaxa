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

// ---------- FrontierWarden: trust hexagon + gate + evidence path ----------
vec2 glyphFrontierWarden(vec2 p){
  float cov = 0.0;
  float acc = 0.0;

  // Outer trust hexagon (the bound policy boundary)
  float hex = sdHexagon(p, 0.34);
  cov = max(cov, stroke(hex, 0.012));
  // Inner concentric hex (nested authority)
  cov = max(cov, stroke(sdHexagon(p, 0.22), 0.009));

  // The gate: a vertical aperture at the hexagon's centre-right edge.
  float gate = sdSegment(p, vec2(0.34, -0.12), vec2(0.34, 0.12));
  acc = max(acc, stroke(gate, 0.02));   // gate is the focal/energy element

  // Evidence path: nodes feeding left→through→out the gate.
  vec2 nodes[4];
  nodes[0] = vec2(-0.30, 0.0);
  nodes[1] = vec2(-0.12, 0.10);
  nodes[2] = vec2(0.06, -0.06);
  nodes[3] = vec2(0.22, 0.04);
  for(int i = 0; i < 3; i++){
    cov = max(cov, stroke(sdSegment(p, nodes[i], nodes[i+1]), 0.007));
  }
  for(int i = 0; i < 4; i++){
    float nd = sdCircle(p - nodes[i], 0.028);
    cov = max(cov, solid(nd));
    if(i == 3) acc = max(acc, solid(nd)); // last node = verified, glows
  }
  // path continues out through the gate
  cov = max(cov, stroke(sdSegment(p, nodes[3], vec2(0.34, 0.0)), 0.007));

  return vec2(clamp(cov, 0.0, 1.0), clamp(acc, 0.0, 1.0));
}

// Dispatch: id → glyph. Returns vec2(coverage, accent). id 0 = none.
vec2 glyphMask(int id, vec2 p){
  if(id == 1) return glyphFrontierWarden(p);
  return vec2(0.0);
}
`;
