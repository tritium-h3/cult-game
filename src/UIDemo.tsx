import React, { useState } from 'react';
import { Table, Card, Sheet, type CardData } from './ui';
import { KnowledgeCard } from './ui/templates/KnowledgeCard';
import { FollowerSheet } from './ui/templates/FollowerSheet';

// ---------------------------------------------------------------------------
// Card layout helpers
// Grid: 80px cells. Card: 2×3 cells = 160×240px.
// Table has padding of 1 grid cell on all sides.
// ---------------------------------------------------------------------------

// The demo has three groups of cards on the left, spread vertically.
// Each card is placed 3 cols apart so they don't overlap each other.

const DEMO_INITIAL_CARDS: Record<string, CardData> = {
  // Row 0 — Sites
  'site-1':     { gx: 1, gy: 1 },
  'site-2':     { gx: 4, gy: 1 },

  // Row 1 — Books
  'book-1':     { gx: 1, gy: 5 },
  'book-2':     { gx: 4, gy: 5 },

  // Row 2 — Artifacts & Patron
  'artifact-1': { gx: 1, gy: 9 },
  'patron-1':   { gx: 4, gy: 9 },
};

// Follower sheet: starts at pixel (560, 80), width 400, height 600.
// 560px / 80 = 7 grid cols across.
const SHEET_X = 560;
const SHEET_Y = 80;
const SHEET_W = 400;
const SHEET_H = 600;

// Second sheet for a second follower
const SHEET2_X = 980;
const SHEET2_Y = 80;

export default function UIDemo() {
  const [cards, setCards] = useState<Record<string, CardData>>(DEMO_INITIAL_CARDS);
  const [log, setLog] = useState<string[]>([]);

  function handleSlotDrop(slotId: string, cardId: string) {
    const msg = `Card "${cardId}" placed in slot "${slotId}"`;
    console.log(`[UIDemo] ${msg}`);
    setLog((prev) => [msg, ...prev].slice(0, 8));
  }

  return (
    <div className="w-screen h-screen overflow-hidden bg-slate-950">
      <Table
        cards={cards}
        onCardsChange={setCards}
        onSlotDrop={handleSlotDrop}
      >
        {/* ── Follower sheet 1: Elara Mourne — 2 unlocked slots + 1 locked ── */}
        <Sheet x={SHEET_X} y={SHEET_Y} width={SHEET_W} height={SHEET_H}>
          <FollowerSheet
            name="Elara Mourne"
            background="Former archivist, drawn to forbidden texts. Methodical and secretive."
            skills={['Research', 'Deception', 'Archaic Languages']}
            slots={[
              { id: 'elara-0', label: 'Primary task' },
              { id: 'elara-1', label: 'Secondary task' },
              { id: 'elara-2', locked: true, label: 'Sworn purpose (locked)' },
            ]}
          />
        </Sheet>

        {/* ── Follower sheet 2: Dorian Vael — 1 unlocked slot ── */}
        <Sheet x={SHEET2_X} y={SHEET2_Y} width={SHEET_W} height={SHEET_H}>
          <FollowerSheet
            name="Dorian Vael"
            background="Street preacher turned true believer. Charismatic but unstable."
            skills={['Persuasion', 'Endurance']}
            slots={[
              { id: 'dorian-0', label: 'Task' },
            ]}
          />
        </Sheet>

        {/* ── Free cards — drag these onto the slots above ── */}
        <Card id="site-1">
          <KnowledgeCard type="site" title="The Sunken Library" description="A flooded archive beneath the old docks. Locals say books still surface at low tide." />
        </Card>
        <Card id="site-2">
          <KnowledgeCard type="site" title="The Pale Cathedral" description="Abandoned since the plague year. Strange light flickers from the bell tower at night." />
        </Card>

        <Card id="book-1">
          <KnowledgeCard type="book" title="Marginalia Obscura" description="A compendium of annotations written in the margins of burned books, reassembled from memory." />
        </Card>
        <Card id="book-2">
          <KnowledgeCard type="book" title="The Warden's Ledger" description="Records of the old asylum. Names, dates, and a cipher that repeats on every third page." />
        </Card>

        <Card id="artifact-1">
          <KnowledgeCard type="artifact" title="Hollow Coin" description="Minted in no known nation. The face shifts depending on lighting conditions." />
        </Card>
        <Card id="patron-1">
          <KnowledgeCard type="patron" title="Sister Anneliese" description="Runs a legitimate charity. Knows more than she admits about the city's underground." />
        </Card>
      </Table>

      {/* ── Event log overlay ── */}
      {log.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-1 max-w-xs pointer-events-none">
          {log.map((entry, i) => (
            <div
              key={i}
              className="text-xs px-3 py-1.5 rounded bg-black/70 text-amber-300 border border-amber-600/30"
            >
              {entry}
            </div>
          ))}
        </div>
      )}

      {/* ── Instructions overlay ── */}
      <div className="fixed top-4 left-4 z-[100] text-xs text-amber-500/50 pointer-events-none space-y-0.5">
        <div>Drag cards onto follower slots.</div>
        <div>Elara's third slot is locked — cards stay put.</div>
        <div>Two cards cannot share an origin cell.</div>
        <div className="mt-1 text-amber-600/40">
          <a href="/" className="pointer-events-auto underline">← Back</a>
        </div>
      </div>
    </div>
  );
}
