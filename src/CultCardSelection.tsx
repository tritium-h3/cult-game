import React, { useState, useEffect, useCallback, useRef } from 'react';
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

// ── The sheet ────────────────────────────────────────────────────────────────
// ONE sheet, anchored at the same place in every phase. The five spread slots
// live in its top band and never move, so a card placed during selection stays
// exactly where it is through naming, narration and the ending. Only the sheet's
// height and the content below the slot band change between phases.
const SHEET_GX = 1;
const SHEET_GY = 1;
const SHEET_COLS = 14;   // 5 slots × 2 wide + 4 × 1-cell gaps = 14
/** Selection: slot band + prompt text. Bottom edge lands at y=560. */
const SHEET_ROWS_SELECTION = 6;
/** Naming / narrating / ready: slot band + content area. Bottom edge at y=880. */
const SHEET_ROWS_READING = 10;

/** Slot dx offsets — 2-wide slots with 1-cell gutters. */
const SLOT_DXS = [0, 3, 6, 9, 12];
/** The spread sits in the sheet's top band in every phase. */
const SLOT_DY = 0;
/** Content area begins just below the 3-row slot band. */
const CONTENT_DY = 3;

// ── Selection phase: the five choices ────────────────────────────────────────
// A row of five beneath the sheet rather than a pile beside it. The grid cannot
// centre a 2-wide card over a 5-cell span, which is why the old 2×2-plus-one
// arrangement had to indent its last card; a row is the only shape that reads as
// deliberate. It also puts every option at the same height, so no single card is
// the one that falls below the fold.
const CHOICE_CARD_GXS = [1, 4, 7, 10, 13];
const CHOICE_CARD_GY = 8;

// ── Ready phase: the action band ─────────────────────────────────────────────
// Deals into the bottom band of the content area — below where a ~150-word
// narrative actually reaches, so the default placement leaves the text readable.
// These are ordinary draggable cards: putting them back over the narrative is
// allowed and expected. Nothing here prevents it, and nothing resizes the text
// to get out of their way.
const ACTION_NEW_GX = 2;      // gx 2..3
const ACTION_BEGIN_GX = 12;   // gx 12..13
const ACTION_CARD_GY = 8;
const CHOICE_SLOT_DX = 6;     // absolute gx = 1+6 = 7..8 — centred between them
const CHOICE_SLOT_DY = 7;     // absolute gy = 1+7 = 8 — same row as action cards

/** Deal the current spread's five options into the choice row below the sheet. */
function getCardsForSpread(spreadIndex: number): Record<string, CardData> {
  const result: Record<string, CardData> = {};
  CARD_SPREADS[spreadIndex].cards.forEach((card, i) => {
    result[`tarot-${spreadIndex}-${card.id}`] = {
      gx: CHOICE_CARD_GXS[i],
      gy: CHOICE_CARD_GY,
    };
  });
  return result;
}

/** Drop every card that isn't sitting in a slot, keeping the placed ones put. */
function keepOnlyPlaced(cards: Record<string, CardData>): Record<string, CardData> {
  return Object.fromEntries(Object.entries(cards).filter(([, data]) => data.slotId));
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
        drag to slot →
      </div>
    </div>
  );
}

