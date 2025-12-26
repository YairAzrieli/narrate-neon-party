import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Moon, Volume2, VolumeX, Sparkles, Eye, EyeOff, ChevronRight, Check, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { triggerVibration } from '@/lib/haptics';
import { useToast } from '@/hooks/use-toast';
import { PhaseTimer } from '@/components/game/PhaseTimer';
import { VoteProgress } from '@/components/game/VoteProgress';
import { SeerRevealModal } from '@/components/game/SeerRevealModal';
import { MorningReveal } from '@/components/game/MorningReveal';
import { GameOverScreen } from '@/components/game/GameOverScreen';
import { useMorningResults } from '@/hooks/useMorningResults';

interface TimelineItem {
  phase: string;
  text: string;
  voice: string;
  action: string;
}

interface GameSession {
  id: string;
  room_id: string;
  theme: string;
  script: string | null;
  phase: string;
  timeline: TimelineItem[] | null;
  timeline_index: number;
}

interface PlayerRole {
  base_role: string;
  themed_role: string;
}

interface Player {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface PlayerWithRole extends Player {
  baseRole: string;
  themedRole: string;
  isAlive: boolean;
  wasKilled: boolean;
  wasSaved: boolean;
}

// Map phases to roles that should be active
const PHASE_ROLE_MAP: Record<string, string[]> = {
  'werewolf': ['Werewolf'],
  'wolves': ['Werewolf'],
  'werewolves': ['Werewolf'],
  'doctor': ['Doctor'],
  'seer': ['Seer'],
};

const GameScreen = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { calculateResults } = useMorningResults();
  
