import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabaseClient';
import LobbyView from '@/views/conductor/LobbyView';
import WritingView from '@/views/conductor/WritingView';
import ConductorVotingView from '@/views/conductor/VotingView';
import ConductorResultsView from '@/views/conductor/ResultsView';

const generateRandomCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

export default function ConductorScreen() {
  const [status, setStatus] = useState<'LOBBY' | 'WRITING' | 'VOTING' | 'RESULTS'>('LOBBY');
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [roomCode] = useState<string>(() => generateRandomCode());

  const fetchLatestRound = async (roomId: string) => {
    const { data } = await supabase
      .from('rounds')
      .select('id')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.id || null;
  };

  useEffect(() => {
    const uniqueChannel = `conductor-sync-${roomCode}-${Math.random().toString(36).substring(2, 9)}`;
    let roomChannel: any;

    const initSync = async () => {
      roomChannel = supabase
        .channel(uniqueChannel)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `room_code=eq.${roomCode}` },
          async (payload) => {
            const nextStatus = payload.new.status;
            setStatus(nextStatus);
            
            if (nextStatus === 'VOTING' || nextStatus === 'RESULTS') {
              const roundId = await fetchLatestRound(payload.new.id);
              setCurrentRoundId(roundId);
            }
          }
        )
        .subscribe();
    };

    initSync();

    return () => {
      if (roomChannel) supabase.removeChannel(roomChannel);
    };
  }, [roomCode]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#121212', color: '#fff', fontFamily: 'sans-serif' }}>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px 40px', 
        backgroundColor: 'var(--bg-card, #171721)', 
        borderBottom: '1px solid #262636',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-muted, #9ca3af)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Presenter Dashboard
          </span>
          {status !== 'LOBBY' && (
            <span style={{ fontSize: '0.85rem', padding: '4px 10px', backgroundColor: '#262636', borderRadius: '20px', color: 'var(--primary)' }}>
              {status} PHASE
            </span>
          )}
        </div>

        <div style={{ fontSize: '1.3rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>
          ROOM CODE: <span style={{ color: 'var(--primary, #6366f1)', backgroundColor: '#1e1b4b', padding: '8px 18px', borderRadius: '8px', border: '1px solid var(--primary, #6366f1)', marginLeft: '8px', fontFamily: 'monospace', fontWeight: '900' }}>{roomCode}</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {status === 'LOBBY' && <LobbyView roomCode={roomCode} />}
        {status === 'WRITING' && <WritingView roomCode={roomCode} />}
        {status === 'VOTING' && <ConductorVotingView currentRoundId={currentRoundId} roomCode={roomCode} />}
        {status === 'RESULTS' && <ConductorResultsView roomCode={roomCode} />}
      </div>

    </div>
  );
}