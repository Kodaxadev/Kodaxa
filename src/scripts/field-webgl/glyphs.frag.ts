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

// ---------- FrontierWarden: evidence gate ----------
// The project EVALUATES and EXPOSES evidence; operators retain control. So the
// mark is an open hexagonal GATE (capability object) with EVIDENCE nodes
// feeding in from the left, one bright VERIFIED PATH through it (the focal
// accent), and a separated tenant POLICY KEY at the lower right — not a shield
// or lock (those imply centralized pass/fail authority).
vec2 glyphFrontierWarden(vec2 p){
  float cov = 0.0;
  float acc = 0.0;

  // Center: large open hexagon gate (flat-top), bold outline. Shifted slightly
  // right to leave room for the evidence feed on the left.
  vec2 hp = p - vec2(0.05, 0.02);
  float hex = sdHexagon(hp.yx, 0.30);         // .yx → flat-top gate aperture
  cov = max(cov, stroke(hex, 0.016));

  // Left: three evidence nodes + connectors feeding toward the gate's left face.
  vec2 ev[3];
  ev[0] = vec2(-0.46, 0.13);
  ev[1] = vec2(-0.46, 0.00);
  ev[2] = vec2(-0.46, -0.13);
  for(int i = 0; i < 3; i++){
    cov = max(cov, solid(sdCircle(p - ev[i], 0.025)));
    cov = max(cov, stroke(sdSegment(p, ev[i] + vec2(0.03, 0.0), vec2(-0.22, ev[i].y * 0.4)), 0.008));
  }

  // Inside: one bright verified path THROUGH the gate (enters left, exits right
  // to a verified terminus just outside the far face). The focal accent.
  float pth = min(
    sdSegment(p, vec2(-0.20, 0.0), vec2(0.05, 0.06)),
    sdSegment(p, vec2(0.05, 0.06), vec2(0.33, -0.04))
  );
  acc = max(acc, stroke(pth, 0.016));
  acc = max(acc, solid(sdCircle(p - vec2(0.34, -0.05), 0.030)));  // verified terminus

  // Lower right: separated tenant policy key — a small ring + stem held apart
  // from the gate, signalling operator-owned control (not central authority).
  cov = max(cov, stroke(sdCircle(p - vec2(0.20, -0.34), 0.045), 0.011));   // key bow (ring)
  cov = max(cov, stroke(sdSegment(p, vec2(0.245, -0.34), vec2(0.40, -0.34)), 0.011)); // shaft
  cov = max(cov, stroke(sdSegment(p, vec2(0.38, -0.34), vec2(0.38, -0.27)), 0.011));  // bit

  return vec2(clamp(cov, 0.0, 1.0), clamp(acc, 0.0, 1.0));
}

// Dispatch: id → glyph. Returns vec2(coverage, accent). id 0 = none.
vec2 glyphMask(int id, vec2 p){
  if(id == 1) return glyphFrontierWarden(p);
  return vec2(0.0);
}
`;
