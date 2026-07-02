import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabaseClient';

export default function ConductorVotingView({ currentRoundId, roomCode }: { currentRoundId: string | null, roomCode: string }) {
  const [voteCount, setVoteCount] = useState(0);
  const [timer, setTimer] = useState(45);

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
        () => {
          setVoteCount((prev) => prev + 1);
        }
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

  const handleEndVoting = async () => {
    if (!currentRoundId) return;

    try {
      // Synced column target definitions: correct_option & chosen_option mapped perfectly
      const { data: round } = await supabase.from('rounds').select('correct_option').eq('id', currentRoundId).single();
      const { data: votes } = await supabase.from('votes').select('player_id, chosen_option').eq('round_id', currentRoundId);
      const { data: players } = await supabase.from('players').select('id, score');

      if (!round || !votes || !players) return;

      for (const player of players) {
        const playerVote = votes.find(v => v.player_id === player.id);
        let pointsEarned = 0;

        if (playerVote && playerVote.chosen_option === round.correct_option) {
          pointsEarned = 100;
        }

        await supabase
          .from('players')
          .update({ score: (player.score || 0) + pointsEarned })
          .eq('id', player.id);
      }

      await supabase.from('rooms').update({ status: 'RESULTS' }).eq('room_code', roomCode);

    } catch (err) {
      console.error('Score engine failure:', err);
    }
  };

  return (
    <div style={{ padding: '60px', textAlign: 'center' }}>
      <h1>⏱️ Voting Mode Active</h1>
      <h2 style={{ fontSize: '80px', color: timer < 10 ? '#ffc107' : '#fff' }}>{timer}s</h2>
      <h3 style={{ fontSize: '32px', margin: '40px 0' }}>Total Incoming Votes Locked: {voteCount}</h3>
      
      <button onClick={handleEndVoting} style={{ padding: '15px 30px', fontSize: '20px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
        🛑 Terminate Round & Calculate Standings
      </button>
    </div>
  );
}