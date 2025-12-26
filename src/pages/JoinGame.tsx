import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameRoom } from '@/hooks/useGameRoom';
import { JoinForm } from '@/components/JoinForm';
import { PlayerGrid } from '@/components/PlayerGrid';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const JoinGame = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { room, players, loading, error, joinRoom, addPlayer, uploadAvatar } = useGameRoom();
  const [joining, setJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (code && !room) {
      joinRoom(code);
    }
  }, [code]);

  // Navigate to game when room status changes to 'playing'
  useEffect(() => {
    if (room?.status === 'playing' && code) {
      navigate(`/game/${code.toUpperCase()}`);
    }
  }, [room?.status, code, navigate]);

  const handleJoin = async (name: string, avatarFile: File | null) => {
    if (!room) return;
    
    setJoining(true);
    try {
      let avatarUrl: string | null = null;
      
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile);
      }

      await addPlayer(room.id, name, avatarUrl);
      setHasJoined(true);
      toast({ title: 'Welcome to the game!', description: 'Waiting for host to start' });
    } catch (err: any) {
      toast({ title: 'Failed to join', description: err.message, variant: 'destructive' });
    } finally {
      setJoining(false);
    }
  };

  // Filter out current player (show only others)
  const otherPlayers = players.filter(p => !p.is_host);

  if (loading) {
    return (
      <div className="h-full bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="h-full bg-background px-4 py-6 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-destructive mb-4">Room Not Found</h1>
        <p className="text-muted-foreground mb-6">This game doesn't exist or has ended.</p>
        <Button onClick={() => navigate('/')}>
          <ArrowLeft className="mr-2 w-4 h-4" />
          Back to Lobby
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full bg-background px-4 py-6 flex flex-col overflow-hidden">
      <header className="flex items-center gap-4 mb-6 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 text-center">
          <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Join Game
          </h1>
          <p className="text-sm text-muted-foreground">Room: {room.room_code}</p>
        </div>
        <div className="w-10" /> {/* Spacer for centering */}
      </header>

      <main className="flex-1 max-w-md mx-auto w-full overflow-y-auto">
        {!hasJoined ? (
          <JoinForm onJoin={handleJoin} loading={joining} />
        ) : (
          <div className="space-y-6">
            <div className="text-center py-6">
              <CheckCircle2 className="w-14 h-14 text-primary mx-auto mb-3" />
              <h2 className="text-2xl font-bold glow-text">You're In!</h2>
              <p className="text-muted-foreground mt-2">Waiting for the host to start the game...</p>
            </div>

            {otherPlayers.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-center">
                  Other Players ({otherPlayers.length})
                </h3>
                <PlayerGrid players={otherPlayers} />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default JoinGame;
