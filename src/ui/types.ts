// Core types for the Table/Card/Sheet UI library.
//
// Physical model:
//   Table  — full-screen scene; hosts sheets and free cards
//   Sheet  — game-placed document; cannot be moved by the user; contains slots
//   Slot   — card-sized receptacle on a sheet; cards can be placed/removed
//   Card   — freely draggable; snaps to an 80×80px grid; upper-left origin is unique
//
// Grid constants (defaults, overridable via TableConfig):
//   GRID_SIZE = 80px per cell
//   CARD_W    = 2 cells  →  160px
//   CARD_H    = 3 cells  →  240px

export interface TableConfig {
  /** Side length of one grid cell in pixels. Default: 80 */
  gridSize: number;
  /** Card width in grid cells. Default: 2 */
  cardW: number;
  /** Card height in grid cells. Default: 3 */
  cardH: number;
}

export const DEFAULT_TABLE_CONFIG: TableConfig = {
  gridSize: 80,
  cardW: 2,
  cardH: 3,
};

/** Position of a card's upper-left corner on the grid, in grid-cell units. */
export interface GridPos {
  gx: number;
  gy: number;
}

/**
 * What the consumer provides and receives — position + slot membership, no visual state.
 * This is the type used in the cards prop and onCardsChange callback.
 */
export interface CardData extends GridPos {
  slotId?: string;
}

/** Internal card state used for rendering — augments CardData with zIndex. */
export interface CardState extends CardData {
  /** Stacking order — higher = on top. */
  zIndex: number;
}

/** Transient state while a card is being dragged. */
export interface DragState {
  cardId: string;
  /** Grid position the card occupied before the drag started (for revert). */
  startGx: number;
  startGy: number;
  /** Pixel offset of the initial mousedown within the card (for natural grab feel). */
  cursorOffsetX: number;
  cursorOffsetY: number;
}

/**
 * An entry in the slot registry.
 * Slots register themselves here on mount so drop detection can find their rects.
 */
export interface SlotEntry {
  slotId: string;
  /** Callback to get the slot's current bounding rect in screen space. */
  getRect: () => DOMRect;
  /** If true, a card placed here cannot be removed by the user. */
  locked: boolean;
  /** The card currently occupying this slot, if any. */
  cardId?: string;
}
