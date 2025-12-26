-- Add timeline fields to game sessions
ALTER TABLE public.game_sessions
ADD COLUMN IF NOT EXISTS timeline JSONB;

ALTER TABLE public.game_sessions
ADD COLUMN IF NOT EXISTS timeline_index INTEGER NOT NULL DEFAULT 0;

-- Votes table for action phases (e.g., werewolf vote_kill)
CREATE TABLE IF NOT EXISTS public.votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  phase TEXT NOT NULL,
  voter_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  target_player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (session_id, phase, voter_player_id)
);

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create votes"
ON public.votes
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can view votes"
ON public.votes
FOR SELECT
USING (true);

CREATE POLICY "Anyone can update votes"
ON public.votes
FOR UPDATE
USING (true);
