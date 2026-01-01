import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Game.css';
import { CARD_SPREADS, generateInitialGameState, getNarrativeAndGameState } from './game/reading';

export default function CultCardSelection() {
  const [currentSpread, setCurrentSpread] = useState<number>(0);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [flippedCard, setFlippedCard] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [narrative, setNarrative] = useState<Narrative | null>(null);
  const navigate = useNavigate();

  const handleCardClick = (cardId: string) => {
    if (flippedCard === cardId) {
      // Confirm selection
      const newSelections = [...selectedCards, cardId];
      setSelectedCards(newSelections);
      setFlippedCard(null);
      
      if (currentSpread < CARD_SPREADS.length - 1) {
        setCurrentSpread(currentSpread + 1);
      } else {
        generateNarrative(newSelections);
      }
    } else {
      // Flip card
      setFlippedCard(cardId);
    }
  };

  const generateNarrative = async (selections: string[]) => {
    setIsGenerating(true);

    const selectedCards: Card[] = selections.map((id, idx) => {
      const spread = CARD_SPREADS[idx];
      const card = spread.cards.find(c => c.id === id);
      if (!card) throw new Error(`Card with id ${id} not found in spread ${spread.title}`);
      return card;
    });

    const narrative = await getNarrativeAndGameState(selectedCards);
    setNarrative(narrative);

    setIsGenerating(false);
  };

  if (narrative) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 text-amber-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-amber-400" />
            <h1 className="text-4xl font-serif mb-2">The Reading Is Complete</h1>
          </div>
          
          <div className="bg-black/40 border-2 border-amber-600/30 rounded-lg p-8 backdrop-blur mb-8">
            <div className="prose prose-invert prose-amber max-w-none">
              <p className="text-lg leading-relaxed whitespace-pre-wrap">{narrative.narrative}</p>
            </div>
          </div>

          <div className="bg-black/40 border-2 border-purple-600/30 rounded-lg p-6 backdrop-blur mb-8">
            <h2 className="text-xl font-serif text-purple-300 mb-4">Initial Game State</h2>
            <pre className="text-xs text-amber-100/80 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(narrative.gameState, null, 2)}
            </pre>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                setCurrentSpread(0);
                setSelectedCards([]);
                setNarrative(null);
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
              setCurrentSpread(0);
              setSelectedCards([]);
              setFlippedCard(null);
              setNarrative(null);
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

        {isGenerating && (
          <div className="text-center">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-amber-400 animate-spin" />
            <p className="text-amber-300">The cards reveal your fate...</p>
          </div>
        )}
      </div>
    </div>
  );
}
