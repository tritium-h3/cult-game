import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, User, Users, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './Game.css';
import { Table, Card, Sheet, Slot, type CardData } from './ui';
import { CARD_SPREADS } from './game/reading';
import type { Card as TarotCardType } from './game/types';
import { getCityById, CITIES } from './game/world';
import { useGameSocket } from './hooks/useGameSocket';

// ── Grid layout constants (1 unit = 80px, default cardW=2 cardH=3 → 160×240px) ──
const GRID = 80;
// 5 cards arranged in a 2-column layout with 1-cell margins from the screen edge.
// Col1 at gx=1, col2 at gx=3 (1-cell left margin). 3 rows with 1-cell vertical gaps.
//   row1 gy=1: card[0] col1, card[1] col2
//   row2 gy=5: card[2] col1, card[3] col2   (1-cell gap: 1+3+1=5)
//   row3 gy=9: card[4] centred at gx=2       (1-cell gap: 5+3+1=9)
const SPREAD_CARD_GXS = [1, 3, 1, 3, 2];
const SPREAD_CARD_GYS = [1, 1, 5, 5, 9];
// Sheet: 1-cell right of the card area (col2 ends at gx=5, +1 gap = gx=6),
// 1-cell top margin, 14 cols wide (accommodates slots dx=0..12+2=14), 11 rows tall.
const SHEET_GX = 6;
const SHEET_GY = 1;
const SHEET_COLS = 14;
const SHEET_ROWS = 11;
// Slot dx offsets within the sheet (5 positions × 2-wide with 1-cell gap)
const SLOT_DXS = [0, 3, 6, 9, 12];
// Slots start at dy=5, leaving 400px of text area above them
const SLOT_DY = 5;

function getCardsForSpread(spreadIndex: number): Record<string, CardData> {
  const result: Record<string, CardData> = {};
  CARD_SPREADS[spreadIndex].cards.forEach((card, i) => {
    result[`tarot-${spreadIndex}-${card.id}`] = {
      gx: SPREAD_CARD_GXS[i],
      gy: SPREAD_CARD_GYS[i],
    };
  });
  return result;
}

// ── Tarot card face content ───────────────────────────────────────────────
function DivinationCard({ cardId }: { cardId: string }) {
  const parts = cardId.split('-');
  const spreadIdx = parseInt(parts[1]);
  const id = parts.slice(2).join('-');
  const spread = CARD_SPREADS[spreadIdx];
  const card = spread?.cards.find(c => c.id === id);
  if (!card || !spread) return null;
  return (
    <div
      className="h-full w-full flex flex-col rounded overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, #231832 0%, #0c1220 100%)',
        border: '1px solid rgba(217,119,6,0.4)',
      }}
    >
      <div
        className="px-2 py-1 text-amber-500/60 text-xs font-serif text-center shrink-0"
        style={{
          borderBottom: '1px solid rgba(217,119,6,0.18)',
          background: 'rgba(120,53,15,0.25)',
        }}
      >
        {spread.title}
      </div>
      <div className="flex-1 flex flex-col px-3 py-2 gap-1 min-h-0">
        <div className="text-amber-300 font-serif text-sm font-bold leading-tight shrink-0">
          {card.name}
        </div>
        <div className="border-t border-amber-800/30 shrink-0" />
        <div className="text-amber-100/65 text-xs leading-snug overflow-hidden">
          {card.description}
        </div>
      </div>
      <div
        className="px-2 py-1 text-center text-amber-700/40 text-xs shrink-0"
        style={{ borderTop: '1px solid rgba(217,119,6,0.1)' }}
      >
        drag to scroll →
      </div>
    </div>
  );
}

