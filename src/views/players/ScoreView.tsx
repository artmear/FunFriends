import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabaseClient';

export default function PlayerScoreView({ currentRoundId }: { currentRoundId: string | null }) {
  const [feedback, setFeedback] = useState('Evaluating scores...');
  const [totalScore, setTotalScore] = useState(0);

  useEffect(() => {
    const playerId = localStorage.getItem('player_id');
    if (!currentRoundId || !playerId) return;

    const evaluatePerformance = async () => {
      const { data: round } = await supabase.from('rounds').select('correct_option').eq('id', currentRoundId).single();
      const { data: vote } = await supabase.from('votes').select('chosen_option').eq('round_id', currentRoundId).eq('player_id', playerId).maybeSingle();
      const { data: player } = await supabase.from('players').select('score').eq('id', playerId).single();

      if (player) setTotalScore(player.score);

      if (round && vote) {
        if (vote.chosen_option === round.correct_option) {
          setFeedback('🎉 Correct! You scored +100 points!');
        } else {
          setFeedback('❌ Incorrect! You got 0 points this round.');
        }
      } else {
        setFeedback('⏳ You did not cast a vote in time.');
      }
    };

    evaluatePerformance();
  }, [currentRoundId]);

  return (
    <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h2>Round Concluded</h2>
      <h3 style={{ margin: '30px 0', color: feedback.startsWith('🎉') ? '#28a745' : '#dc3545' }}>{feedback}</h3>
      <p style={{ fontSize: '20px' }}>Your Global Balance: <strong>{totalScore} pts</strong></p>
    </div>
  );
}