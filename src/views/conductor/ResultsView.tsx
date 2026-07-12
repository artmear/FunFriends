import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabaseClient';

interface LeaderboardRecord {
  id: string;
  name: string;
  score: number;
}

interface RoundMetadata {
  statement_1: string;
  statement_2: string;
  statement_3: string;
  correct_option: number;
}

export default function ConductorResultsView({ roomCode }: { roomCode: string }) {
  const [standings, setStandings] = useState<LeaderboardRecord[]>([]);
  const [gameType, setGameType] = useState<string>('2L1T');
  const [round, setRound] = useState<RoundMetadata | null>(null);
  
  const [stats, setStats] = useState({ opt1Count: 0, opt2Count: 0, total: 0 });

  useEffect(() => {
    const fetchResultsAndContext = async () => {
      const { data: room } = await supabase.from('rooms').select('id, game_type').eq('room_code', roomCode).single();
      if (!room) return;
      setGameType(room.game_type);

      const { data: latestRound } = await supabase
        .from('rounds')
        .select('id, statement_1, statement_2, statement_3, correct_option')
        .eq('room_id', room.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestRound) {
        setRound(latestRound);

        if (room.game_type === 'WYR') {
          const { data: votes } = await supabase.from('votes').select('chosen_option').eq('round_id', latestRound.id);
          if (votes) {
            const opt1 = votes.filter(v => v.chosen_option === 1).length;
            const opt2 = votes.filter(v => v.chosen_option === 2).length;
            setStats({ opt1Count: opt1, opt2Count: opt2, total: votes.length || 1 });
          }
        }
      }

      const { data: players } = await supabase
        .from('players')
        .select('id, name, score')
        .eq('room_id', room.id)
        .order('score', { ascending: false });
      if (players) setStandings(players);
    };

    fetchResultsAndContext();
  }, [roomCode]);

  const handleNextRound = async () => {
    try {
      await supabase.from('rooms').update({ status: 'WRITING' }).eq('room_code', roomCode);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDestroyAndReset = async () => {
    if (!window.confirm("Delete room and purge all player history cascade metadata?")) return;
    try {
      await supabase.from('rooms').delete().eq('room_code', roomCode);
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  const p1 = Math.round((stats.opt1Count / stats.total) * 100);
  const p2 = Math.round((stats.opt2Count / stats.total) * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', minHeight: '100vh', padding: '40px 60px', gap: '40px' }}>
      
      {round && (
        gameType === 'WYR' ? (
          <div style={{ width: '100%', maxWidth: '1000px', backgroundColor: 'var(--bg-card)', padding: '30px 40px', borderRadius: '20px', border: '1px solid #262636' }}>
            <h2 style={{ fontSize: '1.8rem', textAlign: 'center', marginBottom: '25px', color: 'var(--primary)', fontWeight: '800', textTransform: 'uppercase' }}>Audience Split Decisions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', marginBottom: '8px', fontWeight: 'bold' }}>
                  <span>{round.statement_1}</span>
                  <span>{p1}% ({stats.opt1Count} votes)</span>
                </div>
                <div style={{ width: '100%', height: '24px', backgroundColor: '#13131a', borderRadius: '6px', overflow: 'hidden', border: '1px solid #262636' }}>
                  <div style={{ width: `${p1}%`, height: '100%', backgroundColor: '#3b82f6', transition: 'width 1s ease' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', marginBottom: '8px', fontWeight: 'bold' }}>
                  <span>{round.statement_2}</span>
                  <span>{p2}% ({stats.opt2Count} votes)</span>
                </div>
                <div style={{ width: '100%', height: '24px', backgroundColor: '#13131a', borderRadius: '6px', overflow: 'hidden', border: '1px solid #262636' }}>
                  <div style={{ width: `${p2}%`, height: '100%', backgroundColor: '#d946ef', transition: 'width 1s ease' }} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ width: '100%', maxWidth: '1000px', backgroundColor: 'var(--bg-card)', padding: '25px 40px', borderRadius: '20px', border: '1px solid #262636', textAlign: 'center' }}>
            <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>Evaluation Complete</span>
            <h2 style={{ fontSize: '2.5rem', color: 'var(--truth-green)', fontWeight: '900', margin: '5px 0 15px' }}>THE ABSOLUTE TRUTH WAS:</h2>
            <div style={{ padding: '16px 30px', backgroundColor: '#13131a', borderRadius: '10px', border: '2px solid var(--truth-green)', fontSize: '1.6rem', fontWeight: 'bold', display: 'inline-block' }}>
              {round.correct_option === 1 ? round.statement_1 : round.correct_option === 2 ? round.statement_2 : round.statement_3}
            </div>
          </div>
        )
      )}

      <div style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: '900', textAlign: 'center', margin: '10px 0' }}>Leaderboard Standings</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: 'var(--bg-card)', padding: '40px', borderRadius: '20px', border: '1px solid #262636', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
          {standings.map((player, idx) => (
            <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', backgroundColor: idx === 0 ? '#1e1b4b' : '#14141e', borderRadius: '12px', border: idx === 0 ? '2px solid var(--primary)' : '1px solid transparent' }}>
              <span style={{ fontSize: '2rem', fontWeight: idx === 0 ? '800' : '500' }}>
                {idx === 0 ? '👑' : `${idx + 1}.`} {player.name}
              </span>
              <span style={{ fontSize: '2rem', color: 'var(--primary)', fontWeight: 'bold' }}>{player.score || 0} PTS</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '25px', width: '100%', maxWidth: '1000px' }}>
        <button onClick={handleNextRound} className="btn" style={{ flex: 2, height: '65px', fontSize: '1.4rem', backgroundColor: 'var(--primary)', color: '#fff' }}>
          Next Round
        </button>
        <button onClick={handleDestroyAndReset} className="btn" style={{ flex: 1, height: '65px', fontSize: '1.4rem', backgroundColor: 'var(--lie-red)', color: '#fff' }}>
          Wipe Arena & Exit
        </button>
      </div>
    </div>
  );
}