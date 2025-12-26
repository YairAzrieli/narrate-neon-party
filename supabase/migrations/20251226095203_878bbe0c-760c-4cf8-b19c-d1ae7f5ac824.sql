-- Add theme column to game_rooms
ALTER TABLE public.game_rooms ADD COLUMN IF NOT EXISTS theme text;

-- Add is_host column to players
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS is_host boolean NOT NULL DEFAULT false;