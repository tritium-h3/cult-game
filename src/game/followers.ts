import { transliterate } from "transliteration";
import { fakerEN_US } from "@faker-js/faker";
import { Follower, Leader, Verb } from "./types";
import { CITIES } from "./world";

// Verb pools for leader archetypes (The Seeker cards)
const ARCHETYPE_VERBS: Record<string, Verb[]> = {
  'fool':     ['Talk', 'Perform', 'Work'],
  'hanged':   ['Study', 'Explore', 'Talk'],
  'hermit':   ['Study', 'Explore', 'Work'],
  'tower':    ['Explore', 'Study', 'Perform'],
  'magician': ['Talk', 'Perform', 'Study'],
};

// Verb pools for follower circles (The Circle cards)
const CIRCLE_VERBS: Record<string, Verb[]> = {
  'devoted':   ['Talk', 'Perform'],
  'curious':   ['Study', 'Explore'],
  'bound':     ['Work', 'Talk'],
  'desperate': ['Work', 'Explore'],
  'initiated': ['Study', 'Talk'],
};

function generateName(cityId: string): string {
  const city = CITIES.find(candidate => candidate.id === cityId);
  const faker = city?.faker || fakerEN_US;

  const name = faker.person.fullName();
  if (city?.needs_transliteration) {
    return `${name} (${transliterate(name)})`;
  } else {
    return name;
  }
}

function pickVerbs(pool: Verb[], count: number): Verb[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function generateLeader(leaderName: string, archetypeId: string): Leader {
  const pool = ARCHETYPE_VERBS[archetypeId] ?? ['Talk', 'Study'];
  return {
    name: leaderName,
    background: "[LEADER_BACKGROUND]",
    archetype: archetypeId,
    traits: "[LEADER_TRAITS]",
    verbs: pickVerbs(pool, 2),
  };
}

export function generateFollowers(circleId: string, cityId: string, count: number = 3): Follower[] {
  const pool = CIRCLE_VERBS[circleId] ?? ['Talk', 'Work'];
  const followers: Follower[] = [];

  for (let i = 0; i < count; i++) {
    const followerName = generateName(cityId);
    // Each follower gets 2 verbs; occasionally a third
    const verbCount = Math.random() < 0.25 ? 3 : 2;
    const allVerbs: Verb[] = ['Study', 'Talk', 'Explore', 'Perform', 'Work'];
    // Primary verbs from circle pool, extras from full set
    const primary = pickVerbs(pool, Math.min(verbCount, pool.length));
    const extras   = pickVerbs(allVerbs.filter(v => !primary.includes(v)), Math.max(0, verbCount - primary.length));
    const verbs    = [...primary, ...extras] as Verb[];

    followers.push({
      id: `initial-follower-${i + 1}`,
      name: followerName,
      background: `[FOLLOWER_${i + 1}_BACKGROUND]`,
      location: cityId,
      traits: [circleId],
      verbs,
    });
  }

  return followers;
}