export default function CultCardSelection() {
  // ── Selection state ────────────────────────────────────────────────
  const [currentSpreadIndex, setCurrentSpreadIndex] = useState(0);
  // spreadIdx → tarot card id (e.g. 'fool')
  const [lockedCardIds, setLockedCardIds] = useState<Record<number, string>>({});
  // Controlled card map for the Table
  const [cards, setCards] = useState<Record<string, CardData>>(getCardsForSpread(0));

  // ── Phase / narrative state ────────────────────────────────────────
  const [readingState, setNarrativeState] = useState<'selection' | 'naming' | 'narrating' | 'ready'>('selection');
  const [narrative, setNarrative] = useState<string>('');
  const navigate = useNavigate();
  const { send, subscribe } = useGameSocket();

  // ── Naming state ──────────────────────────────────────────────────
  const [cultName, setCultName] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [hasUserSetName, setHasUserSetName] = useState(false);
  const [hasUserSetCultName, setHasUserSetCultName] = useState(false);

  // Derived ordered card selection (mirrors original selectedCards shape)
  const selectedCards = CARD_SPREADS.map((_, i) => lockedCardIds[i] ?? '');

  // When entering naming state, pick a starting city based on archetype
  useEffect(() => {
    if (readingState === 'naming' && !selectedCity) {
      const archetypeId = selectedCards[0] || 'hermit';
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readingState, selectedCity]);

  // When city changes, suggest a name based on locale
  useEffect(() => {
    if (selectedCity && !hasUserSetName) {
      const city = getCityById(selectedCity);
      if (city) {
        const suggestedName = city.faker.person.fullName();
        console.log('Suggesting name:', suggestedName, 'for city:', selectedCity);
        setLeaderName(suggestedName);
      }
    }
  }, [selectedCity, hasUserSetName]);

  // Suggest cult name when naming screen opens (request from server)
  useEffect(() => {
    if (readingState === 'naming' && !hasUserSetCultName) {
      const mysteryId = selectedCards[2];
      const horizonId = selectedCards[3];
      if (mysteryId && horizonId) {
        const unsub = subscribe('CULT_NAME', (name: string) => {
          setCultName(name);
          console.log('Received initial cult name from server:', name);
          unsub();
        });
        send({ type: 'GENERATE_CULT_NAME', payload: { mysteryId, horizonId } });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readingState, hasUserSetCultName]);

  function reset() {
      setNarrativeState('selection');
      setCurrentSpreadIndex(0);
      setLockedCardIds({});
      setCards(getCardsForSpread(0));
      setNarrative('');
      setCultName('');
      setLeaderName('');
      setSelectedCity('');
      setHasUserSetName(false);
      setHasUserSetCultName(false);
  }

  // Subscribe to server messages during the reading
  useEffect(() => {
    const unsubChunk = subscribe('NARRATIVE_CHUNK', (chunk: string) => {
      setNarrative(prev => prev + chunk);
    });
    const unsubDone = subscribe('READING_DONE', () => {
      console.log('Reading done, navigating to game');
      setNarrativeState('ready');
    });
    const unsubError = subscribe('ERROR', (payload: { message: string }) => {
      console.error('Server error during reading:', payload.message);
      alert(`Error: ${payload.message}`);
      reset();
    });
    return () => {
      unsubChunk();
      unsubDone();
      unsubError();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe]);

  const generateNarrative = () => {
    setNarrativeState('narrating');
    const selectedCardsData: TarotCardType[] = selectedCards.map((id, idx) => {
      const spread = CARD_SPREADS[idx];
      const card = spread.cards.find(c => c.id === id);
      if (!card) throw new Error(`Card with id ${id} not found in spread ${spread.title}`);
      return card;
    });

    console.log('Sending INIT_READING to server');
    send({
      type: 'INIT_READING',
      payload: {
        selectedCards: selectedCardsData,
        cultName: cultName.trim(),
        leaderName: leaderName.trim(),
        cityId: selectedCity || undefined,
      },
    });
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cultName.trim() || !leaderName.trim()) {
      alert('Please enter both a cult name and a leader name.');
      return;
    }
    generateNarrative();
  };

  // ── Slot drop handler ────────────────────────────────────────────────────
  const handleSlotDrop = useCallback((slotId: string, cardId: string) => {
    const slotIdx = parseInt(slotId.replace('slot-', ''));
    if (slotIdx !== currentSpreadIndex) {
      console.log(`[CultCardSelection] Ignoring drop on slot-${slotIdx} (current: ${currentSpreadIndex})`);
      return;
    }
    const tarotCardName = cardId.split('-').slice(2).join('-');
    console.log(`[CultCardSelection] Step ${slotIdx}: selected card "${tarotCardName}"`);

    setLockedCardIds(prev => ({ ...prev, [slotIdx]: tarotCardName }));

    const isLast = slotIdx === CARD_SPREADS.length - 1;
    // Compute the exact slot grid position so we can reliably set it regardless of batching order
    const slotGx = SHEET_GX + SLOT_DXS[slotIdx];
    const slotGy = SHEET_GY + SLOT_DY;
    if (!isLast) {
      const nextIdx = slotIdx + 1;
      setCurrentSpreadIndex(nextIdx);
      setCards(prev => {
        const next: Record<string, CardData> = {};
        // Keep all cards already in slots (from completed spreads)
        for (const [id, data] of Object.entries(prev)) {
          if (data.slotId) next[id] = data;
        }
        // Explicitly place the just-dropped card at the computed slot position
        next[cardId] = { gx: slotGx, gy: slotGy, slotId };
        // Add next spread's cards
        Object.assign(next, getCardsForSpread(nextIdx));
        return next;
      });
    } else {
      setCurrentSpreadIndex(CARD_SPREADS.length);
      setCards(prev => {
        const next: Record<string, CardData> = {};
        for (const [id, data] of Object.entries(prev)) {
          if (data.slotId) next[id] = data;
        }
        next[cardId] = { gx: slotGx, gy: slotGy, slotId };
        return next;
      });
      setTimeout(() => setNarrativeState('naming'), 300);
    }
  }, [currentSpreadIndex]);

  // ── Naming screen ─────────────────────────────────────────────────────────
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
                      if (mysteryId && horizonId) {
                        const unsub = subscribe('CULT_NAME', (name: string) => {
                          setCultName(name);
                          setHasUserSetCultName(false);
                          console.log('Received cult name from server:', name);
                          unsub();
                        });
                        send({ type: 'GENERATE_CULT_NAME', payload: { mysteryId, horizonId } });
                      }
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
                onClick={reset}
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

  // ── Narrating / Ready screen ──────────────────────────────────────────────
  if (readingState === 'narrating' || readingState === 'ready') {
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
``
          <div className="bg-black/40 border-2 border-amber-600/30 rounded-lg p-8 backdrop-blur mb-8">
            <div className="prose prose-invert prose-amber max-w-none">
              <p className="text-lg leading-relaxed whitespace-pre-wrap">{narrative}</p>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={reset}
              className="px-6 py-3 bg-purple-800/50 hover:bg-purple-700/50 border border-amber-600/30 rounded text-amber-100 transition-colors"
            >
              Begin Another Reading
            </button>
            <button
              onClick={() => navigate('/game')}
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

  // ── Card selection screen (Table-based) ───────────────────────────────────
  const activeSpread = CARD_SPREADS[currentSpreadIndex];
  // Compact summary of choices already locked in
  const lockedSummary = Object.entries(lockedCardIds)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([idx, cardId]) => {
      const spread = CARD_SPREADS[parseInt(idx)];
      const card = spread.cards.find(c => c.id === cardId);
      return card ? `${spread.title}: ${card.name}` : null;
    })
    .filter(Boolean);

  return (
    <div className="w-screen h-screen overflow-hidden">
      {/* cardH: 2 makes each card 160×160px; 5 cards × 2 rows = 10 rows = 800px fills screen height */}
      <Table cards={cards} onCardsChange={setCards} onSlotDrop={handleSlotDrop}>

        {/* ── Divination scroll: single sheet occupying the right ~87% of the screen ── */}
        <Sheet gx={SHEET_GX} gy={SHEET_GY} cols={SHEET_COLS} rows={SHEET_ROWS}>

          {/* ── Decorative header ── */}
          <div
            style={{
              position: 'absolute', top: 14, left: 0, right: 0,
              textAlign: 'center', fontFamily: 'serif',
              fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'rgba(217,119,6,0.35)', pointerEvents: 'none',
            }}
          >
            The Divination
          </div>

          {/* Thin rule */}
          <div style={{
            position: 'absolute', top: 38, left: 24, right: 24,
            height: 1, background: 'rgba(120,53,15,0.2)', pointerEvents: 'none',
          }} />

          {/* ── Active spread: title ── */}
          <div
            style={{
              position: 'absolute', top: 56, left: 0, right: 0,
              textAlign: 'center', fontFamily: 'serif',
              fontSize: '26px', fontWeight: 'bold',
              color: 'rgba(251,191,36,0.9)', pointerEvents: 'none',
            }}
          >
            {activeSpread?.title ?? 'Complete'}
          </div>

          {/* ── Active spread: meaning subtitle ── */}
          <div
            style={{
              position: 'absolute', top: 100, left: 0, right: 0,
              textAlign: 'center',
              fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'rgba(217,119,6,0.5)', pointerEvents: 'none',
            }}
          >
            {activeSpread?.meaning}
          </div>

          {/* ── Active spread: prompt ── */}
          <div
            style={{
              position: 'absolute', top: 148, left: 32, right: 32,
              textAlign: 'center', fontFamily: 'serif',
              fontSize: '17px', fontStyle: 'italic', lineHeight: 1.55,
              color: 'rgba(254,243,199,0.7)', pointerEvents: 'none',
            }}
          >
            {activeSpread?.prompt}
          </div>

          {/* ── Reset button (top-right corner of sheet) ── */}
          <button
            onClick={reset}
            style={{
              position: 'absolute', top: 14, right: 12,
              fontSize: '11px', padding: '3px 10px',
              background: 'rgba(15,10,5,0.5)',
              border: '1px solid rgba(120,53,15,0.3)',
              borderRadius: 4, color: 'rgba(217,119,6,0.5)',
              cursor: 'pointer',
            }}
          >
            Reset
          </button>

          {/* ── Column labels (just above slots) ── */}
          {SLOT_DXS.map((dx, idx) => (
            <div
              key={`col-label-${idx}`}
              style={{
                position: 'absolute',
                left: dx * GRID + 4,
                top: SLOT_DY * GRID - 30,
                width: 2 * GRID - 8,
                textAlign: 'center',
                fontFamily: 'serif',
                fontSize: '11px',
                color:
                  idx < currentSpreadIndex
                    ? 'rgba(217,119,6,0.5)'
                    : idx === currentSpreadIndex
                    ? 'rgba(251,191,36,0.9)'
                    : 'rgba(120,53,15,0.22)',
                pointerEvents: 'none',
              }}
            >
              {CARD_SPREADS[idx].title}
            </div>
          ))}

          {/* ── Slots: past (locked) + active; future steps not yet rendered ── */}
          {SLOT_DXS.map((dx, idx) => {
            if (idx > currentSpreadIndex) {
              return null;
            }
            return (
              <Slot
                key={`slot-${idx}`}
                id={`slot-${idx}`}
                dx={dx}
                dy={SLOT_DY}
                locked={idx < currentSpreadIndex}
                emptyLabel={CARD_SPREADS[idx].meaning}
                className={idx === currentSpreadIndex ? 'ui-slot-active' : ''}
              />
            );
          })}

          {/* ── Meaning labels (just below slots) ── */}
          {SLOT_DXS.map((dx, idx) => (
            <div
              key={`meaning-${idx}`}
              style={{
                position: 'absolute',
                left: dx * GRID + 4,
                top: (SLOT_DY + 3) * GRID + 10,
                width: 2 * GRID - 8,
                textAlign: 'center',
                fontSize: '10px',
                fontStyle: 'italic',
                lineHeight: 1.4,
                color:
                  idx < currentSpreadIndex
                    ? 'rgba(217,119,6,0.45)'
                    : idx === currentSpreadIndex
                    ? 'rgba(217,119,6,0.6)'
                    : 'rgba(120,53,15,0.2)',
                pointerEvents: 'none',
              }}
            >
              {CARD_SPREADS[idx].meaning}
            </div>
          ))}

          {/* ── Locked selections summary (bottom of sheet) ── */}
          {lockedSummary.length > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: 18,
                left: 20,
                right: 20,
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px 16px',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              {lockedSummary.map((s, i) => (
                <span key={i} style={{ fontSize: '11px', color: 'rgba(217,119,6,0.55)', fontStyle: 'italic' }}>
                  {s}
                </span>
              ))}
            </div>
          )}

        </Sheet>

        {/* ── Cards: one column on the left, one spread visible at a time ── */}
        {Object.keys(cards).map(cardId => {
          const cardData = cards[cardId];
          // Stagger the deal-in for free (non-slotted) cards based on their
          // position in the spread layout (top-left first, bottom-centre last).
          let dealDelay = 0;
          if (!cardData.slotId) {
            const posIdx = SPREAD_CARD_GXS.findIndex(
              (gx, i) => gx === cardData.gx && SPREAD_CARD_GYS[i] === cardData.gy
            );
            dealDelay = posIdx >= 0 ? posIdx * 60 : 0;
          }
          return (
            <Card key={cardId} id={cardId} locked={!!cardData.slotId} dealDelay={dealDelay}>
              <DivinationCard cardId={cardId} />
            </Card>
          );
        })}

      </Table>
    </div>
  );
}
