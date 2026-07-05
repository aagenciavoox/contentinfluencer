-- Soft delete já existe em contents.deleted_at; vincula ideias ao roteiro de origem.
ALTER TABLE public.ideas
  ADD COLUMN IF NOT EXISTS demoted_from_content_id TEXT;

CREATE INDEX IF NOT EXISTS idx_ideas_demoted_from_content_id
  ON public.ideas (demoted_from_content_id)
  WHERE demoted_from_content_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ideas_demoted_from_content_id_fkey'
  ) THEN
    ALTER TABLE public.ideas
      ADD CONSTRAINT ideas_demoted_from_content_id_fkey
      FOREIGN KEY (demoted_from_content_id) REFERENCES public.contents (id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Vincula ideias incompletas a roteiros ainda existentes (ativos ou soft-deleted).
UPDATE public.ideas i
SET demoted_from_content_id = matched.content_id
FROM (
  SELECT DISTINCT ON (i2.id)
    i2.id AS idea_id,
    c2.id AS content_id
  FROM public.ideas i2
  INNER JOIN public.contents c2
    ON c2.title = i2.title AND c2.user_id = i2.user_id
  WHERE i2.demoted_from_content_id IS NULL
    AND i2.archived = false
    AND i2.title IS NOT NULL
    AND btrim(i2.text) = btrim(i2.title)
    AND c2.script IS NOT NULL
    AND length(btrim(c2.script)) > 10
  ORDER BY i2.id, c2.deleted_at NULLS FIRST, c2.updated_at DESC NULLS LAST
) matched
WHERE i.id = matched.idea_id;
