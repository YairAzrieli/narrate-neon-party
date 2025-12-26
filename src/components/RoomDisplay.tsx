import { QRCodeSVG } from 'qrcode.react';
import { getJoinUrl } from '@/lib/gameUtils';
import { Copy, Check, Share2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface RoomDisplayProps {
  roomCode: string;
}

export const RoomDisplay = ({ roomCode }: RoomDisplayProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const joinUrl = getJoinUrl(roomCode);

  const copyCode = async () => {
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    toast({ title: 'Room code copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Narrator AI game!',
          text: `Join my game with code: ${roomCode}`,
          url: joinUrl,
        });
      } catch (err) {
        // User cancelled or share failed, fallback to copy
        if ((err as Error).name !== 'AbortError') {
          copyCode();
        }
      }
    } else {
      // Fallback for browsers without Web Share API
      await navigator.clipboard.writeText(joinUrl);
      toast({ title: 'Link copied to clipboard!' });
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="p-4 bg-foreground rounded-2xl glow-box">
        <QRCodeSVG
          value={joinUrl}
          size={180}
          bgColor="#f0fff0"
          fgColor="#2D0A31"
          level="H"
          includeMargin
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Room Code</p>
          <p className="text-3xl font-bold tracking-widest glow-text">{roomCode}</p>
        </div>
        <button
          onClick={copyCode}
          className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
        >
          {copied ? (
            <Check className="w-5 h-5 text-primary" />
          ) : (
            <Copy className="w-5 h-5 text-muted-foreground" />
          )}
        </button>
      </div>

      <Button
        onClick={handleShare}
        variant="secondary"
        className="w-full gap-2"
      >
        <Share2 className="w-4 h-4" />
        Share Invite Link
      </Button>
    </div>
  );
};
