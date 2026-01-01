import { allFakers, faker, fakerNB_NO } from "@faker-js/faker";
import { fakerAR, fakerCS_CZ, fakerEN_US, fakerEN_GB, fakerEN_IN, fakerTR, fakerJA, fakerPL, fakerES_MX, fakerHE, fakerZH_CN, fakerEL, Faker } from '@faker-js/faker';
import { transliterate } from "transliteration";

export const CARD_SPREADS: Spread[] = [
  {
    title: "The Seeker",
    meaning: "Who you are as the cult leader",
    prompt: "The first card reveals the seeker. Who walks this path?",
    cards: [
      { id: 'fool', name: 'The Fool', description: 'Gold has lost its luster. Pleasure rings hollow.', mechanicalDesc: 'Wealthy dilettante, seeking transcendence beyond pleasure' },
      { id: 'hanged', name: 'The Hanged Man', description: 'Through suffering, revelation. Through sacrifice, truth.', mechanicalDesc: 'Self-sacrificing ascetic, demanding devotion' },
      { id: 'hermit', name: 'The Hermit', description: 'Alone with forbidden texts. Alone with understanding.', mechanicalDesc: 'Isolated scholar, truth found through study' },
      { id: 'tower', name: 'The Tower', description: 'What breaks can be remade. What falls can rise darker.', mechanicalDesc: 'Shattered soul, rebuilt in occult fire' },
      { id: 'magician', name: 'The Magician', description: 'Words bend minds. Presence commands devotion.', mechanicalDesc: 'Natural charismatic, a cult of personality' }
    ]
  },
  {
    title: "The Gateway",
    meaning: "How you discovered the hidden world",
    prompt: "The second card shows the gateway. How did the hidden world open to you?",
    cards: [
      { id: 'inheritance', name: 'The Bequest', description: 'Left to you by hands now cold. Their work unfinished.', mechanicalDesc: 'Received from another: grimoire, property, dying words' },
      { id: 'accident', name: 'The Accident', description: 'You witnessed what should remain unseen.', mechanicalDesc: 'Stumbled upon it, witnessed the impossible' },
      { id: 'bargain', name: 'The Bargain', description: 'You asked. Something answered. The price was paid.', mechanicalDesc: 'Sought it deliberately and paid a price' },
      { id: 'dream', name: 'The Dream', description: 'It whispers in sleep. It calls in waking. It chose you.', mechanicalDesc: 'Called by visions, chosen by forces beyond' },
      { id: 'theft', name: 'The Theft', description: 'Taken from those who hoarded knowledge. They search still.', mechanicalDesc: 'Taken from rival, institution, or collector' }
    ]
  },
  {
    title: "The Mystery",
    meaning: "What occult knowledge you uncovered",
    prompt: "The third card reveals the mystery at your heart. What truth did you uncover?",
    cards: [
      { id: 'eye', name: 'The Watching Eye', description: 'They see us. They have always seen us. They can be called.', mechanicalDesc: 'Entities observe and can be contacted' },
      { id: 'words', name: 'The Hidden Words', description: 'Symbols that ache to look upon. Language that reshapes.', mechanicalDesc: 'A language of symbols with real power' },
      { id: 'bleeding', name: 'The Bleeding World', description: 'The walls are thin. In certain places, they tear.', mechanicalDesc: 'Places where reality is thin, can be pierced' },
      { id: 'pact', name: 'The Ancient Pact', description: 'The old agreements remain. The signatures fade but hold.', mechanicalDesc: 'Old contracts between humans and forces' },
      { id: 'transformation', name: 'The Transformation', description: 'Flesh is mutable. Mind is clay. What limits exist?', mechanicalDesc: 'Methods to change the self, become more' }
    ]
  },
  {
    title: "The Horizon",
    meaning: "Your ultimate goal",
    prompt: "The fourth card points toward the horizon. What do you seek?",
    cards: [
      { id: 'crown', name: 'The Crown', description: 'To move nations. To shape epochs. To wield.', mechanicalDesc: 'Power to influence and build' },
      { id: 'key', name: 'The Key', description: 'Every lock. Every door. Every hidden thing revealed.', mechanicalDesc: 'Knowledge, understanding of all mysteries' },
      { id: 'doorway', name: 'The Doorway', description: 'Beyond flesh. Beyond death. Beyond the threshold.', mechanicalDesc: 'Transcendence, escape from mortality' },
      { id: 'shield', name: 'The Shield', description: 'Something comes. You must be ready. They must survive.', mechanicalDesc: 'Protection against threats to come' },
      { id: 'dawn', name: 'The Dawn', description: 'The world as it is must end. What follows is yours to forge.', mechanicalDesc: 'Transform the world itself, bring new age' }
    ]
  },
  {
    title: "The Circle",
    meaning: "Your initial followers",
    prompt: "The final card shows the circle. Who stands with you at the beginning?",
    cards: [
      { id: 'devoted', name: 'The Devoted Few', description: 'Two, perhaps three. They believe utterly. Ask nothing.', mechanicalDesc: '2-3 believers, utterly committed' },
      { id: 'curious', name: 'The Curious Circle', description: 'Four or five seekers. Intrigued but uncertain. Watching.', mechanicalDesc: '4-5 seekers, diverse but uncertain' },
      { id: 'bound', name: 'The Bound Companions', description: 'Three souls tied to yours by blood or oath. Complicated.', mechanicalDesc: '3 with personal ties, complicated loyalty' },
      { id: 'desperate', name: 'The Desperate', description: 'Four or five who grasp at hope. Grateful. Fragile.', mechanicalDesc: '4-5 who need what you offer, unstable' },
      { id: 'initiated', name: 'The Initiated', description: 'Two who already walk the path. Useful. Dangerous.', mechanicalDesc: '2 who already know the occult, experienced but agenda-driven' }
    ]
  }
];

