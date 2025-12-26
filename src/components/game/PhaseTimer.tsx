import { useEffect, useState, useCallback } from 'react';
import { Timer, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PhaseTimerProps {
  isActionPhase: boolean;
  allVotesIn: boolean;
  onTimerExpired: () => void;
  onSkipPhase: () => void;
  disabled?: boolean;
}

const PHASE_DURATION = 60; // 60 seconds per action phase

export const PhaseTimer = ({ 
  isActionPhase, 
  allVotesIn, 
  onTimerExpired, 
  onSkipPhase,
  disabled 
}: PhaseTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(PHASE_DURATION);
  const [timerExpired, setTimerExpired] = useState(false);

  // Reset timer when entering a new action phase
  useEffect(() => {
    if (isActionPhase) {
      setTimeLeft(PHASE_DURATION);
      setTimerExpired(false);
    }
  }, [isActionPhase]);

  // Countdown logic
  useEffect(() => {
    if (!isActionPhase || allVotesIn || timerExpired) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setTimerExpired(true);
          onTimerExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActionPhase, allVotesIn, timerExpired, onTimerExpired]);

  if (!isActionPhase) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = (timeLeft / PHASE_DURATION) * 100;

  return (
    <div className="w-full space-y-3">
      {/* Timer display */}
      <div className="flex items-center justify-center gap-2">
        <Timer className={`w-5 h-5 ${timerExpired ? 'text-destructive' : 'text-primary'}`} />
        <span className={`text-2xl font-mono font-bold ${timerExpired ? 'text-destructive' : 'text-foreground'}`}>
          {formatTime(timeLeft)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ease-linear ${
            timerExpired ? 'bg-destructive' : progressPercent < 30 ? 'bg-amber-500' : 'bg-primary'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Skip button (only available after timer expires or if votes are in) */}
      {(timerExpired || allVotesIn) && (
        <Button
          onClick={onSkipPhase}
          variant="outline"
          size="sm"
          className="gap-2 w-full"
          disabled={disabled}
        >
          <SkipForward className="w-4 h-4" />
          {allVotesIn ? 'Continue' : 'Skip Phase'}
        </Button>
      )}
    </div>
  );
};
