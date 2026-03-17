import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameSocket } from './hooks/useGameSocket';

export default function LoadSampleMode() {
  const navigate = useNavigate();
  const { send, subscribe } = useGameSocket();

  useEffect(() => {
    // Ask the server to load the hardcoded sample state
    const unsub = subscribe('STATE', () => {
      console.log('[sample] Server loaded sample state, navigating to /game');
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
