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
  const [assignments, setAssignments] = useState<Record<string, string>>({}); // { actionId: followerId }
  const [draggedFollower, setDraggedFollower] = useState<{followerIndex: string, fromActionIndex: string | null} | null>(null);
  const [weekResults, setWeekResults] = useState<{ results: Record<string, Outcome>; updatedState: GameState; assignments: Record<string, string>; actions: Action[] } | null>(null);
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

  const handleDragStart = (e : DragEvent<HTMLDivElement>, followerIndex: string, fromActionIndex : string | null = null) => {
    setDraggedFollower({ followerIndex, fromActionIndex });
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleDragOver = (e : DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDrop = (e : DragEvent<HTMLDivElement>, actionIndex : string) => {
    e.preventDefault();
    if (draggedFollower !== null) {
      const { followerIndex, fromActionIndex } = draggedFollower;
      
      // Check if this follower is already assigned somewhere (other than where they're being dragged from)
      const currentAssignment : [string, string] | undefined = Object.entries(assignments).find(
        ([actIdx, followerIdx]) => followerIdx === followerIndex && actIdx !== fromActionIndex
      );
      
      // Remove from current assignment if exists
      const newAssignments = { ...assignments };
      if (currentAssignment) {
        delete newAssignments[parseInt(currentAssignment[0])];
      }
      
      // Remove from the action they're being dragged from
      if (fromActionIndex !== null) {
        delete newAssignments[fromActionIndex];
      }
      
      // Check if someone else is assigned to this action
      if (newAssignments[actionIndex] !== undefined) {
        // Swap them
        const otherFollower = newAssignments[actionIndex];
        if (fromActionIndex !== null) {
          newAssignments[fromActionIndex] = otherFollower;
        }
      }
      
      // Assign to new action
      newAssignments[actionIndex] = followerIndex;
      setAssignments(newAssignments);
    }
    setDraggedFollower(null);
  };

  const handleDropToUnassign = (e : DragEvent) => {
    e.preventDefault();
    if (draggedFollower !== null) {
      const { fromActionIndex } = draggedFollower;
      if (fromActionIndex !== null) {
        const newAssignments = { ...assignments };
        delete newAssignments[fromActionIndex];
        setAssignments(newAssignments);
      }
    }
    setDraggedFollower(null);
  };

  const handleRemoveAssignment = (actionIndex : number) => {
    const newAssignments = { ...assignments };
    delete newAssignments[actionIndex];
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
    console.log('selectedLocation?.id:', selectedLocation?.id);
    console.log('gameState.map:', gameState.map);
    console.log('gameState.map keys:', gameState.map ? Object.keys(gameState.map) : 'no map');
    const actions = gameState.map?.[selectedLocation?.id || ''] || [];
    console.log('Looking for actions with key:', selectedLocation?.id || '');
    console.log('actions found:', actions);
    console.log('=== END DEBUG ===');

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
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Week {gameState.week}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Location Board */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-4 gap-4">
            {/* Adherents Panel */}
            <div className="col-span-1">
              <div className="bg-black/40 border border-amber-600/20 rounded-lg p-4">
                <h2 className="text-sm font-serif text-amber-300 mb-3">Adherents</h2>
                <div 
                  className="space-y-2 overflow-y-auto pr-2"
                  style={{ maxHeight: 'calc(100vh - 280px)' }}
                  onDragOver={handleDragOver}
                  onDrop={handleDropToUnassign}
                >
                  {gameState.followers.map((follower, idx) => {
                    const isAssigned = Object.values(assignments).includes(follower.id);
                    
                    return (
                      <div 
                        key={idx}
                        draggable={!isAssigned}
                        onDragStart={(e) => handleDragStart(e, follower.id)}
                        className={`bg-purple-900/20 border border-amber-500/20 rounded p-2 transition-all text-xs ${
                          !isAssigned 
                            ? 'cursor-move hover:border-amber-500/40 hover:shadow-lg' 
                            : 'opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <p className="font-serif text-amber-200 text-sm">{follower.name}</p>
                        <p className="text-xs text-amber-200/60 mt-0.5 line-clamp-1">{follower.background}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {Array.isArray(follower.skills) ? follower.skills.map((skill, i) => (
                            <span key={i} className="text-xs px-1.5 py-0.5 bg-amber-800/30 rounded text-amber-300">
                              {skill}
                            </span>
                          )) : null}
                        </div>
                        {isAssigned && (
                          <p className="text-xs text-amber-400 mt-1.5 italic">Assigned</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="col-span-3">
              <div className="bg-black/40 border border-amber-600/20 rounded-lg p-4">
                <h2 className="text-sm font-serif text-amber-300 mb-3">Available Actions</h2>
                
                <div className="space-y-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                  {actions.map((action, actionIdx) => {
                    const assignedFollowerId = assignments[action.id];
                    const assignedFollower = assignedFollowerId !== undefined 
                      ? gameState.followers.find((follower) => follower.id === assignedFollowerId)
                      : null;

                    return (
                      <div key={actionIdx} className="border border-purple-500/30 rounded-lg p-3 bg-purple-900/10">
                        <h3 className="font-serif text-amber-300 text-sm mb-1">{action.title}</h3>
                        <p className="text-xs text-amber-200/70 mb-2 line-clamp-2">{action.description}</p>
                        
                        <div 
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, action.id)}
                          className={`border-2 border-dashed rounded p-2 min-h-16 transition-colors ${
                            assignedFollower 
                              ? 'border-amber-500/60 bg-amber-900/10' 
                              : 'border-amber-500/30'
                          }`}
                        >
                          {assignedFollower ? (
                            <div 
                              draggable
                              onDragStart={(e) => handleDragStart(e, assignedFollower.id, action.id)}
                              className="cursor-move hover:bg-amber-900/20 transition-colors rounded p-1.5 -m-1.5"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="font-serif text-amber-200 text-sm">{assignedFollower.name}</p>
                                  <p className="text-xs text-amber-200/60 mt-0.5 line-clamp-1">{assignedFollower.background}</p>
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {Array.isArray(assignedFollower.skills) 
                                      ? assignedFollower.skills.map((skill, i) => (
                                        <span key={i} className="text-xs px-1.5 py-0.5 bg-amber-800/30 rounded text-amber-300">
                                          {skill}
                                        </span>
                                      )) 
                                      : null}
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleRemoveAssignment(actionIdx)}
                                  className="text-xs text-amber-400 hover:text-amber-300 underline ml-2 flex-shrink-0"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center flex items-center justify-center h-full">
                              <p className="text-xs text-amber-300/50">Drag adherent here</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Process Week Button */}
                <div className="mt-4 text-center">
                  <button 
                    className="px-4 py-2 bg-amber-800/50 hover:bg-amber-700/50 border border-amber-600/30 rounded text-amber-100 transition-colors text-sm"
                    onClick={() => {
                      const { results, updatedState } = completeWeek(assignments, actions, gameState);
                      // Store results and show report screen
                      setWeekResults({ results, updatedState, assignments, actions });
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
    const { results, updatedState, assignments: weekAssignments, actions } = weekResults;

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
              {Object.entries(results).map(([actionId, outcome]) => {
                const action = actions.find(a => a.id === actionId);
                const followerId = weekAssignments[actionId];
                const follower = gameState?.followers.find(f => f.id === followerId);

                if (!action || !follower) return null;

                return (
                  <div key={actionId} className="border border-purple-500/30 rounded-lg p-6 bg-purple-900/10">
                    <div className="mb-3">
                      <h3 className="font-serif text-amber-300 text-lg">{action.title}</h3>
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