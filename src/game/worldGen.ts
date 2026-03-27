/**
 * worldGen.ts — Procedural world generation (no LLM).
 *
 * Generates a WorldState containing a fixed subset of the global CITIES, each
 * populated with a network of pre-existing discoverable WorldItems (hooks).
 *
 * Network model:
 *   Each city has 5 starter hooks (always visible) plus ~17 hidden hooks.
 *   Hooks are connected via DiscoverItem effects — using a hook may surface
 *   others. The same hook can be reachable from multiple paths (redundancy
 *   is intentional and makes the network feel organic).
 *
 * Hook types: person | gathering | institution | site | text
 * Some hooks carry multiple types for broader verb compatibility.
 */

import { transliterate } from 'transliteration';
import { HookType, ItemEffect, Verb, WorldItem, WorldState } from './types';
import { CITIES, getCityById } from './world';

const CITIES_PER_GAME = 6;

// ── Vocabulary ─────────────────────────────────────────────────────────────

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Institutions
const INST_ADJ  = ['Municipal', 'Historical', 'Antiquarian', 'Philosophical', 'Archaeological', 'Ecclesiastical', 'Private', 'Royal'];
const INST_NOUN = ['Society', 'Library', 'Archive', 'Academy', 'Institute', 'Museum', 'Reading Room', 'Collection'];

// Gatherings
const GATH_ADJ  = ['Literary', 'Philosophical', 'Skeptics\'', 'Esoteric', 'Reform', 'Naturalist', 'Archaeological', 'Theosophy'];
const GATH_NOUN = ['Circle', 'Club', 'Society', 'Assembly', 'Reading Group', 'Salon', 'Discussion Group', 'Study Circle'];

// Gathering venues (for multi-type gathering+institution)
const GATH_VENUE_ADJ  = ['Occult', 'Philosophical', 'Spiritualist', 'Reform', 'Literary'];
const GATH_VENUE_NOUN = ['Lodge', 'Hall', 'Society House', 'Meeting Rooms', 'Association'];

// Sites
const SITE_ADJ  = ['Abandoned', 'Bricked-up', 'Hidden', 'Overgrown', 'Flooded', 'Sealed', 'Forgotten', 'Subterranean', 'Crumbling'];
const SITE_NOUN = ['Crypt', 'Cellar', 'Chapel', 'Vault', 'Passage', 'Ossuary', 'Garden', 'Well', 'Chamber', 'Tower'];

// Texts
const TEXT_ADJ  = ['Unsigned', 'Annotated', 'Suppressed', 'Rare', 'Private', 'Classified', 'Recovered', 'Incomplete'];
const TEXT_NOUN = ['Manuscript', 'Pamphlet', 'Journal', 'Letter', 'Register', 'Catalogue', 'Album', 'Notebook'];
const TEXT_SUBJ = ['the Threshold', 'Signs', 'Blood', 'Bone', 'Stars', 'the Veil', 'Ash', 'Broken Glass', 'the Reckoning', 'Old Names'];

// Traits
const SCHOLAR_TRAITS = ['historically-minded', 'methodical', 'obsessive', 'cautious'];
const UNSETTLED_TRAITS = ['haunted', 'superstitious', 'marked', 'sleepless'];
const CONNECTED_TRAITS = ['well-connected', 'charming', 'suspicious'];

// ── Name generators ────────────────────────────────────────────────────────

function article(word: string): string { return /^[aeiou]/i.test(word) ? 'An' : 'A'; }

function instName():      string { return `The ${pick(INST_ADJ)} ${pick(INST_NOUN)}`; }
function gathName():      string { const adj = pick(GATH_ADJ);  return `${article(adj)} ${adj} ${pick(GATH_NOUN)}`; }
function gathHouseName(): string { return `The ${pick(GATH_VENUE_ADJ)} ${pick(GATH_VENUE_NOUN)}`; }
function siteName():      string { const adj = pick(SITE_ADJ);  return `${article(adj)} ${adj} ${pick(SITE_NOUN)}`; }
function textName():      string { const adj = pick(TEXT_ADJ);  return `${article(adj)} ${adj} ${pick(TEXT_NOUN)} of ${pick(TEXT_SUBJ)}`; }
function personName(cityId: string): string {
    const city = getCityById(cityId);
    if (!city) return 'An Unknown Contact';
    const name = city.faker.person.fullName() as string;
    return city.needs_transliteration ? `${transliterate(name)} (${name})` : name;
}

