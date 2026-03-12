import { useState } from 'react';

interface Card {
  id: string;
  name: string;
  color: string;
}

interface DroppedCard extends Card {
  position: { x: number; y: number };
  target?: string;
}

const INITIAL_CARDS: Card[] = [
  { id: 'card1', name: 'The Flame', color: 'bg-red-600' },
  { id: 'card2', name: 'The Void', color: 'bg-purple-900' },
  { id: 'card3', name: 'The Eye', color: 'bg-amber-500' },
  { id: 'card4', name: 'The Serpent', color: 'bg-green-600' },
  { id: 'card5', name: 'The Crown', color: 'bg-yellow-400' },
];

const CARD_EFFECTS: Record<string, { circle: string; altar: string }> = {
  card1: {
    circle: 'Flames dance in a perfect spiral, warming the ritual space',
    altar: 'The altar burns with purifying fire, smoke rising in spirals'
  },
  card2: {
    circle: 'Reality warps at the edges, shadows deepen impossibly',
    altar: 'Offerings vanish into nothingness, consumed by the void'
  },
  card3: {
    circle: 'A thousand eyes open in the air, watching, knowing',
    altar: 'The altar reveals hidden truths in its surface reflections'
  },
  card4: {
    circle: 'Serpents coil through the circle, their scales shimmering with power',
    altar: 'Venom drips onto the altar, transforming all it touches'
  },
  card5: {
    circle: 'Golden light crowns the circle, authority radiating outward',
    altar: 'The altar becomes a throne of ancient sovereignty'
  }
};

