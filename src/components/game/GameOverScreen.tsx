import { useNavigate } from 'react-router-dom';
import { Trophy, Skull, RotateCcw, Home, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PlayerResult {
  id: string;
  name: string;
  avatar_url: string | null;
  baseRole: string;
  themedRole: string;
  isAlive: boolean;
  wasKilled: boolean;
  wasSaved: boolean;
}

interface GameOverScreenProps {
  theme: string;
  players: PlayerResult[];
  killedPlayer: PlayerResult | null;
  savedPlayer: PlayerResult | null;
  wasSuccessfullySaved: boolean;
  roomCode: string;
  onPlayAgain: () => void;
}

export const GameOverScreen = ({
  theme,
  players,
  killedPlayer,
  savedPlayer,
  wasSuccessfullySaved,
  roomCode,
  onPlayAgain,
}: GameOverScreenProps) => {
  const navigate = useNavigate();

  // Count werewolves vs villagers
  const werewolves = players.filter(p => p.baseRole === 'Werewolf');
  const villagers = players.filter(p => p.baseRole !== 'Werewolf');

  return (
    <div className="h-full bg-background px-4 py-6 flex flex-col overflow-auto">
      {/* Header */}
      <header className="text-center mb-6 shrink-0">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          <h1 className="text-3xl font-extrabold glow-text">Game Over!</h1>
          <Sparkles className="w-8 h-8 text-primary animate-pulse" />
        </div>
        <p className="text-muted-foreground text-sm">{theme}</p>
      </header>

      {/* Night Result */}
      <div className="bg-card/50 border border-border rounded-2xl p-6 mb-6">
        <h2 className="text-xl font-bold text-foreground mb-4 text-center">
          What Happened Last Night
        </h2>

        {killedPlayer ? (
          <div className="text-center">
            {wasSuccessfullySaved ? (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                  <Trophy className="w-8 h-8 text-primary" />
                </div>
                <p className="text-lg font-semibold text-foreground">
                  <span className="text-primary">{savedPlayer?.name}</span> was saved!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  The werewolves tried to attack {killedPlayer.name}, but the Doctor saved them!
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-3">
                  <Skull className="w-8 h-8 text-destructive" />
                </div>
                <p className="text-lg font-semibold text-foreground">
                  <span className="text-destructive">{killedPlayer.name}</span> was killed!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  They were a <span className="font-medium">{killedPlayer.themedRole}</span> ({killedPlayer.baseRole})
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="text-center">
            <p className="text-lg font-semibold text-muted-foreground">
              A peaceful night... no one was harmed.
            </p>
          </div>
        )}
      </div>

      {/* Role Reveals */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground mb-4 text-center">
          All Roles Revealed
        </h2>

        <div className="space-y-2">
          {/* Werewolves first */}
          {werewolves.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3">
              <p className="text-xs text-destructive uppercase tracking-wider mb-2 font-medium">
                Werewolves
              </p>
              <div className="flex flex-wrap gap-2">
                {werewolves.map(p => (
                  <div 
                    key={p.id}
                    className="flex items-center gap-2 bg-destructive/20 rounded-full px-3 py-1"
                  >
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">
                          {p.name[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Villagers */}
          {villagers.length > 0 && (
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-3">
              <p className="text-xs text-primary uppercase tracking-wider mb-2 font-medium">
                Villagers & Special Roles
              </p>
              <div className="flex flex-wrap gap-2">
                {villagers.map(p => (
                  <div 
                    key={p.id}
                    className="flex items-center gap-2 bg-primary/20 rounded-full px-3 py-1"
                  >
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">
                          {p.name[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-foreground">{p.name}</span>
                    <span className="text-xs text-muted-foreground">({p.baseRole})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-auto space-y-3 shrink-0">
        <Button
          onClick={onPlayAgain}
          className="w-full gap-2 transition-all hover:scale-[1.02]"
          size="lg"
        >
          <RotateCcw className="w-5 h-5" />
          Play Again (Same Players)
        </Button>
        
        <Button
          onClick={() => navigate('/')}
          variant="outline"
          className="w-full gap-2 transition-all hover:scale-[1.02]"
          size="lg"
        >
          <Home className="w-5 h-5" />
          New Game
        </Button>
      </div>
    </div>
  );
};