// ── Effect helpers ─────────────────────────────────────────────────────────

function discoverEdge(itemId: string, cityId: string, desc: string): ItemEffect {
    return { type: 'DiscoverItem', itemId, cityId, description: desc };
}
function gainTrait(trait: string, desc: string): ItemEffect {
    return { type: 'GainTrait', trait, description: desc };
}
function addFollower(verbs: Verb[], desc: string): ItemEffect {
    return { type: 'AddFollower', verbs, description: desc };
}
function noEffect(): ItemEffect {
    return { type: 'NoEffect' };
}

// ── Network topology ───────────────────────────────────────────────────────
//
// 22 items per city arranged in a discovery network.
// Item IDs: "${cityId}-${category}-${index}"
//
//  Starters (5):  inst-0, gath-0, pers-0, site-0, text-0
//  Hidden  (17):  inst-1..3, gath-1..3, pers-1..4, site-1..3, text-1..3
//
// Multi-type items:
//   gath-1: ['gathering','institution']   — a club with its own premises
//   inst-1: ['institution','site']       — an old archive in a crumbling building
//   pers-2: ['person','text']            — a prolific published author
//   inst-3: ['institution','site']       — the deepest mystery location

type ItemSpec = {
    category: string;
    index: number;
    types: HookType[];
    starter: boolean;
    effects: (cityId: string) => ItemEffect[];
    nameGen: (cityId: string) => string;
};

