-- Drop existing overly complex vote visibility policy
DROP POLICY IF EXISTS "Can view votes after phase ends" ON public.votes;

-- Allow anyone to INSERT votes (for anonymous game play)
CREATE POLICY "Anyone can insert votes"
ON public.votes
FOR INSERT
WITH CHECK (true);

-- Allow anyone to SELECT votes (so host can count them)
CREATE POLICY "Anyone can view votes"
ON public.votes
FOR SELECT
USING (true);