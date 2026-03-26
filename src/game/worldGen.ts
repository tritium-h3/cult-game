/**
 * worldGen.ts — Procedural world generation (no LLM).
 *
 * Generates a WorldState containing a fixed subset of the global CITIES, each
 * populated with pre-existing discoverable WorldItems. All names come from
 * Faker / vocabulary lists.  LLM only supplies flavorDescription later.
 */

import { transliterate } from 'transliteration';
import { HookItemType, ItemEffect, WorldItem, WorldState } from './types';
import { CITIES, getCityById } from './world';

const CITIES_PER_GAME = 6;

// ── Vocabulary ─────────────────────────────────────────────────────────────

const BOOK_ADJECTIVES = ['Hidden', 'Forbidden', 'Ancient', 'Lost', 'Obscured', 'Veiled', 'Cursed', 'Sealed', 'Forgotten', 'Exhumed'];
const BOOK_NOUNS       = ['Chronicle', 'Compendium', 'Treatise', 'Codex', 'Manuscript', 'Testament', 'Ledger', 'Almanac', 'Commentary', 'Register'];
const BOOK_SUBJECTS    = ['Shadows', 'Signs', 'the Threshold', 'the Veil', 'Blood', 'Bone', 'Stars', 'the Deep', 'Ash', 'Broken Glass'];

const SITE_ADJECTIVES  = ['Abandoned', 'Forgotten', 'Sealed', 'Ancient', 'Hidden', 'Sunken', 'Ruined', 'Collapsed', 'Overgrown', 'Subterranean'];
const SITE_TYPES       = ['Vault', 'Archive', 'Crypt', 'Chapel', 'Cellar', 'Garden', 'Hall', 'Chamber', 'Tower', 'Grotto'];

const ARTIFACT_MATERIALS = ['Obsidian', 'Tarnished', 'Blackened', 'Carved', 'Sealed', 'Hollow', 'Painted', 'Bound', 'Corroded', 'Gilded'];
const ARTIFACT_NOUNS     = ['Mirror', 'Compass', 'Knife', 'Urn', 'Idol', 'Lens', 'Coin', 'Ring', 'Vial', 'Reliquary'];

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ── Name generators ────────────────────────────────────────────────────────

function generateBookName(): string {
    return `The ${pick(BOOK_ADJECTIVES)} ${pick(BOOK_NOUNS)} of ${pick(BOOK_SUBJECTS)}`;
}

function generateSiteName(): string {
    return `The ${pick(SITE_ADJECTIVES)} ${pick(SITE_TYPES)}`;
}

function generatePatronName(cityId: string): string {
    const city = getCityById(cityId);
    if (!city) return 'Unknown Contact';
    const name = city.faker.person.fullName() as string;
    if (city.needs_transliteration) {
        return `${transliterate(name)} (${name})`;
    }
    return name;
}

function generateArtifactName(): string {
    return `The ${pick(ARTIFACT_MATERIALS)} ${pick(ARTIFACT_NOUNS)}`;
}

// ── Effect generators ──────────────────────────────────────────────────────
//
// Effects are deterministic by item type + index so the cross-references
// (e.g. book-2 points to artifact-0) are always valid.
//
// Item ID format: "${cityId}-${type}-${index}"

function bookEffects(cityId: string, index: number): ItemEffect[] {
    switch (index) {
        case 0: return [
            { type: 'GainSkill', skill: 'research', description: 'Your investigation sharpens your research skills.' }
        ];
        case 1: return [
            { type: 'GainSkill', skill: 'occult-knowledge', description: 'What you find here deepens your occult understanding.' }
        ];
        case 2: return [
            { type: 'GainSkill', skill: 'languages', description: 'Deciphering these texts improves your linguistic abilities.' },
            { type: 'DiscoverItem', itemId: `${cityId}-artifact-0`, cityId, description: 'A reference inside points to something tangible.' }
        ];
        default: return [{ type: 'NoEffect' }];
    }
}