const CITIES = [
  { id: 'prague', name: 'Prague', flavor: 'alchemical history, astronomical mysteries', faker: fakerCS_CZ },
  { id: 'alexandria', name: 'Alexandria', flavor: 'ancient libraries, lost knowledge', faker: fakerAR, needs_transliteration: true },
  { id: 'salem', name: 'Salem, MA', flavor: 'witch trials, puritan secrets', faker: fakerEN_US },
  { id: 'istanbul', name: 'Istanbul', flavor: 'crossroads of empires, layered histories', faker: fakerTR },
  { id: 'new-orleans', name: 'New Orleans', flavor: 'voodoo, jazz, swamp mysteries', faker: fakerEN_US },
  { id: 'kyoto', name: 'Kyoto', flavor: 'temples, shrines, ritual traditions', faker: fakerJA, needs_transliteration: true },
  { id: 'edinburgh', name: 'Edinburgh', flavor: 'underground vaults, enlightenment darkness', faker: fakerEN_GB },
  { id: 'marrakech', name: 'Marrakech', flavor: 'souks, desert mysticism', faker: fakerAR, needs_transliteration: true },
  { id: 'reykjavik', name: 'Reykjavik', flavor: 'sagas, volcanic landscapes', faker: fakerNB_NO },
  { id: 'varanasi', name: 'Varanasi', flavor: 'death rituals, river ghats', faker: fakerEN_IN },
  { id: 'cairo', name: 'Cairo', flavor: 'pyramids, desert tombs', faker: fakerAR, needs_transliteration: true },
  { id: 'san-francisco', name: 'San Francisco', flavor: 'counterculture, tech occultism', faker: fakerEN_US },
  { id: 'krakow', name: 'Kraków', flavor: 'medieval alchemy, salt mines', faker: fakerPL },
  { id: 'mexico-city', name: 'Mexico City', flavor: 'Aztec ruins beneath modernity', faker: fakerES_MX },
  { id: 'jerusalem', name: 'Jerusalem', flavor: 'three faiths, ancient stones', faker: fakerHE, needs_transliteration: true },
  { id: 'london', name: 'London', flavor: 'Victorian occultism, foggy secrets', faker: fakerEN_GB },
  { id: 'shanghai', name: 'Shanghai', flavor: 'colonial decay, modern excess', faker: fakerZH_CN, needs_transliteration: true },
  { id: 'sedona', name: 'Sedona, AZ', flavor: 'vortexes, new age seekers', faker: fakerEN_US },
  { id: 'athens', name: 'Athens', flavor: 'philosophical ruins, oracle sites', faker: fakerEL, needs_transliteration: true },
  { id: 'santa-fe', name: 'Santa Fe', flavor: 'desert spirituality, art colonies', faker: fakerES_MX }
];

const ARCHETYPE_CITIES : { [key: string]: string[] } = {
  'fool': ['san-francisco', 'shanghai', 'london', 'new-orleans', 'mexico-city', 'istanbul', 'sedona'],
  'hanged': ['varanasi', 'kyoto', 'jerusalem', 'sedona', 'athens', 'santa-fe', 'cairo'],
  'hermit': ['alexandria', 'edinburgh', 'prague', 'krakow', 'london', 'kyoto', 'istanbul', 'athens'],
  'tower': ['new-orleans', 'salem', 'edinburgh', 'reykjavik', 'mexico-city', 'cairo', 'jerusalem'],
  'magician': ['san-francisco', 'london', 'shanghai', 'marrakech', 'prague', 'istanbul', 'athens', 'new-orleans']
};

