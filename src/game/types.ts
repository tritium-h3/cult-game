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
  skills: string[];
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

export class Action {
    id: string;
    title: string;
    outcomes: Outcome[];
    description: string;

    constructor(id: string, title: string, description: string) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.outcomes = [];
    }

    addOutcome(outcome: Outcome) {
        this.outcomes.push(outcome);
        return this; // for chaining
    }

    serialize(): any {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            outcomes: this.outcomes.map(o => o.serialize())
        };
    }

    static deserialize(data: any): Action {
        const action = new Action(data.id, data.title, data.description);
        for (const outcomeData of data.outcomes) {
            action.addOutcome(Outcome.deserialize(outcomeData));
        }
        return action;
    }
}

export class Outcome {
    id: string;

    constructor(id: string) {
        this.id = id;
    }

    // Placeholder method, to be overridden
    odds(follower: Follower): number {
        return 1;
    }

    enact(follower: Follower, gameState: GameState): void {
        // To be implemented in subclasses
    }

    getDescription(): string {
        return "";
    }

    // To be overridden in subclasses
    serialize(): any {
        throw new Error("serialize() must be implemented in subclass");
    }

    // Static dispatcher for deserialization
    static deserialize(data: any): Outcome {
        // This will be called from actions.ts where subclasses are defined
        throw new Error("Outcome.deserialize() should be overridden in actions.ts");
    }
}

export type ActionMap = Record<string, Action[]>;
