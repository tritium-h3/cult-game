// actions.ts
import { Outcome, Follower, GameState, City, Action, ActionMap } from "./types";
import { getCityById } from "./world";

// ============================================================================
// OUTCOME TYPES & SERIALIZATION
// ============================================================================

type OutcomeData = 
    | { type: 'NoOutcome' }
    | { type: 'UnlockAction'; city:  string; actionId: string }
    | { type: 'GainSkill'; skill: string }
    | { type: 'GainTrait'; trait: string }
    | { type: 'AddFollower'; skills: string[] }
    | { type: 'MultiEffect'; effects: OutcomeData[] };

interface OutcomeWithData extends Outcome {
    _data: OutcomeData;
}

// ============================================================================
// HELPERS
// ============================================================================

const hasSkill = (follower: Follower, skill: string) => follower.skills.includes(skill);

// ============================================================================
// OUTCOME FACTORIES
// ============================================================================

const outcomes = {
    noOutcome: (): OutcomeWithData => ({
        id: "no-outcome",
        odds: () => 1,
        enact: () => {},
        getDescription: (_follower: Follower) => "Nothing of note happens.",
        _data: { type: 'NoOutcome' }
    }),

    unlockAction: (city: string, actionId: string, description: string): OutcomeWithData => ({
        id: `unlock-${actionId}-${city}`,
        odds: () => 1,
        enact: (_follower: Follower, gameState: GameState) => {
            if (gameState.map) {
                const cityObj = getCityById(city);
                if (cityObj) {
                    const actionFactory = (actions as any)[actionId];
                    if (actionFactory) {
                        gameState.map[city].push(actionFactory(cityObj));
                    }
                }
            }
        },
        getDescription: () => description,
        _data: { type: 'UnlockAction', city, actionId }
    }),

    gainSkill: (skill: string, description: string): OutcomeWithData => ({
        id: `gain-skill-${skill}`,
        odds: () => 1,
        enact: (follower: Follower) => {
            if (!follower.skills.includes(skill)) {
                follower.skills.push(skill);
            }
        },
        getDescription: () => description,
        _data: { type: 'GainSkill', skill }
    }),

    gainTrait: (trait: string, description: string): OutcomeWithData => ({
        id: `gain-trait-${trait}`,
        odds: () => 1,
        enact: (follower: Follower) => {
            if (!follower.traits.includes(trait)) {
                follower.traits.push(trait);
            }
        },
        getDescription: () => description,
        _data: { type: 'GainTrait', trait }
    }),

    addFollower: (skills: string[], description: string): OutcomeWithData => ({
        id: `add-follower-${skills.join('-')}`,
        odds: () => 1,
        enact: (_follower: Follower, gameState: GameState) => {
            const newFollower: Follower = {
                id: `follower-${Date.now()}`,
                name: "[GENERATED_NAME]",
                background: "[GENERATED_BACKGROUND]",
                location: _follower.location,
                traits: [],
                skills: skills
            };
            gameState.followers.push(newFollower);
        },
        getDescription: () => description,
        _data: { type: 'AddFollower', skills }
    }),

    multiEffect: (effects: OutcomeWithData[], description: string): OutcomeWithData => ({
        id: `multi-${effects.map(e => e.id).join('-')}`,
        odds: () => 1,
        enact: (follower: Follower, gameState: GameState) => {
            effects.forEach(effect => effect.enact(follower, gameState));
        },
        getDescription: () => description,
        _data: { type: 'MultiEffect', effects: effects.map(e => e._data) }
    })
};

// ============================================================================
// ACTION FACTORIES
// ============================================================================

