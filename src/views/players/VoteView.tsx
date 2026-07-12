import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabaseClient';
import '@/App.css';

interface RoundStatements {
  statement_1: string;
  statement_2: string;
  statement_3: string;
}

export default function PlayerVoteView({ currentRoundId }: { currentRoundId: string | null }) {
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [statements, setStatements] = useState<RoundStatements | null>(null);
  
  const [gameType, setGameType] = useState<string>('2L1T');

  useEffect(() => {
    if (!currentRoundId) return;

    const fetchRoundStatements = async () => {
      const { data, error } = await supabase
        .from('rounds')
        .select('statement_1, statement_2, statement_3, rooms(game_type)')
        .eq('id', currentRoundId)
        .maybeSingle();

      if (error) {
        console.error('Failed to grab round text metadata:', error);
        return;
      }

      if (data) {
        setStatements({
          statement_1: data.statement_1,
          statement_2: data.statement_2,
          statement_3: data.statement_3,
        });

        const roomContext = data.rooms as unknown as { game_type: string } | null;
        if (roomContext) {
          setGameType(roomContext.game_type);
        }
      }
    };

    fetchRoundStatements();
    setHasVoted(false);
  }, [currentRoundId]);

  const castVote = async (optionNumber: number) => {
    const playerId = localStorage.getItem('player_id');
    if (!currentRoundId || !playerId || loading) return;

    setLoading(true);
    try {
      await supabase.from('votes').insert({
        round_id: currentRoundId,
        player_id: playerId,
        chosen_option: optionNumber,
      });
      setHasVoted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (hasVoted) {
    return (
      <div className="mobile-container" style={{ justifyContent: 'center' }}>
        <div className="mobile-card" style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--truth-green)' }}>Vote Locked In!</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>Look at the projector for the final countdown.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-container">
      <div className="mobile-card" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--primary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>Round Active</p>
        
        <h2 style={{ marginTop: '8px', fontSize: '1.4rem' }}>
          {gameType === 'WYR' ? 'Which option do you prefer?' : 'Identify the absolute TRUTH:'}
        </h2>
      </div>

      <div className="game-options-grid">
        <button 
          onClick={() => castVote(1)} 
          disabled={loading || !statements} 
          className="btn btn-primary" 
          style={{ backgroundColor: gameType === 'WYR' ? '#1e3a8a' : '#1e1b4b', border: gameType === 'WYR' ? '2px solid #3b82f6' : '2px solid var(--primary)', minHeight: '60px', height: 'auto', fontSize: '1.1rem', padding: '12px' }}
        >
          {statements ? statements.statement_1 : 'Loading Option A...'}
        </button>

        <button 
          onClick={() => castVote(2)} 
          disabled={loading || !statements} 
          className="btn btn-primary" 
          style={{ backgroundColor: gameType === 'WYR' ? '#701a75' : '#1e1b4b', border: gameType === 'WYR' ? '2px solid #d946ef' : '2px solid var(--primary)', minHeight: '60px', height: 'auto', fontSize: '1.1rem', padding: '12px' }}
        >
          {statements ? statements.statement_2 : 'Loading Option B...'}
        </button>

        {gameType !== 'WYR' && (
          <button 
            onClick={() => castVote(3)} 
            disabled={loading || !statements} 
            className="btn btn-primary" 
            style={{ backgroundColor: '#1e1b4b', border: '2px solid var(--primary)', minHeight: '60px', height: 'auto', fontSize: '1.1rem', padding: '12px' }}
          >
            {statements ? statements.statement_3 : 'Loading statement 3...'}
          </button>
        )}
      </div>
    </div>
  );
}