function buildSpecs(): ItemSpec[] {
    return [
        // ── 5 starter hooks ─────────────────────────────────────────────
        {
            category: 'inst', index: 0, types: ['institution'], starter: true,
            nameGen: () => instName(),
            effects: (c) => [
                discoverEdge(`${c}-text-1`, c, 'A shelf of uncatalogued material catches your eye.'),
                discoverEdge(`${c}-text-2`, c, 'A reference in one entry leads you somewhere else.'),
                discoverEdge(`${c}-inst-1`, c, 'A note on the back reveals another address.'),
                gainTrait(pick(SCHOLAR_TRAITS), 'Time spent here changes how you look at things.'),
            ],
        },
        {
            category: 'gath', index: 0, types: ['gathering'], starter: true,
            nameGen: () => gathName(),
            effects: (c) => [
                discoverEdge(`${c}-pers-1`, c, 'Someone at the meeting introduces themselves afterwards.'),
                discoverEdge(`${c}-gath-1`, c, 'Another group meets here — you are quietly invited.'),
                discoverEdge(`${c}-text-3`, c, 'A pamphlet changes hands. You manage to get a copy.'),
            ],
        },
        {
            category: 'pers', index: 0, types: ['person'], starter: true,
            nameGen: (c) => personName(c),
            effects: (c) => [
                discoverEdge(`${c}-pers-2`, c, 'They recommend someone worth meeting.'),
                discoverEdge(`${c}-gath-2`, c, 'They mention a circle you might find interesting.'),
                discoverEdge(`${c}-text-4`, c, 'They press a document into your hand.'),
            ],
        },
        {
            category: 'site', index: 0, types: ['site'], starter: true,
            nameGen: () => siteName(),
            effects: (c) => [
                discoverEdge(`${c}-site-1`, c, 'Beyond the outer area, there is more to find.'),
                discoverEdge(`${c}-site-2`, c, 'A connecting passage leads somewhere else entirely.'),
                discoverEdge(`${c}-pers-3`, c, 'Someone else knows this place. You cross paths.'),
                gainTrait(pick(UNSETTLED_TRAITS), 'What you find here stays with you.'),
            ],
        },
        {
            category: 'text', index: 0, types: ['text'], starter: true,
            nameGen: () => textName(),
            effects: (c) => [
                discoverEdge(`${c}-inst-2`, c, 'A reference inside points to a specific address.'),
                discoverEdge(`${c}-pers-4`, c, 'The author\'s name appears in another context.'),
                discoverEdge(`${c}-site-3`, c, 'Marginal notes describe a physical location.'),
            ],
        },

        // ── Hidden institutions (3) ──────────────────────────────────────
        {
            category: 'inst', index: 1, types: ['institution', 'site'], starter: false,
            nameGen: () => instName(),
            effects: (c) => [
                discoverEdge(`${c}-text-1`, c, 'Its collection contains material you have been tracking.'),
                discoverEdge(`${c}-gath-3`, c, 'A room here is used by a group you have not met.'),
                gainTrait(pick(SCHOLAR_TRAITS), 'The atmosphere here is serious. It rubs off.'),
            ],
        },
        {
            category: 'inst', index: 2, types: ['institution'], starter: false,
            nameGen: () => instName(),
            effects: (c) => [
                discoverEdge(`${c}-text-2`, c, 'A cross-reference surfaces something you needed.'),
                discoverEdge(`${c}-site-2`, c, 'A librarian mentions somewhere you have not looked.'),
            ],
        },
        {
            category: 'inst', index: 3, types: ['institution', 'site'], starter: false,
            nameGen: () => instName(),
            effects: (c) => [
                gainTrait(pick(UNSETTLED_TRAITS), 'What operates here is not what it appears to be.'),
                noEffect(),
            ],
        },

        // ── Hidden gatherings (3) ────────────────────────────────────────
        {
            category: 'gath', index: 1, types: ['gathering', 'institution'], starter: false,
            nameGen: () => gathHouseName(),
            effects: (c) => [
                discoverEdge(`${c}-pers-1`, c, 'A regular here is worth talking to privately.'),
                discoverEdge(`${c}-pers-2`, c, 'Someone at the back attracts your attention.'),
            ],
        },
        {
            category: 'gath', index: 2, types: ['gathering'], starter: false,
            nameGen: () => gathName(),
            effects: (c) => [
                discoverEdge(`${c}-gath-3`, c, 'This group has a more exclusive inner circle.'),
                discoverEdge(`${c}-pers-4`, c, 'Someone here is looking for exactly what you represent.'),
            ],
        },
        {
            category: 'gath', index: 3, types: ['gathering'], starter: false,
            nameGen: () => gathName(),
            effects: (c) => [
                discoverEdge(`${c}-pers-3`, c, 'The same face keeps appearing here and elsewhere.'),
                discoverEdge(`${c}-pers-4`, c, 'A new arrival asks you an oddly specific question.'),
                addFollower(['Talk', 'Perform'], 'Someone here is ready to commit to something.'),
            ],
        },

        // ── Hidden persons (4) ───────────────────────────────────────────
        {
            category: 'pers', index: 1, types: ['person'], starter: false,
            nameGen: (c) => personName(c),
            effects: (c) => [
                discoverEdge(`${c}-gath-2`, c, 'They mention a meeting you should attend.'),
                discoverEdge(`${c}-text-3`, c, 'They have been collecting something you want.'),
            ],
        },
        {
            category: 'pers', index: 2, types: ['person', 'text'], starter: false,
            nameGen: (c) => personName(c),
            effects: (c) => [
                discoverEdge(`${c}-site-1`, c, 'Their writing describes a place from a first-hand account.'),
                discoverEdge(`${c}-text-4`, c, 'They have published something relevant under a pseudonym.'),
            ],
        },
        {
            category: 'pers', index: 3, types: ['person'], starter: false,
            nameGen: (c) => personName(c),
            effects: (c) => [
                discoverEdge(`${c}-site-2`, c, 'They know these streets better than most.'),
                discoverEdge(`${c}-inst-3`, c, 'They drop a name you have been trying to find.'),
                gainTrait(pick(CONNECTED_TRAITS), 'Knowing this person changes how others see you.'),
            ],
        },
        {
            category: 'pers', index: 4, types: ['person'], starter: false,
            nameGen: (c) => personName(c),
            effects: (c) => [
                discoverEdge(`${c}-gath-3`, c, 'They are a founding member of something you have been circling.'),
                discoverEdge(`${c}-text-4`, c, 'They hand you something and ask you to keep it safe.'),
                addFollower(['Study', 'Talk'], 'They want to help. You believe them.'),
            ],
        },

        // ── Hidden sites (3) ─────────────────────────────────────────────
        {
            category: 'site', index: 1, types: ['site'], starter: false,
            nameGen: () => siteName(),
            effects: (c) => [
                discoverEdge(`${c}-site-2`, c, 'A connecting passage leads further.'),
                discoverEdge(`${c}-pers-3`, c, 'Someone else has been here recently.'),
                gainTrait(pick(UNSETTLED_TRAITS), 'Something about this place does not leave you alone.'),
            ],
        },
        {
            category: 'site', index: 2, types: ['site'], starter: false,
            nameGen: () => siteName(),
            effects: (c) => [
                discoverEdge(`${c}-inst-3`, c, 'A marking on the wall matches something you have seen before.'),
                gainTrait(pick(UNSETTLED_TRAITS), 'You feel certain you were meant to find this.'),
            ],
        },
        {
            category: 'site', index: 3, types: ['site'], starter: false,
            nameGen: () => siteName(),
            effects: (c) => [
                discoverEdge(`${c}-inst-3`, c, 'This leads somewhere you did not expect.'),
                gainTrait(pick(UNSETTLED_TRAITS), 'This place leaves a mark.'),
            ],
        },

        // ── Hidden texts (4) ─────────────────────────────────────────────
        {
            category: 'text', index: 1, types: ['text'], starter: false,
            nameGen: () => textName(),
            effects: (c) => [
                discoverEdge(`${c}-inst-2`, c, 'A citation points to a specific collection.'),
                discoverEdge(`${c}-site-3`, c, 'Marginal notes describe a physical location in detail.'),
            ],
        },
        {
            category: 'text', index: 2, types: ['text'], starter: false,
            nameGen: () => textName(),
            effects: (c) => [
                discoverEdge(`${c}-site-1`, c, 'Directions inside are oddly specific and probably still accurate.'),
                discoverEdge(`${c}-pers-3`, c, 'The author is still alive. You can find them.'),
            ],
        },
        {
            category: 'text', index: 3, types: ['text'], starter: false,
            nameGen: () => textName(),
            effects: (c) => [
                discoverEdge(`${c}-gath-2`, c, 'A meeting notice tucked inside gives a date and address.'),
                discoverEdge(`${c}-text-4`, c, 'This is part of a series. There are more.'),
            ],
        },
        {
            category: 'text', index: 4, types: ['text'], starter: false,
            nameGen: () => textName(),
            effects: (c) => [
                discoverEdge(`${c}-inst-3`, c, 'This document should not exist. It names the source.'),
                discoverEdge(`${c}-site-3`, c, 'A location hinted at throughout finally becomes clear.'),
            ],
        },
    ];
}

