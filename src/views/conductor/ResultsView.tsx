import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabaseClient';

interface LeaderboardRecord {
  id: string;
  name: string;
  score: number;
}

export default function ConductorResultsView({ roomCode }: { roomCode: string }) {
  const [standings, setStandings] = useState<LeaderboardRecord[]>([]);

  useEffect(() => {
    const fetchStandings = async () => {
      const { data } = await supabase
        .from('players')
        .select('id, name, score')
        .order('score', { ascending: false });
      if (data) setStandings(data);
    };
    fetchStandings();
  }, []);

  const handleNextRound = async () => {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ status: 'WRITING' })
        .eq('room_code', roomCode);

      if (error) throw error;
    } catch (err) {
      console.error('Failed to advance to the next round:', err);
    }
  };

  // reset function to destroy the room and cascade-wipe all data
  const handleDestroyAndReset = async () => {
    const confirmReset = window.confirm(
      "🚨 WARNING: This will permanently delete the current room, wipe all connected players, reset their scores, and delete all voting history. Proceed?"
    );
    
    if (!confirmReset) return;

    try {
      // Delete the room. ON DELETE CASCADE will instantly purge players, rounds, and votes!
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('room_code', roomCode);

      if (error) throw error;

      // Hard reload the page. 
      // When ConductorScreen mounts again, LobbyView will run its upsert 
      // and provision a brand new, empty room with 0 players!
      window.location.reload();

    } catch (err) {
      console.error('Failed to execute nuclear room purge:', err);
      alert('Error trying to destroy the room.');
    }
  };

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>Round Results - Current Standings</h1>
      
      <div style={{ maxWidth: '500px', margin: '30px auto', textAlign: 'left', backgroundColor: '#222', padding: '20px', borderRadius: '8px' }}>
        {standings.map((player, idx) => (
          <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #444', fontSize: '20px' }}>
            <span>{idx + 1}. {player.name}</span>
            <span style={{ color: '#007bff', fontWeight: 'bold' }}>{player.score || 0} pts</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '30px' }}>
        <button 
          onClick={handleNextRound} 
          style={{ padding: '12px 24px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '18px' }}
        >
          Next Round
        </button>

        <button 
          onClick={handleDestroyAndReset} 
          style={{ padding: '12px 24px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}
        >
          Destroy Room & Reset
        </button>
      </div>
    </div>
  );
}