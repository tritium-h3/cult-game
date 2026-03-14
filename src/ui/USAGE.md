# `src/ui/` — Table/Card/Sheet Interface Library

A physical table metaphor for full-screen game scenes. The mental model is **cards and sheets on a table**: sheets are documents laid out by the game; cards are freely draggable objects the player places onto sheet slots.

---

## Physical Model

| Primitive | Metaphor | Moveable by user? | Z-layer |
|---|---|---|---|
| **Table** | The table surface | — | contains everything |
| **Sheet** | A document on the table | No | `z-10` (always below cards) |
| **Slot** | A receptacle drawn on a sheet | No | inherits Sheet |
| **Card** | A loose card on the table | Yes | `z-20+` (always above sheets) |

**Grid**: 80×80px square cells. Default card size: 160×240px (2 cols × 3 rows).

**Overlap rule**: each card's upper-left corner must occupy a unique grid cell. Two cards can overlap in any way as long as their origins (upper-left corners) are at different grid cells. Attempting to drop a card onto an occupied origin reverts it to its previous position.

---

## Basic Usage

```tsx
import { Table, Card, Sheet, Slot, type CardData } from './ui';
import { useState } from 'react';

const [cards, setCards] = useState<Record<string, CardData>>({
  'card-a': { gx: 1, gy: 1 },
  'card-b': { gx: 4, gy: 1 },
});

<Table cards={cards} onCardsChange={setCards} onSlotDrop={handleDrop}>

  {/* Sheets are plain React children — conditionally render or map over them */}
  <Sheet x={560} y={80} width={400} height={500}>
    <Slot id="slot-1" emptyLabel="Drop here" />
    <Slot id="slot-2" locked emptyLabel="Permanent assignment" />
  </Sheet>

  {/* One Card per entry in cards — id must match the key */}
  <Card id="card-a">
    <div>My card content</div>
  </Card>
  <Card id="card-b">
    <div>Another card</div>
  </Card>

</Table>
```

---

## Cards are Controlled

The parent component owns card positions. `Table` is a controlled component.

```tsx
// Add a card
setCards(prev => ({ ...prev, 'new-card': { gx: 5, gy: 2 } }));

// Remove a card
setCards(prev => {
  const { 'old-card': _, ...rest } = prev;
  return rest;
});

// Move a card programmatically (e.g. game event, week transition)
setCards(prev => ({ ...prev, 'site-1': { gx: 10, gy: 3 } }));

// Replace the entire card set for a new scene
setCards(nextSceneCards);
```

`drag` state (the transient visual of a card in flight) is internal to Table — the parent never sees or manages it.

---

## Sheets and Slots are Dynamic

Sheets are React children, so they're fully dynamic — conditionally render them, map over arrays, whatever:

```tsx
{followers.map(f => (
  <Sheet key={f.id} x={sheetX(f)} y={sheetY(f)} width={400} height={500}>
    {f.slots.map((slot, i) => (
      <Slot key={slot.id} id={slot.id} locked={slot.locked} />
    ))}
  </Sheet>
))}
```

Slots register themselves in the Table's slot registry on mount and unregister on unmount automatically. No manual bookkeeping needed.

---

## Slot Drop Callback

```tsx
function handleDrop(slotId: string, cardId: string) {
  // A card was successfully placed into a slot.
  // Update game state here.
}
```

`onSlotDrop` fires after the card has already snapped into position and `onCardsChange` has been called. The `CardData` for the card will have `slotId` set to the slot's id.

---

## Locking Cards in Slots

A `Slot` with `locked` prevents the user from removing a card once placed:

```tsx
<Slot id="sworn-task" locked emptyLabel="Sworn purpose" />
```

The `locked` prop can be toggled at runtime — if a slot is unlocked after a card is placed, the card becomes draggable again.

---

## `Table` Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `cards` | `Record<string, CardData>` | Yes | Controlled card positions |
| `onCardsChange` | `(cards) => void` | Yes | Called after any drag completes |
| `onSlotDrop` | `(slotId, cardId) => void` | No | Called when a card lands in a slot |
| `config` | `Partial<TableConfig>` | No | Override grid/card size constants |

## `TableConfig` Defaults

```ts
{ gridSize: 80, cardW: 2, cardH: 3 }
// → cards are 160×240px, grid cells are 80×80px
```

## `CardData` Shape

```ts
interface CardData {
  gx: number;      // grid column of upper-left corner
  gy: number;      // grid row of upper-left corner
  slotId?: string; // set when card is in a slot
}
```

---

## Example Templates (non-normative)

`src/ui/templates/KnowledgeCard.tsx` and `src/ui/templates/FollowerSheet.tsx` are example implementations showing a recommended visual pattern for the cult game. They are **not required** — any React children work inside `<Card>` and `<Sheet>`. Use them as reference or a starting point.

```tsx
import { KnowledgeCard } from './ui/templates/KnowledgeCard';
import { FollowerSheet } from './ui/templates/FollowerSheet';

<Card id="book-1">
  <KnowledgeCard type="book" title="Necronomicon" description="Forbidden lore." />
</Card>

<Sheet x={560} y={80} width={400} height={500}>
  <FollowerSheet
    name="Elara Mourne"
    background="Former archivist."
    skills={['Research', 'Deception']}
    slots={[{ id: 'elara-0' }, { id: 'elara-1', locked: true }]}
  />
</Sheet>
```

---

## File Map

```
src/ui/
  index.ts                   Public API re-exports
  types.ts                   TypeScript interfaces
  context.tsx                TableContext, useTable hook, TableProvider
  Table.tsx                  Full-screen container, drag event handling
  Card.tsx                   Draggable card shell
  Sheet.tsx                  Fixed game-placed document container
  Slot.tsx                   Drop target embedded in a Sheet
  hooks/
    useDrag.ts               mousedown handler factory
  templates/
    KnowledgeCard.tsx        Example: site/book/patron/artifact card face
    FollowerSheet.tsx        Example: follower sheet with slot row
  USAGE.md                   This file
```

Demo app: `src/UIDemo.tsx` at route `/demo`.
