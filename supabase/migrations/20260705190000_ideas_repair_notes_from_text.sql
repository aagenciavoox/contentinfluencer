-- Repara ideias cujo `notes` ficou vazio mas o corpo ainda está em `text`
-- (ex.: demovidas antes da separação título/observações ou sobrescritas ao salvar).
UPDATE public.ideas
SET notes = NULLIF(btrim(substring(text FROM position(E'\n' IN text) + 1)), '')
WHERE (notes IS NULL OR btrim(notes) = '')
  AND text IS NOT NULL
  AND position(E'\n' IN text) > 0;

CREATE OR REPLACE FUNCTION public.strip_html_text(html text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(btrim(
    regexp_replace(
      regexp_replace(
        regexp_replace(COALESCE(html, ''), '<br\s*/?>', E'\n', 'gi'),
        '</p>', E'\n\n', 'gi'
      ),
      '<[^>]+>', ' ', 'g'
    )
  ), '');
$$;

WITH candidates AS (
  SELECT DISTINCT ON (i.id)
    i.id AS idea_id,
    i.title AS idea_title,
    c.notes AS content_notes,
    c.script AS content_script
  FROM public.ideas i
  INNER JOIN public.contents c
    ON c.title = i.title AND c.user_id = i.user_id AND c.deleted_at IS NULL
  WHERE i.archived = false
    AND (i.notes IS NULL OR btrim(i.notes) = '')
    AND i.title IS NOT NULL
    AND btrim(i.text) = btrim(i.title)
    AND c.script IS NOT NULL
    AND length(btrim(c.script)) > 10
  ORDER BY i.id, c.updated_at DESC NULLS LAST
),
repaired AS (
  SELECT
    idea_id,
    idea_title,
    NULLIF(btrim(
      concat_ws(
        E'\n\n',
        CASE
          WHEN content_notes IS NOT NULL
            AND btrim(content_notes) <> ''
            AND btrim(content_notes) <> btrim(idea_title)
            THEN btrim(content_notes)
          ELSE NULL
        END,
        NULLIF(btrim(public.strip_html_text(content_script)), '')
      )
    ), '') AS idea_notes
  FROM candidates
)
UPDATE public.ideas i
SET
  notes = r.idea_notes,
  text = CASE
    WHEN r.idea_notes IS NOT NULL THEN btrim(i.title) || E'\n\n' || r.idea_notes
    ELSE btrim(i.title)
  END
FROM repaired r
WHERE i.id = r.idea_id
  AND r.idea_notes IS NOT NULL;
