import React, { useState } from 'react';
import { Table, Card, Sheet, type CardData } from './ui';
import { HookCard } from './ui/templates/HookCard';
import { FollowerSheet } from './ui/templates/FollowerSheet';

// ---------------------------------------------------------------------------
// Demo layout — all values in grid units (1 unit = 80px)
// Grid: 80px cells. Card: 2×3 cells = 160×240px.
// ---------------------------------------------------------------------------

// Cards: two columns, three rows. Columns at gx=1 and gx=4 (3 apart = no overlap).
const DEMO_INITIAL_CARDS: Record<string, CardData> = {
  'site-1':     { gx: 1, gy: 0 },
  'site-2':     { gx: 4, gy: 0 },
  'book-1':     { gx: 1, gy: 4 },
  'book-2':     { gx: 4, gy: 4 },
  'artifact-1': { gx: 1, gy: 8 },
  'patron-1':   { gx: 4, gy: 8 },
};

// Elara sheet: gx=7, gy=2, 4 cols × 8 rows (320×640px)
//   Info area: dy 0–1 (160px)
//   Slot row 1: dy=2 (two slots side by side at dx=0 and dx=2)
//   Slot row 2: dy=5 (one locked slot at dx=0)
const ELARA_GX = 7;
const ELARA_GY = 2;

// Dorian sheet: gx=12, gy=2, 4 cols × 8 rows — matches Elara
//   Info area: dy 0–1 (160px)
//   Slot row 1: dy=2 (two slots side by side at dx=0 and dx=2)
//   Slot row 2: dy=5 (one unlocked slot at dx=0)
const DORIAN_GX = 12;
const DORIAN_GY = 2;

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
        <Sheet gx={ELARA_GX} gy={ELARA_GY} cols={4} rows={8}>
          <FollowerSheet
            name="Elara Mourne"
            background="Former archivist, drawn to forbidden texts. Methodical and secretive."
            skills={['Research', 'Deception', 'Archaic Languages']}
            slots={[
              { id: 'elara-0', dx: 0, dy: 2, label: 'Primary task' },
              { id: 'elara-1', dx: 2, dy: 2, label: 'Secondary task' },
              { id: 'elara-2', dx: 0, dy: 5, locked: true, label: 'Sworn purpose (locked)' },
            ]}
          />
        </Sheet>

        {/* ── Follower sheet 2: Dorian Vael — matches Elara's layout ── */}
        <Sheet gx={DORIAN_GX} gy={DORIAN_GY} cols={4} rows={8}>
          <FollowerSheet
            name="Dorian Vael"
            background="Street preacher turned true believer. Charismatic but unstable."
            skills={['Persuasion', 'Endurance']}
            slots={[
              { id: 'dorian-0', dx: 0, dy: 2, label: 'Primary task' },
            ]}
          />
        </Sheet>

        {/* ── Free cards — drag these onto the slots above ── */}
        <Card id="site-1">
          <HookCard type="site" title="The Sunken Library" description="A flooded archive beneath the old docks. Locals say books still surface at low tide." />
        </Card>
        <Card id="site-2">
          <HookCard type="site" title="The Pale Cathedral" description="Abandoned since the plague year. Strange light flickers from the bell tower at night." />
        </Card>

        <Card id="book-1">
          <HookCard type="book" title="Marginalia Obscura" description="A compendium of annotations written in the margins of burned books, reassembled from memory." />
        </Card>
        <Card id="book-2">
          <HookCard type="book" title="The Warden's Ledger" description="Records of the old asylum. Names, dates, and a cipher that repeats on every third page." />
        </Card>

        <Card id="artifact-1">
          <HookCard type="artifact" title="Hollow Coin" description="Minted in no known nation. The face shifts depending on lighting conditions." />
        </Card>
        <Card id="patron-1">
          <HookCard type="patron" title="Sister Anneliese" description="Runs a legitimate charity. Knows more than she admits about the city's underground." />
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
