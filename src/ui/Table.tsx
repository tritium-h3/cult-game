import React, { useCallback, useRef, type ReactNode, type MouseEvent } from 'react';
import { TableProvider, useTable } from './context';
import type { CardData, TableConfig } from './types';

// ---------------------------------------------------------------------------
// Inner table — owns the drag mousemove/mouseup handlers
// ---------------------------------------------------------------------------

interface TableInnerProps {
  children: ReactNode;
  onSlotDrop?: (slotId: string, cardId: string) => void;
}

function TableInner({ children, onSlotDrop }: TableInnerProps) {
  const { config, cards, drag, slotRegistry, setSlotCard, findCollision, commitDrag, revertDrag } = useTable();

  // Track live cursor position during drag without triggering re-renders.
  // The dragged card's visual position is updated via direct DOM style in useDrag,
  // not through React state, so intermediate positions stay off the render cycle.
  const cursorPos = useRef({ x: 0, y: 0 });
  const tableRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!drag) return;

      const tableRect = tableRef.current?.getBoundingClientRect();
      if (!tableRect) return;

      // Position of the dragged card's top-left in table-local pixels.
      const x = e.clientX - tableRect.left - drag.cursorOffsetX;
      const y = e.clientY - tableRect.top - drag.cursorOffsetY;

      cursorPos.current = { x, y };

      // Move the card via direct DOM manipulation for performance.
      const el = document.getElementById(`card-${drag.cardId}`);
      if (el) {
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.zIndex = '50';
        el.style.transition = 'none'; // no snap animation while actively dragging
      }
    },
    [drag]
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (!drag) return;

      const { cardId, startGx, startGy, cursorOffsetX, cursorOffsetY } = drag;
      const tableRect = tableRef.current?.getBoundingClientRect();
      if (!tableRect) {
        revertDrag();
        return;
      }

      const { gridSize } = config;

      // Raw pixel position of card top-left in table space.
      const rawX = e.clientX - tableRect.left - cursorOffsetX;
      const rawY = e.clientY - tableRect.top - cursorOffsetY;

      // Snap to nearest grid cell.
      const gx = Math.round(rawX / gridSize);
      const gy = Math.round(rawY / gridSize);

      // Clamp to table bounds (keep card fully within viewport).
      const tableW = Math.floor(tableRect.width / gridSize);
      const tableH = Math.floor(tableRect.height / gridSize);
      const clampedGx = Math.max(0, Math.min(gx, tableW - config.cardW));
      const clampedGy = Math.max(0, Math.min(gy, tableH - config.cardH));

      // Collision check — is another card's origin at this exact cell?
      const collision = findCollision(clampedGx, clampedGy, cardId);
      if (collision !== undefined) {
        revertDrag();
        console.log(`[Table] Revert card ${cardId}: collision with ${collision} at (${clampedGx},${clampedGy})`);
        return;
      }

      // Slot proximity check — card center in table space.
      const cardPxW = config.cardW * gridSize;
      const cardPxH = config.cardH * gridSize;
      const cardCenterX = e.clientX - tableRect.left - cursorOffsetX + cardPxW / 2;
      const cardCenterY = e.clientY - tableRect.top - cursorOffsetY + cardPxH / 2;

      let targetSlotId: string | undefined;
      let slotGx = clampedGx;
      let slotGy = clampedGy;

      for (const [slotId, entry] of Object.entries(slotRegistry.current)) {
        const rect = entry.getRect();
        // Convert slot rect to table-local coords.
        const slotLeft = rect.left - tableRect.left;
        const slotTop = rect.top - tableRect.top;
        const slotRight = slotLeft + rect.width;
        const slotBottom = slotTop + rect.height;

        if (
          cardCenterX >= slotLeft &&
          cardCenterX <= slotRight &&
          cardCenterY >= slotTop &&
          cardCenterY <= slotBottom
        ) {
          // Don't allow dropping on a slot occupied by a different card.
          if (entry.cardId && entry.cardId !== cardId) break;

          targetSlotId = slotId;
          // Snap card origin to slot origin.
          slotGx = Math.round(slotLeft / gridSize);
          slotGy = Math.round(slotTop / gridSize);
          console.log(`[Table] Card ${cardId} dropped onto slot ${slotId}`);
          break;
        }
      }

      // Free the old slot if the card was in one.
      const prevCard = cards[cardId];
      if (prevCard?.slotId && prevCard.slotId !== targetSlotId) {
        setSlotCard(prevCard.slotId, undefined);
      }
      if (targetSlotId) {
        setSlotCard(targetSlotId, cardId);
      }

      const finalGx = targetSlotId ? slotGx : clampedGx;
      const finalGy = targetSlotId ? slotGy : clampedGy;

      commitDrag(cardId, finalGx, finalGy, targetSlotId);
      if (targetSlotId) onSlotDrop?.(targetSlotId, cardId);

      console.log(`[Table] Card ${cardId} settled at grid (${finalGx},${finalGy})${targetSlotId ? ` in slot ${targetSlotId}` : ''}`);
    },
    [drag, cards, config, commitDrag, revertDrag, slotRegistry, setSlotCard, findCollision, onSlotDrop]
  );

  return (
    <div
      ref={tableRef}
      id="table-surface"
      className="relative w-screen h-screen overflow-hidden select-none bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      // Prevent the browser's default drag behaviour interfering.
      onDragStart={(e) => e.preventDefault()}
    >
      {/* TODO: panning — attach pan handlers here, transform the inner surface */}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public Table component
// ---------------------------------------------------------------------------

interface TableProps {
  config?: Partial<TableConfig>;
  /** Controlled card positions — own this in your scene component state. */
  cards: Record<string, CardData>;
  /** Called whenever a card's position or slot changes after a drop. */
  onCardsChange: (cards: Record<string, CardData>) => void;
  onSlotDrop?: (slotId: string, cardId: string) => void;
  children?: ReactNode;
}

export function Table({ config, cards, onCardsChange, onSlotDrop, children }: TableProps) {
  return (
    <TableProvider config={config} cards={cards} onCardsChange={onCardsChange}>
      <TableInner onSlotDrop={onSlotDrop}>{children}</TableInner>
    </TableProvider>
  );
}
