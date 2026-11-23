ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS status_entered_at timestamptz;

UPDATE public.contents
SET status_entered_at = created_at
WHERE status_entered_at IS NULL;
