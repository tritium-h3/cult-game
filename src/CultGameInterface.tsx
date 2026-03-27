import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Table, Card, Sheet } from './ui';
import type { CardData } from './ui/types';
import { HookCard } from './ui/templates/HookCard';
import { FollowerSheet } from './ui/templates/FollowerSheet';
import { getCityById } from './game/world';
import type { City, Follower, ClientGameState, ClientAction, HookType, Verb } from './game/types';
import { verbCompatible } from './game/types';
import { useGameSocket } from './hooks/useGameSocket';

/** Week-results payload from the server */
interface ClientWeekResults {
  gameId: string;
  results: Record<string, { outcomeId: string; description: string }>;
  updatedState: ClientGameState;
  assignments: Record<string, string>;
  items: ClientAction[];
  cityId: string;
}

// ── Layout constants (1-cell margin rule throughout) ──────────────────────
// All units are grid cells (1 cell = 80px).

// Header sheet — single-row title bar shared across all views
const HDR_GX = 1, HDR_GY = 1, HDR_COLS = 20, HDR_ROWS = 1;

// Map view — cult info sheet (left) + city tiles (right)
const MAP_CULT_GX = 1,  MAP_CULT_GY = 3, MAP_CULT_COLS = 4, MAP_CULT_ROWS = 6;
// City tiles: 3×2 cells each, 4 per row, starting at gx=6
const MAP_CITY_COLS = 3, MAP_CITY_ROWS = 2;
const MAP_CITY_START_GX = 6, MAP_CITY_START_GY = 3;
const MAP_CITY_PER_ROW = 4, MAP_CITY_COL_STEP = 4, MAP_CITY_ROW_STEP = 3;

// Location view — hook card pool (left, 2 columns)
// Cards are 2×3 cells. Layout: col at gx=1, col at gx=4 (card width 2 + gap 1)
const HOOK_GXS      = [1, 4];
const HOOK_START_GY = 3;    // below header (gy=2) + 1-cell margin
const HOOK_ROW_STEP = 3;    // cardH (3), no gap

// Location view — follower sheets (right, 1 per row stacked vertically)
// Each sheet: 13 cols × 3 rows. Info section + verb slots share the same 3-row band.
// Single column at gx=7; right edge at gx=20 (1-cell margin before table edge).
// Info width shrinks to 6 cols when follower has 3 verbs so all slots fit (7,9,11).
const FOL_GX        = 7;
const FOL_COLS      = 13;
const FOL_ROWS      = 3;
const FOL_PER_ROW   = 1;
const FOL_COL_STEP  = FOL_COLS + 1;
const FOL_ROW_STEP  = FOL_ROWS + 1;

function followerInfoCols(verbCount: number): number {
  return verbCount >= 3 ? 6 : 8;
}

// Report view — single large sheet
const RPT_GX = 1, RPT_GY = 3, RPT_COLS = 20, RPT_ROWS = 8;

// ── Helpers ───────────────────────────────────────────────────────────────

function followerGX(idx: number) { return FOL_GX + (idx % FOL_PER_ROW) * FOL_COL_STEP; }
function followerGY(idx: number) { return HOOK_START_GY + Math.floor(idx / FOL_PER_ROW) * FOL_ROW_STEP; }
function cityGX(idx: number) { return MAP_CITY_START_GX + (idx % MAP_CITY_PER_ROW) * MAP_CITY_COL_STEP; }
function cityGY(idx: number) { return MAP_CITY_START_GY + Math.floor(idx / MAP_CITY_PER_ROW) * MAP_CITY_ROW_STEP; }

/** Slot defs (dx/dy within sheet) for a follower's verb slots. */
function slotDefs(followerId: string, verbs: Verb[]) {
  // Slots sit to the right of the info section.
  // Info is 6 cols wide for 3 verbs → slots at dx=7,9,11 (all fit in 13-col sheet).
  // Info is 8 cols wide for 1-2 verbs → slots at dx=9,11 or centred at dx=10.
  const infoCols = followerInfoCols(verbs.length);
  const startDx = verbs.length === 1 ? infoCols + 2 : infoCols + 1;
  return verbs.map((verb, i) => ({
    id: `${followerId}:${verb}`,
    dx: startDx + i * 2,
    dy: 0,
    label: verb,
  }));
}

/** Build initial card positions for hook items dealt into a location. */
function buildHookCards(items: ClientAction[]): Record<string, CardData> {
  const result: Record<string, CardData> = {};
  items.forEach((item, i) => {
    result[item.id] = {
      gx: HOOK_GXS[i % HOOK_GXS.length],
      gy: HOOK_START_GY + Math.floor(i / HOOK_GXS.length) * HOOK_ROW_STEP,
    };
  });
  return result;
}

