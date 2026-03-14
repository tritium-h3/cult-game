import React, { useEffect, useRef } from 'react';
import { useTable } from './context';

interface SlotProps {
  /** Unique id for this slot, scoped to the table. */
  id: string;
  /**
   * If true, a card placed here cannot be removed by the user.
   * The useDrag hook checks `card.slotId` + slot.locked before allowing mousedown.
   */
  locked?: boolean;
  /** Label shown when the slot is empty. */
  emptyLabel?: string;
  className?: string;
}

/**
 * A card-sized drop target embedded in a Sheet.
 *
 * On mount, registers its DOM rect into the TableContext slot registry so the
 * Table's mouseup handler can detect drops onto this slot.
 *
 * Visual states:
 *   - Empty:    dashed border, muted label
 *   - Occupied: solid border, brighter bg (the Card component renders on top)
 *   - Locked:   subtle lock indicator
 */
export function Slot({ id, locked = false, emptyLabel = 'Drop card here', className = '' }: SlotProps) {
  const { config, registerSlot, unregisterSlot, state, slotRegistry } = useTable();

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    registerSlot({
      slotId: id,
      getRect: () => ref.current!.getBoundingClientRect(),
      locked,
      cardId: undefined,
    });

    console.log(`[Slot] Registered slot: ${id}${locked ? ' (locked)' : ''}`);

    return () => {
      unregisterSlot(id);
      console.log(`[Slot] Unregistered slot: ${id}`);
    };
    // locked can change at runtime; re-register if it does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, locked]);

  // Determine if a card is currently placed in this slot.
  const occupyingCardId = slotRegistry.current[id]?.cardId;
  const isOccupied = !!occupyingCardId;

  const pxW = config.cardW * config.gridSize;
  const pxH = config.cardH * config.gridSize;

  return (
    <div
      ref={ref}
      data-slot-id={id}
      style={{ width: pxW, height: pxH }}
      className={[
        'relative rounded border-2',
        isOccupied
          ? 'border-amber-500/60 bg-amber-900/10'
          : 'border-dashed border-amber-500/30 bg-black/10',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {!isOccupied && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 pointer-events-none">
          <span className="text-xs text-amber-500/40 text-center px-2">{emptyLabel}</span>
          {locked && (
            <span className="text-xs text-amber-600/50">locked</span>
          )}
        </div>
      )}
      {isOccupied && locked && (
        <div className="absolute bottom-1 right-1 pointer-events-none">
          <span className="text-xs text-amber-600/60">⚿</span>
        </div>
      )}
    </div>
  );
}
