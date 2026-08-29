/**
 * MagicPrototype — dev route at /magic
 *
 * Generates a one-city world on the server, assigns Correspondence aspects to
 * items, and dumps everything onto two zones of a single Table:
 *
 *   LEFT  (gx < RITUAL_THRESHOLD)  — item pool, drag from here
 *   RIGHT (gx >= RITUAL_THRESHOLD) — ritual space, free placement only
 *
 * Press D (or click the button) to toggle the cheat overlay.
 *
 * Server sends: MAGIC_PROTO_STATE { cityName, items: WorldItem[], magic: MagicWorldState }
 * Client sends: INIT_MAGIC_PROTO   (on mount)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Card, Sheet, type CardData } from './ui';
import { HookCard } from './ui/templates/HookCard';
import { useGameSocket } from './hooks/useGameSocket';
import { resolveRitualArea, resolveRitualAreaAll } from './game/magic/correspondence';
import type { MagicWorldState, PairResult } from './game/magic/types';
import type { WorldItem, HookType } from './game/types';

// ── Layout constants ────────────────────────────────────────────────────────

/** gx at which the ritual zone begins */
const RITUAL_THRESHOLD = 8;
/** Column 0 gx for the item pool */
const POOL_COL_0 = 0;
/** Column 1 gx for the item pool */
const POOL_COL_1 = 3;
/** Row spacing in the pool (card height=3, 1 gap) */
const POOL_ROW_STEP = 4;

function poolPosition(index: number): { gx: number; gy: number } {
  const col = index % 2;
  const row = Math.floor(index / 2);
  return {
    gx: col === 0 ? POOL_COL_0 : POOL_COL_1,
    gy: row * POOL_ROW_STEP,
  };
}

// ── Result type labels / colours ────────────────────────────────────────────

const RESULT_STYLES: Record<string, string> = {
  resonance: 'border-violet-500/60 bg-violet-900/30 text-violet-200',
  rupture:   'border-red-600/60 bg-red-900/30 text-red-200',
  inert:     'border-slate-600/40 bg-slate-800/20 text-slate-400',
};

const RESULT_LABELS: Record<string, string> = {
  resonance: 'RESONANCE',
  rupture:   'RUPTURE',
  inert:     'INERT',
};

// ── Component ───────────────────────────────────────────────────────────────

