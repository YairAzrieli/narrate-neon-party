import { Player } from '@/hooks/useGameRoom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface PlayerGridProps {
  players: Player[];
}

export const PlayerGrid = ({ players }: PlayerGridProps) => {
  if (players.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground text-sm">Waiting for players to join...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
      {players.map((player) => (
        <div
          key={player.id}
          className="flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-300"
        >
          <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-primary glow-border">
            <AvatarImage src={player.avatar_url || undefined} alt={player.name} />
            <AvatarFallback className="bg-secondary text-primary text-lg font-bold">
              {player.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-foreground truncate max-w-full px-1">
            {player.name}
          </span>
        </div>
      ))}
    </div>
  );
};
