import React, { useState, useEffect, DragEvent } from 'react';
import { MapPin, User, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import "./Game.css"
import { completeWeek, saveGameState, prototypeActionsForCity, deserializeActionMap } from './game/actions';
import { CITIES, getCityById } from './game/world';
import { City, Follower, GameState, Outcome, Action } from './game/types';

export default function CultGameInterface() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<City | undefined>(undefined);
  const [view, setView] = useState<'map' | 'location' | 'report'>('map');
  // assignments: { "${followerId}:${slotIndex}": itemId }
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [draggedItem, setDraggedItem] = useState<{ itemId: string; fromSlotKey: string | null } | null>(null);
  const [weekResults, setWeekResults] = useState<{ results: Record<string, Outcome>; updatedState: GameState; assignments: Record<string, string>; items: Action[] } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Load game state from localStorage
    try {
      const saved = localStorage.getItem('cultGameState');
      if (saved) {
        const state = JSON.parse(saved) as GameState;
        console.log('Loading game state from localStorage');
        console.log('state.hqLocation:', state.hqLocation);
        // Load the serialized action map if it exists
        const savedMap = localStorage.getItem('cultGameActionMap');
        if (savedMap) {
          try {
            state.map = deserializeActionMap(savedMap);
            console.log('Deserialized action map:', state.map);
            console.log('Action map keys:', Object.keys(state.map));
            
            // Check if the map has actions for the HQ location, if not regenerate
            const startCity = state.hqLocation ? getCityById(state.hqLocation) || CITIES[0] : CITIES[0];
            if (!state.map[startCity.id] || state.map[startCity.id].length === 0) {
              console.log('Map missing actions for HQ location, regenerating for:', startCity.id);
              state.map[startCity.id] = prototypeActionsForCity(startCity);
            }
          } catch (e) {
            console.error('Failed to deserialize action map, regenerating:', e);
            const startCity = state.hqLocation ? getCityById(state.hqLocation) || CITIES[0] : CITIES[0];
            state.map = { [startCity.id]: prototypeActionsForCity(startCity) };
            console.log('Regenerated map for city:', startCity.id);
          }
        } else {
          // No saved map, generate default
          const startCity = state.hqLocation ? getCityById(state.hqLocation) || CITIES[0] : CITIES[0];
          state.map = { [startCity.id]: prototypeActionsForCity(startCity) };
          console.log('No saved map, generated default for city:', startCity.id);
        }
        console.log('Final state.map:', state.map);
        setGameState(state);
      } else {
        // No saved game, redirect to home
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to load game state:', error);
      navigate('/');
    }
  }, [navigate]);

  const handleItemDragStart = (e: DragEvent<HTMLDivElement>, itemId: string, fromSlotKey: string | null = null) => {
    setDraggedItem({ itemId, fromSlotKey });
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDropToSlot = (e: DragEvent<HTMLDivElement>, targetSlotKey: string) => {
    e.preventDefault();
    if (!draggedItem) return;
    const { itemId, fromSlotKey } = draggedItem;
    const newAssignments = { ...assignments };
    // Clear source slot if re-dragging from a slot
    if (fromSlotKey !== null) {
      delete newAssignments[fromSlotKey];
    }
    // Displace any existing item in target (sends it back to unassigned pool)
    delete newAssignments[targetSlotKey];
    // Assign item to target slot
    newAssignments[targetSlotKey] = itemId;
    console.log('Drop to slot:', targetSlotKey, '← item:', itemId);
    setAssignments(newAssignments);
    setDraggedItem(null);
  };

  const handleRemoveFromSlot = (slotKey: string) => {
    const newAssignments = { ...assignments };
    delete newAssignments[slotKey];
    console.log('Removed item from slot:', slotKey);
    setAssignments(newAssignments);
  };

  if (!gameState) {
    return null;
  }

  // Map view
  if (view === 'map') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 text-amber-100 p-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-6">
          <div className="flex justify-between items-center bg-black/30 border border-amber-600/20 rounded-lg p-4">
            <div>
              <h1 className="text-2xl font-serif text-amber-300">{gameState.leader.name}</h1>
              <p className="text-sm text-amber-200/70">{gameState.leader.background}</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Week {gameState.week}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{gameState.followers.length} Adherents</span>
              </div>
            </div>
          </div>
        </div>

        {/* Map View */}
        <div className="max-w-7xl mx-auto">
          <div className="bg-black/40 border border-amber-600/20 rounded-lg p-8">
            <h2 className="text-xl font-serif text-amber-300 mb-6">Global Operations</h2>
            
            {/* Simple "map" - just shows locations with adherents */}
            <div className="space-y-4">
              <div 
                className="bg-gradient-to-r from-purple-900/30 to-slate-900/30 border border-amber-500/30 rounded-lg p-6 cursor-pointer hover:border-amber-500/60 transition-colors"
                onClick={() => { 
                  const city = getCityById(gameState.hqLocation);
                  console.log('Clicking to enter location');
                  console.log('gameState.hqLocation:', gameState.hqLocation);
                  console.log('city:', city);
                  console.log('gameState.map:', gameState.map);
                  setSelectedLocation(city); 
                  setView('location'); 
                }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-5 h-5 text-amber-400" />
                      <h3 className="text-lg font-serif text-amber-300">{getCityById(gameState.hqLocation)?.name}</h3>
                    </div>
                    <p className="text-sm text-amber-200/60 mb-3">Your initial base of operations</p>
                    
                    {/* Show adherents at this location */}
                    <div className="space-y-2">
                      <p className="text-xs text-amber-300/70 uppercase tracking-wide">Adherents Present:</p>
                      {gameState.followers.map((follower: Follower, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                          <span className="text-amber-100">{follower.name}</span>
                          <span className="text-amber-200/50 text-xs">- {follower.background}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <button className="px-4 py-2 bg-amber-800/50 hover:bg-amber-700/50 border border-amber-600/30 rounded text-sm transition-colors">
                    Enter Location
                  </button>
                </div>
              </div>

              {/* Placeholder for future locations */}
              <div className="text-center py-8 border border-dashed border-amber-600/20 rounded-lg">
                <p className="text-amber-200/40 text-sm">Other locations will appear as you expand your influence...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Location view
  if (view === 'location') {
    console.log('=== LOCATION VIEW DEBUG ===');
    console.log('selectedLocation:', selectedLocation);
    console.log('gameState.map keys:', gameState.map ? Object.keys(gameState.map) : 'no map');
    const items = gameState.map?.[selectedLocation?.id || ''] || [];
    console.log('items found:', items.length);
    console.log('=== END DEBUG ===');

    // Group items by knowledge type
    const itemsByType: Record<string, Action[]> = { site: [], book: [], patron: [], artifact: [] };
    items.forEach(item => itemsByType[item.type ?? 'site'].push(item));

    const typeConfig: Record<string, { label: string; headerClass: string; badgeClass: string; borderClass: string }> = {
      site:     { label: 'Sites',     headerClass: 'text-amber-400',  badgeClass: 'bg-amber-800/40 text-amber-300',   borderClass: 'border-amber-500/40' },
      book:     { label: 'Books',     headerClass: 'text-violet-400', badgeClass: 'bg-violet-800/40 text-violet-300', borderClass: 'border-violet-500/40' },
      patron:   { label: 'Patrons',   headerClass: 'text-teal-400',   badgeClass: 'bg-teal-800/40 text-teal-300',     borderClass: 'border-teal-500/40' },
      artifact: { label: 'Artifacts', headerClass: 'text-rose-400',   badgeClass: 'bg-rose-800/40 text-rose-300',     borderClass: 'border-rose-500/40' },
    };

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 text-amber-100 p-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-6">
          <div className="flex justify-between items-center bg-black/30 border border-amber-600/20 rounded-lg p-4">
            <div>
              <button
                onClick={() => setView('map')}
                className="text-sm text-amber-400 hover:text-amber-300 mb-1"
              >
                ← Back to Map
              </button>
              <h1 className="text-2xl font-serif text-amber-300">{selectedLocation?.name}</h1>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4" />
              <span>Week {gameState.week}</span>
            </div>
          </div>
        </div>

        {/* Board */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-5 gap-4">

            {/* Left: Known to You */}
            <div className="col-span-2">
              <div
                className="bg-black/40 border border-amber-600/20 rounded-lg p-4 overflow-y-auto"
                style={{ maxHeight: 'calc(100vh - 220px)' }}
              >
                <h2 className="text-sm font-serif text-amber-300 mb-4">Known to You</h2>
                <div className="space-y-5">
                  {(['site', 'book', 'patron', 'artifact'] as const).map(type => {
                    const typeItems = itemsByType[type];
                    if (typeItems.length === 0) return null;
                    const cfg = typeConfig[type];
                    return (
                      <div key={type}>
                        <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${cfg.headerClass}`}>
                          {cfg.label}
                        </p>
                        <div className="space-y-2">
                          {typeItems.map(item => {
                            const isAssigned = Object.values(assignments).includes(item.id);
                            return (
                              <div
                                key={item.id}
                                draggable={!isAssigned}
                                onDragStart={(e) => handleItemDragStart(e, item.id)}
                                className={`border rounded p-2 transition-all text-xs ${cfg.borderClass} ${
                                  isAssigned
                                    ? 'bg-black/10 opacity-40 cursor-not-allowed'
                                    : 'bg-purple-900/20 cursor-move hover:bg-purple-900/40'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-serif text-amber-200 text-sm leading-snug">{item.title}</p>
                                    <p className="text-xs text-amber-200/50 mt-0.5 line-clamp-2">{item.description}</p>
                                  </div>
                                  <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${cfg.badgeClass}`}>{type}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Adherents */}
            <div className="col-span-3">
              <div className="bg-black/40 border border-amber-600/20 rounded-lg p-4">
                <h2 className="text-sm font-serif text-amber-300 mb-4">Adherents</h2>
                <div className="space-y-4 overflow-y-auto pr-2" style={{ maxHeight: 'calc(100vh - 340px)' }}>
                  {gameState.followers.map(follower => {
                    const numSlots = follower.slots ?? 1;
                    return (
                      <div key={follower.id} className="border border-purple-500/30 rounded-lg p-3 bg-purple-900/10">
                        {/* Follower info */}
                        <div className="mb-3">
                          <p className="font-serif text-amber-300 text-sm">{follower.name}</p>
                          <p className="text-xs text-amber-200/60 mt-0.5 line-clamp-1">{follower.background}</p>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {Array.isArray(follower.skills) && follower.skills.map(skill => (
                              <span key={skill} className="text-xs px-1.5 py-0.5 bg-amber-800/30 rounded text-amber-300">{skill}</span>
                            ))}
                          </div>
                        </div>
                        {/* Slots */}
                        <div className={`grid gap-2 ${numSlots > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          {Array.from({ length: numSlots }).map((_, slotIndex) => {
                            const slotKey = `${follower.id}:${slotIndex}`;
                            const assignedItemId = assignments[slotKey];
                            const assignedItem = assignedItemId ? items.find(i => i.id === assignedItemId) : null;
                            const slotCfg = assignedItem?.type ? typeConfig[assignedItem.type] : null;
                            return (
                              <div
                                key={slotKey}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDropToSlot(e, slotKey)}
                                className={`border-2 border-dashed rounded p-2 min-h-14 transition-colors ${
                                  assignedItem
                                    ? 'border-amber-500/60 bg-amber-900/10'
                                    : 'border-amber-500/20'
                                }`}
                              >
                                {assignedItem ? (
                                  <div
                                    draggable
                                    onDragStart={(e) => handleItemDragStart(e, assignedItem.id, slotKey)}
                                    className="cursor-move hover:bg-amber-900/20 transition-colors rounded p-0.5 -m-0.5"
                                  >
                                    <div className="flex items-start justify-between gap-1">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-serif text-amber-200 leading-snug">{assignedItem.title}</p>
                                        {slotCfg && (
                                          <span className={`text-xs px-1 py-0.5 rounded mt-0.5 inline-block ${slotCfg.badgeClass}`}>
                                            {assignedItem.type}
                                          </span>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => handleRemoveFromSlot(slotKey)}
                                        className="text-amber-400/70 hover:text-amber-300 flex-shrink-0 text-lg leading-none ml-1"
                                      >×</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center h-full">
                                    <p className="text-xs text-amber-300/30">Drop knowledge here</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Complete Week Button */}
                <div className="mt-4 text-center">
                  <button
                    className="px-4 py-2 bg-amber-800/50 hover:bg-amber-700/50 border border-amber-600/30 rounded text-amber-100 transition-colors text-sm"
                    onClick={() => {
                      console.log('Completing week with assignments:', assignments);
                      const { results, updatedState } = completeWeek(assignments, items, gameState);
                      setWeekResults({ results, updatedState, assignments, items });
                      setView('report');
                    }}
                  >
                    Complete Week's Work
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // Report view
  if (view === 'report' && weekResults) {
    const { results, updatedState, assignments: weekAssignments, items } = weekResults;

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 text-amber-100 p-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-black/30 border border-amber-600/20 rounded-lg p-4">
            <h1 className="text-2xl font-serif text-amber-300 text-center">Week {gameState?.week} - Results</h1>
          </div>
        </div>

        {/* Results */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-black/40 border border-amber-600/20 rounded-lg p-8">
            <h2 className="text-xl font-serif text-amber-300 mb-6">Events of the Week</h2>
            
            <div className="space-y-6">
              {Object.entries(results).map(([slotKey, outcome]) => {
                const itemId = weekAssignments[slotKey];
                const followerId = slotKey.split(':')[0];
                const item = items.find(a => a.id === itemId);
                const follower = gameState?.followers.find(f => f.id === followerId);

                if (!item || !follower) return null;

                return (
                  <div key={slotKey} className="border border-purple-500/30 rounded-lg p-6 bg-purple-900/10">
                    <div className="mb-3">
                      <h3 className="font-serif text-amber-300 text-lg">{item.title}</h3>
                      <p className="text-sm text-amber-200/70 mt-1">{selectedLocation?.name}</p>
                    </div>
                    
                    <div className="mb-4 pl-4 border-l-2 border-amber-500/30">
                      <p className="text-amber-200">
                        <span className="font-serif text-amber-300">{follower.name}</span>
                        <span className="text-amber-200/60 text-sm ml-2">({follower.background})</span>
                      </p>
                    </div>

                    <div className="bg-black/30 rounded p-4">
                      <p className="text-amber-100">{outcome.getDescription(follower)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Continue Button */}
            <div className="mt-8 text-center">
              <button 
                className="px-8 py-4 bg-amber-800/50 hover:bg-amber-700/50 border border-amber-600/30 rounded text-amber-100 transition-colors text-lg"
                onClick={() => {
                  // Enact outcomes and save (this mutates updatedState)
                  saveGameState(weekAssignments, results, updatedState);
                  // Set the mutated state in React
                  setGameState({ ...updatedState });
                  setWeekResults(null);
                  setAssignments({});
                  setSelectedLocation(undefined);
                  setView('map');
                }}
              >
                Begin New Week
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}