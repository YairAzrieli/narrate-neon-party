import { useState, useEffect } from 'react';
import { Sunrise, Skull, Heart, Loader2 } from 'lucide-react';

interface MorningRevealProps {
  killedPlayerName: string | null;
  wasSaved: boolean;
  savedByDoctor: boolean;
  isRevealing: boolean;
}

export const MorningReveal = ({ 
  killedPlayerName, 
  wasSaved, 
  savedByDoctor,
  isRevealing 
}: MorningRevealProps) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!isRevealing) {
      setStep(0);
      return;
    }

    // Dramatic reveal sequence
    const timer1 = setTimeout(() => setStep(1), 500);
    const timer2 = setTimeout(() => setStep(2), 1500);
    const timer3 = setTimeout(() => setStep(3), 2500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [isRevealing]);

  if (!isRevealing) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-sm text-center">
        {/* Step 0: Sun rising */}
        <div className={`transition-all duration-500 ${step >= 0 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
          <Sunrise className="w-20 h-20 text-amber-400 mx-auto mb-6 animate-pulse" />
          <h2 className="text-2xl font-bold text-foreground mb-2">The Sun Rises...</h2>
        </div>

        {/* Step 1: Loading suspense */}
        {step === 1 && (
          <div className="mt-6 animate-in fade-in duration-300">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
            <p className="text-muted-foreground mt-2">Checking the village...</p>
          </div>
        )}

        {/* Step 2: Result */}
        {step >= 2 && (
          <div className="mt-6 animate-in fade-in zoom-in duration-500">
            {!killedPlayerName ? (
              // No one was targeted
              <div className="bg-primary/20 border border-primary/50 rounded-2xl p-6">
                <Heart className="w-12 h-12 text-primary mx-auto mb-3" />
                <h3 className="text-xl font-bold text-foreground">A Peaceful Night!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  No one was harmed. The village sleeps soundly.
                </p>
              </div>
            ) : wasSaved && savedByDoctor ? (
              // Saved by doctor
              <div className="bg-primary/20 border border-primary/50 rounded-2xl p-6">
                <Heart className="w-12 h-12 text-primary mx-auto mb-3" />
                <h3 className="text-xl font-bold text-foreground">
                  {killedPlayerName} was saved!
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  The Doctor's healing powers protected them from the wolves!
                </p>
              </div>
            ) : (
              // Someone died
              <div className="bg-destructive/20 border border-destructive/50 rounded-2xl p-6">
                <Skull className="w-12 h-12 text-destructive mx-auto mb-3" />
                <h3 className="text-xl font-bold text-foreground">
                  {killedPlayerName} was killed!
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  The werewolves claimed a victim in the night...
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Continue hint */}
        {step >= 3 && (
          <p className="text-xs text-muted-foreground mt-6 animate-in fade-in duration-300">
            The host will continue when ready...
          </p>
        )}
      </div>
    </div>
  );
};
