import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabaseClient';

export default function ConductorVotingView({ currentRoundId, roomCode }: { currentRoundId: string | null, roomCode: string }) {
  const [voteCount, setVoteCount] = useState(0);
  const [timer, setTimer] = useState(45);
  const [isEnding, setIsEnding] = useState(false);
  const [gameType, setGameType] = useState<string>('2L1T');

  useEffect(() => {
    const fetchGameContext = async () => {
      const { data } = await supabase.from('rooms').select('game_type').eq('room_code', roomCode).maybeSingle();
      if (data) {
        setGameType(data.game_type);
      }
    };
    fetchGameContext();
  }, [roomCode]);

  const handleEndVoting = async () => {
    if (!currentRoundId || isEnding) return;
    setIsEnding(true);

    try {
      const { data: round } = await supabase.from('rounds').select('correct_option').eq('id', currentRoundId).single();
      const { data: votes } = await supabase.from('votes').select('player_id, chosen_option').eq('round_id', currentRoundId);
      const { data: players } = await supabase.from('players').select('id, score');

      if (!round || !votes || !players) return;

      const opt1Count = votes.filter(v => v.chosen_option === 1).length;
      const opt2Count = votes.filter(v => v.chosen_option === 2).length;

      for (const player of players) {
        const playerVote = votes.find(v => v.player_id === player.id);
        let pointsEarned = 0;

        if (gameType === 'WYR') {
          if (playerVote) {
            const chosen = playerVote.chosen_option;
          
          const votedMajority = (chosen === 1 && opt1Count >= opt2Count) || (chosen === 2 && opt2Count >= opt1Count);
          
          if (votedMajority) {
            pointsEarned = 50;
          }
          }
        } else {
          if (playerVote && playerVote.chosen_option === round.correct_option) {
            pointsEarned = 100;
          }
        }

        await supabase
          .from('players')
          .update({ score: (player.score || 0) + pointsEarned })
          .eq('id', player.id);
      }

      await supabase.from('rooms').update({ status: 'RESULTS' }).eq('room_code', roomCode);

    } catch (err) {
      console.error('Score engine failure:', err);
      setIsEnding(false);
    }
  };

  useEffect(() => {
    if (timer === 0) {
      handleEndVoting();
    }
  }, [timer]);

  useEffect(() => {
    if (!currentRoundId) return;

    const uniqueVotingChannel = `live-votes-${Math.random().toString(36).substring(2, 9)}`;
    const voteChannel = supabase.channel(uniqueVotingChannel);

    const fetchVotes = async () => {
      const { count } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('round_id', currentRoundId);
      if (count !== null) setVoteCount(count);
    };
    fetchVotes();

    voteChannel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes', filter: `round_id=eq.${currentRoundId}` },
        () => setVoteCount((prev) => prev + 1)
      )
      .subscribe();

    const countdown = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(countdown);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      supabase.removeChannel(voteChannel);
      clearInterval(countdown);
    };
  }, [currentRoundId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '40px', gap: '30px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '3rem', letterSpacing: '1px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
        ⏱️ {gameType === 'WYR' ? 'Dilemma Voting' : 'Vote Running'}
      </h1>
      
      <div style={{ fontSize: '11rem', fontWeight: '900', color: timer < 10 ? 'var(--lie-red)' : '#fff', transition: 'color 0.5s ease', fontFamily: 'monospace' }}>
        {timer}<span style={{ fontSize: '4rem' }}>s</span>
      </div>

      <div style={{ backgroundColor: 'var(--bg-card)', padding: '30px 60px', borderRadius: '15px', border: '1px solid #262636', marginTop: '20px' }}>
        <h3 style={{ fontSize: '2.5rem', fontWeight: '700' }}>Incoming Ballots: <span style={{ color: 'var(--primary)' }}>{voteCount}</span></h3>
      </div>
      
      <button 
        onClick={handleEndVoting} 
        disabled={isEnding}
        className="btn" 
        style={{ 
          maxWidth: '500px', 
          height: '65px', 
          fontSize: '1.4rem', 
          backgroundColor: isEnding ? '#555' : 'var(--lie-red)', 
          color: '#fff', 
          marginTop: '40px',
          cursor: isEnding ? 'not-allowed' : 'pointer'
        }}
      >
        {isEnding ? '🚨 Computing Scores...' : '🛑 Terminate Round & Compute Scores'}
      </button>
    </div>
  );
}