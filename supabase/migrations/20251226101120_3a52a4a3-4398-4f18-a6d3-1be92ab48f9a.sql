-- Create game_sessions table to store roles and AI-generated scripts
CREATE TABLE public.game_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  theme TEXT NOT NULL,
  script TEXT,
  phase TEXT NOT NULL DEFAULT 'night',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create player_roles table to store assigned roles per session
CREATE TABLE public.player_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  base_role TEXT NOT NULL,
  themed_role TEXT NOT NULL,
  is_alive BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, player_id)
);

-- Enable RLS
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_roles ENABLE ROW LEVEL SECURITY;

-- Policies for game_sessions
CREATE POLICY "Anyone can view game sessions"
ON public.game_sessions FOR SELECT
USING (true);

CREATE POLICY "Anyone can create game sessions"
ON public.game_sessions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update game sessions"
ON public.game_sessions FOR UPDATE
USING (true);

-- Policies for player_roles
CREATE POLICY "Anyone can view player roles"
ON public.player_roles FOR SELECT
USING (true);

CREATE POLICY "Anyone can create player roles"
ON public.player_roles FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update player roles"
ON public.player_roles FOR UPDATE
USING (true);

-- Enable realtime for game_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_roles;