import { CITIES } from "./world";
import { Card, GameState, Spread } from "./types";
import { generateLeader, generateFollowers } from "./followers";

interface Narrative {
  narrative: string;
  gameState: GameState;
}

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
      { id: 'devoted', name: 'The Devoted Few', description: 'They believe utterly. Ask nothing.', mechanicalDesc: '3 believers, utterly committed' },
      { id: 'curious', name: 'The Curious Circle', description: 'Intrigued but uncertain. Watching.', mechanicalDesc: '3 seekers, diverse but uncertain' },
      { id: 'bound', name: 'The Bound Companions', description: 'Souls tied to yours by blood or oath. Complicated.', mechanicalDesc: '3 with personal ties, complicated loyalty' },
      { id: 'desperate', name: 'The Desperate', description: 'Those who grasp at hope. Grateful. Fragile.', mechanicalDesc: '3 who need what you offer, unstable' },
      { id: 'initiated', name: 'The Initiated', description: 'They who already walk the path. Useful. Dangerous.', mechanicalDesc: '3 who already know the occult, experienced but agenda-driven' }
    ]
  }
];

const ARCHETYPE_CITIES : { [key: string]: string[] } = {
  'fool': ['san-francisco', 'shanghai', 'london', 'new-orleans', 'mexico-city', 'istanbul', 'sedona'],
  'hanged': ['varanasi', 'kyoto', 'jerusalem', 'sedona', 'athens', 'santa-fe', 'cairo'],
  'hermit': ['alexandria', 'edinburgh', 'prague', 'krakow', 'london', 'kyoto', 'istanbul', 'athens'],
  'tower': ['new-orleans', 'salem', 'edinburgh', 'reykjavik', 'mexico-city', 'cairo', 'jerusalem'],
  'magician': ['san-francisco', 'london', 'shanghai', 'marrakech', 'prague', 'istanbul', 'athens', 'new-orleans']
};

export async function generateInitialGameState(selectedCards: Card[], cultName: string, leaderName: string, cityId?: string): Promise<GameState> {
  // Determine starting city based on leader archetype or use provided city
  const archetype : string = selectedCards[0].id;
  const possibleCities = ARCHETYPE_CITIES[archetype] || CITIES.map(city => city.id);
  const startingCity = cityId || possibleCities[Math.floor(Math.random() * possibleCities.length)];
  
  console.log('generateInitialGameState: using city', startingCity, cityId ? '(provided)' : '(random)');

  // Generate leader with skills based on archetype
  const leader = generateLeader(leaderName, archetype);

  // Generate followers with skills based on circle type
  const circleCard: string = selectedCards[4].id;
  const followers = generateFollowers(circleCard, startingCity, 3);

  // Generate initial game state template with placeholders
  const gameStateTemplate: GameState = {
    cultName: cultName,
    leader: leader,
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
    followers: followers,
    hqLocation: startingCity,
    week: 1
  };

  return gameStateTemplate;
}

export async function getNarrative(selectedCards: Card[], gameStateTemplate : GameState, addToNarrative: (text: string) => void, host?: string): Promise<string | undefined> {
    const selectedCardDetails: string = selectedCards.map((card, idx) => {
      const spread = CARD_SPREADS[idx];
      return `${spread.meaning}: ${card.mechanicalDesc}`;
    }).join('\n');

    try {
      const hostUrl = host ? `http://${host}:11434` : 'http://torment-nexus.local:11434';
      const response = await fetch(`${hostUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemma3:12b',
          prompt: `You are creating the origin story for a cult management game. Based on these characteristics:

<characteristics>
${selectedCardDetails}
</characteristics>

And this game state template:
<game_state>
${JSON.stringify(gameStateTemplate, null, 2)}
</game_state>

Your task is to write a concrete 2-paragraph narrative (under 150 words) in second person describing how this cult began.

Guidelines:
- Invent details for all placeholders in the game state template
- Be SPECIFIC: for example, "assistant professor of mathematics at University of Cairo" not "learned person", or "ancient Sumerian tablet" not "old artifact"
- If and when you use fictional names, make them unique to the setting, or based on real folklore or mythology. Do not use the work of other authors (e.g. "Azathoth" is WRONG. "Quetzalcoatl" is better. A made-up name is okay.)
- Give followers real names and concrete backgrounds
- The leader and followers should have professions and backgrounds based on their skills
- Choose a real city for the starting location
- Make artifact names evocative but concrete
- Make everything consistent with the card choices and the game state template
- The narrative should be in two paragraphs:
  - The first paragraph should be the founder's origin and discovery of the occult
  - The second paragraph should describe how they began the cult and the initial followers
- ONLY output the narrative text, do NOT output the game state or any other explanation
`,
          stream: true,
          keep_alive: '60m'
        })
      });

      const reader = response.body?.getReader();
      if (!reader) {
        console.error('No response body');
        return undefined;
      }

      const decoder = new TextDecoder();
      let done = false;
      let text = '';
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');
          for (const line of lines) {
            let json: any;
            try {
              json = JSON.parse(line);
            } catch (e) {
              console.error('Failed to parse line as JSON:', line);
              continue;
            }
            text += json.response;
            addToNarrative(json.response);
            if (json.done) {
              // Generation complete
              done = true;
              break;
            }
          }
        }
      }
      return text;

    } catch (error) {
      console.error('API error:', error);
      return undefined;
    }
  }

  export async function getGameState(narrativeText: string, gameStateTemplate: GameState, host?: string): Promise<GameState | undefined> {
    try {
      const hostUrl = host ? `http://${host}:11434` : 'http://torment-nexus.local:11434';
      const response = await fetch(`${hostUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gemma3:12b',
          prompt: `You are filling in the initial game state for a cult management game from its initial narrative.
Based on this narrative:
<narrative>
${narrativeText}
</narrative>

And this game state template with placeholders:
<game_state_template>
${JSON.stringify(gameStateTemplate, null, 2)}
</game_state_template>

Your task is to fill in the placeholders in the game state template with concrete details from the narrative.
Return the full game state as valid JSON. ONLY return the JSON, do NOT include any other text.

Ensure that:
- All placeholders are filled in with specific details from the narrative (if they exist). If they don't exist in the narrative, create plausible details consistent with the narrative.
- The JSON structure is preserved and valid.
- Placeholder fields are in square breackets (e.g., "[ARTIFACT_NAME]"). ONLY replace those fields. Make NO OTHER changes to the structure or field names.
`,
          stream: false,
          format: 'json', // This tells Ollama to enforce JSON output
          keep_alive: '60m'
        })
      });

      const data = await response.json();
      console.log('API response for game state:', data);
      const text = data.response; // Ollama puts the response in data.response

      // Try to parse the JSON response
      let parsed: GameState;
      try {
        // Remove markdown code blocks if present
        const cleaned: string = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsed = JSON.parse(cleaned);
        
        return parsed;
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        return undefined;
      }
    } catch (error) {
      console.error('API error:', error);
      return undefined;
    }
  }
    
