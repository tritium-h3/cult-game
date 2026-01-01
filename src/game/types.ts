
interface Card {
  id: string;
  name: string;
  description: string;
  mechanicalDesc: string;
}

interface Spread {
  title: string;
  meaning: string;
  prompt: string;
  cards: Card[];
}

interface Narrative {
  narrative: string;
  gameState: GameState;
}

interface Leader {
  name: string;
  background: string;
  archetype: string;
  traits: string;
}

interface Artifact {
  name: string;
  description: string;
}

interface Discovery {
  type: string;
  artifact: Artifact;
  details: string;
}

interface Mystery {
  type: string;
  knownRituals: string[];
  paradigm: string;
}

interface Goal {
  type: string;
  description: string;
}

interface Follower {
  name: string;
  background: string;
  location: string;
  traits: string[];
  skills: string[];
}

interface GameState {
  leader: Leader;
  discovery: Discovery;
  mystery: Mystery;
  goal: Goal;
  followers: Follower[];
  hqLocation: string;
  week: number;
}
