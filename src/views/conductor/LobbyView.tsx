import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabaseClient';
import { QRCodeSVG } from 'qrcode.react';

interface Player {
  id: string;
  name: string;
}

export default function LobbyView({ roomCode }: { roomCode: string }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  const gameUrl = `http://10.227.150.144:5173/`;

  useEffect(() => {
    let isMounted = true;
    const uniqueChannelName = `lobby-players-${roomCode}-${Math.random().toString(36).substring(2, 9)}`;
    const playerSubscription = supabase.channel(uniqueChannelName);

    const setupLobby = async () => {
      // Create the randomized room in the DB
      const { data: roomData } = await supabase
        .from('rooms')
        .upsert({ room_code: roomCode, status: 'LOBBY' }, { onConflict: 'room_code' })
        .select('id')
        .single();

      if (!roomData || !isMounted) return;

      // Fetch existing players if the conductor reloaded the page
      const { data: existingPlayers } = await supabase
        .from('players')
        .select('id, name')
        .eq('room_id', roomData.id);

      if (existingPlayers && isMounted) {
        setPlayers(existingPlayers);
      }

      // Listen to incoming real-time inserts for this specific room ID
      playerSubscription
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'players', filter: `room_id=eq.${roomData.id}` },
          (payload) => {
            const newPlayer = payload.new as Player;
            setPlayers((prev) => {
              if (prev.some((p) => p.id === newPlayer.id)) return prev;
              return [...prev, newPlayer];
            });
          }
        )
        .subscribe();
    };

    setupLobby();

    return () => {
      isMounted = false;
      supabase.removeChannel(playerSubscription);
    };
  }, [roomCode]);

  const handleStartGame = async () => {
    if (players.length === 0) {
      alert('Wait for players to join first!');
      return;
    }

    setLoading(true);
    try {
      await supabase.from('rooms').update({ status: 'WRITING' }).eq('room_code', roomCode);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '42px', margin: '10px 0' }}>Room Code: <span style={{ color: '#007bff' }}>{roomCode}</span></h1>
      
      <div style={{ backgroundColor: 'white', padding: '16px', display: 'inline-block', borderRadius: '8px', margin: '20px 0' }}>
        <QRCodeSVG value={gameUrl} size={220} />
      </div>
      <p style={{ color: '#aaa' }}>Scan QR or open: {gameUrl}</p>

      <div style={{ margin: '30px auto', maxWidth: '400px' }}>
        <h3>Joined Players ({players.length}):</h3>
        <ul style={{ padding: 0 }}>
          {players.map((player) => (
            <li key={player.id} style={{ fontSize: '24px', listStyle: 'none', margin: '10px 0', borderBottom: '1px solid #333', paddingBottom: '8px' }}>
              {player.name}
            </li>
          ))}
        </ul>
      </div>

      <button onClick={handleStartGame} disabled={loading} style={{ padding: '15px 30px', fontSize: '20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
        {loading ? 'Launching...' : 'Start Game'}
      </button>
    </div>
  );
}