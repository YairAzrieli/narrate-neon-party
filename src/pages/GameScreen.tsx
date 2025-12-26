import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Moon } from 'lucide-react';

interface GameSession {
  id: string;
  theme: string;
  script: string | null;
  phase: string;
}

const GameScreen = () => {
  const { code } = useParams<{ code: string }>();
  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;

    const fetchSession = async () => {
      // First get room ID from code
      const { data: room } = await supabase
        .from('game_rooms')
        .select('id')
        .eq('room_code', code.toUpperCase())
        .single();

      if (!room) {
        setLoading(false);
        return;
      }

      // Then get the latest game session
      const { data: sessionData } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('room_id', room.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (sessionData) {
        setSession(sessionData);
      }
      setLoading(false);
    };

    fetchSession();
  }, [code]);

  if (loading) {
    return (
      <div className="h-full bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-full bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Game session not found</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-background px-4 py-6 flex flex-col overflow-hidden">
      <header className="text-center mb-8 shrink-0">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Moon className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-extrabold glow-text">Night Phase</h1>
        </div>
        <p className="text-muted-foreground text-sm">{session.theme}</p>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full">
        <div className="bg-card/50 border border-border rounded-2xl p-6 text-center">
          <p className="text-lg leading-relaxed text-foreground">
            {session.script || 'The night has begun...'}
          </p>
        </div>
      </main>
    </div>
  );
};

export default GameScreen;