function generateName(cityId : string) : string {
  const city = CITIES.find(candidate => candidate.id === cityId);
  const faker = city?.faker || fakerEN_US;

  const name = faker.person.fullName();
  if (city?.needs_transliteration) {
    return `${name} (${transliterate(name)})`;
  } else {
    return name;
  }
}

export async function generateInitialGameState(selectedCards: Card[]): Promise<GameState> {
  // Determine starting city based on leader archetype
  const archetype : string = selectedCards[0].id;
  const possibleCities = ARCHETYPE_CITIES[archetype] || CITIES.map(city => city.id);
  const startingCity = possibleCities[Math.floor(Math.random() * possibleCities.length)];

  const leaderName = generateName(startingCity);

  // Generate initial game state template with placeholders
    const gameStateTemplate: GameState = {
      leader: {
        name: leaderName,
        background: "[LEADER_BACKGROUND]",
        archetype: selectedCards[0].id,
        traits: "[LEADER_TRAITS]"
      },
      discovery: {
        type: selectedCards[1].id,
        artifact: {
          name: "[ARTIFACT_NAME]",
          description: "[ARTIFACT_DESC]"
        },
        details: "[DISCOVERY_DETAILS]"
      },
      mystery: {
        type: selectedCards[2].id,
        knownRituals: ["[RITUAL_NAME]"],
        paradigm: "[MAGIC_PARADIGM]"
      },
      goal: {
        type: selectedCards[3].id,
        description: "[GOAL_DESC]"
      },
      followers: [],
      hqLocation: startingCity,
      week: 1
    };

    let followerCount: number = 3;
    let circleCard: string = selectedCards[4].id;

    for (let i = 0; i < followerCount; i++) {
      const followerName = generateName(startingCity);
      gameStateTemplate.followers.push({
        name: followerName,
        background: `[FOLLOWER_${i + 1}_BACKGROUND]`,
        location: startingCity,
        traits: [circleCard],
        skills: [`[FOLLOWER_${i + 1}_SKILL_1]`, `[FOLLOWER_${i + 1}_SKILL_2]`]
      });
    }
    return gameStateTemplate;
  }

export async function getNarrativeAndGameState(selectedCards: Card[]): Promise<Narrative> {
    const gameStateTemplate: GameState = await generateInitialGameState(selectedCards);

    const selectedCardDetails: string = selectedCards.map((card, idx) => {
      const spread = CARD_SPREADS[idx];
      return `${spread.meaning}: ${card.mechanicalDesc}`;
    }).join('\n');

    try {
      const response = await fetch('http://torment-nexus.local:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemma3:12b',
          prompt: `You are creating the origin story and initial game state for a cult management game. Based on these characteristics:

${selectedCardDetails}

And this game state template:
${JSON.stringify(gameStateTemplate, null, 2)}

Your task is to:
1. Write a concrete 2-paragraph narrative (under 150 words) in second person describing how this cult began
2. Fill in ALL the placeholders in the JSON template above with specific, concrete details

CRITICAL: You must return ONLY valid JSON in this exact format:
{
  "narrative": "your narrative text here...",
  "gameState": { ...the completed game state... }
}

Guidelines:
- Be SPECIFIC: for example, "assistant professor of mathematics at Miskatonic Community College" not "learned person"
- Give followers real names and concrete backgrounds
- Choose a real city for the starting location
- Make artifact names evocative but concrete
- Leader traits should be 2-3 adjectives in an array like ["scholarly", "obsessive"]
- Follower skills should be 1-2 concrete skills in an array like ["research", "persuasion"]
- Make everything consistent with the card choices
- Make the narrative consistent with the game state details
- The narrative should be in two paragraphs:
  - The first paragraph should be the founder's origin and discovery of the occult
  - The second paragraph should describe how they began the cult and the initial followers

Return ONLY the JSON object, no other text.`,
          stream: false,
          format: 'json', // This tells Ollama to enforce JSON output
          keep_alive: '60m',
        })
      });

      const data = await response.json();
      console.log('API response:', data);
      const text = data.response; // Ollama puts the response in data.response

      // Try to parse the JSON response
      let parsed: Narrative;
      try {
        // Remove markdown code blocks if present
        const cleaned: string = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(cleaned);
        
        // Save to localStorage
        try {
          localStorage.setItem('cultGameState', JSON.stringify(parsed.gameState));
          console.log('Game state saved to localStorage');
        } catch (storageError) {
          console.error('Failed to save to localStorage:', storageError);
        }
        
        return parsed;
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        return {
          narrative: 'The cards blur and shift. The reading is unclear. Perhaps you should try again...',
          gameState: gameStateTemplate
        };
      }
    } catch (error) {
      console.error('API error:', error);
      return {
        narrative: 'The cards blur and shift. The reading is unclear. Perhaps you should try again...',
        gameState: gameStateTemplate
      };
    }
  }
    