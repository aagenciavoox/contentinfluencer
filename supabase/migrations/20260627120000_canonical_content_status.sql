-- Collapse legacy production statuses into canonical "Produção".
-- Programado becomes a derived display state (publishDate future), not persisted.

-- NOT VALID constraints still reject invalid new row versions, so the legacy
-- constraint must be removed before rewriting values to the canonical status.
ALTER TABLE public.contents DROP CONSTRAINT IF EXISTS contents_status_allowed_check;

-- Optional production tags before status migration
UPDATE public.contents
SET tags = array_append(COALESCE(tags, '{}'::text[]), 'gravar')
WHERE status = 'Pronto para Gravar'
  AND NOT ('gravar' = ANY(COALESCE(tags, '{}'::text[])));

UPDATE public.contents
SET tags = array_append(COALESCE(tags, '{}'::text[]), 'editar')
WHERE status = 'A Editar'
  AND NOT ('editar' = ANY(COALESCE(tags, '{}'::text[])));

UPDATE public.contents
SET status = 'Produção'
WHERE status IN (
  'Pronto para Gravar',
  'Gravado',
  'A Editar',
  'Editado',
  'Programado'
);

ALTER TABLE public.contents
  ADD CONSTRAINT contents_status_allowed_check
  CHECK (
    status IN ('Ideia', 'Roteiro', 'Produção', 'Postado')
  ) NOT VALID;

ALTER TABLE public.contents VALIDATE CONSTRAINT contents_status_allowed_check;
