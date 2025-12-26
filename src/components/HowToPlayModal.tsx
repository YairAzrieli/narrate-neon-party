import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skull, Heart, Eye, Users, Moon, Sun } from 'lucide-react';

interface HowToPlayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HowToPlayModal = ({ open, onOpenChange }: HowToPlayModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center glow-text">How to Play</DialogTitle>
          <DialogDescription className="text-center">
            A social deduction game of mystery and deception
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Game Overview */}
          <section>
            <h3 className="font-semibold text-foreground mb-2">🎯 Objective</h3>
            <p className="text-sm text-muted-foreground">
              Werewolves try to eliminate villagers without being discovered. 
              Villagers must find and eliminate the werewolves to survive.
            </p>
          </section>

          {/* Roles */}
          <section>
            <h3 className="font-semibold text-foreground mb-3">👥 Roles</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/30">
                <Skull className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-destructive">Werewolf</p>
                  <p className="text-xs text-muted-foreground">
                    Choose a victim each night. Try to blend in during the day.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg border border-primary/30">
                <Heart className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-primary">Doctor</p>
                  <p className="text-xs text-muted-foreground">
                    Protect one player each night. Can save them from werewolves!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg border border-primary/30">
                <Eye className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-primary">Seer</p>
                  <p className="text-xs text-muted-foreground">
                    Learn another player's true role each night.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-secondary rounded-lg border border-border">
                <Users className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Villager</p>
                  <p className="text-xs text-muted-foreground">
                    No special powers, but your vote counts! Watch and deduce.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Phases */}
          <section>
            <h3 className="font-semibold text-foreground mb-3">🔄 Game Phases</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shrink-0">
                  <Moon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Night Phase</p>
                  <p className="text-xs text-muted-foreground">
                    Everyone closes their eyes. The AI narrator guides each role 
                    to wake up and perform their action secretly.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center shrink-0">
                  <Sun className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Morning Reveal</p>
                  <p className="text-xs text-muted-foreground">
                    Everyone wakes up to discover if anyone was killed... 
                    or if the Doctor made a heroic save!
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Tips */}
          <section className="bg-card/50 rounded-lg p-4 border border-border">
            <h3 className="font-semibold text-foreground mb-2">💡 Tips</h3>
            <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
              <li>Everyone should close their eyes during night phases</li>
              <li>The Host controls the game flow and presses "Next"</li>
              <li>Each theme generates unique role names!</li>
              <li>Seer: Keep your role secret or risk becoming a target</li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
};
