import { Outcome, Follower, GameState, City, Action, ActionMap } from "./types";
import { getCityById } from "./world";

function researchAction(city: City): Action {
    return new Action("research", "Research", `Search for obscure knowledge in ${city.name}'s public archives and university collections.`)
        .addOutcome(new KnowledgeOutcome(city.id))
        .addOutcome(new NoOutcome());
}

function attendCulturalEventAction(city: City): Action {
    return new Action("culture", "Attend Cultural Event", `Mingle with ${city.name}'s cultural elite at local events. Some may have connections to secret things.`)
        .addOutcome(new InvitedToPerformOutcome(city.id))
        .addOutcome(new NoOutcome());
}

function exploreHistoricSitesAction(city: City): Action {
    return new Action("explore", "Explore Historic Sites", `Visit ${city.name}'s sites, cemeteries, forgotten places. Something may be hidden there.`)
        .addOutcome(new MagicalSiteFoundOutcome(city.id))
        .addOutcome(new NoOutcome());
}

function performInCityAction(city: City) : Action {
    return new Action("perform", "Perform", `Showcase your artistic talents to ${city.name}'s elite audiences.`)
        .addOutcome(new NoOutcome());
}

class NoOutcome extends Outcome {
    constructor() {
        super("no-outcome");
    }

    odds(follower: Follower): number {
        return 1;
    }

    enact(follower: Follower, gameState: GameState): void {
        // No effect
    }

    getDescription(): string {
        return "Nothing of note happens.";
    }

    serialize(): any {
        return { type: 'NoOutcome' };
    }

    static deserialize(data: any): NoOutcome {
        return new NoOutcome();
    }
}

class KnowledgeOutcome extends Outcome {
    readonly city: string;

    constructor(city: string) {
        super(`knowledge-${city}`);
        this.city = city;
    }

    odds(follower: Follower): number {
        return 1;
    }

    enact(follower: Follower, gameState: GameState): void {
        // Implement knowledge gain logic here
    }

    getDescription(): string {
        return `The follower uncovers hidden knowledge.`;
    }

    serialize(): any {
        return { type: 'KnowledgeOutcome', city: this.city };
    }

    static deserialize(data: any): KnowledgeOutcome {
        return new KnowledgeOutcome(data.city);
    }
}

class InvitedToPerformOutcome extends Outcome {
    readonly city: string;

    constructor(city: string) {
        super(`invited-to-perform-${city}`);
        this.city = city;
    }

    odds(follower: Follower): number {
        return 1;
    }

    enact(follower: Follower, gameState: GameState): void {
        if (gameState.map) {
            gameState.map[this.city].push(performInCityAction(getCityById(this.city)!));
        }
    }

    getDescription(): string {
        return `The follower is invited to perform.`;
    }

    serialize(): any {
        return { type: 'InvitedToPerformOutcome', city: this.city };
    }

    static deserialize(data: any): InvitedToPerformOutcome {
        return new InvitedToPerformOutcome(data.city);
    }
}

class MagicalSiteFoundOutcome extends Outcome {
    readonly city: string;

    constructor(city: string) {
        super(`magical-site-found-${city}`);
        this.city = city;
    }

    odds(follower: Follower): number {
        return 1;
    }

    enact(follower: Follower, gameState: GameState): void {
        // Implement magical site discovery logic here
    }

    getDescription(): string {
        return `The follower discovers a magical site.`;
    }

    serialize(): any {
        return { type: 'MagicalSiteFoundOutcome', city: this.city };
    }

    static deserialize(data: any): MagicalSiteFoundOutcome {
        return new MagicalSiteFoundOutcome(data.city);
    }
}

// Override the base Outcome.deserialize to dispatch to the correct subclass
Outcome.deserialize = function(data: any): Outcome {
    switch (data.type) {
        case 'NoOutcome':
            return NoOutcome.deserialize(data);
        case 'KnowledgeOutcome':
            return KnowledgeOutcome.deserialize(data);
        case 'InvitedToPerformOutcome':
            return InvitedToPerformOutcome.deserialize(data);
        case 'MagicalSiteFoundOutcome':
            return MagicalSiteFoundOutcome.deserialize(data);
        default:
            throw new Error(`Unknown outcome type: ${data.type}`);
    }
};

export function prototypeActionsForCity(city: City): Action[] {
    return [
        new Action("research", "Research", `Search for obscure knowledge in ${city.name}'s public archives and university collections.`)
            .addOutcome(new KnowledgeOutcome(city.id))
            .addOutcome(new NoOutcome()),
        new Action("culture", "Attend Cultural Event", `Mingle with ${city.name}'s cultural elite at local events. Some may have connections to secret things.`)
            .addOutcome(new InvitedToPerformOutcome(city.id))
            .addOutcome(new NoOutcome()),
        new Action("explore", "Explore Historic Sites", `Visit ${city.name}'s sites, cemeteries, forgotten places. Something may be hidden there.`)
            .addOutcome(new MagicalSiteFoundOutcome(city.id))
            .addOutcome(new NoOutcome()),
    ];
}

export function performAction(action: Action, follower: Follower): Outcome {
    // Calculate total odds
    const totalOdds = action.outcomes.reduce((sum, outcome) => sum + outcome.odds(follower), 0);
    const rand = Math.random() * totalOdds;
    let cumulative = 0;

    for (const outcome of action.outcomes) {
        cumulative += outcome.odds(follower);
        if (rand <= cumulative) {
            return outcome;
        }
    }
    throw new Error("No outcome selected, this should not happen.");
}

export function performCityActions(assignments: { [actionId: string]: string }, actions: Action[], gameState: GameState) : { [actionId: string]: Outcome } {
    const results: { [actionId: string]: Outcome } = {};
    for (const [actionId, followerId] of Object.entries(assignments)) {
        const action = actions.find(a => a.id === actionId);
        if (!action) {
            throw new Error(`Action with id ${actionId} not found in action map.`);
        }
        const follower = gameState.followers.find(f => f.id === followerId);
        if (!follower) {
            throw new Error(`Follower with id ${followerId} not found in game state.`);
        }
        const outcome = performAction(action, follower);
        results[actionId] = outcome;
    }
    return results;
}

export function enactCityActions(assignments: { [actionId: string]: string }, results: { [actionId: string]: Outcome }, gameState: GameState): void {
    for (const [actionId, outcome] of Object.entries(results)) {
        const followerId = assignments[actionId];
        if (!followerId) {
            throw new Error(`No follower assigned to action ${actionId}.`);
        }
        const follower = gameState.followers.find(f => f.id === followerId);
        if (!follower) {
            throw new Error(`Follower with id ${followerId} not found in game state.`);
        }
        outcome.enact(follower, gameState);
    }
}

// Serialization support for ActionMap
export function serializeActionMap(map: ActionMap): string {
    const serialized: Record<string, any[]> = {};
    for (const [cityId, actions] of Object.entries(map)) {
        serialized[cityId] = actions.map(action => action.serialize());
    }
    return JSON.stringify(serialized);
}

export function deserializeActionMap(json: string): ActionMap {
    const parsed: Record<string, any[]> = JSON.parse(json);
    const map: ActionMap = {};
    for (const [cityId, serializedActions] of Object.entries(parsed)) {
        map[cityId] = serializedActions.map(data => Action.deserialize(data));
    }
    return map;
}