import React, { useEffect } from 'react';
import { useTable } from './context';
import { useSheet } from './Sheet';

interface SlotProps {
  /** Unique id for this slot, scoped to the table. */
  id: string;
  /**
   * Grid-unit offset from the containing Sheet's upper-left corner.
   * The slot's absolute table position = (sheet.gx + dx, sheet.gy + dy).
   * Must result in a grid-aligned position — decimal values are not valid.
   */
  dx: number;
  dy: number;
  /**
   * If true, a card placed here cannot be removed by the user.
   */
  locked?: boolean;
  /** Label shown when the slot is empty. */
  emptyLabel?: string;
  className?: string;
}

/**
 * A card-sized drop target embedded in a Sheet.
 *
 * Position is grid-aligned via dx/dy offsets from the parent Sheet.
 * Registers its absolute (gx, gy) into the TableContext slot registry on mount
 * so the Table's mouseup handler can detect card drops by grid position match.
 *
 * Visual states:
 *   - Empty:    dashed border, muted label
 *   - Occupied: solid border, brighter bg (the Card renders on top)
 *   - Locked:   subtle lock indicator
 */
export function Slot({ id, dx, dy, locked = false, emptyLabel = 'Drop card here', className = '' }: SlotProps) {
  const { config, registerSlot, unregisterSlot, slotRegistry } = useTable();
  const sheet = useSheet();

  const absoluteGx = sheet.gx + dx;
  const absoluteGy = sheet.gy + dy;

  useEffect(() => {
    registerSlot({ slotId: id, gx: absoluteGx, gy: absoluteGy, locked, cardId: undefined });
    console.log(`[Slot] Registered slot: ${id} at (${absoluteGx},${absoluteGy})${locked ? ' (locked)' : ''}`);
    return () => {
      unregisterSlot(id);
      console.log(`[Slot] Unregistered slot: ${id}`);
    };
  // Re-register if position or locked state changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, absoluteGx, absoluteGy, locked]);

  const isOccupied = !!slotRegistry.current[id]?.cardId;
  const { gridSize, cardW, cardH } = config;
  const pxW = cardW * gridSize;
  const pxH = cardH * gridSize;

  return (
    <div
      data-slot-id={id}
      style={{
        position: 'absolute',
        left: dx * gridSize,
        top: dy * gridSize,
        width: pxW,
        height: pxH,
      }}
    >
      {/* Inset visual indicator — 8px from grid boundary, matching Card's inset wrapper.
          Creates margins at sheet edges and gutters between adjacent slots. */}
      <div
        className={[
          'absolute inset-2 rounded border-2',
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
            {locked && <span className="text-xs text-amber-600/50">locked</span>}
          </div>
        )}
        {isOccupied && locked && (
          <div className="absolute bottom-1 right-1 pointer-events-none">
            <span className="text-xs text-amber-600/60">⚿</span>
          </div>
        )}
      </div>
    </div>
  );
}
