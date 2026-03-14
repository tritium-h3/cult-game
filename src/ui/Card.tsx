import React, { type ReactNode, useEffect, useRef } from 'react';
import { useTable } from './context';
import { useDrag } from './hooks/useDrag';

interface CardProps {
  /** Must match a key in the cards map passed to Table's initialCards (or added via dispatch). */
  id: string;
  /** If true, the card cannot be dragged by the user. */
  locked?: boolean;
  children?: ReactNode;
  className?: string;
}

/**
 * A freely draggable card on the table.
 *
 * Position is driven by context state (gx, gy) × gridSize.
 * During a drag, position is updated via direct DOM style (no re-renders) for
 * performance — the CSS transition is stripped while dragging and restored on
 * mouseup so the snap animation only fires at the end.
 *
 * Z-index layers:
 *   Sheets:            z-10
 *   Cards (at rest):   z-20..49  (monotonically increasing; most-recently-moved wins)
 *   Card (dragging):   z-50  (applied by Table's mousemove handler)
 */
export function Card({ id, locked = false, children, className = '' }: CardProps) {
  const { cards, drag, config, slotRegistry } = useTable();

  const card = cards[id];
  // A card in a locked slot cannot be moved, regardless of the locked prop on Card.
  const effectiveLocked = locked || !!(card?.slotId && slotRegistry.current[card.slotId]?.locked);
  const { onMouseDown } = useDrag(id, effectiveLocked);

  const isDragging = drag?.cardId === id;

  // Re-apply the correct committed position + transition after drag ends.
  // The table's mousemove strips the transition; we restore it here once the
  // drag state clears so the snap animation plays.
  const elRef = useRef<HTMLDivElement>(null);
  const prevDragging = useRef(false);

  useEffect(() => {
    if (prevDragging.current && !isDragging && elRef.current && card) {
      const px = card.gx * config.gridSize;
      const py = card.gy * config.gridSize;
      // Restore transition so the snap animation fires.
      elRef.current.style.transition = 'left 120ms ease-out, top 120ms ease-out';
      elRef.current.style.left = `${px}px`;
      elRef.current.style.top = `${py}px`;
      elRef.current.style.zIndex = String(card.zIndex + 20); // zIndex 20+ keeps cards above sheets (z-10)
    }
    prevDragging.current = isDragging;
  });

  if (!card) {
    console.warn(`[Card] Card "${id}" not found in table state`);
    return null;
  }

  const pxX = card.gx * config.gridSize;
  const pxY = card.gy * config.gridSize;
  const pxW = config.cardW * config.gridSize;
  const pxH = config.cardH * config.gridSize;

  return (
    <div
      id={`card-${id}`}
      ref={elRef}
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute',
        left: pxX,
        top: pxY,
        width: pxW,
        height: pxH,
        zIndex: isDragging ? 50 : card.zIndex + 20,
        // Transition is applied/removed dynamically in the useEffect above.
        // On initial render show no transition (card appears in place).
        transition: 'none',
      }}
      className={[
        'rounded',
        locked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
