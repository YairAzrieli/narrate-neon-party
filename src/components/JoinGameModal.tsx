import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';

interface JoinGameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const JoinGameModal = ({ open, onOpenChange }: JoinGameModalProps) => {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoin = () => {
    if (!roomCode.trim()) return;
    setIsJoining(true);
    navigate(`/join/${roomCode.toUpperCase().trim()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoin();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Join Game</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-center text-muted-foreground">
            Enter the room code shared by the host
          </p>
          
          <Input
            placeholder="e.g. ABC123"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            className="text-center text-2xl tracking-widest font-mono uppercase"
            maxLength={6}
            autoFocus
          />
          
          <Button
            onClick={handleJoin}
            disabled={!roomCode.trim() || isJoining}
            className="w-full gap-2"
            size="lg"
          >
            {isJoining ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                Join Room
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