function siteEffects(cityId: string, index: number): ItemEffect[] {
    switch (index) {
        case 0: return [
            { type: 'GainTrait', trait: 'historically-minded', description: 'Study of this place shifts your perspective permanently.' }
        ];
        case 1: return [
            { type: 'GainTrait', trait: 'superstitious', description: 'What you witness here makes you wary of unseen forces.' },
            { type: 'DiscoverItem', itemId: `${cityId}-book-1`, cityId, description: 'Someone left a written record of this place.' }
        ];
        case 2: return [
            { type: 'DiscoverItem', itemId: `${cityId}-artifact-1`, cityId, description: 'Hidden within the site is something worth taking.' }
        ];
        default: return [{ type: 'NoEffect' }];
    }
}

function patronEffects(cityId: string, index: number): ItemEffect[] {
    switch (index) {
        case 0: return [
            { type: 'GainSkill', skill: 'networking', description: 'This connection expands your network considerably.' }
        ];
        case 1: return [
            { type: 'AddFollower', skills: ['persuasion', 'networking'], description: 'Someone drawn to your work seeks to join the circle.' }
        ];
        case 2: return [
            { type: 'GainSkill', skill: 'persuasion', description: 'Engaging with this person hones your persuasion.' },
            { type: 'DiscoverItem', itemId: `${cityId}-book-0`, cityId, description: 'They recommend a text worth tracking down.' }
        ];
        default: return [{ type: 'NoEffect' }];
    }
}

function artifactEffects(cityId: string, index: number): ItemEffect[] {
    switch (index) {
        case 0: return [
            { type: 'GainSkill', skill: 'occult-knowledge', description: 'Handling this object deepens your occult knowledge.' },
            { type: 'DiscoverItem', itemId: `${cityId}-site-0`, cityId, description: 'Studying it reveals a connected location.' }
        ];
        case 1: return [
            { type: 'GainTrait', trait: 'marked', description: 'Something notices your interest. You feel watched.' },
            { type: 'DiscoverItem', itemId: `${cityId}-patron-0`, cityId, description: 'Through dark channels, a contact emerges.' }
        ];
        default: return [{ type: 'NoEffect' }];
    }
}

// ── Item factories ─────────────────────────────────────────────────────────

function makeBook(cityId: string, index: number): WorldItem {
    return {
        id: `${cityId}-book-${index}`,
        cityId,
        type: 'book',
        name: generateBookName(),
        flavorDescription: '',
        discoveredBy: 'research-at-libraries',
        effects: bookEffects(cityId, index),
    };
}

function makeSite(cityId: string, index: number): WorldItem {
    return {
        id: `${cityId}-site-${index}`,
        cityId,
        type: 'site',
        name: generateSiteName(),
        flavorDescription: '',
        discoveredBy: 'explore-historic-sites',
        effects: siteEffects(cityId, index),
    };
}

function makePatron(cityId: string, index: number): WorldItem {
    return {
        id: `${cityId}-patron-${index}`,
        cityId,
        type: 'patron',
        name: generatePatronName(cityId),
        flavorDescription: '',
        discoveredBy: 'visit-coffee-shops',
        effects: patronEffects(cityId, index),
    };
}

function makeArtifact(cityId: string, index: number): WorldItem {
    return {
        id: `${cityId}-artifact-${index}`,
        cityId,
        type: 'artifact',
        name: generateArtifactName(),
        flavorDescription: '',
        discoveredBy: 'attend-cultural-events',
        effects: artifactEffects(cityId, index),
    };
}

// 3 books + 3 sites + 3 patrons + 2 artifacts = 11 items per city
function generateCityItems(cityId: string): WorldItem[] {
    const items: WorldItem[] = [];
    for (let i = 0; i < 3; i++) items.push(makeBook(cityId, i));
    for (let i = 0; i < 3; i++) items.push(makeSite(cityId, i));
    for (let i = 0; i < 3; i++) items.push(makePatron(cityId, i));
    for (let i = 0; i < 2; i++) items.push(makeArtifact(cityId, i));
    return items;
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
        console.log(`[worldgen] ${cityId}: ${items[cityId].length} items generated`);
    }

    const total = Object.values(items).flat().length;
    console.log(`[worldgen] World ready — ${cities.length} cities, ${total} total items`);

    return { cities, items };
}
