import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameSocket } from './hooks/useGameSocket';

export default function ClearStorage() {
  const [cleared, setCleared] = useState(false);
  const navigate = useNavigate();
  const { send, subscribe } = useGameSocket();

  useEffect(() => {
    const unsub = subscribe('RESET_OK', () => {
      console.log('Server reset OK');
      setCleared(true);
      unsub();
    });
    send({ type: 'RESET' });
    return unsub;
  }, [send, subscribe]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 text-amber-100 flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-serif text-amber-300 mb-4">
          {cleared ? 'Storage Cleared' : 'Clearing Storage...'}
        </h1>
        <p className="text-amber-200/70 mb-8">
          {cleared 
            ? 'All saved game data has been removed. You can now start fresh.' 
            : 'Removing corrupted data...'}
        </p>
        {cleared && (
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-amber-800/50 hover:bg-amber-700/50 border border-amber-600/30 rounded text-amber-100 transition-colors"
            >
              Start New Reading
            </button>
            <button
              onClick={() => navigate('/sample')}
              className="px-6 py-3 bg-purple-800/50 hover:bg-purple-700/50 border border-amber-600/30 rounded text-amber-100 transition-colors"
            >
              Load Sample
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
