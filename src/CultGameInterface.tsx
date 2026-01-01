import React, { useState, useEffect, DragEvent } from 'react';
import { MapPin, User, Calendar } from 'lucide-react';
import "./Game.css"

export default function CultGameInterface() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [view, setView] = useState<'map' | 'location'>('map');
  const [assignments, setAssignments] = useState<Record<number, number>>({}); // { actionIndex: followerIndex }
  const [draggedFollower, setDraggedFollower] = useState<{followerIndex: number, fromActionIndex: number | null} | null>(null);

  useEffect(() => {
    // Load game state from localStorage
    try {
      const saved = localStorage.getItem('cultGameState');
      if (saved) {
        const state = JSON.parse(saved);
        setGameState(state);
        setSelectedLocation(state.startingLocation);
      } else {
        // No saved game, show message
        setGameState(null);
      }
    } catch (error) {
      console.error('Failed to load game state:', error);
    }
  }, []);

  const handleDragStart = (e : DragEvent<HTMLDivElement>, followerIndex: number, fromActionIndex : number | null = null) => {
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

  const handleDrop = (e : DragEvent<HTMLDivElement>, actionIndex : number) => {
    e.preventDefault();
    if (draggedFollower !== null) {
      const { followerIndex, fromActionIndex } = draggedFollower;
      
      // Check if this follower is already assigned somewhere (other than where they're being dragged from)
      const currentAssignment : [string, number] | undefined = Object.entries(assignments).find(
        ([actIdx, followerIdx]) => followerIdx === followerIndex && parseInt(actIdx) !== fromActionIndex
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
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 text-amber-100 flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-3xl font-serif mb-4">No Active Cult</h1>
          <p className="text-amber-200/70 mb-4">You need to complete the card reading first to begin your work.</p>
          <p className="text-sm text-amber-300/50">This prototype expects a saved game state in localStorage.</p>
        </div>
      </div>
    );
  }

  // Map view
  if (view === 'map') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 text-amber-100 p-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-6">
          <div className="flex justify-between items-center bg-black/30 border border-amber-600/20 rounded-lg p-4">
            <div>
              <h1 className="text-2xl font-serif text-amber-300">The Work Begins</h1>
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
                onClick={() => setView('location')}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-5 h-5 text-amber-400" />
                      <h3 className="text-lg font-serif text-amber-300">{gameState.hqLocation}</h3>
                    </div>
                    <p className="text-sm text-amber-200/60 mb-3">Your initial base of operations</p>
                    
                    {/* Show adherents at this location */}
                    <div className="space-y-2">
                      <p className="text-xs text-amber-300/70 uppercase tracking-wide">Adherents Present:</p>
                      {gameState.followers.map((follower, idx) => (
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
    const actions = [
      {
        title: 'Research at Local Libraries',
        description: 'Search for occult knowledge in public archives and university collections.'
      },
      {
        title: 'Attend Cultural Gatherings',
        description: 'Mingle with locals, build connections, identify potential recruits.'
      },
      {
        title: 'Explore Historic Sites',
        description: 'Visit old churches, cemeteries, and forgotten places. Something may be hidden there.'
      }
    ];

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
              <h1 className="text-2xl font-serif text-amber-300">{selectedLocation}</h1>
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
          <div className="grid grid-cols-3 gap-6">
            {/* Adherents Panel */}
            <div className="col-span-1">
              <div 
                className="bg-black/40 border border-amber-600/20 rounded-lg p-6"
                onDragOver={handleDragOver}
                onDrop={handleDropToUnassign}
              >
                <h2 className="text-lg font-serif text-amber-300 mb-4">Adherents</h2>
                <div className="space-y-3">
                  {gameState.followers.map((follower, idx) => {
                    const isAssigned = Object.values(assignments).includes(idx);
                    
                    return (
                      <div 
                        key={idx}
                        draggable={!isAssigned}
                        onDragStart={(e) => handleDragStart(e, idx)}
                        className={`bg-purple-900/20 border border-amber-500/20 rounded-lg p-3 transition-all ${
                          !isAssigned 
                            ? 'cursor-move hover:border-amber-500/40 hover:shadow-lg' 
                            : 'opacity-40 cursor-not-allowed'
                        }`}
                      >
                        <p className="font-serif text-amber-200">{follower.name}</p>
                        <p className="text-xs text-amber-200/60 mt-1">{follower.background}</p>
                        <div className="flex gap-2 mt-2">
                          {Array.isArray(follower.skills) ? follower.skills.map((skill, i) => (
                            <span key={i} className="text-xs px-2 py-1 bg-amber-800/30 rounded text-amber-300">
                              {skill}
                            </span>
                          )) : null}
                        </div>
                        {isAssigned && (
                          <p className="text-xs text-amber-400 mt-2 italic">Currently assigned</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="col-span-2">
              <div className="bg-black/40 border border-amber-600/20 rounded-lg p-6">
                <h2 className="text-lg font-serif text-amber-300 mb-4">Available Actions</h2>
                
                <div className="space-y-4">
                  {actions.map((action, actionIdx) => {
                    const assignedFollowerIdx = assignments[actionIdx];
                    const assignedFollower = assignedFollowerIdx !== undefined 
                      ? gameState.followers[assignedFollowerIdx] 
                      : null;

                    return (
                      <div key={actionIdx} className="border border-purple-500/30 rounded-lg p-4 bg-purple-900/10">
                        <h3 className="font-serif text-amber-300 mb-2">{action.title}</h3>
                        <p className="text-sm text-amber-200/70 mb-3">{action.description}</p>
                        
                        <div 
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, actionIdx)}
                          className={`border-2 border-dashed rounded p-4 min-h-20 transition-colors ${
                            assignedFollower 
                              ? 'border-amber-500/60 bg-amber-900/10' 
                              : 'border-amber-500/30'
                          }`}
                        >
                          {assignedFollower ? (
                            <div 
                              draggable
                              onDragStart={(e) => handleDragStart(e, assignedFollowerIdx, actionIdx)}
                              className="cursor-move hover:bg-amber-900/20 transition-colors rounded p-2 -m-2"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-serif text-amber-200">{assignedFollower.name}</p>
                                  <p className="text-xs text-amber-200/60 mt-1">{assignedFollower.background}</p>
                                  <div className="flex gap-2 mt-2">
                                    {Array.isArray(assignedFollower.skills) 
                                      ? assignedFollower.skills.map((skill, i) => (
                                        <span key={i} className="text-xs px-2 py-1 bg-amber-800/30 rounded text-amber-300">
                                          {skill}
                                        </span>
                                      )) 
                                      : null}
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleRemoveAssignment(actionIdx)}
                                  className="text-xs text-amber-400 hover:text-amber-300 underline"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center flex items-center justify-center h-full">
                              <p className="text-sm text-amber-300/50">Drag an adherent here to assign</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Process Week Button */}
                <div className="mt-6 text-center">
                  <button 
                    className="px-6 py-3 bg-amber-800/50 hover:bg-amber-700/50 border border-amber-600/30 rounded text-amber-100 transition-colors"
                    onClick={() => alert('Turn processing not yet implemented')}
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
}