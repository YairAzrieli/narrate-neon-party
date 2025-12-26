import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGameRoom } from '@/hooks/useGameRoom';
import { RoomDisplay } from '@/components/RoomDisplay';
import { PlayerGrid } from '@/components/PlayerGrid';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Lobby = () => {
  const [gameCode, setGameCode] = useState('');
  const [theme, setTheme] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const { room, players, loading, error, createRoom, joinRoom } = useGameRoom();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Navigate to game when room status changes to 'playing'
  useEffect(() => {
    if (room?.status === 'playing') {
      navigate(`/game/${room.room_code}`);
    }
  }, [room?.status, room?.room_code, navigate]);

  const handleCreateGame = async () => {
    const newRoom = await createRoom();
    if (newRoom) {
      toast({ title: 'Game created!', description: 'Share the code with friends' });
    }
  };

  const handleJoinGame = async () => {
    if (!gameCode.trim()) {
      toast({ title: 'Please enter a game code', variant: 'destructive' });
      return;
    }

    const foundRoom = await joinRoom(gameCode);
    if (foundRoom) {
      navigate(`/join/${foundRoom.room_code}`);
    } else {
      toast({ title: 'Room not found', variant: 'destructive' });
    }
  };

  // Filter out host from displayed players
  const activePlayers = players.filter(p => !p.is_host);

  const handleStartGame = async () => {
    if (!room || !theme.trim()) {
      toast({ title: 'Please enter a theme for the game', variant: 'destructive' });
      return;
    }

    if (activePlayers.length < 1) {
      toast({ title: 'Need at least 1 player to start', variant: 'destructive' });
      return;
    }

    setIsStarting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-game-script', {
        body: { room_id: room.id, theme: theme.trim() }
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Game Started!', description: 'The night phase begins...' });
      // Navigation to game screen would go here
      console.log('Game session created:', data);
    } catch (err: any) {
      console.error('Start game error:', err);
      toast({ title: 'Failed to start game', description: err.message, variant: 'destructive' });
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="h-full bg-background px-4 py-6 flex flex-col overflow-hidden">
      <header className="text-center mb-6 shrink-0">
        <h1 className="text-3xl font-extrabold glow-text flex items-center justify-center gap-2">
          <Sparkles className="w-7 h-7 text-primary" />
          Narrator AI
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">The AI-powered party game</p>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full overflow-y-auto">
        {!room ? (
          <div className="space-y-6">
            <div className="space-y-3">
              <Input
                placeholder="Enter Game Code"
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                className="text-center text-2xl tracking-widest h-14 uppercase"
                maxLength={4}
              />
              <Button
                onClick={handleJoinGame}
                className="w-full text-lg py-6"
                disabled={loading || !gameCode.trim()}
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Join Game'}
              </Button>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-muted-foreground text-sm">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Button
              onClick={handleCreateGame}
              variant="secondary"
              className="w-full text-lg py-6"
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Create Game'}
            </Button>

            {error && (
              <p className="text-destructive text-center text-sm">{error}</p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <RoomDisplay roomCode={room.room_code} />
            
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-center">
                Players ({activePlayers.length})
              </h2>
              <PlayerGrid players={activePlayers} />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground block text-center">
                Game Theme
              </label>
              <Input
                placeholder="e.g., Harry Potter, Israeli Army, Pirates..."
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="text-center"
              />
            </div>

            <Button 
              className="w-full text-lg py-6" 
              disabled={activePlayers.length < 1 || !theme.trim() || isStarting}
              onClick={handleStartGame}
            >
              {isStarting ? <Loader2 className="animate-spin mr-2" /> : null}
              {isStarting ? 'Generating Script...' : 'Start Game'}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Lobby;
