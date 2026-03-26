// actions.ts
import { Outcome, Follower, GameState, City, Action, WorldState, WorldItem, ItemEffect } from "./types";
import { getCityById, CITY_VENUES } from "./world";

// ============================================================================
// HELPERS
// ============================================================================

const hasSkill = (follower: Follower, skill: string) => follower.skills.includes(skill);

// ============================================================================
// OUTCOME FACTORIES
// ============================================================================

const outcomes = {
    noOutcome: (): Outcome => ({
        id: "no-outcome",
        odds: () => 1,
        enact: () => {},
        getDescription: () => "Nothing of note happens.",
    }),

    gainSkill: (skill: string, description: string): Outcome => ({
        id: `gain-skill-${skill}`,
        odds: () => 1,
        enact: (follower: Follower) => {
            if (!follower.skills.includes(skill)) {
                follower.skills.push(skill);
                console.log(`[outcome] ${follower.name} gained skill: ${skill}`);
            }
        },
        getDescription: () => description,
    }),

    gainTrait: (trait: string, description: string): Outcome => ({
        id: `gain-trait-${trait}`,
        odds: () => 1,
        enact: (follower: Follower) => {
            if (!follower.traits.includes(trait)) {
                follower.traits.push(trait);
                console.log(`[outcome] ${follower.name} gained trait: ${trait}`);
            }
        },
        getDescription: () => description,
    }),

    addFollower: (skills: string[], description: string): Outcome => ({
        id: `add-follower-${skills.join('-')}`,
        odds: () => 1,
        enact: (_follower: Follower, gameState: GameState) => {
            const newFollower: Follower = {
                id: `follower-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                name: '[New Member]',
                background: '',
                location: _follower.location,
                traits: [],
                skills: [...skills],
                slots: 1,
            };
            gameState.followers.push(newFollower);
            console.log(`[outcome] New follower added with skills: ${skills}`);
        },
        getDescription: () => description,
    }),
};

// ============================================================================
// WORLD-ITEM OUTCOMES
// ============================================================================

function effectToOutcome(effect: ItemEffect): Outcome {
    switch (effect.type) {
        case 'GainSkill':
            return outcomes.gainSkill(effect.skill, effect.description);

        case 'GainTrait':
            return outcomes.gainTrait(effect.trait, effect.description);

        case 'AddFollower':
            return outcomes.addFollower(effect.skills, effect.description);

        case 'DiscoverItem':
            return {
                id: `discover-item-${effect.itemId}`,
                odds: () => 1,
                enact: (_follower: Follower, gameState: GameState) => {
                    if (!gameState.discoveredItems[effect.cityId]) {
                        gameState.discoveredItems[effect.cityId] = [];
                    }
                    if (!gameState.discoveredItems[effect.cityId].includes(effect.itemId)) {
                        gameState.discoveredItems[effect.cityId].push(effect.itemId);
                        console.log(`[outcome] Item effect revealed: ${effect.itemId}`);
                    }
                },
                getDescription: () => effect.description,
            };

        case 'NoEffect':
        default:
            return outcomes.noOutcome();
    }
}

/**
 * Convert a discovered WorldItem into a draggable Action card.
 * All effects fire as a single compound outcome so nothing is skipped.
 */
export function worldItemToAction(item: WorldItem): Action {
    const effectOutcomes = item.effects.map(effectToOutcome);

    const compoundOutcome: Outcome = {
        id: `use-item-${item.id}`,
        odds: () => 1,
        enact: (follower: Follower, gameState: GameState) => {
            for (const o of effectOutcomes) {
                o.enact(follower, gameState);
            }
        },
        getDescription: (_follower: Follower) => {
            const lines = item.effects
                .filter(e => e.type !== 'NoEffect')
                .map(e => (e as any).description)
                .filter(Boolean);
            return lines.join(' ') || 'You engage with what you have found.';
        },
    };

    return {
        id: item.id,
        title: item.name,
        description: item.flavorDescription || `A ${item.type} of uncertain significance.`,
        type: item.type,
        outcomes: [compoundOutcome],
    };
}

// ============================================================================
// EXPLORATION ACTIONS
// ============================================================================

function countUndiscovered(
    cityId: string,
    actionId: string,
    worldState: WorldState,
    gameState: GameState,
): number {
    const cityItems = worldState.items[cityId] ?? [];
    const discovered = gameState.discoveredItems[cityId] ?? [];
    return cityItems.filter(item => item.discoveredBy === actionId && !discovered.includes(item.id)).length;
}

function makeExploreEnact(cityId: string, actionId: string, worldState: WorldState) {
    return ((_follower: Follower, gameState: GameState) => {
        const cityItems = worldState.items[cityId] ?? [];
        const discovered = gameState.discoveredItems[cityId] ?? [];
        const undiscovered = cityItems.filter(
            item => item.discoveredBy === actionId && !discovered.includes(item.id)
        );
        if (undiscovered.length > 0) {
            const pick = undiscovered[Math.floor(Math.random() * undiscovered.length)];
            if (!gameState.discoveredItems[cityId]) gameState.discoveredItems[cityId] = [];
            gameState.discoveredItems[cityId].push(pick.id);
            console.log(`[discovery] ${actionId} revealed: ${pick.name} (${pick.id})`);
        } else {
            console.log(`[discovery] Nothing left via ${actionId} in ${cityId}`);
        }
    });
}

const actions = {
    attendCulturalEvents: (city: City, worldState: WorldState): Action => {
        const v = CITY_VENUES[city.id];
        const venue = v?.culturalVenue ?? `${city.name}'s cultural venues`;
        return {
            id: "attend-cultural-events",
            type: 'site',
            title: `Attend Events at ${venue}`,
            description: `Mingle with performers, collectors, and seekers at ${venue}.`,
            outcomes: [
                {
                    id: 'attend-discover',
                    odds: (f, gs) => {
                        const n = countUndiscovered(city.id, 'attend-cultural-events', worldState, gs);
                        if (n === 0) return 0;
                        return hasSkill(f, 'networking') || hasSkill(f, 'artistic') ? 4 : 2;
                    },
                    enact: makeExploreEnact(city.id, 'attend-cultural-events', worldState),
                    getDescription: () => 'You uncover something of interest at the event.',
                },
                {
                    ...outcomes.gainSkill("networking", "Mingling here develops your networking skills."),
                    odds: (f) => hasSkill(f, 'networking') ? 0 : 1,
                },
                {
                    ...outcomes.noOutcome(),
                    odds: () => 1,
                },
            ],
        };
    },

    researchAtLibraries: (city: City, worldState: WorldState): Action => {
        const v = CITY_VENUES[city.id];
        const venue = v?.library ?? `${city.name}'s archives`;
        return {
            id: "research-at-libraries",
            type: 'book',
            title: `Research at ${venue}`,
            description: `Search the restricted stacks and back catalogues of ${venue} for occult material.`,
            outcomes: [
                {
                    id: 'research-discover',
                    odds: (f, gs) => {
                        const n = countUndiscovered(city.id, 'research-at-libraries', worldState, gs);
                        if (n === 0) return 0;
                        return hasSkill(f, 'research') ? 4 : 2;
                    },
                    enact: makeExploreEnact(city.id, 'research-at-libraries', worldState),
                    getDescription: () => 'Your search turns up a promising lead.',
                },
                {
                    ...outcomes.gainSkill("research", "Methodical archive work sharpens your research skills."),
                    odds: (f) => hasSkill(f, 'research') ? 0 : 1,
                },
                {
                    ...outcomes.noOutcome(),
                    odds: () => 1,
                },
            ],
        };
    },

    exploreHistoricSites: (city: City, worldState: WorldState): Action => {
        const v = CITY_VENUES[city.id];
        const venue = v?.site ?? `${city.name}'s historic sites`;
        return {
            id: "explore-historic-sites",
            type: 'site',
            title: `Explore ${venue}`,
            description: `Walk ${venue} at odd hours, looking for what the tourists miss.`,
            outcomes: [
                {
                    id: 'sites-discover',
                    odds: (f, gs) => {
                        const n = countUndiscovered(city.id, 'explore-historic-sites', worldState, gs);
                        if (n === 0) return 0;
                        return hasSkill(f, 'observation') || hasSkill(f, 'analysis') ? 4 : 2;
                    },
                    enact: makeExploreEnact(city.id, 'explore-historic-sites', worldState),
                    getDescription: () => 'You find something the city keeps quiet about.',
                },
                {
                    ...outcomes.gainTrait("historically-minded", "Spending time here shifts your perspective permanently."),
                    odds: (f) => f.traits.includes('historically-minded') ? 0 : 1,
                },
                {
                    ...outcomes.noOutcome(),
                    odds: () => 1,
                },
            ],
        };
    },

    visitCoffeeShops: (city: City, worldState: WorldState): Action => {
        const v = CITY_VENUES[city.id];
        const venue = v?.cafe ?? `${city.name}'s cafés`;
        return {
            id: "visit-coffee-shops",
            type: 'patron',
            title: `Frequent ${venue}`,
            description: `Take a regular table at ${venue} and let the conversation come to you.`,
            outcomes: [
                {
                    id: 'coffee-discover',
                    odds: (f, gs) => {
                        const n = countUndiscovered(city.id, 'visit-coffee-shops', worldState, gs);
                        if (n === 0) return 0;
                        return hasSkill(f, 'networking') || hasSkill(f, 'persuasion') ? 4 : 2;
                    },
                    enact: makeExploreEnact(city.id, 'visit-coffee-shops', worldState),
                    getDescription: () => 'You meet someone worth knowing.',
                },
                {
                    ...outcomes.gainSkill("networking", "Regular presence here develops your networking skills."),
                    odds: (f) => hasSkill(f, 'networking') ? 0 : 1,
                },
                {
                    ...outcomes.noOutcome(),
                    odds: () => 1,
                },
            ],
        };
    },
};

// ============================================================================
// RUNTIME ACTION BUILDER
// ============================================================================

/**
 * Returns the full list of actions available to followers in a city:
 * the 4 permanent exploration actions plus any already-discovered WorldItems.
 */
export function getAvailableActionsForCity(
    cityId: string,
    worldState: WorldState,
    gameState: GameState,
): Action[] {
    const city = getCityById(cityId);
    if (!city) return [];

    const explorationActions: Action[] = [
        actions.attendCulturalEvents(city, worldState),
        actions.researchAtLibraries(city, worldState),
        actions.exploreHistoricSites(city, worldState),
        actions.visitCoffeeShops(city, worldState),
    ];

    const discovered = gameState.discoveredItems[cityId] ?? [];
    const cityItems = worldState.items[cityId] ?? [];
    const discoveredActions: Action[] = discovered
        .map(id => cityItems.find(item => item.id === id))
        .filter((item): item is WorldItem => item !== undefined)
        .map(item => worldItemToAction(item));

    console.log(`[actions] ${cityId}: ${explorationActions.length} exploration + ${discoveredActions.length} discovered`);
    return [...explorationActions, ...discoveredActions];
}

// ============================================================================
// WEEK EXECUTION ENGINE
// ============================================================================

export function performAction(action: Action, follower: Follower, gameState: GameState): Outcome {
    const totalOdds = action.outcomes.reduce((sum, o) => sum + o.odds(follower, gameState), 0);
    if (totalOdds <= 0) return outcomes.noOutcome();

    const rand = Math.random() * totalOdds;
    let cumulative = 0;
    for (const o of action.outcomes) {
        cumulative += o.odds(follower, gameState);
        if (rand <= cumulative) return o;
    }
    return action.outcomes[action.outcomes.length - 1];
}

export function performCityActions(
    assignments: Record<string, string>,
    items: Action[],
    gameState: GameState,
): Record<string, Outcome> {
    const results: Record<string, Outcome> = {};
    for (const [slotKey, itemId] of Object.entries(assignments)) {
        const item = items.find(a => a.id === itemId);
        if (!item) {
            console.error(`[actions] Item not found: ${itemId}`);
            continue;
        }
        const followerId = slotKey.split(':')[0];
        const follower = gameState.followers.find(f => f.id === followerId);
        if (!follower) {
            console.error(`[actions] Follower not found: ${followerId}`);
            continue;
        }
        results[slotKey] = performAction(item, follower, gameState);
    }
    return results;
}

export function enactCityActions(
    assignments: Record<string, string>,
    results: Record<string, Outcome>,
    gameState: GameState,
): void {
    for (const [slotKey, outcome] of Object.entries(results)) {
        const followerId = slotKey.split(':')[0];
        const follower = gameState.followers.find(f => f.id === followerId);
        if (!follower) {
            console.error(`[actions] Follower not found for enact: ${followerId}`);
            continue;
        }
        outcome.enact(follower, gameState);
    }
}

/**
 * Compute outcomes for the week and advance the week counter.
 * Does NOT enact outcomes — that happens in enactCityActions after the player
 * confirms the results.
 */
export function completeWeek(
    assignments: Record<string, string>,
    actionItems: Action[],
    gameState: GameState,
): { results: Record<string, Outcome>; updatedState: GameState } {
    const results = performCityActions(assignments, actionItems, gameState);

    // Deep-copy mutable collections so enact() mutations on updatedState
    // don't alias back into the live entry.state before ACCEPT_WEEK_RESULTS.
    const updatedState: GameState = {
        ...gameState,
        week: gameState.week + 1,
        discoveredItems: Object.fromEntries(
            Object.entries(gameState.discoveredItems).map(([k, v]) => [k, [...v]])
        ),
        followers: gameState.followers.map(f => ({
            ...f,
            skills: [...f.skills],
            traits: [...f.traits],
        })),
    };

    return { results, updatedState };
}
