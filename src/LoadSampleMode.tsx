import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameState } from './game/types';
import { prototypeActionsForCity } from './game/actions';
import { getCityById } from './game/world';

export default function LoadSampleMode() {
  const navigate = useNavigate();

  useEffect(() => {
    // Create a sample GameState
    const sampleGameState: GameState = {
      cultName: "The Obsidian Circle",
      leader: {
        name: "Alaric Thorne",
        background: "Former archaeologist turned mystic after discovering an ancient artifact",
        archetype: "The Seeker",
        traits: "Charismatic, obsessive, scholarly",
        skills: ["research", "occult-knowledge"]
      },
      discovery: {
        type: "Ancient Artifact",
        artifact: {
          name: "The Obsidian Mirror",
          description: "A polished black stone mirror that seems to reflect more than just light"
        },
        details: "Found in a forgotten temple in the mountains, radiating otherworldly energy"
      },
      mystery: {
        type: "Cosmic Horror",
        knownRituals: ["Ritual of Awakening", "Circle of Protection"],
        paradigm: "The world is a thin veil over deeper, stranger realities"
      },
      goal: {
        type: "Enlightenment",
        description: "Unlock the secrets of the Obsidian Mirror and transcend mortal limitations"
      },
      followers: [
        {
          id: "follower-1",
          name: "Elena Voss",
          background: "Disillusioned philosophy professor",
          location: "new-york",
          traits: ["Intellectual", "Curious"],
          skills: ["Research", "Teaching"]
        },
        {
          id: "follower-2",
          name: "Marcus Chen",
          background: "Former tech entrepreneur seeking meaning",
          location: "new-york",
          traits: ["Wealthy", "Ambitious"],
          skills: ["Networking", "Finance"]
        },
        {
          id: "follower-3",
          name: "Sofia Ramirez",
          background: "Artist drawn to the occult",
          location: "new-york",
          traits: ["Creative", "Sensitive"],
          skills: ["Art", "Divination"]
        }
      ],
      hqLocation: "new-orleans",
      week: 1
    };

    // Initialize the action map
    const startCity = getCityById(sampleGameState.hqLocation);
    if (startCity) {
      sampleGameState.map = {
        [startCity.id]: prototypeActionsForCity(startCity)
      };
    }

    // Save to localStorage
    localStorage.setItem('cultGameState', JSON.stringify(sampleGameState));

    // Navigate to the game
    navigate('/game');
  }, [navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '1.5rem',
      color: '#8b5cf6'
    }}>
      Loading sample game...
    </div>
  );
}
