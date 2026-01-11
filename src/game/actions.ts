import { Outcome, Follower, GameState, City, Action, ActionMap } from "./types";
import { getCityById } from "./world";

// Outcome types for serialization
type OutcomeData = 
    | { type: 'NoOutcome' }
    | { type: 'KnowledgeOutcome'; city: string }
    | { type: 'InvitedToPerformOutcome'; city: string }
    | { type: 'MagicalSiteFoundOutcome'; city: string };

interface OutcomeWithData extends Outcome {
    _data: OutcomeData;
}

// Outcome factory functions - easy to define, easy to serialize
const outcomes = {
    noOutcome: (): OutcomeWithData => ({
        id: "no-outcome",
        odds: () => 1,
        enact: () => {},
        getDescription: (_follower: Follower) => "Nothing of note happens.",
        _data: { type: 'NoOutcome' }
    }),

    knowledge: (city: string): OutcomeWithData => ({
        id: `knowledge-${city}`,
        odds: () => 1,
        enact: () => {
            // Implement knowledge gain logic here
        },
        getDescription: (_follower: Follower) => `${_follower.name} uncovers hidden knowledge.`,
        _data: { type: 'KnowledgeOutcome', city }
    }),

    invitedToPerform: (city: string): OutcomeWithData => ({
        id: `invited-to-perform-${city}`,
        odds: () => 1,
        enact: (_follower: Follower, gameState: GameState) => {
            if (gameState.map) {
                gameState.map[city].push(actions.perform(getCityById(city)!));
            }
        },
        getDescription: (_follower: Follower) => `${_follower.name} is invited to perform.`,
        _data: { type: 'InvitedToPerformOutcome', city }
    }),

    magicalSiteFound: (city: string): OutcomeWithData => ({
        id: `magical-site-found-${city}`,
        odds: () => 1,
        enact: () => {
            // Implement magical site discovery logic here
        },
        getDescription: (_follower: Follower) => `${_follower.name} discovers a magical site.`,
        _data: { type: 'MagicalSiteFoundOutcome', city }
    })
};

// Action factory functions - concise definitions
const actions = {
    research: (city: City): Action => ({
        id: "research",
        title: "Research",
        description: `Search for obscure knowledge in ${city.name}'s public archives and university collections.`,
        outcomes: [outcomes.knowledge(city.id), outcomes.noOutcome()]
    }),

    culture: (city: City): Action => ({
        id: "culture",
        title: "Attend Cultural Event",
        description: `Mingle with ${city.name}'s cultural elite at local events. Some may have connections to secret things.`,
        outcomes: [outcomes.invitedToPerform(city.id), outcomes.noOutcome()]
    }),

    explore: (city: City): Action => ({
        id: "explore",
        title: "Explore Historic Sites",
        description: `Visit ${city.name}'s sites, cemeteries, forgotten places. Something may be hidden there.`,
        outcomes: [outcomes.magicalSiteFound(city.id), outcomes.noOutcome()]
    }),

    perform: (city: City): Action => ({
        id: "perform",
        title: "Perform",
        description: `Showcase your artistic talents to ${city.name}'s elite audiences.`,
        outcomes: [outcomes.noOutcome()]
    })
};

// Standalone serialization functions
function serializeOutcome(outcome: Outcome): OutcomeData {
    return (outcome as OutcomeWithData)._data;
}

function serializeAction(action: Action): any {
    return {
        id: action.id,
        title: action.title,
        description: action.description,
        outcomes: action.outcomes.map(serializeOutcome)
    };
}

// Deserialization registry
function deserializeOutcome(data: OutcomeData): OutcomeWithData {
    switch (data.type) {
        case 'NoOutcome':
            return outcomes.noOutcome();
        case 'KnowledgeOutcome':
            return outcomes.knowledge(data.city);
        case 'InvitedToPerformOutcome':
            return outcomes.invitedToPerform(data.city);
        case 'MagicalSiteFoundOutcome':
            return outcomes.magicalSiteFound(data.city);
    }
}

function deserializeAction(data: any): Action {
    return {
        id: data.id,
        title: data.title,
        description: data.description,
        outcomes: data.outcomes.map(deserializeOutcome)
    };
}

export function prototypeActionsForCity(city: City): Action[] {
    return [
        actions.research(city),
        actions.culture(city),
        actions.explore(city)
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
        serialized[cityId] = actions.map(serializeAction);
    }
    return JSON.stringify(serialized);
}

export function deserializeActionMap(json: string): ActionMap {
    const parsed: Record<string, any[]> = JSON.parse(json);
    const map: ActionMap = {};
    for (const [cityId, serializedActions] of Object.entries(parsed)) {
        map[cityId] = serializedActions.map(deserializeAction);
    }
    return map;
}

/**
 * Complete a week's work: perform actions and increment week
 * Does NOT enact outcomes - that happens in saveGameState
 * @returns Object with results and updated game state
 */
export function completeWeek(
    assignments: Record<string, string>,
    actions: Action[],
    gameState: GameState
): { results: Record<string, Outcome>; updatedState: GameState } {
    // Perform actions to determine outcomes
    const results = performCityActions(assignments, actions, gameState);
    
    // Update week counter
    const updatedState = { ...gameState, week: gameState.week + 1 };
    
    return { results, updatedState };
}

/**
 * Enact outcomes and persist game state to localStorage
 */
export function saveGameState(
    assignments: Record<string, string>,
    results: Record<string, Outcome>,
    gameState: GameState
): void {
    // Enact the outcomes (mutates gameState)
    enactCityActions(assignments, results, gameState);
    
    // Save action map separately using serialization
    if (gameState.map) {
        localStorage.setItem('cultGameActionMap', serializeActionMap(gameState.map));
    }
    // Save game state without map (map is saved separately)
    const { map, ...stateToSave } = gameState;
    localStorage.setItem('cultGameState', JSON.stringify(stateToSave));
}