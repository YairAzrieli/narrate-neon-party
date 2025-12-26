import { Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SeerRevealModalProps {
  targetName: string;
  targetRole: string;
  themedRole?: string;
  onClose: () => void;
}

export const SeerRevealModal = ({ targetName, targetRole, themedRole, onClose }: SeerRevealModalProps) => {
  const isEvil = targetRole === 'Werewolf';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-sm animate-in fade-in zoom-in duration-300">
        <div className={`bg-gradient-to-br ${isEvil ? 'from-destructive/20 to-destructive/5 border-destructive/50' : 'from-primary/20 to-primary/5 border-primary/50'} border-2 rounded-3xl p-8 text-center shadow-2xl`}>
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon */}
          <div className={`w-16 h-16 rounded-full ${isEvil ? 'bg-destructive/20' : 'bg-primary/20'} flex items-center justify-center mx-auto mb-4`}>
            <Eye className={`w-8 h-8 ${isEvil ? 'text-destructive' : 'text-primary'}`} />
          </div>

          {/* Title */}
          <p className="text-sm text-muted-foreground uppercase tracking-wider mb-2">
            You discovered that
          </p>

          {/* Player name */}
          <h2 className="text-2xl font-extrabold text-foreground mb-4">
            {targetName}
          </h2>

          {/* Role reveal */}
          <p className="text-sm text-muted-foreground mb-1">is a</p>
          
          <h3 className={`text-3xl font-extrabold mb-2 ${isEvil ? 'text-destructive' : 'text-primary'}`}>
            {themedRole || targetRole}
          </h3>
          
          <p className="text-sm text-muted-foreground">
            ({targetRole})
          </p>

          {/* Warning for evil roles */}
          {isEvil && (
            <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
              <p className="text-xs text-destructive font-medium">
                ⚠️ This player is dangerous!
              </p>
            </div>
          )}

          {/* Close button */}
          <Button 
            onClick={onClose} 
            className="mt-6 w-full"
            variant={isEvil ? 'destructive' : 'default'}
          >
            I understand
          </Button>
        </div>
      </div>
    </div>
  );
};