// ── Shared button styles ──────────────────────────────────────────────────
const btnPrimary: React.CSSProperties = {
  padding: '7px 20px', fontFamily: 'serif', fontSize: '13px', fontWeight: 'bold',
  background: 'rgba(120,53,15,0.4)', border: '1px solid rgba(217,119,6,0.5)',
  borderRadius: '4px', color: 'rgba(251,191,36,0.9)', cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
  padding: '6px 14px', fontSize: '12px',
  background: 'rgba(15,10,30,0.5)', border: '1px solid rgba(120,53,15,0.35)',
  borderRadius: '4px', color: 'rgba(217,119,6,0.7)', cursor: 'pointer',
};

export default function CultGameInterface() {
  const [gameState, setGameState]               = useState<ClientGameState | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<City | undefined>(undefined);
  const [view, setView]                         = useState<'map' | 'location' | 'report'>('map');
  const [cards, setCards]                       = useState<Record<string, CardData>>({});
  const [weekResults, setWeekResults]           = useState<ClientWeekResults | null>(null);
  // For drop compatibility checking: verb extracted from slot id
  const getSlotVerb = useCallback((slotId: string): Verb | null => {
    const verb = slotId.split(':')[1] as Verb;
    return verb ?? null;
  }, []);
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const { send, subscribe } = useGameSocket();

  // ── WebSocket subscriptions ──────────────────────────────────────────
  useEffect(() => {
    if (!gameId) { navigate('/'); return; }
    const unsubState = subscribe('STATE', ({ state }: { gameId: string; state: ClientGameState }) => {
      console.log('[game] Received STATE from server');
      setGameState(state);
    });
    const unsubNoState = subscribe('NO_STATE', () => {
      console.log('[game] No state, redirecting to card selection');
      navigate('/');
    });
    const unsubResults = subscribe('WEEK_RESULTS', (payload: ClientWeekResults) => {
      console.log('[game] Received WEEK_RESULTS from server');
      setWeekResults(payload);
      setCards({});
      setView('report');
    });
    const unsubError = subscribe('ERROR', (payload: { message: string }) => {
      console.error('[game] Server error:', payload.message);
    });
    send({ type: 'GET_STATE', payload: { gameId } });
    return () => { unsubState(); unsubNoState(); unsubResults(); unsubError(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  // ── Derived state ────────────────────────────────────────────────────
  /** Items available for assignment in the current location. */
  const hookItems = useMemo((): ClientAction[] => {
    if (!selectedLocation || !gameState?.map) return [];
    return (gameState.map as Record<string, ClientAction[]>)[selectedLocation.id] ?? [];
  }, [selectedLocation, gameState]);

  /**
   * Current assignments derived from card positions.
   * Cards sitting in follower slots contribute { slotId → cardId }.
   */
  const assignments = useMemo((): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const [cardId, data] of Object.entries(cards)) {
      if (data.slotId) result[data.slotId] = cardId;
    }
    return result;
  }, [cards]);

  /** Ordered list of city IDs the cult knows about (HQ first). */
  const knownCities = useMemo((): string[] => {
    if (!gameState) return [];
    const ids = new Set([gameState.hqLocation, ...Object.keys(gameState.map ?? {})]);
    return Array.from(ids);
  }, [gameState]);

  // ── Actions ──────────────────────────────────────────────────────────
  const enterLocation = useCallback((city: City) => {
    const items = (gameState?.map as Record<string, ClientAction[]>)?.[city.id] ?? [];
    console.log('[game] Entering location:', city.id, '| hook items:', items.length);
    setSelectedLocation(city);
    setCards(buildHookCards(items));
    setView('location');
  }, [gameState]);

  const handleCardsChange = useCallback((newCards: Record<string, CardData>) => {
    // Reject drops into slots whose verb is incompatible with the card's hook types
    for (const [cardId, data] of Object.entries(newCards)) {
      if (data.slotId) {
        const verb = getSlotVerb(data.slotId);
        const item = hookItems.find(i => i.id === cardId);
        if (verb && item && item.types && !verbCompatible(verb, item.types as HookType[])) {
          console.log(`[game] Rejected drop: ${verb} incompatible with ${item.types.join(',')}`)
          // Revert to position before card entered the slot
          const prev = cards[cardId];
          return setCards(prev ? { ...cards, [cardId]: { ...prev, slotId: undefined } } : cards);
        }
      }
    }
    setCards(newCards);
  }, [cards, hookItems, getSlotVerb]);

  const handleCompleteWeek = useCallback(() => {
    if (!gameId || !gameState) return;
    const cityId = selectedLocation?.id ?? gameState.hqLocation;
    console.log('[game] Completing week | cityId:', cityId, '| assignments:', assignments);
    send({ type: 'COMPLETE_WEEK', payload: { gameId, assignments, cityId } });
  }, [gameId, gameState, assignments, selectedLocation, send]);

  const handleBeginNewWeek = useCallback(() => {
    if (!gameId || !weekResults) return;
    send({ type: 'ACCEPT_WEEK_RESULTS', payload: { gameId } });
    setGameState({ ...weekResults.updatedState });
    setWeekResults(null);
    setCards({});
    setSelectedLocation(undefined);
    setView('map');
  }, [gameId, weekResults, send]);

  // ── Loading state ─────────────────────────────────────────────────────
  if (!gameState) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f0a1e 0%, #1a0a2e 50%, #0f0a1e 100%)',
      }}>
        <div style={{ fontFamily: 'serif', fontSize: '18px', color: 'rgba(217,119,6,0.6)' }}
          className="animate-pulse">
          Consulting the void…
        </div>
      </div>
    );
  }

  const reportCity = weekResults ? getCityById(weekResults.cityId) : undefined;

  return (
<Table cards={cards} onCardsChange={handleCardsChange}>

      {/* ════════════════════════════════════════════════════════════════
          HEADER — persists across all views
      ════════════════════════════════════════════════════════════════ */}
      <Sheet gx={HDR_GX} gy={HDR_GY} cols={HDR_COLS} rows={HDR_ROWS}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 28px', gap: '16px' }}>
          {/* Left: back navigation or cult name */}
          <div style={{ flex: 1 }}>
            {view === 'location' && (
              <button style={btnSecondary} onClick={() => { setCards({}); setView('map'); }}>
                ← Map
              </button>
            )}
            {view !== 'location' && (
              <div style={{ fontFamily: 'serif', fontSize: '15px', color: 'rgba(217,119,6,0.55)', letterSpacing: '0.08em' }}>
                {gameState.cultName}
              </div>
            )}
          </div>
          {/* Center: context title */}
          <div style={{ fontFamily: 'serif', fontSize: '20px', fontWeight: 'bold', color: 'rgba(251,191,36,0.9)', textAlign: 'center' }}>
            {view === 'location' && selectedLocation?.name}
            {view === 'map'      && gameState.leader.name}
            {view === 'report'   && `Week ${gameState.week} — Results`}
          </div>
          {/* Right: week counter + primary action */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px' }}>
            {view !== 'report' && (
              <div style={{ fontSize: '12px', color: 'rgba(217,119,6,0.5)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span>Week</span>
                <span style={{ fontFamily: 'serif', fontSize: '14px', color: 'rgba(251,191,36,0.8)' }}>{gameState.week}</span>
              </div>
            )}
            {view === 'location' && (
              <button style={btnPrimary} onClick={handleCompleteWeek}>
                Complete Week's Work
              </button>
            )}
            {view === 'report' && (
              <button style={btnPrimary} onClick={handleBeginNewWeek}>
                Begin New Week
              </button>
            )}
          </div>
        </div>
      </Sheet>

      {/* ════════════════════════════════════════════════════════════════
          MAP VIEW — cult status + city tiles
      ════════════════════════════════════════════════════════════════ */}
      {view === 'map' && (
        <>
          {/* Cult status */}
          <Sheet gx={MAP_CULT_GX} gy={MAP_CULT_GY} cols={MAP_CULT_COLS} rows={MAP_CULT_ROWS}>
            <div style={{ position: 'absolute', inset: 0, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px', overflow: 'hidden' }}>
              <div style={{ fontFamily: 'serif', fontSize: '9px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(217,119,6,0.4)' }}>
                Cult Status
              </div>
              <div style={{ height: 1, background: 'rgba(120,53,15,0.25)', flexShrink: 0 }} />
              <div style={{ fontFamily: 'serif', fontSize: '16px', fontWeight: 'bold', color: 'rgba(251,191,36,0.9)' }}>
                {gameState.leader.name}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(168,162,158,0.8)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>
                {gameState.leader.background}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ fontSize: '11px', color: 'rgba(217,119,6,0.6)' }}>
                  Week <span style={{ fontFamily: 'serif', color: 'rgba(251,191,36,0.85)' }}>{gameState.week}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(217,119,6,0.6)' }}>
                  {gameState.followers.length} Adherents
                </div>
              </div>
              <div style={{ borderTop: '1px solid rgba(120,53,15,0.2)', paddingTop: '6px', overflow: 'hidden' }}>
                <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(217,119,6,0.4)', marginBottom: '4px' }}>
                  Followers
                </div>
                {gameState.followers.map(f => (
                  <div key={f.id} style={{ fontSize: '10px', color: 'rgba(253,230,138,0.8)', fontFamily: 'serif', lineHeight: 1.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {f.name}
                  </div>
                ))}
              </div>
            </div>
          </Sheet>

          {/* City tiles */}
          {knownCities.map((cityId, idx) => {
            const city = getCityById(cityId);
            const isHQ = cityId === gameState.hqLocation;
            return (
              <Sheet key={cityId} gx={cityGX(idx)} gy={cityGY(idx)} cols={MAP_CITY_COLS} rows={MAP_CITY_ROWS}>
                <div
                  style={{ position: 'absolute', inset: 0, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '4px', cursor: 'pointer' }}
                  onClick={() => city && enterLocation(city)}
                >
                  {isHQ && (
                    <div style={{ fontSize: '8px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(217,119,6,0.5)', flexShrink: 0 }}>
                      Headquarters
                    </div>
                  )}
                  <div style={{ fontFamily: 'serif', fontSize: '15px', fontWeight: 'bold', color: 'rgba(251,191,36,0.9)', lineHeight: 1.2 }}>
                    {city?.name}
                  </div>
                  <div style={{ fontSize: '9px', color: 'rgba(168,162,158,0.6)', fontStyle: 'italic', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3 } as React.CSSProperties}>
                    {city?.flavor}
                  </div>
                  <div style={{ marginTop: 'auto', fontSize: '10px', color: 'rgba(217,119,6,0.45)' }}>
                    Enter →
                  </div>
                </div>
              </Sheet>
            );
          })}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════
          LOCATION VIEW — follower sheets with assignment slots
      ════════════════════════════════════════════════════════════════ */}
      {view === 'location' && gameState.followers.map((follower, idx) => (
        <Sheet
          key={follower.id}
          gx={followerGX(idx)}
          gy={followerGY(idx)}
          cols={FOL_COLS}
          rows={FOL_ROWS}
        >
          <FollowerSheet
            name={follower.name}
            background={follower.background}
            skills={Array.isArray(follower.verbs) ? follower.verbs : []}
            slots={slotDefs(follower.id, follower.verbs ?? [])}
            infoCols={followerInfoCols((follower.verbs ?? []).length)}
          />
        </Sheet>
      ))}

      {/* ════════════════════════════════════════════════════════════════
          REPORT VIEW — week results sheet
      ════════════════════════════════════════════════════════════════ */}
      {view === 'report' && weekResults && (
        <Sheet gx={RPT_GX} gy={RPT_GY} cols={RPT_COLS} rows={RPT_ROWS}>
          <div style={{
            position: 'absolute', inset: 0,
            padding: '18px 32px', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', gap: '10px',
          }}>
            <div style={{ fontFamily: 'serif', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(217,119,6,0.4)', flexShrink: 0 }}>
              Events of the Week
            </div>
            <div style={{ height: 1, background: 'rgba(120,53,15,0.25)', flexShrink: 0 }} />
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {Object.entries(weekResults.results).map(([slotKey, result]) => {
                const itemId = weekResults.assignments[slotKey];
                const followerId = slotKey.split(':')[0];
                const item = weekResults.items.find(a => a.id === itemId);
                const follower = gameState.followers.find((f: Follower) => f.id === followerId);
                if (!item || !follower) return null;
                return (
                  <div key={slotKey} style={{ borderLeft: '2px solid rgba(120,53,15,0.5)', paddingLeft: '14px' }}>
                    <div style={{ fontFamily: 'serif', fontSize: '14px', color: 'rgba(253,230,138,0.9)', marginBottom: '2px' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(217,119,6,0.55)', marginBottom: '6px' }}>
                      {follower.name}{reportCity && ` · ${reportCity.name}`}
                    </div>
                    <div style={{ fontSize: '13px', color: 'rgba(254,243,199,0.8)', lineHeight: 1.65 }}>
                      {result.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Sheet>
      )}

      {/* ════════════════════════════════════════════════════════════════
          HOOK CARDS — dealt into the location view pool
      ════════════════════════════════════════════════════════════════ */}
      {view === 'location' && Object.keys(cards).map((cardId, idx) => {
        const item = hookItems.find(i => i.id === cardId);
        if (!item) return null;
        return (
          <Card key={cardId} id={cardId} dealDelay={idx * 60}>
            <HookCard
              type={(item.types?.[0] as HookType) ?? 'institution'}
              title={item.title}
              description={item.description}
            />
          </Card>
        );
      })}

    </Table>
  );
}