export const actions = {
    // TIER 0 - Starting Actions
    
    attendCulturalEvents: (city: City): Action => ({
        id: "attend-cultural-events",
        title: "Attend Cultural Events",
        description: `Mingle with ${city.name}'s cultural scene at galleries, readings, and performances.`,
        outcomes: [
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "performAtOpenMic", "You're invited to perform at an open mic night."),
                    outcomes.gainSkill("networking", "You develop networking skills.")
                ], "You make valuable connections in the cultural scene."),
                odds: (f) => hasSkill(f, 'networking') ? 3 : 1
            },
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "joinArtCollective", "An art collective invites you to join."),
                    outcomes.gainSkill("persuasion", "You develop persuasion skills.")
                ], "You charm the local artists and gain their trust."),
                odds: (f) => hasSkill(f, 'persuasion') ? 3 : 1
            },
            {
                ...outcomes.unlockAction(city.id, "organizePrivateSalon", "You could organize a private salon."),
                odds: () => 2
            },
            {
                ...outcomes.noOutcome(),
                odds: (f) => hasSkill(f, 'networking') || hasSkill(f, 'persuasion') ? 1 : 3
            }
        ]
    }),

    researchAtLibraries: (city: City): Action => ({
        id: "research-at-libraries",
        title: "Research at Libraries",
        description: `Search ${city.name}'s public archives and university collections for occult knowledge.`,
        outcomes: [
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "studyForbiddenSection", "You find references to a forbidden section."),
                    outcomes.gainSkill("research", "You develop research skills.")
                ], "You uncover references to restricted texts."),
                odds: (f) => hasSkill(f, 'research') ? 4 : 1
            },
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "studyForbiddenSection", "The forbidden section calls to you."),
                    outcomes.unlockAction(city.id, "befriendOccultBookshopOwner", "You learn of an occult bookshop.")
                ], "Your occult knowledge reveals hidden patterns in the texts."),
                odds: (f) => hasSkill(f, 'occult-knowledge') ? 3 : 0
            },
            {
                ...outcomes.unlockAction(city.id, "interviewLocalHistorians", "Local historians might know more."),
                odds: () => 2
            },
            {
                ...outcomes.noOutcome(),
                odds: () => 2
            }
        ]
    }),

    exploreHistoricSites: (city: City): Action => ({
        id: "explore-historic-sites",
        title: "Explore Historic Sites",
        description: `Visit ${city.name}'s old churches, cemeteries, and forgotten places.`,
        outcomes: [
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "investigateOldChurch", "An old church shows signs of occult activity."),
                    outcomes.unlockAction(city.id, "mapUndergroundTunnels", "You discover entrances to underground tunnels.")
                ], "Your analytical eye reveals hidden patterns."),
                odds: (f) => hasSkill(f, 'analysis') ? 3 : 0
            },
            {
                ...outcomes.unlockAction(city.id, "mapUndergroundTunnels", "You find tunnel entrances."),
                odds: (f) => hasSkill(f, 'physical') ? 2 : 1
            },
            {
                ...outcomes.gainTrait("suspicious", "You attract unwanted attention."),
                odds: (f) => hasSkill(f, 'stealth') ? 0 : 2
            },
            {
                ...outcomes.noOutcome(),
                odds: () => 2
            }
        ]
    }),

    visitCoffeeShops: (city: City): Action => ({
        id: "visit-coffee-shops",
        title: "Visit Coffee Shops",
        description: `Network in ${city.name}'s cafes and intellectual hangouts.`,
        outcomes: [
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "recruitSympatheticStudent", "You could recruit someone interested."),
                    outcomes.gainSkill("persuasion", "You develop persuasion skills.")
                ], "You find someone sympathetic to esoteric ideas."),
                odds: (f) => hasSkill(f, 'persuasion') ? 3 : 1
            },
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "befriendOccultBookshopOwner", "You hear of an occult bookshop owner."),
                    outcomes.gainSkill("networking", "You develop networking skills.")
                ], "Your connections lead you to the occult underground."),
                odds: (f) => hasSkill(f, 'networking') ? 3 : 1
            },
            {
                ...outcomes.noOutcome(),
                odds: () => 2
            }
        ]
    }),

    // TIER 1 - First Discoveries
    
    performAtOpenMic: (city: City): Action => ({
        id: "perform-at-open-mic",
        title: "Perform at Open Mic Night",
        description: `Showcase your talents to ${city.name}'s artistic community.`,
        outcomes: [
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "organizePrivateSalon", "You could organize a private salon."),
                    outcomes.gainSkill("performance", "You develop performance skills.")
                ], "Your performance captivates the audience."),
                odds: (f) => hasSkill(f, 'performance') ? 4 : 1
            },
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "recruitSympatheticStudent", "Someone approaches you after."),
                    outcomes.unlockAction(city.id, "organizePrivateSalon", "You could gather these people.")
                ], "Your charisma draws both followers and opportunities."),
                odds: (f) => hasSkill(f, 'persuasion') && hasSkill(f, 'performance') ? 2 : 0
            },
            {
                ...outcomes.gainTrait("self-doubting", "The poor reception shakes your confidence."),
                odds: (f) => hasSkill(f, 'performance') ? 1 : 3
            }
        ]
    }),

    joinArtCollective: (city: City): Action => ({
        id: "join-art-collective",
        title: "Join Art Collective",
        description: `Become part of ${city.name}'s underground art scene.`,
        outcomes: [
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "organizeExhibition", "The collective wants to exhibit."),
                    outcomes.unlockAction(city.id, "befriendOccultBookshopOwner", "An artist knows an occult bookshop.")
                ], "Your networking opens new doors."),
                odds: (f) => hasSkill(f, 'networking') ? 3 : 1
            },
            {
                ...outcomes.unlockAction(city.id, "organizePrivateSalon", "You could host a salon."),
                odds: (f) => hasSkill(f, 'persuasion') ? 2 : 1
            },
            {
                ...outcomes.gainTrait("disillusioned", "The collective's politics frustrate you."),
                odds: (f) => hasSkill(f, 'networking') || hasSkill(f, 'persuasion') ? 1 : 3
            }
        ]
    }),

    studyForbiddenSection: (city: City): Action => ({
        id: "study-forbidden-section",
        title: "Study Forbidden Section",
        description: `Access ${city.name}'s restricted occult texts.`,
        outcomes: [
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "attemptTranslation", "Ancient texts need translation."),
                    outcomes.gainSkill("occult-knowledge", "Your understanding deepens.")
                ], "You unlock forbidden knowledge."),
                odds: (f) => hasSkill(f, 'occult-knowledge') ? 4 : 0
            },
            {
                ...outcomes.multiEffect([
                    outcomes.unlockAction(city.id, "purchaseRareTexts", "You need these texts."),
                    outcomes.unlockAction(city.id, "attemptTranslation", "Translation is needed.")
                ], "Your linguistic skills reveal secrets."),
                odds: (f) => hasSkill(f, 'languages') ? 3 : 0
            },
            {
                ...outcomes.multiEffect([
                    outcomes.gainTrait("haunted", "What you read haunts you."),
                    outcomes.unlockAction(city.id, "interviewLocalHistorians", "You need context.")
                ], "Unprepared, the texts disturb you deeply."),
                odds: (f) => hasSkill(f, 'occult-knowledge') || hasSkill(f, 'languages') ? 0 : 3
            },
            {
                ...outcomes.gainTrait("marked", "The librarians ban you."),
                odds: (f) => hasSkill(f, 'stealth') ? 0 : 1
            }
        ]
    }),

    // Continue with more actions...
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function prototypeActionsForCity(city: City): Action[] {
    return [
        actions.attendCulturalEvents(city),
        actions.researchAtLibraries(city),
        actions.exploreHistoricSites(city),
        actions.visitCoffeeShops(city)
    ];
}

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

