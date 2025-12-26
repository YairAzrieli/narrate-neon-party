import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Play, Users, HelpCircle, Moon, Skull, Heart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HowToPlayModal } from '@/components/HowToPlayModal';
import { JoinGameModal } from '@/components/JoinGameModal';

const Index = () => {
  const navigate = useNavigate();
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showJoinGame, setShowJoinGame] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-full bg-background flex flex-col items-center justify-center px-6 py-12 overflow-auto">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-2 h-2 bg-primary/30 rounded-full animate-pulse" />
        <div className="absolute top-40 right-16 w-3 h-3 bg-primary/20 rounded-full animate-pulse delay-300" />
        <div className="absolute bottom-32 left-20 w-2 h-2 bg-primary/25 rounded-full animate-pulse delay-500" />
        <div className="absolute bottom-48 right-24 w-1.5 h-1.5 bg-primary/30 rounded-full animate-pulse delay-700" />
      </div>

      {/* Main Content */}
      <div 
        className={`relative z-10 text-center max-w-md w-full transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Logo & Title */}
        <div className="mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-10 h-10 text-primary animate-pulse" />
            <h1 className="text-5xl font-extrabold glow-text tracking-tight">
              Narrator AI
            </h1>
            <Sparkles className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground text-lg">
            The AI-Powered Party Game
          </p>
        </div>

        {/* Feature Icons */}
        <div className="flex justify-center gap-6 mb-10">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center">
              <Moon className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">Night Phase</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center">
              <Skull className="w-6 h-6 text-destructive" />
            </div>
            <span className="text-xs text-muted-foreground">Werewolves</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center">
              <Heart className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">Doctor</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-full bg-card border border-border flex items-center justify-center">
              <Eye className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">Seer</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button
            onClick={() => navigate('/lobby')}
            size="lg"
            className="w-full text-lg py-7 gap-3 glow-border transition-all hover:scale-[1.02]"
          >
            <Play className="w-6 h-6" />
            Host Game
          </Button>

          <Button
            onClick={() => setShowJoinGame(true)}
            variant="secondary"
            size="lg"
            className="w-full text-lg py-7 gap-3 transition-all hover:scale-[1.02]"
          >
            <Users className="w-6 h-6" />
            Join Game
          </Button>

          <Button
            onClick={() => setShowHowToPlay(true)}
            variant="ghost"
            className="w-full gap-2 text-muted-foreground hover:text-foreground"
          >
            <HelpCircle className="w-5 h-5" />
            How to Play
          </Button>
        </div>

        {/* Footer Note */}
        <p className="mt-10 text-xs text-muted-foreground/60">
          Best played with 4-10 friends
        </p>
      </div>

      <HowToPlayModal open={showHowToPlay} onOpenChange={setShowHowToPlay} />
      <JoinGameModal open={showJoinGame} onOpenChange={setShowJoinGame} />
    </div>
  );
};

export default Index;
