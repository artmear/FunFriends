import { useState } from 'react';
import { supabase } from '@/config/supabaseClient';

interface JoinViewProps {
  onJoinSuccess: (roomCode: string) => void;
}

export default function JoinView({ onJoinSuccess }: JoinViewProps) {
  const [roomInput, setRoomInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRoom = roomInput.trim().toUpperCase();
    const cleanName = nameInput.trim();

    if (!cleanRoom || !cleanName || isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Check if a room with this dynamic code exists and is still in LOBBY status
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id')
        .eq('room_code', cleanRoom)
        .eq('status', 'LOBBY')
        .maybeSingle();

      if (roomError || !room) {
        alert('Room not found or game has already started!');
        setIsSubmitting(false);
        return;
      }

      // Prevent player duplication inside this dynamic instance
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id, name')
        .eq('room_id', room.id)
        .eq('name', cleanName)
        .maybeSingle();

      if (existingPlayer) {
        localStorage.setItem('player_id', existingPlayer.id);
        localStorage.setItem('player_name', existingPlayer.name);
        onJoinSuccess(cleanRoom);
        return;
      }

      // Register the new player bound to the verified room record ID
      const { data: newPlayer, error: insertError } = await supabase
        .from('players')
        .insert({ room_id: room.id, name: cleanName })
        .select()
        .single();

      if (insertError) throw insertError;

      localStorage.setItem('player_id', newPlayer.id);
      localStorage.setItem('player_name', newPlayer.name);
      
      onJoinSuccess(cleanRoom);

    } catch (err) {
      console.error(err);
      alert('Error trying to register into the room.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleJoin} style={{ padding: '30px', maxWidth: '400px', margin: '40px auto', display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: 'sans-serif' }}>
      <h2>🎮 Join Game Room</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label>Room Code:</label>
        <input
          type="text"
          value={roomInput}
          onChange={(e) => setRoomInput(e.target.value)}
          placeholder="e.g. B7K9"
          maxLength={4}
          disabled={isSubmitting}
          style={{ padding: '12px', fontSize: '18px', textTransform: 'uppercase', borderRadius: '6px', border: '1px solid #555' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label>Your Name:</label>
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="e.g. Pedro"
          maxLength={15}
          disabled={isSubmitting}
          style={{ padding: '12px', fontSize: '18px', borderRadius: '6px', border: '1px solid #555' }}
        />
      </div>

      <button 
        type="submit" 
        disabled={isSubmitting} 
        style={{ 
          padding: '14px', 
          fontSize: '18px', 
          fontWeight: 'bold',
          backgroundColor: isSubmitting ? '#555' : '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '6px', 
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          marginTop: '10px'
        }}
      >
        {isSubmitting ? 'Connecting...' : 'Enter Lobby'}
      </button>
    </form>
  );
}