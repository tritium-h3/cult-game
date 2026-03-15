import React, { createContext, useContext, type ReactNode } from 'react';
import { useTable } from './context';

/** Provided by Sheet to its children so Slot can compute absolute table coords. */
export interface SheetContextValue {
  gx: number;
  gy: number;
}

export const SheetContext = createContext<SheetContextValue | null>(null);

/** Convenience hook for reading the enclosing sheet's grid position. */
export function useSheet(): SheetContextValue {
  const ctx = useContext(SheetContext);
  if (!ctx) throw new Error('useSheet must be used inside a Sheet component');
  return ctx;
}

interface SheetProps {
  /** Grid column of this sheet's upper-left corner on the table. */
  gx: number;
  /** Grid row of this sheet's upper-left corner on the table. */
  gy: number;
  /** Width in grid cells. */
  cols: number;
  /** Height in grid cells. */
  rows: number;
  children?: ReactNode;
  className?: string;
}

/**
 * A game-placed document on the table.
 *
 * All position and size props are in grid units (multiples of gridSize px).
 * Sheets are always at z-10, beneath all cards (z-20+).
 * The user cannot move sheets — position is controlled by game/scene logic.
 *
 * Provides SheetContext so child Slot components can register their
 * absolute table grid positions.
 */
export function Sheet({ gx, gy, cols, rows, children, className = '' }: SheetProps) {
  const { config } = useTable();
  const { gridSize } = config;

  return (
    <SheetContext.Provider value={{ gx, gy }}>
      {/* Outer container — exactly grid-sized, transparent.
          Slot dx/dy positioning is relative to this element's top-left corner. */}
      <div
        style={{
          position: 'absolute',
          left: gx * gridSize,
          top: gy * gridSize,
          width: cols * gridSize,
          height: rows * gridSize,
          zIndex: 10,
        }}
      >
        {/* Visual background — bleeds 8px past the grid boundary on all sides,
            so the sheet visually extends into neighbouring grid squares.
            Combined with card/slot inset-2, there is an 8px gap between the
            sheet's edge and any card content in adjacent cells. */}
        <div
          className={[
            'absolute -inset-[30px] rounded-lg border border-amber-600/30 bg-black/40 backdrop-blur-sm pointer-events-none',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
        />
        {children}
      </div>
    </SheetContext.Provider>
  );
}
