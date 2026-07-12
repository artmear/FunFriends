import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabaseClient';

export default function WritingView({ roomCode }: { roomCode: string }) {
  const [f1, setF1] = useState('');
  const [f2, setF2] = useState('');
  const [f3, setF3] = useState('');
  const [correct, setCorrect] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  
  const [gameType, setGameType] = useState<string>('2L1T');

  useEffect(() => {
    const fetchGameType = async () => {
      const { data } = await supabase.from('rooms').select('game_type').eq('room_code', roomCode).maybeSingle();
      if (data) {
        setGameType(data.game_type);
      }
    };
    fetchGameType();
  }, [roomCode]);

  const handleStartVoting = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (gameType === 'WYR' && (!f1 || !f2)) return;
    if (gameType === '2L1T' && (!f1 || !f2 || !f3)) return;
    
    setLoading(true);

    try {
      const { data: room } = await supabase.from('rooms').select('id').eq('room_code', roomCode).single();
      if (!room) throw new Error('Room missing');

      const { error: rErr } = await supabase
        .from('rounds')
        .insert({
          room_id: room.id,
          statement_1: f1,
          statement_2: f2,
          statement_3: gameType === 'WYR' ? '' : f3,
          correct_option: gameType === 'WYR' ? 1 : correct
        });

      if (rErr) throw rErr;

      await supabase.from('rooms').update({ status: 'VOTING' }).eq('room_code', roomCode);

    } catch (err) {
      console.error(err);
      alert('Error establishing round facts.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '40px' }}>
      <form onSubmit={handleStartVoting} style={{ backgroundColor: 'var(--bg-card)', padding: '50px', borderRadius: '20px', width: '100%', maxWidth: '900px', border: '1px solid #262636', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        
        <h2 style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '40px', color: 'var(--primary)' }}>
          {gameType === 'WYR' ? 'Input "Would You Rather" Choices' : 'Input Round Statements'}
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <input 
            style={{ width: '100%', padding: '18px', fontSize: '1.4rem', borderRadius: '10px', border: '1px solid #3e3e56', backgroundColor: '#13131a', color: '#fff' }} 
            placeholder={gameType === 'WYR' ? 'Dilemma Option A' : 'Statement 1'} 
            value={f1} 
            onChange={e => setF1(e.target.value)} 
          />
          <input 
            style={{ width: '100%', padding: '18px', fontSize: '1.4rem', borderRadius: '10px', border: '1px solid #3e3e56', backgroundColor: '#13131a', color: '#fff' }} 
            placeholder={gameType === 'WYR' ? 'Dilemma Option B' : 'Statement 2'} 
            value={f2} 
            onChange={e => setF2(e.target.value)} 
          />
          
          {gameType !== 'WYR' && (
            <input 
              style={{ width: '100%', padding: '18px', fontSize: '1.4rem', borderRadius: '10px', border: '1px solid #3e3e56', backgroundColor: '#13131a', color: '#fff' }} 
              placeholder="Statement 3" 
              value={f3} 
              onChange={e => setF3(e.target.value)} 
            />
          )}
        </div>
        
        {gameType !== 'WYR' && (
          <div style={{ margin: '35px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', fontSize: '1.5rem' }}>
            <span>Which statement is the TRUTH?</span>
            <select value={correct} onChange={e => setCorrect(Number(e.target.value))} style={{ padding: '12px 24px', fontSize: '1.3rem', borderRadius: '8px', backgroundColor: '#1e1b4b', color: '#fff', border: '2px solid var(--primary)', fontWeight: 'bold', cursor: 'pointer' }}>
              <option value={1}>Statement 1</option>
              <option value={2}>Statement 2</option>
              <option value={3}>Statement 3</option>
            </select>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary" style={{ height: '65px', fontSize: '1.5rem', marginTop: gameType === 'WYR' ? '40px' : '10px' }}>
          {loading ? 'Locking configuration...' : '🚀 Launch Live Voting'}
        </button>
      </form>
    </div>
  );
}