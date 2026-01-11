import { transliterate } from "transliteration";
import { fakerEN_US } from "@faker-js/faker";
import { Skill, Follower, Leader } from "./types";
import { CITIES } from "./world";

export const skills: Record<string, Skill> = {
  // Social
  networking: {
    id: "networking",
    type: "social",
    name: "Networking",
    description: "Making connections, finding people"
  },
  persuasion: {
    id: "persuasion",
    type: "social",
    name: "Persuasion",
    description: "Convincing people, recruiting"
  },
  performance: {
    id: "performance",
    type: "social",
    name: "Performance",
    description: "Public speaking, presenting, captivating"
  },

  // Intellectual
  research: {
    id: "research",
    type: "intellectual",
    name: "Research",
    description: "Finding information systematically"
  },
  "occult-knowledge": {
    id: "occult-knowledge",
    type: "intellectual",
    name: "Occult Knowledge",
    description: "Understanding mystical/esoteric concepts"
  },
  analysis: {
    id: "analysis",
    type: "intellectual",
    name: "Analysis",
    description: "Interpreting patterns, understanding meaning"
  },
  languages: {
    id: "languages",
    type: "intellectual",
    name: "Languages",
    description: "Reading/translating texts"
  },

  // Physical
  stealth: {
    id: "stealth",
    type: "physical",
    name: "Stealth",
    description: "Moving undetected, avoiding notice"
  },
  observation: {
    id: "observation",
    type: "physical",
    name: "Observation",
    description: "Noticing details, surveying spaces"
  },
  physical: {
    id: "physical",
    type: "physical",
    name: "Physical",
    description: "Athletics, endurance, breaking in"
  },

  // Practical
  wealth: {
    id: "wealth",
    type: "practical",
    name: "Wealth",
    description: "Having/accessing money and resources"
  },
  artistic: {
    id: "artistic",
    type: "practical",
    name: "Artistic",
    description: "Creative expression, making things"
  },
  survival: {
    id: "survival",
    type: "practical",
    name: "Survival",
    description: "Navigating difficult/dangerous environments"
  }
};

// Skill sets for leader archetypes (The Seeker cards)
const ARCHETYPE_SKILLS: Record<string, string[]> = {
  'fool': ['wealth', 'networking', 'persuasion', 'artistic', 'performance'],
  'hanged': ['occult-knowledge', 'survival', 'persuasion', 'performance'],
  'hermit': ['research', 'occult-knowledge', 'analysis', 'languages'],
  'tower': ['occult-knowledge', 'survival', 'stealth', 'analysis'],
  'magician': ['persuasion', 'performance', 'networking', 'analysis']
};

// Skill sets for follower circles (The Circle cards)
const CIRCLE_SKILLS: Record<string, string[]> = {
  'devoted': ['persuasion', 'occult-knowledge', 'networking', 'performance'],
  'curious': ['research', 'analysis', 'observation', 'networking'],
  'bound': ['networking', 'persuasion', 'wealth', 'stealth'],
  'desperate': ['survival', 'physical', 'stealth', 'observation'],
  'initiated': ['occult-knowledge', 'research', 'languages', 'analysis']
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

function pickRandomSkills(skillPool: string[], count: number): string[] {
  const shuffled = [...skillPool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function generateLeader(leaderName: string, archetypeId: string): Leader {
  const skillPool = ARCHETYPE_SKILLS[archetypeId] || ['occult-knowledge', 'persuasion'];
  const leaderSkills = pickRandomSkills(skillPool, 2);
  
  return {
    name: leaderName,
    background: "[LEADER_BACKGROUND]",
    archetype: archetypeId,
    traits: "[LEADER_TRAITS]",
    skills: leaderSkills
  };
}

export function generateFollowers(circleId: string, cityId: string, count: number = 3): Follower[] {
  const skillPool = CIRCLE_SKILLS[circleId] || ['networking', 'persuasion'];
  const followers: Follower[] = [];

  for (let i = 0; i < count; i++) {
    const followerName = generateName(cityId);
    const followerSkills = pickRandomSkills(skillPool, 2);
    
    followers.push({
      id: `initial-follower-${i + 1}`,
      name: followerName,
      background: `[FOLLOWER_${i + 1}_BACKGROUND]`,
      location: cityId,
      traits: [circleId],
      skills: followerSkills
    });
  }

  return followers;
}
