import React, { type ReactNode } from 'react';

interface SheetProps {
  /** Left position in pixels from the table origin. */
  x: number;
  /** Top position in pixels from the table origin. */
  y: number;
  /** Width in pixels. */
  width: number;
  /** Height in pixels. */
  height: number;
  children?: ReactNode;
  className?: string;
}

/**
 * A game-placed document on the table.
 *
 * Sheets are always at z-10, beneath all cards (z-20+).
 * The user cannot move sheets — position is purely controlled by game/scene logic.
 *
 * Slot components placed inside a Sheet will register themselves in the
 * TableContext slot registry, enabling the Table's drop detection to find them.
 */
export function Sheet({ x, y, width, height, children, className = '' }: SheetProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        zIndex: 10,
      }}
      className={[
        'rounded-lg border border-amber-600/30 bg-black/40 backdrop-blur-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}
