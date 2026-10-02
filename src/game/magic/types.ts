// ── Magic system types ─────────────────────────────────────────────────────
//
// These types are shared between the server (grammar logic, worldgen) and the
// client (second table UI, cheat overlay). No function-bearing fields here —
// everything in this file is JSON-serialisable.

/** Names of the available grammar options.  Add new entries as grammars are built. */
export type GrammarName = 'correspondence';

// ── Correspondence ─────────────────────────────────────────────────────────

/**
 * A pair of opposing aspects, e.g. ['Hollow', 'Full'].
 * Items assigned either pole of the pair are in opposition to each other.
 */
export type AspectPair = [string, string];

/**
 * The generated parameters for a single Correspondence-grammar playthrough.
 *
 * activePairs   — the 3 (or so) pairs that are "in play" this world.
 * activeAspects — flat list of all aspect names in play (both poles of every pair).
 * itemAspects   — maps item id → list of aspect names assigned to that item.
 *                 Items with no entry have no aspects (they are inert on the second table).
 */
export interface CorrespondenceParams {
  activePairs: AspectPair[];
  activeAspects: string[];
  itemAspects: Record<string, string[]>;
}

// ── MagicWorldState (discriminated union — grows as grammars are added) ────

export type MagicWorldState =
  | { grammar: 'correspondence'; params: CorrespondenceParams };

// ── Resolution types ───────────────────────────────────────────────────────

/** The three outcomes when two items are placed together on the ritual table. */
export type ResonanceType = 'resonance' | 'rupture' | 'inert';

/**
 * The result of evaluating a single pair of items on the ritual table.
 *
 * type          — resonance | rupture | inert
 * sharedAspects — aspects both items share (non-empty only when type='resonance')
 * opposingPairs — pairs where A has one pole and B has the other (non-empty when type='rupture')
 * description   — player-facing description (no aspects revealed)
 */
export interface PairResult {
  itemIdA: string;
  itemIdB: string;
  type: ResonanceType;
  sharedAspects: string[];
  opposingPairs: AspectPair[];
  description: string;
}
