import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import {
  DEFAULT_TABLE_CONFIG,
  type CardData,
  type CardState,
  type DragState,
  type SlotEntry,
  type TableConfig,
} from './types';

// ---------------------------------------------------------------------------
// Internal (visual) state — drag and z-ordering, not owned by the consumer
// ---------------------------------------------------------------------------

interface InternalState {
  drag: DragState | null;
  /** cardId → zIndex, used to determine render order among cards */
  zOrder: Record<string, number>;
  topZ: number;
}

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

interface TableContextValue {
  config: TableConfig;
  /** Merged: positions from parent + internal zIndex — use this for rendering */
  cards: Record<string, CardState>;
  drag: DragState | null;
  /** Mutable ref map of slot entries registered by Slot components on mount. */
  slotRegistry: React.MutableRefObject<Record<string, SlotEntry>>;
  registerSlot: (entry: SlotEntry) => void;
  unregisterSlot: (slotId: string) => void;
  setSlotCard: (slotId: string, cardId: string | undefined) => void;
  findCollision: (gx: number, gy: number, excludeCardId: string) => string | undefined;
  startDrag: (drag: DragState) => void;
  commitDrag: (cardId: string, gx: number, gy: number, slotId?: string) => void;
  revertDrag: () => void;
}

const TableContext = createContext<TableContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface TableProviderProps {
  config?: Partial<TableConfig>;
  /** Controlled card positions — owned by the consumer. */
  cards: Record<string, CardData>;
  /** Called whenever a card's position or slot changes after a drop. */
  onCardsChange: (cards: Record<string, CardData>) => void;
  children: ReactNode;
}

export function TableProvider({ config: configOverrides, cards, onCardsChange, children }: TableProviderProps) {
  const config: TableConfig = { ...DEFAULT_TABLE_CONFIG, ...configOverrides };

  const [internal, setInternal] = useState<InternalState>(() => {
    const zOrder: Record<string, number> = {};
    let topZ = 0;
    for (const id of Object.keys(cards)) {
      zOrder[id] = ++topZ;
    }
    return { drag: null, zOrder, topZ };
  });

  // Stable refs so callbacks don't need to be recreated when cards change.
  const cardsRef = useRef(cards);
  cardsRef.current = cards;
  const onCardsChangeRef = useRef(onCardsChange);
  onCardsChangeRef.current = onCardsChange;

  // Sync zOrder when cards are added or removed by the consumer.
  useEffect(() => {
    setInternal(prev => {
      const currentIds = new Set(Object.keys(cards));
      const knownIds = new Set(Object.keys(prev.zOrder));
      const added = [...currentIds].filter(id => !knownIds.has(id));
      const removed = [...knownIds].filter(id => !currentIds.has(id));
      if (added.length === 0 && removed.length === 0) return prev;
      let topZ = prev.topZ;
      const newZOrder = { ...prev.zOrder };
      for (const id of added) newZOrder[id] = ++topZ;
      for (const id of removed) delete newZOrder[id];
      return { ...prev, zOrder: newZOrder, topZ };
    });
  }, [cards]);

  // Merge external positions with internal zIndex for rendering.
  const mergedCards: Record<string, CardState> = {};
  for (const [id, data] of Object.entries(cards)) {
    mergedCards[id] = { ...data, zIndex: internal.zOrder[id] ?? 1 };
  }

  const slotRegistry = useRef<Record<string, SlotEntry>>({});

  const registerSlot = useCallback((entry: SlotEntry) => {
    slotRegistry.current[entry.slotId] = entry;
  }, []);

  const unregisterSlot = useCallback((slotId: string) => {
    delete slotRegistry.current[slotId];
  }, []);

  const setSlotCard = useCallback((slotId: string, cardId: string | undefined) => {
    const entry = slotRegistry.current[slotId];
    if (entry) entry.cardId = cardId;
  }, []);

  // Reads from ref — always sees current cards without needing them as deps.
  const findCollision = useCallback(
    (gx: number, gy: number, excludeCardId: string): string | undefined => {
      for (const [id, card] of Object.entries(cardsRef.current)) {
        if (id !== excludeCardId && card.gx === gx && card.gy === gy) return id;
      }
      return undefined;
    },
    []
  );

  const startDrag = useCallback((drag: DragState) => {
    setInternal(prev => ({ ...prev, drag }));
  }, []);

  const commitDrag = useCallback((cardId: string, gx: number, gy: number, slotId?: string) => {
    setInternal(prev => {
      const newTopZ = prev.topZ + 1;
      return { drag: null, zOrder: { ...prev.zOrder, [cardId]: newTopZ }, topZ: newTopZ };
    });
    const newCardData: CardData = { gx, gy };
    if (slotId !== undefined) newCardData.slotId = slotId;
    onCardsChangeRef.current({ ...cardsRef.current, [cardId]: newCardData });
  }, []);

  const revertDrag = useCallback(() => {
    setInternal(prev => ({ ...prev, drag: null }));
  }, []);

  const value: TableContextValue = {
    config,
    cards: mergedCards,
    drag: internal.drag,
    slotRegistry,
    registerSlot,
    unregisterSlot,
    setSlotCard,
    findCollision,
    startDrag,
    commitDrag,
    revertDrag,
  };

  return <TableContext.Provider value={value}>{children}</TableContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTable(): TableContextValue {
  const ctx = useContext(TableContext);
  if (!ctx) throw new Error('useTable must be used inside a TableProvider (Table component)');
  return ctx;
}

export type { TableContextValue };
