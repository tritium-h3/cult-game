import React, { useCallback, useEffect, useRef, useState, type ReactNode, type MouseEvent } from 'react';
import { TableProvider, useTable } from './context';
import type { CardData, GridPos, TableConfig } from './types';

// ---------------------------------------------------------------------------
// Particle definitions for card removal explosion
// ---------------------------------------------------------------------------

const PARTICLES: Array<{
  angle: number; r: number; size: number; color: string;
  delay: number; dur: number; rot: number;
}> = [
  { angle: 0,   r: 72, size: 6, color: '#fcd34d', delay: 0,  dur: 460, rot: 45  },
  { angle: 30,  r: 55, size: 4, color: '#fef3c7', delay: 20, dur: 500, rot: 30  },
  { angle: 60,  r: 85, size: 7, color: '#f59e0b', delay: 5,  dur: 440, rot: 90  },
  { angle: 90,  r: 65, size: 4, color: '#fcd34d', delay: 40, dur: 520, rot: 60  },
  { angle: 120, r: 78, size: 6, color: '#fef3c7', delay: 15, dur: 480, rot: 45  },
  { angle: 150, r: 52, size: 4, color: '#d97706', delay: 60, dur: 510, rot: 30  },
  { angle: 180, r: 88, size: 7, color: '#fcd34d', delay: 10, dur: 450, rot: 90  },
  { angle: 210, r: 62, size: 4, color: '#fef3c7', delay: 50, dur: 490, rot: 45  },
  { angle: 240, r: 73, size: 5, color: '#f59e0b', delay: 25, dur: 470, rot: 60  },
  { angle: 270, r: 82, size: 4, color: '#fcd34d', delay: 70, dur: 530, rot: 30  },
  { angle: 300, r: 58, size: 6, color: '#fef3c7', delay: 35, dur: 485, rot: 90  },
  { angle: 330, r: 68, size: 5, color: '#d97706', delay: 55, dur: 475, rot: 45  },
];

const MAX_PARTICLE_DUR = Math.max(...PARTICLES.map(p => p.delay + p.dur));

// ---------------------------------------------------------------------------
// Card removal explosion overlay
// ---------------------------------------------------------------------------

