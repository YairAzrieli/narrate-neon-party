-- Add UNIQUE constraint on votes table to prevent duplicate votes
-- This ensures each player can only vote once per phase per session
ALTER TABLE public.votes ADD CONSTRAINT votes_unique_per_phase 
  UNIQUE (session_id, phase, voter_player_id);

-- Add is_alive column to player_roles if not exists (for tracking eliminations)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'player_roles' AND column_name = 'is_alive') THEN
    ALTER TABLE public.player_roles ADD COLUMN is_alive BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;