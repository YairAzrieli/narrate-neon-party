import { QRCodeSVG } from 'qrcode.react';
import { getJoinUrl } from '@/lib/gameUtils';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

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
    </div>
  );
};