function CardExplosion({ gx, gy, onDone }: { gx: number; gy: number; onDone: () => void }) {
  const { config } = useTable();

  useEffect(() => {
    const timer = setTimeout(onDone, MAX_PARTICLE_DUR + 120);
    return () => clearTimeout(timer);
  }, [onDone]);

  const pxX = gx * config.gridSize;
  const pxY = gy * config.gridSize;
  const pxW = config.cardW * config.gridSize;
  const pxH = config.cardH * config.gridSize;
  const cx = pxW / 2;
  const cy = pxH / 2;

  return (
    <div
      style={{
        position: 'absolute',
        left: pxX,
        top: pxY,
        width: pxW,
        height: pxH,
        zIndex: 60,
        pointerEvents: 'none',
      }}
    >
      {/* Brief warm flash at the card face */}
      <div className="card-explosion-flash" />

      {/* Outward-flying twinkle particles */}
      {PARTICLES.map((p, i) => {
        const tx = Math.cos((p.angle * Math.PI) / 180) * p.r;
        const ty = Math.sin((p.angle * Math.PI) / 180) * p.r;
        return (
          <div
            key={i}
            className="card-explosion-particle"
            style={{
              left: cx - p.size / 2,
              top: cy - p.size / 2,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              boxShadow: `0 0 ${p.size}px ${Math.ceil(p.size * 0.8)}px ${p.color}99`,
              animationDelay: `${p.delay}ms`,
              '--twinkle-dur': `${p.dur}ms`,
              '--tx': `${tx}px`,
              '--ty': `${ty}px`,
              '--rot': `${p.rot}deg`,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner table — owns the drag mousemove/mouseup handlers
// ---------------------------------------------------------------------------

interface TableInnerProps {
  children: ReactNode;
  onSlotDrop?: (slotId: string, cardId: string) => void;
  exitingCards: Record<string, GridPos>;
  onExitDone: (id: string) => void;
}

function TableInner({ children, onSlotDrop, exitingCards, onExitDone }: TableInnerProps) {
  const { config, cards, drag, slotRegistry, setSlotCard, findCollision, commitDrag, revertDrag } = useTable();

  const tableRef = useRef<HTMLDivElement>(null);
  const innerCanvasRef = useRef<HTMLDivElement>(null);
  const cursorPos = useRef({ x: 0, y: 0 });

  // Pan state — all tracking via refs so mousemove never triggers re-renders.
  const panOffsetRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 });
  // Only used for cursor styling; updates only at pan start/end.
  const [isPanning, setIsPanning] = useState(false);

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      // Pan movement — translate the inner canvas directly, no re-render needed.
      if (isPanningRef.current) {
        const newX = panStartRef.current.panX + (e.clientX - panStartRef.current.mouseX);
        const newY = panStartRef.current.panY + (e.clientY - panStartRef.current.mouseY);
        panOffsetRef.current = { x: newX, y: newY };
        if (innerCanvasRef.current) {
          innerCanvasRef.current.style.transform = `translate(${newX}px, ${newY}px)`;
        }
        return;
      }

      if (!drag) return;

      const tableRect = tableRef.current?.getBoundingClientRect();
      if (!tableRect) return;

      // Position of the dragged card's top-left in inner canvas space (subtract pan offset).
      const x = e.clientX - tableRect.left - drag.cursorOffsetX - panOffsetRef.current.x;
      const y = e.clientY - tableRect.top - drag.cursorOffsetY - panOffsetRef.current.y;

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
      // End pan on button release.
      if (isPanningRef.current && e.button === 0) {
        isPanningRef.current = false;
        setIsPanning(false);
        console.log('[Table] Pan end at', panOffsetRef.current);
        return;
      }

      if (!drag) return;

      const { cardId, startGx, startGy, cursorOffsetX, cursorOffsetY } = drag;
      const tableRect = tableRef.current?.getBoundingClientRect();
      if (!tableRect) {
        revertDrag();
        return;
      }

      const { gridSize } = config;

      // Raw pixel position of card top-left in inner canvas space (subtract pan offset).
      const rawX = e.clientX - tableRect.left - cursorOffsetX - panOffsetRef.current.x;
      const rawY = e.clientY - tableRect.top - cursorOffsetY - panOffsetRef.current.y;

      // Snap to nearest grid cell.
      const gx = Math.round(rawX / gridSize);
      const gy = Math.round(rawY / gridSize);

      // Clamp to non-negative: cards may exist beyond the visible area when panned.
      const clampedGx = Math.max(0, gx);
      const clampedGy = Math.max(0, gy);

      // Collision check — is another card's origin at this exact cell?
      const collision = findCollision(clampedGx, clampedGy, cardId);
      if (collision !== undefined) {
        revertDrag();
        console.log(`[Table] Revert card ${cardId}: collision with ${collision} at (${clampedGx},${clampedGy})`);
        return;
      }

      // Slot detection — all slots are grid-aligned, so a simple position match suffices.
      // No DOM measurement needed.
      let targetSlotId: string | undefined;
      for (const [slotId, entry] of Object.entries(slotRegistry.current)) {
        if (entry.gx === clampedGx && entry.gy === clampedGy) {
          targetSlotId = slotId;
          console.log(`[Table] Card ${cardId} dropped onto slot ${slotId} at (${clampedGx},${clampedGy})`);
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

      commitDrag(cardId, clampedGx, clampedGy, targetSlotId);
      if (targetSlotId) onSlotDrop?.(targetSlotId, cardId);

      console.log(`[Table] Card ${cardId} settled at grid (${clampedGx},${clampedGy})${targetSlotId ? ` in slot ${targetSlotId}` : ''}`);
    },
    [drag, cards, config, commitDrag, revertDrag, slotRegistry, setSlotCard, findCollision, onSlotDrop]
  );

  // Left-click on the table background (not on a card — cards call stopPropagation) starts panning.
  const handleMouseDown = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      // Don't intercept clicks on interactive elements — let them work normally.
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'LABEL') return;
      if ((e.target as HTMLElement).isContentEditable) return;
      e.preventDefault(); // prevent text selection while panning
      isPanningRef.current = true;
      setIsPanning(true);
      panStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        panX: panOffsetRef.current.x,
        panY: panOffsetRef.current.y,
      };
      console.log('[Table] Pan start');
    },
    []
  );

  return (
    <div
      ref={tableRef}
      id="table-surface"
      className={[
        'relative w-screen h-screen overflow-hidden select-none bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900',
        isPanning ? 'table-panning' : 'cursor-grab',
      ].join(' ')}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDragStart={(e) => e.preventDefault()}
    >
      {/* Inner panning canvas — all content lives here and moves together via transform. */}
      <div
        ref={innerCanvasRef}
        style={{ position: 'absolute', inset: 0, transform: 'translate(0px, 0px)' }}
      >
        {children}

        {/* Card removal explosions — at the card's last committed grid position. */}
        {Object.entries(exitingCards).map(([id, pos]) => (
          <CardExplosion key={id} gx={pos.gx} gy={pos.gy} onDone={() => onExitDone(id)} />
        ))}
      </div>
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
  const [exitingCards, setExitingCards] = useState<Record<string, GridPos>>({});
  // Stable ref so the effect always sees the previous render's cards without re-subscribing.
  const prevCardsRef = useRef<Record<string, CardData>>(cards);

  useEffect(() => {
    const prev = prevCardsRef.current;
    const removedIds = Object.keys(prev).filter(id => !(id in cards));
    if (removedIds.length > 0) {
      console.log('[Table] Cards removed — queuing explosions:', removedIds);
      setExitingCards(ex => {
        const updated = { ...ex };
        for (const id of removedIds) updated[id] = { gx: prev[id].gx, gy: prev[id].gy };
        return updated;
      });
    }
    prevCardsRef.current = cards;
  }, [cards]);

  const handleExitDone = useCallback((id: string) => {
    setExitingCards(ex => {
      const { [id]: _, ...rest } = ex;
      return rest;
    });
  }, []);

  return (
    <TableProvider config={config} cards={cards} onCardsChange={onCardsChange}>
      <TableInner
        onSlotDrop={onSlotDrop}
        exitingCards={exitingCards}
        onExitDone={handleExitDone}
      >
        {children}
      </TableInner>
    </TableProvider>
  );
}
