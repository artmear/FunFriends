import { useState } from 'react';
import { supabase } from '@/config/supabaseClient';

export default function PlayerVoteView({ currentRoundId }: { currentRoundId: string | null }) {
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);

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
      alert('Vote recording failed.');
    } finally {
      setLoading(false);
    }
  };

  if (hasVoted) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>Vote Transmitted!</h2>
        <p>Waiting for the countdown to conclude on the screen.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2>Choose the TRUTH:</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '30px' }}>
        <button onClick={() => castVote(1)} disabled={loading} style={{ padding: '20px', fontSize: '18px', borderRadius: '8px', cursor: 'pointer' }}>Option 1</button>
        <button onClick={() => castVote(2)} disabled={loading} style={{ padding: '20px', fontSize: '18px', borderRadius: '8px', cursor: 'pointer' }}>Option 2</button>
        <button onClick={() => castVote(3)} disabled={loading} style={{ padding: '20px', fontSize: '18px', borderRadius: '8px', cursor: 'pointer' }}>Option 3</button>
      </div>
    </div>
  );
}