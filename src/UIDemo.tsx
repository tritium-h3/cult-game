import React, { useState } from 'react';
import { Table, Card, Sheet, type CardData } from './ui';
import { HookCard, type HookItemType } from './ui/templates/HookCard';
import { FollowerSheet } from './ui/templates/FollowerSheet';

// ---------------------------------------------------------------------------
// Demo layout — all values in grid units (1 unit = 80px)
// Grid: 80px cells. Card: 2×3 cells = 160×240px.
// ---------------------------------------------------------------------------

// Cards: two columns, three rows. Columns at gx=1 and gx=4 (3 apart = no overlap).
// Type/title/description live here so discarded cards can be re-dealt from the same data.
interface DemoCardDef {
  type: HookItemType;
  title: string;
  description: string;
  gx: number;
  gy: number;
}

const DEMO_CARDS: Record<string, DemoCardDef> = {
  'site-1':     { type: 'site',     gx: 1, gy: 0, title: 'The Sunken Library',  description: 'A flooded archive beneath the old docks. Locals say books still surface at low tide.' },
  'site-2':     { type: 'site',     gx: 4, gy: 0, title: 'The Pale Cathedral',  description: 'Abandoned since the plague year. Strange light flickers from the bell tower at night.' },
  'book-1':     { type: 'book',     gx: 1, gy: 4, title: 'Marginalia Obscura',  description: 'A compendium of annotations written in the margins of burned books, reassembled from memory.' },
  'book-2':     { type: 'book',     gx: 4, gy: 4, title: "The Warden's Ledger", description: 'Records of the old asylum. Names, dates, and a cipher that repeats on every third page.' },
  'artifact-1': { type: 'artifact', gx: 1, gy: 8, title: 'Hollow Coin',          description: 'Minted in no known nation. The face shifts depending on lighting conditions.' },
  'patron-1':   { type: 'patron',   gx: 4, gy: 8, title: 'Sister Anneliese',     description: "Runs a legitimate charity. Knows more than she admits about the city's underground." },
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
  // State is derived from DEMO_CARDS so cards can be re-dealt.
  const [cards, setCards] = useState<Record<string, CardData>>(() =>
    Object.fromEntries(Object.entries(DEMO_CARDS).map(([id, d]) => [id, { gx: d.gx, gy: d.gy }]))
  );
  const [log, setLog] = useState<string[]>([]);

  function removeCard(id: string) {
    setCards(c => {
      const { [id]: _, ...rest } = c;
      return rest;
    });
    console.log(`[UIDemo] Discarded card "${id}"`);
  }

  function dealCard() {
    const discarded = Object.keys(DEMO_CARDS).filter(id => !(id in cards));
    if (discarded.length === 0) return;
    const id = discarded[0];
    const def = DEMO_CARDS[id];
    console.log(`[UIDemo] Dealing card "${id}"`);
    setCards(c => ({ ...c, [id]: { gx: def.gx, gy: def.gy } }));
  }

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

        {/* ── Free cards — conditionally rendered so mounting = entrance animation, unmounting = explosion ── */}
        {Object.entries(DEMO_CARDS).map(([id, def]) =>
          id in cards ? (
            <Card key={id} id={id}>
              <HookCard
                type={def.type}
                title={def.title}
                description={def.description}
                onDiscard={() => removeCard(id)}
              />
            </Card>
          ) : null
        )}
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
        <div>Hover a card and click <span className="text-amber-400/70">×</span> to discard it — watch it burst.</div>
        <div>Elara's third slot is locked — cards stay put.</div>
        <div>Two cards cannot share an origin cell.</div>
        {Object.keys(DEMO_CARDS).some(id => !(id in cards)) && (
          <button
            onClick={dealCard}
            className="pointer-events-auto mt-1.5 px-2 py-1 rounded border border-amber-600/30 text-amber-400/75 hover:text-amber-300 hover:border-amber-500/50 transition-colors"
          >
            Deal a card
          </button>
        )}
        <div className="mt-1 text-amber-600/40">
          <a href="/" className="pointer-events-auto underline">← Back</a>
        </div>
      </div>
    </div>
  );
}