// Deserialization
export function deserializeOutcome(data: OutcomeData): OutcomeWithData {
    switch (data.type) {
        case 'NoOutcome':
            return outcomes.noOutcome();
        case 'UnlockAction':
            return outcomes.unlockAction(data.city, data.actionId, "[DESCRIPTION]");
        case 'GainSkill':
            return outcomes.gainSkill(data.skill, "[DESCRIPTION]");
        case 'GainTrait':
            return outcomes.gainTrait(data.trait, "[DESCRIPTION]");
        case 'AddFollower':
            return outcomes.addFollower(data.skills, "[DESCRIPTION]");
        case 'MultiEffect':
            return outcomes.multiEffect(
                data.effects.map(deserializeOutcome),
                "[DESCRIPTION]"
            );
        default:
            console.error('Unknown outcome type during deserialization:', data);
            return outcomes.noOutcome();
    }
}

function deserializeAction(data: any): Action {
    const deserializedOutcomes = data.outcomes
        .map(deserializeOutcome)
        .filter((outcome: OutcomeWithData | undefined) => outcome !== undefined);
    
    // Ensure at least one outcome exists (fallback to noOutcome)
    if (deserializedOutcomes.length === 0) {
        console.warn('Action had no valid outcomes after deserialization, adding noOutcome:', data.id);
        deserializedOutcomes.push(outcomes.noOutcome());
    }
    
    return {
        id: data.id,
        title: data.title,
        description: data.description,
        outcomes: deserializedOutcomes as OutcomeWithData[]
    };
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