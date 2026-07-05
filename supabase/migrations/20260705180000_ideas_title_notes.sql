-- Separa título e observações nas ideias (text permanece sincronizado para compatibilidade).
ALTER TABLE public.ideas
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

UPDATE public.ideas
SET
  title = CASE
    WHEN position(E'\n' IN text) > 0 THEN NULLIF(btrim(split_part(text, E'\n', 1)), '')
    ELSE NULLIF(btrim(text), '')
  END,
  notes = CASE
    WHEN position(E'\n' IN text) > 0 THEN NULLIF(btrim(substring(text FROM position(E'\n' IN text) + 1)), '')
    ELSE NULL
  END
WHERE title IS NULL AND notes IS NULL AND text IS NOT NULL;