export default function MagicPrototype() {
  const { send, subscribe } = useGameSocket();

  const [cityName, setCityName]   = useState<string | null>(null);
  const [items, setItems]         = useState<WorldItem[]>([]);
  const [magic, setMagic]         = useState<MagicWorldState | null>(null);
  const [cards, setCards]         = useState<Record<string, CardData>>({});
  const [pairResults, setPairResults] = useState<PairResult[]>([]);
  const [overlayVisible, setOverlayVisible] = useState(false);

  // Keep magic ref in sync for onCardsChange without stale closure
  const magicRef = useRef<MagicWorldState | null>(null);
  magicRef.current = magic;

  // ── Server init ────────────────────────────────────────────────────────

  useEffect(() => {
    const unsub = subscribe('MAGIC_PROTO_STATE', (payload: {
      cityName: string;
      items: WorldItem[];
      magic: MagicWorldState;
    }) => {
      console.log('[magic] Received MAGIC_PROTO_STATE for city', payload.cityName, `(${payload.items.length} items)`);
      setCityName(payload.cityName);
      setItems(payload.items);
      setMagic(payload.magic);

      // Place all items in the pool
      const initialCards: Record<string, CardData> = {};
      payload.items.forEach((item, i) => {
        initialCards[item.id] = poolPosition(i);
      });
      setCards(initialCards);
      setPairResults([]);
    });

    console.log('[magic] Sending INIT_MAGIC_PROTO');
    send({ type: 'INIT_MAGIC_PROTO' });

    return unsub;
  }, []);

  // ── Keyboard overlay toggle ────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'd' || e.key === 'D') setOverlayVisible(v => !v);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // ── Card change handler — recompute ritual pairs ───────────────────────

  const handleCardsChange = useCallback((newCards: Record<string, CardData>) => {
    setCards(newCards);
    const m = magicRef.current;
    if (!m) return;

    const ritualIds = Object.entries(newCards)
      .filter(([, pos]) => pos.gx >= RITUAL_THRESHOLD)
      .map(([id]) => id);

    console.log('[magic] Ritual zone cards:', ritualIds);
    const results = resolveRitualArea(ritualIds, m.params);
    setPairResults(results);
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────

  const itemById = useCallback((id: string) => items.find(i => i.id === id), [items]);

  const ritualIds = Object.entries(cards)
    .filter(([, pos]) => pos.gx >= RITUAL_THRESHOLD)
    .map(([id]) => id);

  // All pairs including inert, for the cheat overlay
  const allPairResults = magic && ritualIds.length >= 2
    ? resolveRitualAreaAll(ritualIds, magic.params)
    : [];

  // ── Loading state ──────────────────────────────────────────────────────

  if (!magic) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-slate-950 text-slate-400 font-serif">
        <div className="text-center space-y-2">
          <div className="text-lg text-amber-200/60">Ritual space loading…</div>
          <div className="text-xs text-slate-500">connecting to server</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-950">
      <Table cards={cards} onCardsChange={handleCardsChange}>

        {/* ── Ritual zone marker sheet ── */}
        <Sheet gx={RITUAL_THRESHOLD} gy={-1} cols={20} rows={100}>
          <div className="h-full w-full border-l border-violet-700/30 bg-violet-950/10 flex flex-col pt-2 pl-2">
            <span className="text-xs font-serif text-violet-400/40 tracking-widest uppercase select-none">
              The Second Table
            </span>
          </div>
        </Sheet>

        {/* ── Item pool — all WorldItems as HookCards ── */}
        {items.map((item) =>
          item.id in cards ? (
            <Card key={item.id} id={item.id}>
              <HookCard
                type={item.types[0] as HookType}
                title={item.name}
                description={item.flavorDescription || undefined}
              />
            </Card>
          ) : null
        )}

      </Table>

      {/* ── City label ── */}
      <div className="fixed top-4 left-4 z-[100] pointer-events-none">
        <div className="text-xs text-amber-500/50 font-serif tracking-wide">
          {cityName ?? '…'}
        </div>
        <div className="text-xs text-slate-600 mt-0.5">
          {items.length} items · drag right to place in ritual space →
        </div>
      </div>

      {/* ── Pair results panel ── */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-72 pointer-events-none">
        {pairResults.length === 0 && ritualIds.length === 0 && (
          <div className="text-xs text-slate-600 font-serif italic">
            Drag items into the ritual space to observe their correspondences.
          </div>
        )}
        {pairResults.length === 0 && ritualIds.length >= 2 && (
          <div className="text-xs text-slate-500 font-serif italic">
            No correspondences surface.
          </div>
        )}
        {pairResults.map((r, i) => {
          const nameA = itemById(r.itemIdA)?.name ?? r.itemIdA;
          const nameB = itemById(r.itemIdB)?.name ?? r.itemIdB;
          return (
            <div
              key={i}
              className={`rounded border px-3 py-2 text-xs space-y-1 ${RESULT_STYLES[r.type]}`}
            >
              <div className="font-mono font-bold tracking-widest text-[10px]">
                {RESULT_LABELS[r.type]}
              </div>
              <div className="font-serif text-[11px] opacity-70">
                {nameA} × {nameB}
              </div>
              <div className="leading-snug opacity-80 font-serif italic">
                {r.description}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Cheat overlay toggle button ── */}
      <div className="fixed bottom-4 left-4 z-[100]">
        <button
          onClick={() => setOverlayVisible(v => !v)}
          className={`text-xs px-3 py-1.5 rounded border font-mono transition-colors
            ${overlayVisible
              ? 'border-violet-500/70 text-violet-300 bg-violet-900/40'
              : 'border-slate-600/40 text-slate-500 hover:text-slate-300 hover:border-slate-500/50'
            }`}
        >
          {overlayVisible ? 'hide cheat [D]' : 'cheat [D]'}
        </button>
      </div>

      {/* ── Cheat overlay ── */}
      {overlayVisible && (
        <div className="fixed inset-4 top-16 z-[200] pointer-events-none flex gap-4">

          {/* Active pairs + item aspects */}
          <div className="bg-slate-900/90 border border-slate-700/50 rounded p-3 text-xs font-mono space-y-2 self-start min-w-48">
            <div className="text-amber-400/80 font-bold tracking-wide text-[10px] uppercase">
              Grammar: {magic.grammar}
            </div>
            <div className="text-slate-400 text-[10px] uppercase tracking-wide mt-2">
              Active pairs
            </div>
            {magic.params.activePairs.map(([a, b], i) => (
              <div key={i} className="text-slate-300">
                <span className="text-violet-300">{a}</span>
                <span className="text-slate-500"> / </span>
                <span className="text-red-300">{b}</span>
              </div>
            ))}

            <div className="text-slate-400 text-[10px] uppercase tracking-wide mt-3 pt-2 border-t border-slate-700/50">
              Item aspects
            </div>
            <div className="space-y-0.5 max-h-64 overflow-y-auto">
              {items.map(item => {
                const aspects = magic.params.itemAspects[item.id];
                return (
                  <div key={item.id} className="flex justify-between gap-2">
                    <span className="text-slate-400 truncate max-w-[120px]">{item.name}</span>
                    <span className={aspects?.length ? 'text-violet-200' : 'text-slate-600'}>
                      {aspects?.length ? aspects.join(', ') : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live pair breakdown (includes inert) */}
          {allPairResults.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-700/50 rounded p-3 text-xs font-mono space-y-1.5 self-start min-w-64">
              <div className="text-slate-400 text-[10px] uppercase tracking-wide">
                Ritual space — all pairs
              </div>
              {allPairResults.map((r, i) => {
                const nameA = itemById(r.itemIdA)?.name ?? r.itemIdA;
                const nameB = itemById(r.itemIdB)?.name ?? r.itemIdB;
                const aspectsA = magic.params.itemAspects[r.itemIdA] ?? [];
                const aspectsB = magic.params.itemAspects[r.itemIdB] ?? [];
                return (
                  <div key={i} className={`px-2 py-1 rounded ${RESULT_STYLES[r.type]}`}>
                    <div className="font-bold text-[10px] tracking-widest">
                      {RESULT_LABELS[r.type]}
                    </div>
                    <div className="text-[10px] opacity-70">
                      [{aspectsA.join(', ') || '—'}] × [{aspectsB.join(', ') || '—'}]
                    </div>
                    <div className="text-[10px] opacity-60 truncate">
                      {nameA} × {nameB}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Back link ── */}
      <div className="fixed bottom-4 right-4 z-[100] text-xs text-slate-600">
        <a href="/" className="hover:text-slate-400 transition-colors">← back</a>
      </div>
    </div>
  );
}
