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

export const glyphId = (key: string | null | undefined): number =>
  (key && GLYPH_IDS[key]) || 0;
