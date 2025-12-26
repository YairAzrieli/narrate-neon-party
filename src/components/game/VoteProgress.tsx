import { Check, Users } from 'lucide-react';

interface VoteProgressProps {
  currentVotes: number;
  requiredVotes: number;
  allVotesIn: boolean;
}

export const VoteProgress = ({ currentVotes, requiredVotes, allVotesIn }: VoteProgressProps) => {
  if (requiredVotes === 0) return null;

  const progressPercent = Math.min((currentVotes / requiredVotes) * 100, 100);

  return (
    <div className="bg-card/30 border border-border rounded-xl p-4 w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Votes</span>
        </div>
        <span className="text-sm font-semibold text-foreground">
          {currentVotes} / {requiredVotes}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${
            allVotesIn ? 'bg-primary' : 'bg-primary/60'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Status message */}
      <p className={`text-xs mt-2 ${allVotesIn ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
        {allVotesIn ? (
          <span className="flex items-center gap-1">
            <Check className="w-3 h-3" />
            All votes received!
          </span>
        ) : (
          'Waiting for players to vote...'
        )}
      </p>
    </div>
  );
};
