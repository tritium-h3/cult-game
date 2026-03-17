import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameSocket } from './hooks/useGameSocket';
import { setGameId } from './game/gameId';

export default function LoadSampleMode() {
  const navigate = useNavigate();
  const { send, subscribe } = useGameSocket();

  useEffect(() => {
    // Ask the server to create a new sample game and return its id
    const unsub = subscribe('STATE', ({ gameId }: { gameId: string }) => {
      console.log('[sample] Server created sample game', gameId, 'navigating to /game');
      setGameId(gameId);
      navigate('/game');
      unsub();
    });
    send({ type: 'LOAD_SAMPLE' });
    return unsub;
  }, [navigate, send, subscribe]);

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