  const [session, setSession] = useState<GameSession | null>(null);
  const [playerRole, setPlayerRole] = useState<PlayerRole | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerRoles, setPlayerRoles] = useState<Record<string, { base: string; themed: string }>>({}); 
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [roleRevealed, setRoleRevealed] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);

  // TTS state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Voting state
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  
  // Vote tracking for host blocking
  const [currentPhaseVoteCount, setCurrentPhaseVoteCount] = useState(0);
  const [requiredVoteCount, setRequiredVoteCount] = useState(0);
  
  // Seer reveal
  const [seerRevealTarget, setSeerRevealTarget] = useState<{ name: string; baseRole: string; themedRole: string } | null>(null);
  
  // Morning reveal state
  const [isShowingMorningReveal, setIsShowingMorningReveal] = useState(false);
  const [morningResult, setMorningResult] = useState<{
    killedPlayerName: string | null;
    wasSaved: boolean;
    savedByDoctor: boolean;
  } | null>(null);
  
  // Game Over state
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverData, setGameOverData] = useState<{
    killedPlayer: PlayerWithRole | null;
    savedPlayer: PlayerWithRole | null;
    wasSuccessfullySaved: boolean;
  } | null>(null);

  const playerId = localStorage.getItem('player_id');

  // Determine if current user is host - verify from database
  useEffect(() => {
    if (!code) return;
    
    const verifyHost = async () => {
      const hostHint = localStorage.getItem('is_host') === 'true';
      
      if (hostHint) {
        const { data: room } = await supabase
          .from('game_rooms')
          .select('id')
          .eq('room_code', code.toUpperCase())
          .maybeSingle();
        
        if (room) {
          const { data: hostPlayer } = await supabase
            .from('players')
            .select('id')
            .eq('room_id', room.id)
            .eq('is_host', true)
            .maybeSingle();
          
          setIsHost(!!hostPlayer && hostHint);
        } else {
          setIsHost(false);
        }
      } else {
        setIsHost(false);
      }
    };
    
    verifyHost();
  }, [code]);

  // Fetch session, player role, and players
  useEffect(() => {
    if (!code) return;

    const fetchData = async () => {
      const { data: room } = await supabase
        .from('game_rooms')
        .select('id')
        .eq('room_code', code.toUpperCase())
        .maybeSingle();

      if (!room) {
        setLoading(false);
        return;
      }

      setRoomId(room.id);

      // Fetch players
      const { data: playersData } = await supabase
        .from('players')
        .select('id, name, avatar_url')
        .eq('room_id', room.id)
        .eq('is_host', false);

      if (playersData) {
        setPlayers(playersData);
      }

      const { data: sessionData } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('room_id', room.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionData) {
        const timeline = typeof sessionData.timeline === 'string' 
          ? JSON.parse(sessionData.timeline) 
          : sessionData.timeline;
        setSession({ ...sessionData, timeline } as GameSession);

        // Fetch ALL player roles for this session (needed for vote counting and seer)
        const { data: allRolesData } = await supabase
          .from('player_roles')
          .select('player_id, base_role, themed_role')
          .eq('session_id', sessionData.id);

        if (allRolesData) {
          const rolesMap: Record<string, { base: string; themed: string }> = {};
          for (const r of allRolesData) {
            rolesMap[r.player_id] = { base: r.base_role, themed: r.themed_role };
          }
          setPlayerRoles(rolesMap);
        }

        if (playerId) {
          const { data: roleData } = await supabase
            .from('player_roles')
            .select('base_role, themed_role')
            .eq('session_id', sessionData.id)
            .eq('player_id', playerId)
            .maybeSingle();

          if (roleData) {
            setPlayerRole(roleData);
          }
        }
        
        // Check if we're past the last item (game over)
        if (timeline && sessionData.timeline_index >= timeline.length) {
          setIsGameOver(true);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [code, playerId]);

  // Get current timeline item
  const currentTimelineItem = session?.timeline?.[session.timeline_index] ?? null;
  const isLastItem = session?.timeline && session.timeline_index >= session.timeline.length - 1;

  // Calculate required vote count for current phase
  useEffect(() => {
    if (!currentTimelineItem || !playerRoles) {
      setRequiredVoteCount(0);
      return;
    }

    const phase = currentTimelineItem.phase.toLowerCase();
    const activeRoles = PHASE_ROLE_MAP[phase];
    
    if (!activeRoles || currentTimelineItem.action === 'none' || currentTimelineItem.action === 'reveal') {
      setRequiredVoteCount(0);
      return;
    }

    // Count players with active roles
    const count = Object.values(playerRoles).filter(r => activeRoles.includes(r.base)).length;
    setRequiredVoteCount(count);
  }, [currentTimelineItem, playerRoles]);

  // Subscribe to votes table for real-time vote counting (HOST BLOCKING LOGIC)
  useEffect(() => {
    if (!session?.id || !roomId || !currentTimelineItem) return;

    const currentPhase = currentTimelineItem.phase;
    
    // Initial fetch of votes for current phase
    const fetchVotes = async () => {
      const { data: votes, error } = await supabase
        .from('votes')
        .select('id')
        .eq('session_id', session.id)
        .eq('phase', currentPhase);

      if (!error && votes) {
        setCurrentPhaseVoteCount(votes.length);
      }
    };

    fetchVotes();

    // Subscribe to new votes
    const channel = supabase
      .channel(`votes-${session.id}-${currentPhase}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
          filter: `session_id=eq.${session.id}`,
        },
        (payload) => {
          console.log('New vote:', payload);
          if ((payload.new as any).phase === currentPhase) {
            setCurrentPhaseVoteCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id, roomId, currentTimelineItem?.phase]);

  // Check for existing vote when phase changes (prevent duplicate voting)
  useEffect(() => {
    const checkExistingVote = async () => {
      if (!session?.id || !playerId || !currentTimelineItem) return;
      
      const { data: existingVote } = await supabase
        .from('votes')
        .select('id')
        .eq('session_id', session.id)
        .eq('phase', currentTimelineItem.phase)
        .eq('voter_player_id', playerId)
        .maybeSingle();
      
      setHasVoted(!!existingVote);
    };
    
    setCurrentPhaseVoteCount(0);
    setSelectedTarget(null);
    checkExistingVote();
  }, [session?.timeline_index, session?.id, playerId, currentTimelineItem?.phase]);

  // Realtime subscription for session updates
  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel(`game-session-${session.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          console.log('Session updated:', payload);
          const newData = payload.new as any;
          const timeline = typeof newData.timeline === 'string'
            ? JSON.parse(newData.timeline)
            : newData.timeline;
          
          setSession((prev) => {
            if (!prev) return null;
            const updated = { ...prev, ...newData, timeline };
            
            if (updated.timeline_index !== prev.timeline_index) {
              const currentItem = updated.timeline?.[updated.timeline_index];
              if (currentItem) {
                checkAndVibrate(currentItem.phase);
              }
              
              // Check for game over
              if (updated.timeline && updated.timeline_index >= updated.timeline.length) {
                setIsGameOver(true);
              }
            }
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  // Check if it's the player's turn and vibrate
  const checkAndVibrate = useCallback((phase: string) => {
    if (!playerRole) return;

    const activeRoles = PHASE_ROLE_MAP[phase.toLowerCase()];
    if (activeRoles && activeRoles.includes(playerRole.base_role)) {
      console.log('Your turn! Vibrating...');
      triggerVibration([200, 100, 200]);
    }
  }, [playerRole]);

  // Check if player is active for current phase
  const isPlayerActive = useCallback(() => {
    if (!playerRole || !currentTimelineItem) return false;
    const activeRoles = PHASE_ROLE_MAP[currentTimelineItem.phase.toLowerCase()];
    return activeRoles?.includes(playerRole.base_role) ?? false;
  }, [playerRole, currentTimelineItem]);

  // Determine if Next button should be enabled
  const isActionPhase = currentTimelineItem?.action && 
    ['vote_kill', 'vote_save', 'reveal_role'].includes(currentTimelineItem.action);
  const allVotesIn = requiredVoteCount > 0 && currentPhaseVoteCount >= requiredVoteCount;
  const canAdvance = !isActionPhase || allVotesIn;

  // Play TTS audio via edge function
  const playAudio = useCallback(async (text: string, voice: string) => {
    if (isGeneratingAudio || isSpeaking || !roomId) return;

    setIsGeneratingAudio(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, voice, room_id: roomId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'TTS generation failed');
      }

      const data = await response.json();
      const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
      
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onplay = () => setIsSpeaking(true);
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
      
      await audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      toast({ 
        title: 'Audio Error', 
        description: error instanceof Error ? error.message : 'Failed to play narration', 
        variant: 'destructive' 
      });
    } finally {
      setIsGeneratingAudio(false);
    }
  }, [isGeneratingAudio, isSpeaking, roomId, toast]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  // Handle morning reveal calculation
  const handleMorningPhase = useCallback(async () => {
    if (!session?.id || !roomId) return;
    
    setIsShowingMorningReveal(true);
    
    const result = await calculateResults(session.id, roomId, players);
    
    setMorningResult({
      killedPlayerName: result.killedPlayerName,
      wasSaved: result.wasSaved,
      savedByDoctor: result.savedPlayerId !== null,
    });
    
    // Prepare game over data
    const killedPlayer = players.find(p => p.id === result.killedPlayerId);
    const savedPlayer = players.find(p => p.id === result.savedPlayerId);
    
    setGameOverData({
      killedPlayer: killedPlayer ? {
        ...killedPlayer,
        baseRole: playerRoles[killedPlayer.id]?.base || 'Unknown',
        themedRole: playerRoles[killedPlayer.id]?.themed || 'Unknown',
        isAlive: result.wasSaved || !result.killedPlayerId,
        wasKilled: !result.wasSaved,
        wasSaved: result.wasSaved,
      } : null,
      savedPlayer: savedPlayer ? {
        ...savedPlayer,
        baseRole: playerRoles[savedPlayer.id]?.base || 'Unknown',
        themedRole: playerRoles[savedPlayer.id]?.themed || 'Unknown',
        isAlive: true,
        wasKilled: false,
        wasSaved: true,
      } : null,
      wasSuccessfullySaved: result.wasSaved,
    });
    
    // Hide reveal after 4 seconds
    setTimeout(() => {
      setIsShowingMorningReveal(false);
    }, 4000);
  }, [session?.id, roomId, players, playerRoles, calculateResults]);

  // Host advances timeline - with blocking logic
  const advanceTimeline = useCallback(async (skipPhase = false) => {
    if (!session || isAdvancing || !roomId) return;
    if (!skipPhase && !canAdvance) return;

    setIsAdvancing(true);
    try {
      const { data: hostPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('room_id', roomId)
        .eq('is_host', true)
        .maybeSingle();
      
      if (!hostPlayer) {
        throw new Error('Only the host can advance the timeline');
      }

      // Check if moving to morning phase - trigger reveal
      const nextIndex = session.timeline_index + 1;
      const nextItem = session.timeline?.[nextIndex];
      
      if (nextItem?.phase === 'morning') {
        await handleMorningPhase();
      }

      // Check if this is the last item
      if (isLastItem) {
        setIsGameOver(true);
        return;
      }

      const newItem = session.timeline?.[nextIndex];

      const { error } = await supabase
        .from('game_sessions')
        .update({
          timeline_index: nextIndex,
          phase: newItem?.phase ?? session.phase,
          script: newItem?.text ?? session.script,
        })
        .eq('id', session.id);

      if (error) throw error;
    } catch (err: any) {
      console.error('Failed to advance timeline:', err);
      toast({ title: 'Failed to advance', description: err.message, variant: 'destructive' });
    } finally {
      setIsAdvancing(false);
    }
  }, [session, isLastItem, isAdvancing, roomId, canAdvance, toast, handleMorningPhase]);

  // Handle timer expiry
  const handleTimerExpired = useCallback(() => {
    toast({ 
      title: 'Time\'s up!', 
      description: 'You can now skip this phase if needed.',
    });
  }, [toast]);

  // Submit vote
  const submitVote = useCallback(async () => {
    if (!session || !roomId || !playerId || !selectedTarget || hasVoted) return;

    try {
      const { data: voter } = await supabase
        .from('players')
        .select('id')
        .eq('id', playerId)
        .eq('room_id', roomId)
        .maybeSingle();
      
      if (!voter) {
        throw new Error('You are not a valid player in this game');
      }

      const { data: target } = await supabase
        .from('players')
        .select('id')
        .eq('id', selectedTarget)
        .eq('room_id', roomId)
        .maybeSingle();
      
      if (!target) {
        throw new Error('Invalid target player');
      }

      const { error } = await supabase
        .from('votes')
        .insert({
          room_id: roomId,
          session_id: session.id,
          phase: currentTimelineItem?.phase ?? session.phase,
          voter_player_id: playerId,
          target_player_id: selectedTarget,
        });

      if (error) {
        // Check for duplicate vote error
        if (error.code === '23505') {
          toast({ title: 'Already voted', description: 'You have already voted this phase', variant: 'destructive' });
          setHasVoted(true);
          return;
        }
        throw error;
      }

      setHasVoted(true);
      triggerVibration([100]);
      
      // Seer reveal - show the target's role
      if (currentTimelineItem?.action === 'reveal_role' && playerRole?.base_role === 'Seer') {
        const targetPlayer = players.find(p => p.id === selectedTarget);
        const targetRoleInfo = playerRoles[selectedTarget];
        if (targetPlayer && targetRoleInfo) {
          setSeerRevealTarget({
            name: targetPlayer.name,
            baseRole: targetRoleInfo.base,
            themedRole: targetRoleInfo.themed,
          });
        }
      } else {
        toast({ title: 'Vote submitted!', description: 'Your choice has been recorded.' });
      }
    } catch (err: any) {
      console.error('Vote error:', err);
      toast({ title: 'Failed to vote', description: err.message, variant: 'destructive' });
    }
  }, [session, roomId, playerId, selectedTarget, hasVoted, currentTimelineItem, playerRole, players, playerRoles, toast]);

  const handleRevealRole = () => {
    setRoleRevealed(true);
    triggerVibration([100]);
  };
  
  const handlePlayAgain = useCallback(() => {
    navigate(`/lobby/${code}`);
  }, [navigate, code]);

  if (loading) {
    return (
      <div className="h-full bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="h-full bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Game session not found</p>
      </div>
    );
  }

  // GAME OVER SCREEN
  if (isGameOver) {
    const allPlayersWithRoles: PlayerWithRole[] = players.map(p => ({
      ...p,
      baseRole: playerRoles[p.id]?.base || 'Unknown',
      themedRole: playerRoles[p.id]?.themed || 'Unknown',
      isAlive: true,
      wasKilled: gameOverData?.killedPlayer?.id === p.id && !gameOverData?.wasSuccessfullySaved,
      wasSaved: gameOverData?.savedPlayer?.id === p.id && gameOverData?.wasSuccessfullySaved,
    }));

    return (
      <GameOverScreen
        theme={session.theme}
        players={allPlayersWithRoles}
        killedPlayer={gameOverData?.killedPlayer || null}
        savedPlayer={gameOverData?.savedPlayer || null}
        wasSuccessfullySaved={gameOverData?.wasSuccessfullySaved || false}
        roomCode={code || ''}
        onPlayAgain={handlePlayAgain}
      />
    );
  }

  // Morning Reveal Overlay
  if (isShowingMorningReveal && morningResult) {
    return (
      <>
        <MorningReveal
          killedPlayerName={morningResult.killedPlayerName}
          wasSaved={morningResult.wasSaved}
          savedByDoctor={morningResult.savedByDoctor}
          isRevealing={true}
        />
      </>
    );
  }

  // Seer Reveal Modal
  if (seerRevealTarget) {
    return (
      <>
        <SeerRevealModal
          targetName={seerRevealTarget.name}
          targetRole={seerRevealTarget.baseRole}
          themedRole={seerRevealTarget.themedRole}
          onClose={() => setSeerRevealTarget(null)}
        />
      </>
    );
  }

  // HOST VIEW - Interactive Timeline with Blocking Logic
  if (isHost) {
    return (
      <div className="h-full bg-background px-4 py-6 flex flex-col overflow-hidden">
        <header className="text-center mb-6 shrink-0">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Moon className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-extrabold glow-text">
              {currentTimelineItem?.phase?.replace('_', ' ').toUpperCase() || 'Night Phase'}
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">{session.theme}</p>
          {session.timeline && (
            <p className="text-xs text-muted-foreground mt-1">
              Step {session.timeline_index + 1} of {session.timeline.length}
            </p>
          )}
        </header>

        <main className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full gap-6">
          {/* Audio Controls */}
          <div className="flex gap-3">
            {!isSpeaking && !isGeneratingAudio ? (
              <Button
                onClick={() => currentTimelineItem && playAudio(currentTimelineItem.text, currentTimelineItem.voice)}
                size="lg"
                className="gap-2"
                disabled={!currentTimelineItem}
              >
                <Volume2 className="w-5 h-5" />
                Play Narration
              </Button>
            ) : isGeneratingAudio ? (
              <Button size="lg" disabled className="gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </Button>
            ) : (
              <Button
                onClick={stopAudio}
                variant="secondary"
                size="lg"
                className="gap-2"
              >
                <VolumeX className="w-5 h-5" />
                Stop
              </Button>
            )}
          </div>

          {/* Speaking indicator */}
          {isSpeaking && (
            <div className="flex items-center gap-2 text-primary animate-pulse">
              <div className="flex gap-1">
                <span className="w-1 h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-6 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="w-1 h-6 bg-primary rounded-full animate-bounce" style={{ animationDelay: '450ms' }} />
                <span className="w-1 h-4 bg-primary rounded-full animate-bounce" style={{ animationDelay: '600ms' }} />
              </div>
              <span className="text-sm font-medium">Speaking...</span>
            </div>
          )}

          {/* Current text */}
          <div className="bg-card/50 border border-border rounded-2xl p-6 text-center w-full">
            <p className="text-lg leading-relaxed text-foreground">
              {currentTimelineItem?.text || session.script || 'The night has begun...'}
            </p>
            {currentTimelineItem?.action && currentTimelineItem.action !== 'none' && (
              <p className="text-xs text-muted-foreground mt-3 uppercase tracking-wider">
                Action: {currentTimelineItem.action.replace('_', ' ')}
              </p>
            )}
          </div>

          {/* Phase Timer (for action phases) */}
          {isActionPhase && (
            <PhaseTimer
              isActionPhase={isActionPhase}
              allVotesIn={allVotesIn}
              onTimerExpired={handleTimerExpired}
              onSkipPhase={() => advanceTimeline(true)}
              disabled={isAdvancing || isSpeaking}
            />
          )}

          {/* Vote Status (only for action phases) */}
          {isActionPhase && requiredVoteCount > 0 && (
            <VoteProgress
              currentVotes={currentPhaseVoteCount}
              requiredVotes={requiredVoteCount}
              allVotesIn={allVotesIn}
            />
          )}

          {/* Next Button with Blocking Logic */}
          {!isLastItem && !isActionPhase && (
            <Button
              onClick={() => advanceTimeline()}
              size="lg"
              variant="outline"
              className="gap-2"
              disabled={isAdvancing || isSpeaking}
            >
              {isAdvancing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
              Next
            </Button>
          )}

          {isLastItem && (
            <Button
              onClick={() => setIsGameOver(true)}
              size="lg"
              className="gap-2"
            >
              <Sparkles className="w-5 h-5" />
              End Game
            </Button>
          )}
        </main>
      </div>
    );
  }

  // PLAYER VIEW
  const showVotingUI = isPlayerActive() && 
    currentTimelineItem?.action && 
    ['vote_kill', 'vote_save', 'reveal_role'].includes(currentTimelineItem.action) &&
    !hasVoted;

  const showSleepingScreen = !isPlayerActive() && 
    currentTimelineItem?.action && 
    currentTimelineItem.action !== 'none' &&
    currentTimelineItem.action !== 'reveal';

  return (
    <div className="h-full bg-background px-4 py-6 flex flex-col overflow-hidden">
      <header className="text-center mb-6 shrink-0">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Moon className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-extrabold glow-text">
            {currentTimelineItem?.phase?.replace('_', ' ').toUpperCase() || 'Night Phase'}
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">{session.theme}</p>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full overflow-y-auto">
        {/* Voting UI */}
        {showVotingUI && (
          <div className="w-full space-y-4">
            <div className="text-center mb-4">
              <p className="text-lg font-semibold text-foreground">
                {currentTimelineItem?.action === 'vote_kill' 
                  ? 'Choose a victim' 
                  : currentTimelineItem?.action === 'reveal_role'
                    ? 'Choose someone to investigate'
                    : 'Choose who to save'}
              </p>
              <p className="text-sm text-muted-foreground">
                {currentTimelineItem?.text}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {players
                .filter(p => p.id !== playerId)
                .map((player) => (
                  <button
                    key={player.id}
                    onClick={() => setSelectedTarget(player.id)}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedTarget === player.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card/50 hover:border-primary/50'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-2 flex items-center justify-center overflow-hidden">
                      {player.avatar_url ? (
                        <img src={player.avatar_url} alt={player.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-muted-foreground">
                          {player.name[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{player.name}</p>
                  </button>
                ))}
            </div>

            <Button
              onClick={submitVote}
              className="w-full gap-2"
              disabled={!selectedTarget}
            >
              <Check className="w-4 h-4" />
              Confirm Vote
            </Button>
          </div>
        )}

        {/* Voted confirmation */}
        {hasVoted && isPlayerActive() && (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <p className="text-lg font-semibold text-foreground">Vote Submitted!</p>
            <p className="text-sm text-muted-foreground">Waiting for others...</p>
          </div>
        )}

        {/* Sleeping screen */}
        {showSleepingScreen && (
          <div className="text-center">
            <Moon className="w-16 h-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
            <p className="text-xl font-semibold text-foreground">Sleeping...</p>
            <p className="text-sm text-muted-foreground mt-2">Keep your eyes closed</p>
          </div>
        )}

        {/* Role card (when not in action phase or reveal phase) */}
        {!showVotingUI && !showSleepingScreen && !hasVoted && playerRole && (
          <div className="w-full">
            {!roleRevealed ? (
              <button
                onClick={handleRevealRole}
                className="w-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30 rounded-3xl p-8 text-center shadow-lg shadow-primary/10 transition-transform active:scale-95"
              >
                <EyeOff className="w-12 h-12 text-primary mx-auto mb-4" />
                <p className="text-xl font-bold text-foreground mb-2">Your Role is Hidden</p>
                <p className="text-muted-foreground text-sm">Tap to reveal your secret role</p>
              </button>
            ) : (
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30 rounded-3xl p-8 text-center shadow-lg shadow-primary/10">
                <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
                
                <p className="text-muted-foreground text-sm uppercase tracking-wider mb-2">
                  Your Secret Role
                </p>
                
                <h2 className="text-3xl font-extrabold text-foreground mb-2">
                  {playerRole.themed_role}
                </h2>
                
                <p className="text-muted-foreground text-sm">
                  ({playerRole.base_role})
                </p>

                <div className="mt-6 pt-6 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">
                    Keep this secret! Close your eyes and listen to the narrator.
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 gap-2"
                  onClick={() => setRoleRevealed(false)}
                >
                  <Eye className="w-4 h-4" />
                  Hide Role
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Loading role */}
        {!playerRole && !isHost && (
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your role...</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default GameScreen;
