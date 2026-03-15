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
  map?: ActionMap;
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
