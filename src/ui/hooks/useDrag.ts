import { useCallback } from 'react';
import { useTable } from '../context';

/**
 * Returns a mousedown handler to attach to a card element.
 *
 * When the user presses down on a card:
 *   1. Records the cursor offset within the card (for a natural grab feel).
 *   2. Dispatches START_DRAG with the card's current grid position as the revert point.
 *
 * The table's onMouseMove / onMouseUp then drive the rest:
 *   - mousemove: card follows cursor via direct DOM style (no re-renders).
 *   - mouseup:   snap to grid, collision check, slot check, commit or revert.
 *
 * @param cardId  The id of the card this hook is attached to.
 * @param locked  If true, mousedown is a no-op (card cannot be moved).
 */
export function useDrag(cardId: string, locked: boolean = false) {
  const { cards, startDrag } = useTable();

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (locked) return;

      // Only respond to primary button clicks.
      if (e.button !== 0) return;

      // Prevent the event from bubbling to the table's mouseup handler prematurely.
      e.stopPropagation();

      const card = cards[cardId];
      if (!card) {
        console.warn(`[useDrag] Card ${cardId} not found in state`);
        return;
      }

      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();

      // How far inside the card the user clicked.
      const cursorOffsetX = e.clientX - rect.left;
      const cursorOffsetY = e.clientY - rect.top;

      console.log(`[useDrag] Start drag: card=${cardId} from (${card.gx},${card.gy})`);

      startDrag({
        cardId,
        startGx: card.gx,
        startGy: card.gy,
        cursorOffsetX,
        cursorOffsetY,
      });
    },
    [locked, cardId, cards, startDrag]
  );

  return { onMouseDown };
}
