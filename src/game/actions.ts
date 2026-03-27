// actions.ts
import { Outcome, Follower, GameState, Action, WorldState, WorldItem, ItemEffect, Verb } from "./types";
import { getCityById } from "./world";

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

    addFollower: (verbs: Verb[], description: string): Outcome => ({
        id: `add-follower-${verbs.join('-')}`,
        odds: () => 1,
        enact: (_follower: Follower, gameState: GameState) => {
            const newFollower: Follower = {
                id: `follower-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                name: '[New Member]',
                background: '',
                location: _follower.location,
                traits: [],
                verbs: [...verbs],
            };
            gameState.followers.push(newFollower);
            console.log(`[outcome] New follower added with verbs: ${verbs}`);
        },
        getDescription: () => description,
    }),
};

// ============================================================================
// WORLD-ITEM OUTCOMES
// ============================================================================

function effectToOutcome(effect: ItemEffect): Outcome {
    switch (effect.type) {
        case 'GainTrait':
            return outcomes.gainTrait(effect.trait, effect.description);

        case 'AddFollower':
            return outcomes.addFollower(effect.verbs, effect.description);

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
                        console.log(`[outcome] Item revealed: ${effect.itemId}`);
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
 * Convert a WorldItem into a draggable Action card.
 * All effects are weighted equally; one fires per week.
 */
export function worldItemToAction(item: WorldItem): Action {
    const effectOutcomes = item.effects.map(effectToOutcome);
    const totalWeight = effectOutcomes.length;

    const compoundOutcome: Outcome = {
        id: `use-item-${item.id}`,
        odds: () => totalWeight,
        enact: (follower: Follower, gameState: GameState) => {
            // Pick one effect at random
            const chosen = effectOutcomes[Math.floor(Math.random() * effectOutcomes.length)];
            chosen.enact(follower, gameState);
        },
        getDescription: (_follower: Follower) => {
            const lines = item.effects
                .filter(e => e.type !== 'NoEffect')
                .map(e => (e as any).description)
                .filter(Boolean);
            return lines[0] || 'You engage with what you have found.';
        },
    };

    return {
        id: item.id,
        title: item.name,
        description: item.flavorDescription || `A ${item.types[0]} of uncertain significance.`,
        types: item.types,
        outcomes: [compoundOutcome, { ...outcomes.noOutcome(), odds: () => 1 }],
    };
}

// ============================================================================
// RUNTIME ACTION BUILDER
// ============================================================================

/**
 * Returns all hook cards available to followers in a city:
 *   - Starter hooks (always present)
 *   - Items discovered via previous engagement (DiscoverItem effects)
 */
export function getAvailableActionsForCity(
    cityId: string,
    worldState: WorldState,
    gameState: GameState,
): Action[] {
    const cityItems = worldState.items[cityId] ?? [];
    const discovered = new Set(gameState.discoveredItems[cityId] ?? []);

    const available = cityItems.filter(
        item => item.starterHook || discovered.has(item.id)
    );

    console.log(`[actions] ${cityId}: ${available.length} hooks available (${available.filter(i => i.starterHook).length} starter + ${available.filter(i => !i.starterHook && discovered.has(i.id)).length} discovered)`);
    return available.map(item => worldItemToAction(item));
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
            verbs: [...f.verbs],
            traits: [...f.traits],
        })),
    };

    return { results, updatedState };
}
