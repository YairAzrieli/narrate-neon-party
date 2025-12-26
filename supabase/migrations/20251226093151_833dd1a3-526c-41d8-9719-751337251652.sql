-- Create game_rooms table
CREATE TABLE public.game_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL UNIQUE,
  host_id UUID,
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create players table
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Public read/write policies for game rooms (party game - no auth needed)
CREATE POLICY "Anyone can view game rooms" 
ON public.game_rooms FOR SELECT USING (true);

CREATE POLICY "Anyone can create game rooms" 
ON public.game_rooms FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update game rooms" 
ON public.game_rooms FOR UPDATE USING (true);

-- Public read/write policies for players
CREATE POLICY "Anyone can view players" 
ON public.players FOR SELECT USING (true);

CREATE POLICY "Anyone can join as player" 
ON public.players FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update players" 
ON public.players FOR UPDATE USING (true);

CREATE POLICY "Anyone can leave game" 
ON public.players FOR DELETE USING (true);

-- Enable realtime for players table
ALTER TABLE public.players REPLICA IDENTITY FULL;

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies for avatars
CREATE POLICY "Anyone can view avatars" 
ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload avatars" 
ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');