// ── Action card face ─────────────────────────────────────────────────────────
function ActionCardFace({
  action,
}: {
  action: 'new-reading' | 'begin-game';
}) {
  const isBegin = action === 'begin-game';
  return (
    <div
      className="h-full w-full flex flex-col rounded overflow-hidden select-none"
      style={{
        background: isBegin
          ? 'linear-gradient(160deg, #2d1505 0%, #1a0d0d 100%)'
          : 'linear-gradient(160deg, #0d1a2d 0%, #070d19 100%)',
        border: `1px solid ${isBegin ? 'rgba(217,119,6,0.65)' : 'rgba(139,92,246,0.55)'}`,
        cursor: 'grab',
      }}
    >
      <div
        className="px-2 py-1 text-center text-xs font-serif shrink-0"
        style={{
          borderBottom: `1px solid ${isBegin ? 'rgba(217,119,6,0.25)' : 'rgba(139,92,246,0.25)'}`,
          background: isBegin ? 'rgba(120,53,15,0.35)' : 'rgba(76,29,149,0.35)',
          color: isBegin ? 'rgba(251,191,36,0.75)' : 'rgba(196,181,253,0.75)',
        }}
      >
        {isBegin ? 'The Path Opens' : 'The Stars Reset'}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-3 py-4 gap-3">
        <div
          className="text-center font-serif font-bold leading-tight"
          style={{
            color: isBegin ? 'rgba(251,191,36,0.95)' : 'rgba(196,181,253,0.9)',
            fontSize: '15px',
          }}
        >
          {isBegin ? 'Begin Your Work' : 'Begin Another Reading'}
        </div>
        <div
          className="text-center text-xs leading-snug"
          style={{ color: isBegin ? 'rgba(254,243,199,0.6)' : 'rgba(233,213,255,0.55)' }}
        >
          {isBegin
            ? 'The reading is complete. Step forward.'
            : 'The cards may be read again.'}
        </div>
      </div>
      <div
        className="px-2 py-1 text-center text-xs shrink-0"
        style={{
          borderTop: `1px solid ${isBegin ? 'rgba(217,119,6,0.12)' : 'rgba(139,92,246,0.12)'}`,
          color: isBegin ? 'rgba(217,119,6,0.55)' : 'rgba(139,92,246,0.55)',
        }}
      >
        drag to decide
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
  const [pendingGameId, setPendingGameId] = useState<string | null>(null);
  const pendingGameIdRef = useRef<string | null>(null);
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
    const unsubDone = subscribe('READING_DONE', (payload: any) => {
      const gameId: string = payload?.gameId;
      console.log('Reading done, full payload:', payload, '| gameId:', gameId);
      pendingGameIdRef.current = gameId;
      setPendingGameId(gameId);
      setNarrativeState('ready');
      // Deal two action cards onto the table
      setCards(prev => ({
        ...prev,
        'action-new-reading': { gx: ACTION_NEW_GX, gy: ACTION_CARD_GY },
        'action-begin-game': { gx: ACTION_BEGIN_GX, gy: ACTION_CARD_GY },
      }));
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
    // ── Action choice slot ──────────────────────────────────────────────
    if (slotId === 'action-choice') {
      console.log(`[CultCardSelection] Action choice slot received card: ${cardId}`);
      if (cardId === 'action-new-reading') {
        reset();
      } else if (cardId === 'action-begin-game') {
        const id = pendingGameIdRef.current;
        console.log('Navigating to game, id:', id);
        navigate(`/game/${id}`);
      }
      return;
    }
    // ── Spread selection slots ───────────────────────────────────────────
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
      setCards(prev => ({
        ...keepOnlyPlaced(prev),
        [cardId]: { gx: slotGx, gy: slotGy, slotId },
        ...getCardsForSpread(nextIdx),
      }));
    } else {
      setCurrentSpreadIndex(CARD_SPREADS.length);
      setCards(prev => ({
        ...keepOnlyPlaced(prev),
        [cardId]: { gx: slotGx, gy: slotGy, slotId },
      }));
      // The slot row is in the same place in every phase, so the five placed
      // cards need no repositioning — only the sheet beneath them changes.
      setTimeout(() => setNarrativeState('naming'), 300);
    }
  }, [currentSpreadIndex]);

  // Used only within the selection sheet
  const activeSpread = CARD_SPREADS[currentSpreadIndex];
  const sheetRows = readingState === 'selection' ? SHEET_ROWS_SELECTION : SHEET_ROWS_READING;

  // ── Single Table render — all phases ─────────────────────────────────────
  return (
    <div className="w-screen h-screen overflow-hidden">
      <Table cards={cards} onCardsChange={setCards} onSlotDrop={handleSlotDrop}>

        {/* ══════════════════════════════════════════════════════════════════
            THE SHEET — one sheet across every phase. The five spread slots sit
            in its top band and never move, so a card placed during selection
            stays exactly where it is through naming, narration and the ending.
            Only the sheet's height and the content below the band change.
        ══════════════════════════════════════════════════════════════════ */}
        <Sheet gx={SHEET_GX} gy={SHEET_GY} cols={SHEET_COLS} rows={sheetRows}>

          {/* ── The spread: five slots along the top band ── */}
          {SLOT_DXS.map((dx, idx) => {
            // Steps you haven't reached yet have no slot during selection.
            if (readingState === 'selection' && idx > currentSpreadIndex) return null;
            const isActive = readingState === 'selection' && idx === currentSpreadIndex;
            return (
              <React.Fragment key={`spread-${idx}`}>
                {/* Spread title, tucked inside the slot's top edge. A placed card
                    covers this and carries the same title in its own header, so
                    the label reads continuously once the slot is filled. */}
                <div
                  style={{
                    position: 'absolute',
                    left: dx * GRID + 10,
                    top: SLOT_DY * GRID + 13,
                    width: 2 * GRID - 20,
                    textAlign: 'center',
                    fontFamily: 'serif',
                    fontSize: '11px',
                    color: isActive ? 'rgba(251,191,36,0.9)' : 'rgba(217,119,6,0.5)',
                    pointerEvents: 'none',
                  }}
                >
                  {CARD_SPREADS[idx].title}
                </div>
                <Slot
                  id={`slot-${idx}`}
                  dx={dx}
                  dy={SLOT_DY}
                  locked={!isActive}
                  emptyLabel={CARD_SPREADS[idx].meaning}
                  className={isActive ? 'ui-slot-active' : ''}
                />
              </React.Fragment>
            );
          })}

          {/* ── SELECTION — the prompt for the current spread ── */}
          {readingState === 'selection' && (
            <div style={{
              position: 'absolute', top: CONTENT_DY * GRID,
              left: 0, right: 0, bottom: 0, pointerEvents: 'none',
            }}>

            {/* Decorative header */}
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

            {/* Active spread: title */}
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

            {/* Active spread: meaning subtitle */}
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

            {/* Active spread: prompt */}
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

            </div>
          )}

          {/* Reset — bottom corner, clear of the slot band above */}
          {readingState === 'selection' && (
            <button
              onClick={reset}
              style={{
                position: 'absolute', bottom: 10, right: 14,
                fontSize: '11px', padding: '3px 10px',
                background: 'rgba(15,10,5,0.5)',
                border: '1px solid rgba(120,53,15,0.3)',
                borderRadius: 4, color: 'rgba(217,119,6,0.5)',
                cursor: 'pointer',
              }}
            >
              Reset
            </button>
          )}

          {/* Choice slot — appears when the reading completes. The two action
              cards deal in beside it, clear of where the narrative text reaches;
              dragging them back over the text is allowed. */}
          {readingState === 'ready' && (
            <Slot
              id="action-choice"
              dx={CHOICE_SLOT_DX}
              dy={CHOICE_SLOT_DY}
              emptyLabel="Drag your choice here"
            />
          )}

            {/* ── NAMING PHASE ── */}
            {readingState === 'naming' && (
              <div style={{ position: 'absolute', top: CONTENT_DY * GRID, left: 0, right: 0, bottom: 0 }}>
            <form
              onSubmit={handleNameSubmit}
              style={{
                position: 'absolute', inset: 0,
                padding: '18px 48px 18px 48px',
                display: 'flex', flexDirection: 'column',
              }}
            >
              {/* Sheet header */}
              <div style={{ textAlign: 'center', flexShrink: 0 }}>
                <div style={{
                  fontFamily: 'serif', fontSize: '10px', letterSpacing: '0.18em',
                  textTransform: 'uppercase', color: 'rgba(217,119,6,0.35)',
                }}>
                  The Divination
                </div>
                <div style={{ height: 1, background: 'rgba(120,53,15,0.2)', margin: '6px -18px 10px' }} />
                <div style={{
                  fontFamily: 'serif', fontSize: '22px', fontWeight: 'bold',
                  color: 'rgba(251,191,36,0.9)',
                }}>
                  Name Your Destiny
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(217,119,6,0.5)', marginTop: '3px', marginBottom: '14px' }}>
                  Every cult needs a name. Every leader needs an identity.
                </div>
              </div>

              {/* Two-column fields */}
              <div style={{ display: 'flex', gap: '36px', flex: 1, minHeight: 0 }}>

                {/* Left: city + cult name */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(217,119,6,0.8)', fontFamily: 'serif', fontSize: '13px', marginBottom: '5px' }}>
                      <MapPin size={13} /> The City
                    </div>
                    <select
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      style={{
                        width: '100%', padding: '7px 11px', fontSize: '13px',
                        background: 'rgba(10,6,20,0.75)', border: '1px solid rgba(217,119,6,0.3)',
                        borderRadius: '4px', color: 'rgba(254,243,199,0.9)', outline: 'none',
                      }}
                    >
                      {CITIES.map(city => (
                        <option key={city.id} value={city.id} style={{ background: '#1e1030' }}>
                          {city.name} — {city.flavor}
                        </option>
                      ))}
                    </select>
                    <div style={{ fontSize: '11px', color: 'rgba(217,119,6,0.4)', marginTop: '3px' }}>
                      Where will your journey begin?
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(217,119,6,0.8)', fontFamily: 'serif', fontSize: '13px', marginBottom: '5px' }}>
                      <Users size={13} /> The Cult
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        value={cultName}
                        onChange={(e) => { setCultName(e.target.value); setHasUserSetCultName(true); }}
                        placeholder="The Order of the Veiled Truth..."
                        maxLength={100}
                        style={{
                          flex: 1, padding: '7px 11px', fontSize: '13px',
                          background: 'rgba(10,6,20,0.75)', border: '1px solid rgba(217,119,6,0.3)',
                          borderRadius: '4px', color: 'rgba(254,243,199,0.9)', outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        title="Generate a new cult name"
                        onClick={() => {
                          const mysteryId = selectedCards[2];
                          const horizonId = selectedCards[3];
                          if (mysteryId && horizonId) {
                            const unsub = subscribe('CULT_NAME', (name: string) => {
                              setCultName(name); setHasUserSetCultName(false);
                              console.log('Received cult name from server:', name);
                              unsub();
                            });
                            send({ type: 'GENERATE_CULT_NAME', payload: { mysteryId, horizonId } });
                          }
                        }}
                        style={{
                          padding: '7px 10px', background: 'rgba(76,29,149,0.4)',
                          border: '1px solid rgba(217,119,6,0.3)', borderRadius: '4px',
                          color: 'rgba(196,181,253,0.85)', cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        <Sparkles size={14} />
                      </button>
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(217,119,6,0.4)', marginTop: '3px' }}>
                      What will they call your congregation?
                    </div>
                  </div>
                </div>

                {/* Right: leader name + action buttons */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(217,119,6,0.8)', fontFamily: 'serif', fontSize: '13px', marginBottom: '5px' }}>
                      <User size={13} /> The Leader
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        value={leaderName}
                        onChange={(e) => { setLeaderName(e.target.value); setHasUserSetName(true); }}
                        placeholder="Margot Ashford..."
                        maxLength={100}
                        style={{
                          flex: 1, padding: '7px 11px', fontSize: '13px',
                          background: 'rgba(10,6,20,0.75)', border: '1px solid rgba(217,119,6,0.3)',
                          borderRadius: '4px', color: 'rgba(254,243,199,0.9)', outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        title="Generate a new name"
                        onClick={() => {
                          const city = getCityById(selectedCity);
                          if (city) {
                            const newName = city.faker.person.fullName();
                            setLeaderName(newName); setHasUserSetName(false);
                            console.log('Generated new suggested name:', newName);
                          }
                        }}
                        style={{
                          padding: '7px 10px', background: 'rgba(76,29,149,0.4)',
                          border: '1px solid rgba(217,119,6,0.3)', borderRadius: '4px',
                          color: 'rgba(196,181,253,0.85)', cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        <Sparkles size={14} />
                      </button>
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(217,119,6,0.4)', marginTop: '3px' }}>
                      What name shall you be known by?
                    </div>
                  </div>

                  <div style={{ flex: 1 }} />

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={reset}
                      style={{
                        padding: '8px 18px', fontSize: '13px',
                        background: 'rgba(15,10,30,0.6)', border: '1px solid rgba(120,53,15,0.35)',
                        borderRadius: '4px', color: 'rgba(217,119,6,0.7)', cursor: 'pointer',
                      }}
                    >
                      Return to Cards
                    </button>
                    <button
                      type="submit"
                      style={{
                        padding: '8px 22px', fontSize: '14px', fontFamily: 'serif', fontWeight: 'bold',
                        background: 'rgba(120,53,15,0.35)', border: '1px solid rgba(217,119,6,0.5)',
                        borderRadius: '4px', color: 'rgba(251,191,36,0.9)', cursor: 'pointer',
                      }}
                    >
                      Reveal Your Path
                    </button>
                  </div>
                </div>

              </div>
            </form>
              </div>
            )}

            {/* ── NARRATING / READY — narrative text; action cards deal in on completion ── */}
            {(readingState === 'narrating' || readingState === 'ready') && (
              <div style={{ position: 'absolute', top: CONTENT_DY * GRID, left: 0, right: 0, bottom: 0 }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '14px 32px' }}>

              {/* Header */}
              <div style={{ flexShrink: 0, textAlign: 'center', marginBottom: '10px' }}>
                <div style={{
                  fontFamily: 'serif', fontSize: '10px', letterSpacing: '0.18em',
                  textTransform: 'uppercase', color: 'rgba(217,119,6,0.35)',
                }}>
                  The Divination
                </div>
                <div style={{ height: 1, background: 'rgba(120,53,15,0.2)', margin: '6px -12px' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '6px' }}>
                  {readingState === 'narrating' && (
                    <Sparkles size={15} className="text-amber-400 animate-pulse" />
                  )}
                  <div style={{
                    fontFamily: 'serif', fontSize: '19px', fontWeight: 'bold',
                    color: 'rgba(251,191,36,0.9)',
                  }}>
                    {readingState === 'narrating'
                      ? 'Your Path Is Being Revealed...'
                      : 'The Reading Is Complete'}
                  </div>
                  {readingState === 'narrating' && (
                    <Sparkles size={15} className="text-amber-400 animate-pulse" />
                  )}
                </div>
              </div>

              {/* Scrollable narrative text */}
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '6px' }}>
                <p style={{
                  fontFamily: 'serif', fontSize: '15px', lineHeight: 1.7,
                  color: 'rgba(254,243,199,0.85)', whiteSpace: 'pre-wrap', margin: 0,
                }}>
                  {narrative}
                  {readingState === 'narrating' && (
                    <span style={{
                      display: 'inline-block',
                      borderRight: '2px solid rgba(251,191,36,0.7)',
                      marginLeft: '2px', height: '0.9em',
                      verticalAlign: 'text-bottom',
                      animation: 'blink 1s step-end infinite',
                    }} />
                  )}
                </p>
              </div>

            </div>
              </div>
            )}
        </Sheet>

        {/* ══════════════════════════════════════════════════════════════════
            CARDS — tarot cards (all phases) + action cards (ready phase)
        ══════════════════════════════════════════════════════════════════ */}
        {Object.keys(cards).map(cardId => {
          // Action card: Begin Another Reading
          if (cardId === 'action-new-reading') {
            return (
              <Card key={cardId} id={cardId} dealDelay={0}>
                <ActionCardFace action="new-reading" />
              </Card>
            );
          }
          // Action card: Begin Your Work
          if (cardId === 'action-begin-game') {
            return (
              <Card key={cardId} id={cardId} dealDelay={200}>
                <ActionCardFace action="begin-game" />
              </Card>
            );
          }

          // Tarot card
          const cardData = cards[cardId];
          const isLockedCard = readingState !== 'selection' || !!cardData.slotId;
          let dealDelay = 0;
          if (!cardData.slotId && readingState === 'selection') {
            // All five choices share a row, so gx alone identifies the position.
            const posIdx = CHOICE_CARD_GXS.indexOf(cardData.gx);
            dealDelay = posIdx >= 0 ? posIdx * 60 : 0;
          }
          return (
            <Card key={cardId} id={cardId} locked={isLockedCard} dealDelay={dealDelay}>
              <DivinationCard cardId={cardId} />
            </Card>
          );
        })}

      </Table>
    </div>
  );
}
