export interface Card {
  id: string;
  name: string;
  description: string;
  mechanicalDesc: string;
}

export interface Spread {
  title: string;
  meaning: string;
  prompt: string;
  cards: Card[];
}

// ── Verb & hook-type system ────────────────────────────────────────────────

/** The five action verbs. Each follower has 2–3; each verb maps to one slot. */
export type Verb = 'Study' | 'Talk' | 'Explore' | 'Perform' | 'Work';

/** The five hook classification types (a hook can have multiple). */
export type HookType = 'person' | 'gathering' | 'institution' | 'site' | 'text';

/** Which hook types are compatible with each verb. */
export const VERB_COMPAT: Record<Verb, HookType[]> = {
  Study:   ['text', 'institution'],
  Talk:    ['person', 'gathering'],
  Explore: ['site', 'institution'],
  Perform: ['gathering', 'institution'],
  Work:    ['institution', 'person'],
};

/** True if the given verb can be used on a hook with those types. */
export function verbCompatible(verb: Verb, hookTypes: HookType[]): boolean {
  return hookTypes.some(t => VERB_COMPAT[verb].includes(t));
}

// ── Game character types ──────────────────────────────────────────────────

export interface Leader {
  name: string;
  background: string;
  archetype: string;
  traits: string;
  verbs: Verb[];
}

export interface Artifact {
  name: string;
  description: string;
}

export interface Discovery {
  type: string;
  artifact: Artifact;
  details: string;
}

export interface Mystery {
  type: string;
  knownRituals: string[];
  paradigm: string;
}

export interface Goal {
  type: string;
  description: string;
}

export interface Follower {
  id: string;
  name: string;
  background: string;
  location: string;
  traits: string[];
  /** 2–3 verbs; determines slot count and hook compatibility. */
  verbs: Verb[];
}

export interface City {
  id: string;
  name: string;
  flavor: string;
  faker: any;
  needs_transliteration?: boolean;
}

// ── World types (immutable, generated once per run) ────────────────────────

/** A single effect that fires when a follower engages with a WorldItem */
export type ItemEffect =
    | { type: 'GainTrait'; trait: string; description: string }
    | { type: 'AddFollower'; verbs: Verb[]; description: string }
    | { type: 'DiscoverItem'; itemId: string; cityId: string; description: string }
    | { type: 'NoEffect' };

/** A pre-generated discoverable hook that exists in the world */
export interface WorldItem {
    id: string;
    cityId: string;
    /** One or more hook classifications; determines verb compatibility. */
    types: HookType[];
    name: string;
    flavorDescription: string;
    /** If true, visible at city entry without prior discovery. */
    starterHook: boolean;
    effects: ItemEffect[];
}

/** The immutable world — generated once at game start */
export interface WorldState {
    cities: string[];
    items: Record<string, WorldItem[]>;      // cityId -> WorldItem[]
}

export interface GameState {
  cultName: string;
  leader: Leader;
  discovery: Discovery;
  mystery: Mystery;
  goal: Goal;
  followers: Follower[];
  hqLocation: string;
  week: number;
  /** cityId → [worldItemId, ...] — non-starter items the cult has discovered */
  discoveredItems: Record<string, string[]>;
}

export interface Action {
    id: string;
    title: string;
    description: string;
    types?: HookType[];
    outcomes: Outcome[];
}

export interface Outcome {
    id: string;
    odds(follower: Follower, gameState: GameState): number;
    enact(follower: Follower, gameState: GameState): void;
    getDescription(follower: Follower): string;
}

export type ActionMap = Record<string, Action[]>;

/** Client-safe action (no function-bearing Outcome objects). */
export interface ClientAction {
  id: string;
  title: string;
  description: string;
  types?: HookType[];
}

/** GameState as delivered to the client: includes a derived action map. */
export type ClientGameState = GameState & {
  map?: Record<string, ClientAction[]>;
};
