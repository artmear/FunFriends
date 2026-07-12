import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabaseClient';
import '@/App.css';

export default function PlayerScoreView({ currentRoundId }: { currentRoundId: string | null }) {
  const [feedback, setFeedback] = useState('Evaluating scores...');
  const [totalScore, setTotalScore] = useState(0);
  const [gameType, setGameType] = useState('2L1T');

  useEffect(() => {
    const playerId = localStorage.getItem('player_id');
    if (!currentRoundId || !playerId) return;

    const evaluatePerformance = async () => {
      const { data: round } = await supabase
        .from('rounds')
        .select('correct_option, rooms(game_type)')
        .eq('id', currentRoundId)
        .single();
        
      const { data: vote } = await supabase
        .from('votes')
        .select('chosen_option')
        .eq('round_id', currentRoundId)
        .eq('player_id', playerId)
        .maybeSingle();
        
      const { data: player } = await supabase
        .from('players')
        .select('score')
        .eq('id', playerId)
        .single();

      if (player) setTotalScore(player.score);

      if (round && vote) {
        const roomContext = round.rooms as unknown as { game_type: string } | null;
        const activeGameType = roomContext?.game_type || '2L1T';
        setGameType(activeGameType);

        if (activeGameType === 'WYR') {
          setFeedback('Opinion Logged! Your preference was registered.');
        } else {
          if (vote.chosen_option === round.correct_option) {
            setFeedback('Correct! You earned +100 PTS!');
          } else {
            setFeedback('Tricked! 0 points this round.');
          }
        }
      } else {
        setFeedback('⏳ Out of time! No vote recorded.');
      }
    };

    evaluatePerformance();
  }, [currentRoundId]);

  const isPositiveFeedback = feedback.startsWith('Correct') || feedback.startsWith('Opinion');

  return (
    <div className="mobile-container" style={{ justifyContent: 'center' }}>
      <div className="mobile-card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', padding: '40px 24px' }}>
        <p style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold', fontSize: '0.9rem' }}>Round Concluded</p>
        
        <h2 style={{ 
          fontSize: '1.8rem', 
          color: gameType === 'WYR' ? 'var(--primary)' : isPositiveFeedback ? 'var(--truth-green)' : 'var(--lie-red)' 
        }}>
          {feedback}
        </h2>
        
        <div style={{ margin: '10px 0', height: '1px', backgroundColor: '#262636' }} />
        <p style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>Your Balance: <strong style={{ color: 'var(--primary)', fontSize: '1.4rem' }}>{totalScore} pts</strong></p>
      </div>
    </div>
  );
}