// ── Item factory ───────────────────────────────────────────────────────────

function generateCityItems(cityId: string): WorldItem[] {
    const specs = buildSpecs();
    return specs.map((spec): WorldItem => ({
        id:               `${cityId}-${spec.category}-${spec.index}`,
        cityId,
        types:            spec.types,
        name:             spec.nameGen(cityId),
        flavorDescription: '',
        starterHook:      spec.starter,
        effects:          spec.effects(cityId),
    }));
}

// ── Public API ─────────────────────────────────────────────────────────────

function selectCities(hqCityId: string, count: number): string[] {
    const others = CITIES.filter(c => c.id !== hqCityId).map(c => c.id);
    const shuffled = [...others].sort(() => Math.random() - 0.5);
    return [hqCityId, ...shuffled.slice(0, Math.min(count - 1, shuffled.length))];
}

export function generateWorldState(hqCityId: string, count: number = CITIES_PER_GAME): WorldState {
    const cities = selectCities(hqCityId, count);
    const items: Record<string, WorldItem[]> = {};

    for (const cityId of cities) {
        items[cityId] = generateCityItems(cityId);
        const starters = items[cityId].filter(i => i.starterHook).length;
        const total    = items[cityId].length;
        console.log(`[worldgen] ${cityId}: ${total} items (${starters} starter hooks)`);
    }

    const totalItems = Object.values(items).flat().length;
    console.log(`[worldgen] World ready — ${cities.length} cities, ${totalItems} total items`);

    return { cities, items };
}

