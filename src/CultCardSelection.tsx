import React, { useState, useEffect } from 'react';
import { Sparkles, User, Users, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Game.css';
import { CARD_SPREADS, generateInitialGameState, getNarrative, getGameState, generateCultName } from './game/reading';
import { Card, GameState, Spread } from './game/types';
import { getCityById, CITIES } from './game/world';

export default function CultCardSelection() {
  const [currentSpread, setCurrentSpread] = useState<number>(0);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [flippedCard, setFlippedCard] = useState<string | null>(null);
  const [narrative, setNarrative] = useState<string>('');
  const [gameState, setGameState] = useState<GameState>({} as GameState);
  const navigate = useNavigate();
  const [readingState, setNarrativeState] = useState<'selection' | 'naming' | 'narrating' | 'ready'>('selection');
  const [cultName, setCultName] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [hasUserSetName, setHasUserSetName] = useState(false);
  const [hasUserSetCultName, setHasUserSetCultName] = useState(false);

  // When entering naming state, initialize city and generate suggested name
  useEffect(() => {
    if (readingState === 'naming' && !selectedCity) {
      // Pick random city based on archetype
      const archetype = selectedCards[0]; // The Seeker card
      const archetypeId = CARD_SPREADS[0].cards.find(c => c.id === archetype)?.id || 'hermit';
      
      // Import the ARCHETYPE_CITIES logic from reading.ts
      const archetypeCities: { [key: string]: string[] } = {
        'fool': ['san-francisco', 'shanghai', 'london', 'new-orleans', 'mexico-city', 'istanbul', 'sedona'],
        'hanged': ['varanasi', 'kyoto', 'jerusalem', 'sedona', 'athens', 'santa-fe', 'cairo'],
        'hermit': ['alexandria', 'edinburgh', 'prague', 'krakow', 'london', 'kyoto', 'istanbul', 'athens'],
        'tower': ['new-orleans', 'salem', 'edinburgh', 'reykjavik', 'mexico-city', 'cairo', 'jerusalem'],
        'magician': ['san-francisco', 'london', 'shanghai', 'marrakech', 'prague', 'istanbul', 'athens', 'new-orleans']
      };
      
      const possibleCities = archetypeCities[archetypeId] || CITIES.map(city => city.id);
      const randomCity = possibleCities[Math.floor(Math.random() * possibleCities.length)];
      
      console.log('Initial city selection:', randomCity, 'for archetype:', archetypeId);
      setSelectedCity(randomCity);
    }
  }, [readingState, selectedCards, selectedCity]);

  // When city changes, generate a new suggested name (if user hasn't customized it)
  useEffect(() => {
    if (selectedCity && !hasUserSetName) {
      const city = getCityById(selectedCity);
      if (city) {
        const faker = city.faker;
        const suggestedName = faker.person.fullName();
        console.log('Suggesting name:', suggestedName, 'for city:', selectedCity);
        setLeaderName(suggestedName);
      }
    }
  }, [selectedCity, hasUserSetName]);

  // Initialize cult name when entering naming state
  useEffect(() => {
    if (readingState === 'naming' && !hasUserSetCultName && selectedCards.length >= 4) {
      const mysteryId = selectedCards[2]; // The Mystery card (index 2)
      const horizonId = selectedCards[3]; // The Horizon card (index 3)
      const suggestedCultName = generateCultName(mysteryId, horizonId);
      console.log('Suggesting cult name:', suggestedCultName);
      setCultName(suggestedCultName);
    }
  }, [readingState, selectedCards, hasUserSetCultName]);

  const handleCardClick = (cardId: string) => {
    if (flippedCard === cardId) {
      // Confirm selection
      const newSelections = [...selectedCards, cardId];
      setSelectedCards(newSelections);
      setFlippedCard(null);
      
      if (currentSpread < CARD_SPREADS.length - 1) {
        setCurrentSpread(currentSpread + 1);
      } else {
        // All cards selected, move to naming state
        setNarrativeState('naming');
      }
    } else {
      // Flip card
      setFlippedCard(cardId);
    }
  };

  function reset() {
      setNarrativeState('selection');
      setCurrentSpread(0);
      setSelectedCards([]);
      setFlippedCard(null);
      setNarrative('');
      setGameState({} as GameState);
      setCultName('');
      setLeaderName('');
      setSelectedCity('');
      setHasUserSetName(false);
      setHasUserSetCultName(false);
  }

  function addToNarrative(text: string) {
    setNarrative((prev) => prev + text);
  }

  const generateNarrative = async () => {
    setNarrativeState('narrating');
    const selectedCardsData: Card[] = selectedCards.map((id, idx) => {
      const spread = CARD_SPREADS[idx];
      const card = spread.cards.find(c => c.id === id);
      if (!card) throw new Error(`Card with id ${id} not found in spread ${spread.title}`);
      return card;
    });

    const gameStateTemplate = await generateInitialGameState(selectedCardsData, cultName.trim(), leaderName.trim(), selectedCity);
    // Update template with user-provided names
    gameStateTemplate.cultName = cultName.trim();
    gameStateTemplate.leader.name = leaderName.trim();
    
    console.log('Generated game state template:', gameStateTemplate);
    const narrativeText = await getNarrative(selectedCardsData, gameStateTemplate, addToNarrative, window.location.hostname);
    const gameState = await getGameState(narrativeText || '', gameStateTemplate, window.location.hostname);
    
    if (gameState) {
      // Ensure the names from form are preserved
      gameState.cultName = cultName.trim();
      gameState.leader.name = leaderName.trim();
    }
    
    setGameState(gameState || {} as GameState);
    if (narrativeText && gameState) {
      try {
        localStorage.setItem('cultGameState', JSON.stringify(gameState));
        console.log('Game state saved to localStorage');
        setNarrativeState('ready');
      } catch (storageError) {
        console.error('Failed to save to localStorage:', storageError);
      }
    } else {
      alert('Failed to generate narrative or game state. Please try again.');
      reset();
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cultName.trim() || !leaderName.trim()) {
      alert('Please enter both a cult name and a leader name.');
      return;
    }
    generateNarrative();
  };

  // Name input screen
  if (readingState === 'naming') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 text-amber-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-amber-400 animate-pulse" />
            <h1 className="text-4xl font-serif mb-2">Name Your Destiny</h1>
            <p className="text-amber-200/70">Every cult needs a name. Every leader needs an identity.</p>
          </div>

          <form onSubmit={handleNameSubmit} className="space-y-8">
            <div className="bg-black/40 border-2 border-amber-600/30 rounded-lg p-8 backdrop-blur">
              <div className="mb-6">
                <label htmlFor="city" className="flex items-center gap-2 text-amber-300 mb-2">
                  <MapPin className="w-5 h-5" />
                  <span className="text-lg font-serif">The City</span>
                </label>
                <select
                  id="city"
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-amber-600/30 rounded text-amber-100 focus:outline-none focus:border-amber-500/50 transition-colors"
                >
                  {CITIES.map(city => (
                    <option key={city.id} value={city.id}>
                      {city.name} — {city.flavor}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-amber-300/50 mt-2">Where will your journey begin?</p>
              </div>

              <div className="mb-6">
                <label htmlFor="cult-name" className="flex items-center gap-2 text-amber-300 mb-2">
                  <Users className="w-5 h-5" />
                  <span className="text-lg font-serif">The Cult</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="cult-name"
                    type="text"
                    value={cultName}
                    onChange={(e) => {
                      setCultName(e.target.value);
                      setHasUserSetCultName(true);
                    }}
                    placeholder="The Order of the Veiled Truth..."
                    className="flex-1 px-4 py-3 bg-slate-900/50 border border-amber-600/30 rounded text-amber-100 placeholder-amber-300/30 focus:outline-none focus:border-amber-500/50 transition-colors"
                    maxLength={100}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const mysteryId = selectedCards[2];
                      const horizonId = selectedCards[3];
                      const newCultName = generateCultName(mysteryId, horizonId);
                      setCultName(newCultName);
                      setHasUserSetCultName(false);
                      console.log('Generated new cult name:', newCultName);
                    }}
                    className="px-4 py-3 bg-purple-800/50 hover:bg-purple-700/50 border border-amber-600/30 rounded text-amber-100 transition-colors whitespace-nowrap"
                    title="Generate a new cult name suggestion"
                  >
                    <Sparkles className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-amber-300/50 mt-2">What will they call your congregation?</p>
              </div>

              <div>
                <label htmlFor="leader-name" className="flex items-center gap-2 text-amber-300 mb-2">
                  <User className="w-5 h-5" />
                  <span className="text-lg font-serif">The Leader</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="leader-name"
                    type="text"
                    value={leaderName}
                    onChange={(e) => {
                      setLeaderName(e.target.value);
                      setHasUserSetName(true);
                    }}
                    placeholder="Margot Ashford..."
                    className="flex-1 px-4 py-3 bg-slate-900/50 border border-amber-600/30 rounded text-amber-100 placeholder-amber-300/30 focus:outline-none focus:border-amber-500/50 transition-colors"
                    maxLength={100}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const city = getCityById(selectedCity);
                      if (city) {
                        const newName = city.faker.person.fullName();
                        setLeaderName(newName);
                        setHasUserSetName(false);
                        console.log('Generated new suggested name:', newName);
                      }
                    }}
                    className="px-4 py-3 bg-purple-800/50 hover:bg-purple-700/50 border border-amber-600/30 rounded text-amber-100 transition-colors whitespace-nowrap"
                    title="Generate a new name suggestion"
                  >
                    <Sparkles className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-amber-300/50 mt-2">What name shall you be known by?</p>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                type="button"
                onClick={() => {
                  setNarrativeState('selection');
                  setCultName('');
                  setLeaderName('');
                  setSelectedCity('');
                  setHasUserSetName(false);
                  setHasUserSetCultName(false);
                }}
                className="px-6 py-3 bg-slate-800/50 hover:bg-slate-700/50 border border-amber-600/30 rounded text-amber-100 transition-colors"
              >
                Return to Cards
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-amber-800/50 hover:bg-amber-700/50 border border-amber-600/30 rounded text-amber-100 transition-colors font-serif text-lg"
              >
                Reveal Your Path
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Narration and ready screens
  if ((readingState === 'narrating') || (readingState === 'ready')) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 text-amber-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            {readingState === 'narrating' ? (
              <>
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-amber-400 animate-pulse" />
                <h1 className="text-4xl font-serif mb-2">Your Path Is Being Revealed...</h1>
              </>
            ) : (
              <>
                <Sparkles className="w-12 h-12 mx-auto mb-4 text-amber-400" />
                <h1 className="text-4xl font-serif mb-2">The Reading Is Complete</h1>
              </>
            )}
          </div>
          
          <div className="bg-black/40 border-2 border-amber-600/30 rounded-lg p-8 backdrop-blur mb-8">
            <div className="prose prose-invert prose-amber max-w-none">
              <p className="text-lg leading-relaxed whitespace-pre-wrap">{narrative}</p>
            </div>
          </div>

          <div className="bg-black/40 border-2 border-purple-600/30 rounded-lg p-6 backdrop-blur mb-8">
            <h2 className="text-xl font-serif text-purple-300 mb-4">Initial Game State</h2>
            <pre className="text-xs text-amber-100/80 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(gameState, null, 2)}
            </pre>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => { 
                reset();
              }}
              className="px-6 py-3 bg-purple-800/50 hover:bg-purple-700/50 border border-amber-600/30 rounded text-amber-100 transition-colors"
            >
              Begin Another Reading
            </button>
            <button
              onClick={() => {
                navigate('/game');
              }}
              className="px-6 py-3 bg-amber-800/50 hover:bg-amber-700/50 border border-amber-600/30 rounded text-amber-100 transition-colors"
              disabled={readingState !== 'ready'}
            >
              Begin Your Work
            </button>
          </div>
        </div>
      </div>
    );
  }

  const spread: Spread = CARD_SPREADS[currentSpread];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 text-amber-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-amber-400 animate-pulse" />
          <h1 className="text-4xl font-serif mb-2">The Reading</h1>
          <p className="text-amber-200/70">Card {currentSpread + 1} of {CARD_SPREADS.length}</p>
          <button
            onClick={() => {
              reset();
            }}
            className="mt-4 px-4 py-2 text-sm bg-slate-800/50 hover:bg-slate-700/50 border border-amber-600/30 rounded text-amber-200 transition-colors"
          >
            Reset Reading
          </button>
        </div>

        {/* Progress */}
        <div className="flex justify-center gap-2 mb-8">
          {CARD_SPREADS.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 w-12 rounded ${
                idx < currentSpread ? 'bg-amber-500' :
                idx === currentSpread ? 'bg-amber-400 animate-pulse' :
                'bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Selected Cards */}
        {selectedCards.length > 0 && (
          <div className="text-center mb-8 bg-black/30 border border-amber-600/20 rounded-lg p-4">
            <h3 className="text-sm text-amber-300/70 mb-2">Cards Drawn:</h3>
            <div className="flex flex-wrap justify-center gap-2">
              {selectedCards.map((cardId, idx) => {
                const spread = CARD_SPREADS[idx];
                const card: Card | undefined = spread.cards.find(c => c.id === cardId);
                return (
                  <span key={idx} className="text-sm text-amber-200 italic">
                    {card?.name || 'Unknown'}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Prompt */}
        <div className="text-center mb-12">
          <h2 className="text-2xl font-serif mb-2">{spread.title}</h2>
          <p className="text-xl text-amber-300/90 italic">{spread.prompt}</p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          {spread.cards.map((card) => {
            const isFlipped = flippedCard === card.id;
            
            return (
              <button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                className="relative aspect-[2/3] transition-all duration-500 transform hover:scale-105"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}
              >
                {/* Card Back */}
                <div
                  className="absolute inset-0 rounded-lg bg-gradient-to-br from-purple-900 to-slate-900 flex items-center justify-center"
                  style={{
                    backfaceVisibility: 'hidden',
                    border: '2px solid rgba(217, 119, 6, 0.5)',
                    boxSizing: 'border-box'
                  }}
                >
                  <Sparkles className="w-8 h-8 text-amber-500/50" />
                </div>

                {/* Card Front */}
                <div
                  className="absolute inset-0 rounded-lg bg-gradient-to-br from-amber-900/20 to-purple-900/20 p-4 flex flex-col justify-between backdrop-blur"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    border: '2px solid rgb(245, 158, 11)',
                    boxSizing: 'border-box'
                  }}
                >
                  <h3 className="text-lg font-serif text-amber-300">{card.name}</h3>
                  <p className="text-xs text-amber-100/70 mt-2 leading-relaxed">{card.description}</p>
                  <p className="text-xs text-amber-400 mt-2 italic">Click again to select</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
