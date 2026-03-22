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

export interface Leader {
  name: string;
  background: string;
  archetype: string;
  traits: string;
  skills: string[];
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

export type SkillClass = "social" | "intellectual" | "physical" | "practical";
export type HookItemType = 'site' | 'book' | 'patron' | 'artifact';

// ── World types (immutable, generated once per run) ────────────────────────

/** A single effect that fires when a follower uses a discovered WorldItem */
export type ItemEffect =
    | { type: 'GainSkill'; skill: string; description: string }
    | { type: 'GainTrait'; trait: string; description: string }
    | { type: 'AddFollower'; skills: string[]; description: string }
    | { type: 'DiscoverItem'; itemId: string; cityId: string; description: string }
    | { type: 'NoEffect' };

/** A pre-generated discoverable thing that exists in the world */
export interface WorldItem {
    id: string;           // e.g. "prague-book-0"
    cityId: string;
    type: HookItemType;
    name: string;         // Faker-generated
    flavorDescription: string;  // LLM-generated, empty until populated
    discoveredBy: string; // action id that reveals this (e.g. 'research-at-libraries')
    effects: ItemEffect[];
}

/** The immutable world — generated once at game start */
export interface WorldState {
    cities: string[];                        // active city IDs for this run
    items: Record<string, WorldItem[]>;      // cityId -> WorldItem[]
}

export interface Skill {
  id: string;
  type: SkillClass;
  name: string;
  description: string;
}

export interface Follower {
  id: string;
  name: string;
  background: string;
  location: string;
  traits: string[];
  skills: string[];
  slots: number;
}

export interface City {
  id: string;
  name: string;
  flavor: string;
  faker: any;
  needs_transliteration?: boolean;
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
  /** cityId → [worldItemId, ...] — what the cult has discovered so far */
  discoveredItems: Record<string, string[]>;
}

export interface Action {
    id: string;
    title: string;
    description: string;
    type?: HookItemType;
    outcomes: Outcome[];
}

export interface Outcome {
    id: string;
    odds(follower: Follower, gameState: GameState): number;
    enact(follower: Follower, gameState: GameState): void;
    getDescription(follower: Follower): string;
}

export type ActionMap = Record<string, Action[]>;

/** Client-safe action (no function-bearing Outcome objects).
 *  Matches what the server sends in map values and WEEK_RESULTS. */
export interface ClientAction {
  id: string;
  title: string;
  description: string;
  type?: HookItemType;
}

/** GameState as delivered to the client: includes a derived action map.
 *  The map is never stored — it is built by the server on every response. */
export type ClientGameState = GameState & {
  map?: Record<string, ClientAction[]>;
};
