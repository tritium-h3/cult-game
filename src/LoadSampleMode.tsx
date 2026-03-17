import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameSocket } from './hooks/useGameSocket';

export default function LoadSampleMode() {
  const navigate = useNavigate();
  const { send, subscribe } = useGameSocket();

  useEffect(() => {
    const unsub = subscribe('STATE', ({ gameId }: { gameId: string }) => {
      console.log('[sample] Server created sample game', gameId);
      navigate(`/game/${gameId}`);
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
