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
      const { data: roomData } = await supabase
        .from('rooms')
        .upsert({ room_code: roomCode, status: 'LOBBY' }, { onConflict: 'room_code' })
        .select('id')
        .single();

      if (!roomData || !isMounted) return;

      const { data: existingPlayers } = await supabase
        .from('players')
        .select('id, name')
        .eq('room_id', roomData.id);

      if (existingPlayers && isMounted) {
        setPlayers(existingPlayers);
      }

      playerSubscription
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomData.id}` },
          (payload) => {
            if (!isMounted) return;

            if (payload.eventType === 'INSERT') {
              const newPlayer = payload.new as Player;
              setPlayers((prev) => {
                if (prev.some((p) => p.id === newPlayer.id)) return prev;
                return [...prev, newPlayer];
              });
            }
            
            else if (payload.eventType === 'DELETE') {
              const oldPlayer = payload.old as { id: string };
              setPlayers((prev) => prev.filter((p) => p.id !== oldPlayer.id));
            }
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '100vh', padding: '60px', alignItems: 'center', gap: '80px', maxWidth: '1600px', margin: '0 auto' }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px' }}>
        <h3 style={{ fontSize: '1.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px' }}>Join the game</h3>
        <h1 style={{ fontSize: '5.5rem', fontWeight: '900', letterSpacing: '4px', margin: '10px 0' }}>Code: <span style={{ color: 'var(--primary)' }}>{roomCode}</span></h1>
        
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'inline-block' }}>
          <QRCodeSVG value={gameUrl} size={280} />
        </div>
        <p style={{ fontSize: '1.4rem', color: 'var(--text-muted)', marginTop: '10px' }}>URL: <strong style={{ color: '#fff' }}>{gameUrl}</strong></p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', height: '80%', justifyContent: 'space-between', backgroundColor: 'var(--bg-card)', padding: '40px', borderRadius: '20px', border: '1px solid #262636' }}>
        <div>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '30px', borderBottom: '2px solid #262636', paddingBottom: '15px' }}>👥 Active Lobby ({players.length})</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxHeight: '450px', overflowY: 'auto' }}>
            {players.map((player) => (
              <div key={player.id} style={{ fontSize: '1.6rem', padding: '12px 20px', backgroundColor: '#1f1f2e', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                ⚡ {player.name}
              </div>
            ))}
          </div>
        </div>

        <button onClick={handleStartGame} disabled={loading} className="btn btn-primary" style={{ height: '70px', fontSize: '1.6rem', background: 'var(--truth-green)', marginTop: '40px' }}>
          {loading ? 'Processing...' : 'Start Match'}
        </button>
      </div>

    </div>
  );
}