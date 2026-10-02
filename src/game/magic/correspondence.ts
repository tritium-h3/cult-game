/**
 * correspondence.ts — Correspondence grammar for the magic system.
 *
 * GRAMMAR SUMMARY
 *   Every WorldItem is secretly assigned 0–2 aspects from a set of opposing
 *   pairs (e.g. Hollow / Full).  When items are placed together on the ritual
 *   table, pairs of items are evaluated:
 *     - Shared aspect on both items  → RESONANCE
 *     - One item has a pole, the other has the opposing pole → RUPTURE
 *     - No relationship → INERT
 *
 * ITERATION WORKFLOW
 *   All tunable numbers live in the CONSTANTS section at the top of this file.
 *   Tweak them, save, and the server hot-reloads.  Refresh /magic to see the effect.
 */

import type { WorldItem } from '../types';
import type {
  AspectPair,
  CorrespondenceParams,
  PairResult,
  ResonanceType,
} from './types';

// ── CONSTANTS (tweak freely) ───────────────────────────────────────────────

/**
 * The full vocabulary of opposing aspect pairs.
 * World-gen picks ACTIVE_PAIR_COUNT of these per playthrough.
 */
export const ASPECT_VOCABULARY: AspectPair[] = [
  ['Hollow', 'Full'],
  ['Bound', 'Free'],
  ['Severed', 'Witnessed'],
  ['Ancient', 'Newborn'],
  ['Burning', 'Drowned'],
  ['Named', 'Forgotten'],
  ['Dreaming', 'Waking'],
  ['Marked', 'Unseen'],
];

/** How many opposing pairs are active in a single playthrough. */
const ACTIVE_PAIR_COUNT = 3;

/**
 * Approximate fraction of items that receive at least one aspect.
 * 0.5 = roughly half the items have an aspect; the rest are inert.
 */
const ASPECT_COVERAGE = 0.5;

/**
 * Probability that an item with one aspect also gets a second aspect.
 * Kept low so single-aspect items are the norm.
 */
const DOUBLE_ASPECT_CHANCE = 0.2;

// ── Description templates ──────────────────────────────────────────────────
// Player-facing (no aspect names revealed).

const RESONANCE_DESCRIPTIONS = [
  'Something stirs between them. The air grows heavy with recognition.',
  'A current passes between the two. Neither is unchanged.',
  'They answer each other — call and response from across a great distance.',
  'The space between them thickens. Something is listening.',
  'A correspondence. Not coincidence — something older than coincidence.',
];

const RUPTURE_DESCRIPTIONS = [
  'They resist each other. The table trembles with the effort of keeping them apart.',
  'A wrongness spreads from the gap between them. Not dangerous — yet.',
  'Opposition. One pushes where the other pulls. The ritual space destabilises.',
  'The air between them goes cold. Something is offended by the pairing.',
  'They cancel. Where there should be power, there is only a sound at the edge of hearing.',
];

const INERT_DESCRIPTIONS = [
  'Nothing. The items sit alongside each other without comment.',
  'No connection surfaces. They are strangers to each other.',
  'Silence.',
];

// ── Helpers ────────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Core generation ────────────────────────────────────────────────────────

/**
 * Generates the Correspondence parameters for a set of world items.
 * Call once at world-gen time; store the result in MagicWorldState.
 */
export function generateCorrespondenceParams(items: WorldItem[]): CorrespondenceParams {
  // Pick ACTIVE_PAIR_COUNT pairs from the vocabulary
  const activePairs: AspectPair[] = shuffle(ASPECT_VOCABULARY).slice(0, ACTIVE_PAIR_COUNT);
  const activeAspects: string[] = activePairs.flat();

  console.log('[magic/correspondence] Active pairs:', activePairs.map(p => p.join('/')).join(', '));

  // Assign aspects to items
  const itemAspects: Record<string, string[]> = {};
  const shuffledItems = shuffle(items);
  const targetCount = Math.round(items.length * ASPECT_COVERAGE);

  shuffledItems.slice(0, targetCount).forEach(item => {
    const aspect = pick(activeAspects);
    const aspects: string[] = [aspect];
    if (Math.random() < DOUBLE_ASPECT_CHANCE) {
      // Pick a second aspect from a different pair than the first
      const otherAspects = activeAspects.filter(a => {
        const pair = activePairs.find(p => p.includes(a));
        return pair && !pair.includes(aspect);
      });
      if (otherAspects.length > 0) aspects.push(pick(otherAspects));
    }
    itemAspects[item.id] = aspects;
    console.log(`[magic/correspondence]   ${item.name} (${item.id}) → [${aspects.join(', ')}]`);
  });

  return { activePairs, activeAspects, itemAspects };
}

// ── Resolution ─────────────────────────────────────────────────────────────

/**
 * Evaluates the relationship between two items placed on the ritual table.
 * Pure function — no side effects.
 */
export function resolvePair(
  itemIdA: string,
  itemIdB: string,
  params: CorrespondenceParams,
): PairResult {
  const aspectsA = params.itemAspects[itemIdA] ?? [];
  const aspectsB = params.itemAspects[itemIdB] ?? [];

  // Check resonance: shared aspect
  const sharedAspects = aspectsA.filter(a => aspectsB.includes(a));
  if (sharedAspects.length > 0) {
    return {
      itemIdA,
      itemIdB,
      type: 'resonance',
      sharedAspects,
      opposingPairs: [],
      description: pick(RESONANCE_DESCRIPTIONS),
    };
  }

  // Check rupture: A has one pole, B has the opposing pole
  const opposingPairs: AspectPair[] = [];
  for (const pair of params.activePairs) {
    const aHasFirst  = aspectsA.includes(pair[0]);
    const aHasSecond = aspectsA.includes(pair[1]);
    const bHasFirst  = aspectsB.includes(pair[0]);
    const bHasSecond = aspectsB.includes(pair[1]);
    if ((aHasFirst && bHasSecond) || (aHasSecond && bHasFirst)) {
      opposingPairs.push(pair);
    }
  }
  if (opposingPairs.length > 0) {
    return {
      itemIdA,
      itemIdB,
      type: 'rupture',
      sharedAspects: [],
      opposingPairs,
      description: pick(RUPTURE_DESCRIPTIONS),
    };
  }

  // Inert
  return {
    itemIdA,
    itemIdB,
    type: 'inert',
    sharedAspects: [],
    opposingPairs: [],
    description: pick(INERT_DESCRIPTIONS),
  };
}

/**
 * Evaluates all unique pairs among the given item IDs on the ritual table.
 * Filters out inert pairs so the result list only contains meaningful events.
 */
export function resolveRitualArea(
  itemIds: string[],
  params: CorrespondenceParams,
): PairResult[] {
  const results: PairResult[] = [];
  for (let i = 0; i < itemIds.length; i++) {
    for (let j = i + 1; j < itemIds.length; j++) {
      const r = resolvePair(itemIds[i], itemIds[j], params);
      if (r.type !== 'inert') results.push(r);
    }
  }
  return results;
}

/**
 * Returns ALL pairs (including inert) — used by the cheat overlay.
 */
export function resolveRitualAreaAll(
  itemIds: string[],
  params: CorrespondenceParams,
): PairResult[] {
  const results: PairResult[] = [];
  for (let i = 0; i < itemIds.length; i++) {
    for (let j = i + 1; j < itemIds.length; j++) {
      results.push(resolvePair(itemIds[i], itemIds[j], params));
    }
  }
  return results;
}