export default function MagicPrototype() {
  const [hand, setHand] = useState<Card[]>(INITIAL_CARDS);
  const [droppedCards, setDroppedCards] = useState<DroppedCard[]>([]);
  const [draggedCard, setDraggedCard] = useState<Card | null>(null);
  const [dragSource, setDragSource] = useState<'hand' | 'table' | null>(null);

  const handleDragStart = (card: Card, source: 'hand' | 'table') => {
    setDraggedCard(card);
    setDragSource(source);
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
    setDragSource(null);
  };

  const handleDropOnTable = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedCard) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Remove from hand if dragging from hand
    if (dragSource === 'hand') {
      setHand(hand.filter(c => c.id !== draggedCard.id));
    } else if (dragSource === 'table') {
      // Remove from table (will be re-added at new position)
      setDroppedCards(droppedCards.filter(c => c.id !== draggedCard.id));
    }
    
    // Add to table at new position (clear target when dropping on general table)
    setDroppedCards([
      ...droppedCards.filter(c => c.id !== draggedCard.id),
      { id: draggedCard.id, name: draggedCard.name, color: draggedCard.color, position: { x, y } }
    ]);
  };

  const handleDropOnTarget = (e: React.DragEvent, targetName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedCard) return;

    // Get position relative to the main table, not the target
    const tableElement = document.querySelector('.magic-table') as HTMLElement;
    if (!tableElement) return;
    
    const tableRect = tableElement.getBoundingClientRect();
    const x = e.clientX - tableRect.left;
    const y = e.clientY - tableRect.top;

    // Remove from hand if dragging from hand
    if (dragSource === 'hand') {
      setHand(hand.filter(c => c.id !== draggedCard.id));
    } else if (dragSource === 'table') {
      // Remove from table (will be re-added at new position)
      setDroppedCards(droppedCards.filter(c => c.id !== draggedCard.id));
    }
    
    // Add to target at new position
    setDroppedCards([
      ...droppedCards.filter(c => c.id !== draggedCard.id),
      { ...draggedCard, position: { x, y }, target: targetName }
    ]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const returnCardToHand = (cardId: string) => {
    const card = droppedCards.find(c => c.id === cardId);
    if (!card) return;

    setDroppedCards(droppedCards.filter(c => c.id !== cardId));
    setHand([...hand, { id: card.id, name: card.name, color: card.color }]);
  };

  const handleDropOnHand = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedCard || dragSource !== 'table') return;

    returnCardToHand(draggedCard.id);
  };

  const resetTable = () => {
    setHand(INITIAL_CARDS);
    setDroppedCards([]);
  };

  // Calculate active effects
  const activeEffects = droppedCards
    .filter(card => card.target)
    .map(card => ({
      cardName: card.name,
      target: card.target!,
      effect: card.target === 'circle' 
        ? CARD_EFFECTS[card.id]?.circle 
        : CARD_EFFECTS[card.id]?.altar
    }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-amber-400">Magic Prototype</h1>
          <button
            onClick={resetTable}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Hand of Cards */}
        <div 
          className="mb-8 bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30"
          onDrop={handleDropOnHand}
          onDragOver={handleDragOver}
        >
          <h2 className="text-xl font-semibold text-amber-300 mb-4">Your Hand</h2>
          <div className="flex gap-4 flex-wrap min-h-[12rem]">
            {hand.map(card => (
              <div
                key={card.id}
                draggable
                onDragStart={() => handleDragStart(card, 'hand')}
                onDragEnd={handleDragEnd}
                className={`${card.color} w-32 h-48 rounded-lg shadow-2xl cursor-move 
                  flex items-center justify-center text-white font-bold text-center p-4
                  border-2 border-white/20 hover:scale-105 transition-transform
                  ${draggedCard?.id === card.id ? 'opacity-50' : ''}`}
              >
                {card.name}
              </div>
            ))}
            {hand.length === 0 && (
              <p className="text-slate-400 italic">No cards remaining in hand</p>
            )}
          </div>
        </div>

        {/* Main Table */}
        <div
          onDrop={handleDropOnTable}
          onDragOver={handleDragOver}
          className="magic-table relative bg-gradient-to-br from-green-900/40 to-green-800/40 
            backdrop-blur-sm rounded-xl border-4 border-amber-600/50 shadow-2xl
            min-h-[600px] p-8"
        >
          <div className="absolute top-4 left-4 text-amber-300/50 text-sm font-semibold">
            THE TABLE
          </div>

          {/* Predefined Drop Targets */}
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 flex gap-12">
            {/* Target 1: Circle of Power */}
            <div
              onDrop={(e) => handleDropOnTarget(e, 'circle')}
              onDragOver={handleDragOver}
              className="relative w-48 h-48 rounded-full border-4 border-dashed border-purple-400/50
                bg-purple-500/10 hover:bg-purple-500/20 transition-colors
                flex items-center justify-center"
            >
              <span className="text-purple-300 font-semibold text-sm text-center">
                Circle of Power
              </span>
            </div>

            {/* Target 2: Altar */}
            <div
              onDrop={(e) => handleDropOnTarget(e, 'altar')}
              onDragOver={handleDragOver}
              className="relative w-56 h-40 border-4 border-dashed border-amber-400/50
                bg-amber-500/10 hover:bg-amber-500/20 transition-colors
                flex items-center justify-center rounded-lg"
            >
              <span className="text-amber-300 font-semibold text-sm text-center">
                The Altar
              </span>
            </div>
          </div>

          {/* Dropped Cards */}
          {droppedCards.map(card => (
            <div
              key={card.id}
              draggable
              onDragStart={() => handleDragStart(card, 'table')}
              onDragEnd={handleDragEnd} animate-pulse
              style={{
                position: 'absolute',
                left: `${card.position.x}px`,
                top: `${card.position.y}px`,
                transform: 'translate(-50%, -50%)'
              }}
              onDoubleClick={() => returnCardToHand(card.id)}
              className={`${card.color} w-32 h-48 rounded-lg shadow-2xl cursor-move 
                flex items-center justify-center text-white font-bold text-center p-4
                border-2 border-white/20 hover:scale-110 transition-transform
                ${card.target ? 'ring-4 ring-white/30' : ''}
                ${draggedCard?.id === card.id ? 'opacity-50' : ''}`}
              title={card.target ? `On ${card.target} (double-click to return)` : 'Double-click to return to hand'}
            >
              {card.name}
            </div>
          ))}
        </div>

        {/* Active Effects Display */}
        {activeEffects.length > 0 && (
          <div className="mt-6 bg-gradient-to-r from-purple-900/50 to-amber-900/50 backdrop-blur-sm rounded-xl p-6 border border-amber-500/50">
            <h2 className="text-2xl font-bold text-amber-300 mb-4">Active Effects</h2>
            <div className="space-y-3">
              {activeEffects.map((effect, idx) => (
                <div key={idx} className="bg-black/30 rounded-lg p-4 border border-purple-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-amber-400 font-bold">{effect.cardName}</span>
                    <span className="text-purple-300 text-sm">
                      → {effect.target === 'circle' ? 'Circle of Power' : 'The Altar'}
                    </span>
                  </div>
                  <p className="text-slate-300 italic text-sm">{effect.effect}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-6 bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30">
          <p className="text-amber-300 text-sm">
            <strong>Instructions:</strong> Drag cards from your hand onto the table. 
            Drop them on the Circle of Power or The Altar for special placement, or anywhere else on the table. 
            Cards can be dragged around the table to reposition them, or dragged back to your hand. 
            Double-click any placed card to return it to your hand.
          </p>
          <p className="text-purple-300 text-xs mt-2">
            Cards in targets: {droppedCards.filter(c => c.target).length} | 
            Cards on table: {droppedCards.filter(c => !c.target).length}
          </p>
        </div>
      </div>
    </div>
  );
}
