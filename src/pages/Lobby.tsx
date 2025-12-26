import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGameRoom } from '@/hooks/useGameRoom';
import { RoomDisplay } from '@/components/RoomDisplay';
import { PlayerGrid } from '@/components/PlayerGrid';
import { JoinForm } from '@/components/JoinForm';
import { Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Lobby = () => {
  const [gameCode, setGameCode] = useState('');
  const [pendingRoom, setPendingRoom] = useState<{ id: string; room_code: string } | null>(null);
  const [isSettingUpHost, setIsSettingUpHost] = useState(false);
  const { room, players, loading, error, createRoom, joinRoom, addPlayer, uploadAvatar } = useGameRoom();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCreateGame = async () => {
    const newRoom = await createRoom();
    if (newRoom) {
      setPendingRoom(newRoom);
      setIsSettingUpHost(true);
    }
  };

  const handleHostSetup = async (name: string, avatarFile: File | null) => {
    if (!pendingRoom) return;
    
    try {
      let avatarUrl: string | null = null;
      
      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile);
      }

      await addPlayer(pendingRoom.id, name, avatarUrl, true);
      await joinRoom(pendingRoom.room_code);
      setIsSettingUpHost(false);
      setPendingRoom(null);
      toast({ title: 'Game created!', description: 'Share the code with friends' });
    } catch (err: any) {
      toast({ title: 'Failed to create game', description: err.message, variant: 'destructive' });
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
        {isSettingUpHost ? (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Set Up Your Profile</h2>
              <p className="text-muted-foreground text-sm mt-1">You'll be the host of this game</p>
            </div>
            <JoinForm onJoin={handleHostSetup} loading={loading} />
          </div>
        ) : !room ? (
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
          <div className="space-y-8">
            <RoomDisplay roomCode={room.room_code} />
            
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-center">
                Players ({players.length})
              </h2>
              <PlayerGrid players={players} />
            </div>

            <Button className="w-full text-lg py-6" disabled={players.length < 2}>
              Start Game
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Lobby;
