ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS posted_at timestamptz;
