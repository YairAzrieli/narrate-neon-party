import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MorningResult {
  killedPlayerId: string | null;
  killedPlayerName: string | null;
  savedPlayerId: string | null;
  wasSaved: boolean;
}

interface Player {
  id: string;
  name: string;
}

export const useMorningResults = () => {
  const calculateResults = useCallback(async (
    sessionId: string,
    roomId: string,
    players: Player[]
  ): Promise<MorningResult> => {
    // Fetch all votes for this session
    const { data: werewolfVotes } = await supabase
      .from('votes')
      .select('target_player_id')
      .eq('session_id', sessionId)
      .eq('phase', 'werewolf');

    const { data: doctorVotes } = await supabase
      .from('votes')
      .select('target_player_id')
      .eq('session_id', sessionId)
      .eq('phase', 'doctor');

    // Count werewolf votes - majority wins
    const killVotes: Record<string, number> = {};
    if (werewolfVotes) {
      for (const vote of werewolfVotes) {
        killVotes[vote.target_player_id] = (killVotes[vote.target_player_id] || 0) + 1;
      }
    }

    // Find the player with most kill votes
    let killedPlayerId: string | null = null;
    let maxVotes = 0;
    for (const [playerId, votes] of Object.entries(killVotes)) {
      if (votes > maxVotes) {
        maxVotes = votes;
        killedPlayerId = playerId;
      }
    }

    // Check if doctor saved this player
    let savedPlayerId: string | null = null;
    if (doctorVotes && doctorVotes.length > 0) {
      // Doctor can only save one person
      savedPlayerId = doctorVotes[0].target_player_id;
    }

    // Was the killed player saved?
    const wasSaved = killedPlayerId !== null && savedPlayerId === killedPlayerId;

    // If saved, no one actually dies
    if (wasSaved) {
      // Update is_alive stays true for the saved player
      console.log(`Player ${killedPlayerId} was saved by the doctor!`);
    } else if (killedPlayerId) {
      // Update is_alive to false for the killed player
      const { error } = await supabase
        .from('player_roles')
        .update({ is_alive: false })
        .eq('session_id', sessionId)
        .eq('player_id', killedPlayerId);

      if (error) {
        console.error('Failed to update is_alive:', error);
      }
    }

    // Find player name
    const killedPlayer = players.find(p => p.id === killedPlayerId);

    return {
      killedPlayerId,
      killedPlayerName: killedPlayer?.name || null,
      savedPlayerId,
      wasSaved,
    };
  }, []);

  return { calculateResults };
};
