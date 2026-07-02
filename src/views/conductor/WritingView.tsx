import { useState } from 'react';
import { supabase } from '@/config/supabaseClient';

export default function WritingView({ roomCode }: { roomCode: string }) {
  const [f1, setF1] = useState('');
  const [f2, setF2] = useState('');
  const [f3, setF3] = useState('');
  const [correct, setCorrect] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  const handleStartVoting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f1 || !f2 || !f3) return;
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
          statement_3: f3,
          correct_option: correct
        });

      if (rErr) throw rErr;

      await supabase
        .from('rooms')
        .update({ status: 'VOTING' })
        .eq('room_code', roomCode);

    } catch (err) {
      console.error(err);
      alert('Error establishing round facts.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleStartVoting} style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>📝 Input Round Statements</h2>
      <input style={{ display: 'block', width: '100%', margin: '10px 0', padding: '10px' }} placeholder="Statement 1" value={f1} onChange={e => setF1(e.target.value)} />
      <input style={{ display: 'block', width: '100%', margin: '10px 0', padding: '10px' }} placeholder="Statement 2" value={f2} onChange={e => setF2(e.target.value)} />
      <input style={{ display: 'block', width: '100%', margin: '10px 0', padding: '10px' }} placeholder="Statement 3" value={f3} onChange={e => setF3(e.target.value)} />
      
      <label style={{ display: 'block', margin: '20px 0' }}>
        Which one is the TRUTH? 
        <select value={correct} onChange={e => setCorrect(Number(e.target.value))} style={{ marginLeft: '10px', padding: '5px' }}>
          <option value={1}>Statement 1</option>
          <option value={2}>Statement 2</option>
          <option value={3}>Statement 3</option>
        </select>
      </label>

      <button type="submit" disabled={loading} style={{ padding: '12px 24px', backgroundColor: '#28a745', color: '#fff', border: 'none', cursor: 'pointer' }}>
        {loading ? 'Processing...' : '🚀 Launch Live Voting'}
      </button>
    </form>
  );
}