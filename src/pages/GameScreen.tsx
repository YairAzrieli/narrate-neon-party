import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Moon, Volume2, VolumeX, Sparkles, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { triggerVibration } from '@/lib/haptics';

interface GameSession {
  id: string;
  theme: string;
  script: string | null;
  phase: string;
}

interface PlayerRole {
  base_role: string;
  themed_role: string;
}

// Map phases to roles that should be alerted
const PHASE_ROLE_MAP: Record<string, string[]> = {
  'wolves': ['Werewolf'],
  'werewolves': ['Werewolf'],
  'doctor': ['Doctor'],
  'seer': ['Seer'],
};

const GameScreen = () => {
  const { code } = useParams<{ code: string }>();
  const [session, setSession] = useState<GameSession | null>(null);
  const [playerRole, setPlayerRole] = useState<PlayerRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [roleRevealed, setRoleRevealed] = useState(false);
  
  // TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasSpoken, setHasSpoken] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const lastPhaseRef = useRef<string | null>(null);

  // Determine if current user is host
  useEffect(() => {
    const hostFlag = localStorage.getItem('is_host');
    setIsHost(hostFlag === 'true');
  }, []);

  // Fetch session and player role
  useEffect(() => {
    if (!code) return;

    const fetchData = async () => {
      const { data: room } = await supabase
        .from('game_rooms')
        .select('id')
        .eq('room_code', code.toUpperCase())
        .maybeSingle();

      if (!room) {
        setLoading(false);
        return;
      }

      const { data: sessionData } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('room_id', room.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionData) {
        setSession(sessionData);

        const playerId = localStorage.getItem('player_id');
        if (playerId) {
          const { data: roleData } = await supabase
            .from('player_roles')
            .select('base_role, themed_role')
            .eq('session_id', sessionData.id)
            .eq('player_id', playerId)
            .maybeSingle();

          if (roleData) {
            setPlayerRole(roleData);
          }
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [code]);

  // Check if it's the player's turn and vibrate
  const checkAndVibrate = useCallback((phase: string) => {
    if (!playerRole) return;
    
    const activeRoles = PHASE_ROLE_MAP[phase.toLowerCase()];
    if (activeRoles && activeRoles.includes(playerRole.base_role)) {
      console.log('Your turn! Vibrating...');
      triggerVibration([200, 100, 200]);
    }
  }, [playerRole]);

  // Realtime subscription for phase changes
  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel('game-session-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          console.log('Session updated:', payload);
          const newSession = payload.new as GameSession;
          setSession((prev) => prev ? { ...prev, ...newSession } : null);
          
          // Check for phase change and vibrate if it's player's turn
          if (newSession.phase !== lastPhaseRef.current) {
            lastPhaseRef.current = newSession.phase;
            checkAndVibrate(newSession.phase);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id, checkAndVibrate]);

  // TTS function
  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported');
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 0.8;
    utterance.volume = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setHasSpoken(true);
    };
    utterance.onerror = (e) => {
      console.error('Speech error:', e);
      setIsSpeaking(false);
    };

    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const handlePlayAudio = () => {
    if (session?.script) {
      speak(session.script);
    }
  };

  const handleRevealRole = () => {
    setRoleRevealed(true);
    triggerVibration([100]);
  };

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

  // HOST VIEW
  if (isHost) {
    return (
      <div className="h-full bg-background px-4 py-6 flex flex-col overflow-hidden">
        <header className="text-center mb-8 shrink-0">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Moon className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-extrabold glow-text">Night Phase</h1>
          </div>
          <p className="text-muted-foreground text-sm">{session.theme}</p>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full gap-6">
          <div className="flex gap-3">
            {!isSpeaking ? (
              <Button
                onClick={handlePlayAudio}
                size="lg"
                className="gap-2"
              >
                <Volume2 className="w-5 h-5" />
                {hasSpoken ? 'Play Again' : 'Play Narration'}
              </Button>
            ) : (
              <Button
                onClick={stopSpeaking}
                variant="secondary"
                size="lg"
                className="gap-2"
              >
                <VolumeX className="w-5 h-5" />
                Stop
              </Button>
            )}
          </div>

          {isSpeaking && (
            <div className="flex items-center gap-2 text-primary animate-pulse">
              <div className="flex gap-1">
                <span className="w-1 h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-6 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="w-1 h-6 bg-primary rounded-full animate-bounce" style={{ animationDelay: '450ms' }} />
                <span className="w-1 h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '600ms' }} />
              </div>
              <span className="text-sm font-medium">Speaking...</span>
            </div>
          )}

          <div className="bg-card/50 border border-border rounded-2xl p-6 text-center">
            <p className="text-lg leading-relaxed text-foreground">
              {session.script || 'The night has begun...'}
            </p>
          </div>
        </main>
      </div>
    );
  }

  // PLAYER VIEW
  return (
    <div className="h-full bg-background px-4 py-6 flex flex-col overflow-hidden">
      <header className="text-center mb-8 shrink-0">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Moon className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-extrabold glow-text">Night Phase</h1>
        </div>
        <p className="text-muted-foreground text-sm">{session.theme}</p>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
        {playerRole ? (
          <div className="w-full">
            {!roleRevealed ? (
              // Tap to reveal
              <button
                onClick={handleRevealRole}
                className="w-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30 rounded-3xl p-8 text-center shadow-lg shadow-primary/10 transition-transform active:scale-95"
              >
                <EyeOff className="w-12 h-12 text-primary mx-auto mb-4" />
                <p className="text-xl font-bold text-foreground mb-2">Your Role is Hidden</p>
                <p className="text-muted-foreground text-sm">Tap to reveal your secret role</p>
              </button>
            ) : (
              // Role Card
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30 rounded-3xl p-8 text-center shadow-lg shadow-primary/10">
                <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
                
                <p className="text-muted-foreground text-sm uppercase tracking-wider mb-2">
                  Your Secret Role
                </p>
                
                <h2 className="text-3xl font-extrabold text-foreground mb-2">
                  {playerRole.themed_role}
                </h2>
                
                <p className="text-muted-foreground text-sm">
                  ({playerRole.base_role})
                </p>

                <div className="mt-6 pt-6 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">
                    Keep this secret! Close your eyes and listen to the narrator.
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 gap-2"
                  onClick={() => setRoleRevealed(false)}
                >
                  <Eye className="w-4 h-4" />
                  Hide Role
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your role...</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default GameScreen;
