import { useEffect, useState } from 'react';
import { supabase } from '@/config/supabaseClient';
import LobbyView from '@/views/conductor/LobbyView';
import WritingView from '@/views/conductor/WritingView';
import ConductorVotingView from '@/views/conductor/VotingView';
import ConductorResultsView from '@/views/conductor/ResultsView';

// Helper function to generate a cryptographic-style 4-letter alphanumeric room code
const generateRandomCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ23456789'; // Avoided confusing '0', 'O', '1', 'I'
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
      // Listen to real-time updates bound exclusively to this unique room code
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
    <div style={{ minHeight: '100vh', backgroundColor: '#121212', color: '#fff', fontFamily: 'sans-serif' }}>
      {status === 'LOBBY' && <LobbyView roomCode={roomCode} />}
      {status === 'WRITING' && <WritingView roomCode={roomCode} />}
      {status === 'VOTING' && <ConductorVotingView currentRoundId={currentRoundId} roomCode={roomCode} />}
      {status === 'RESULTS' && <ConductorResultsView roomCode={roomCode} />}
    </div>
  );
}