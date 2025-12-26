-- Fix votes visibility: Hide votes during active voting phase
DROP POLICY IF EXISTS "Anyone can view votes" ON public.votes;

-- Create policy that only shows votes after the phase has ended
-- Votes are visible when timeline has moved past the phase
CREATE POLICY "Can view votes after phase ends"
ON public.votes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM game_sessions gs
    WHERE gs.id = votes.session_id
    AND (
      -- Allow viewing if timeline has advanced past this vote's phase index
      gs.timeline_index > COALESCE(
        (
          SELECT (idx - 1)::int
          FROM jsonb_array_elements(gs.timeline) WITH ORDINALITY AS t(item, idx)
          WHERE item->>'phase' = votes.phase
          LIMIT 1
        ), 
        -1
      )
      -- Also allow viewing if the game is over (no timeline or at end)
      OR gs.timeline IS NULL
      OR gs.timeline_index >= jsonb_array_length(gs.timeline) - 1
    )
  )
);

-- Restrict avatar uploads to valid image extensions only
DROP POLICY IF EXISTS "Anyone can upload avatars" ON storage.objects;

CREATE POLICY "Upload avatars with image validation"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp')
);