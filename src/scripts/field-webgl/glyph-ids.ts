// Maps a glyph key → shader id (must match the dispatch in glyphs.frag.ts).
// 0 = no glyph (hero wolf texture). Used by EvidenceField (Astro) and runtime.
export const GLYPH_IDS: Record<string, number> = {
  // generic systems/archive glyph (work index, 404)
  archive: 2,
  // per-project (case studies) — project id → glyph
  frontierwarden: 1,
  'signal-vault': 3,
  'ef-atlas': 4,
  'code-warden': 5,
  step: 6,
  rowdiff: 7,
  chronosmcp: 8,
  'task-anchor': 9,
  'agency-terminal': 10,
};

// Glyph ids that actually have a built scene in glyphs.frag.ts. Unbuilt ids
// fall back to 0 (the wolf ambient) so no page shows a blank panel. Add an id
// here when its scene ships.
const BUILT_GLYPHS = new Set<number>([1, 3]); // FrontierWarden, Signal Vault

export const glyphId = (key: string | null | undefined): number => {
  const id = (key && GLYPH_IDS[key]) || 0;
  return BUILT_GLYPHS.has(id) ? id : 0;
};
