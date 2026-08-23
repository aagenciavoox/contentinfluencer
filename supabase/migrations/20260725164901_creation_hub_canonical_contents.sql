-- Central de Criação: consolida ideias e roteiros em public.contents.
--
-- A tabela legada public.ideas é mantida intacta para rollback e auditoria.
-- legacy_idea_id é TEXT (e não UUID) porque ideas.id também é TEXT e existem
-- IDs históricos não-UUID que precisam conservar a identidade original.

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '2min';

-- Constraints NOT VALID ainda são aplicadas a UPDATEs novos. Remova a regra
-- legada antes de escrever o status canônico.
ALTER TABLE public.contents
  DROP CONSTRAINT IF EXISTS contents_status_allowed_check;

-- Preserve nuances úteis do fluxo legado antes de consolidar os status.
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
  CHECK (status IN ('Ideia', 'Roteiro', 'Produção', 'Postado'))
  NOT VALID;

ALTER TABLE public.contents
  VALIDATE CONSTRAINT contents_status_allowed_check;

ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS legacy_idea_id text;

COMMENT ON COLUMN public.contents.archived_at IS
  'Arquivamento reversível na Central de Criação; independente do soft delete técnico.';

COMMENT ON COLUMN public.contents.legacy_idea_id IS
  'Identificador TEXT da public.ideas legada. TEXT preserva IDs históricos que não são UUID.';

-- Ideias promovidas já possuem um conteúdo canônico. Associa o registro sem
-- rebaixar seu status e só preenche metadados editoriais ainda ausentes.
-- Nesse caso ideas.archived representa "consumida pela promoção", portanto
-- não deve arquivar o roteiro resultante na Central.
UPDATE public.contents AS content
SET
  legacy_idea_id = idea.id,
  title = COALESCE(
    NULLIF(btrim(content.title), ''),
    NULLIF(btrim(idea.title), ''),
    NULLIF(btrim(split_part(idea.text, E'\n', 1)), ''),
    'Ideia sem título'
  ),
  notes = COALESCE(
    NULLIF(btrim(content.notes), ''),
    NULLIF(btrim(idea.notes), ''),
    CASE
      WHEN position(E'\n' IN idea.text) > 0
        THEN NULLIF(btrim(substring(idea.text FROM position(E'\n' IN idea.text) + 1)), '')
      ELSE NULL
    END
  ),
  pilar_id = COALESCE(content.pilar_id, idea.pilar_id),
  series_id = COALESCE(content.series_id, idea.series_id),
  biblioteca_item_id = COALESCE(content.biblioteca_item_id, idea.origem_id),
  created_at = LEAST(
    COALESCE(content.created_at, idea.created_at, now()),
    COALESCE(idea.created_at, content.created_at, now())
  ),
  updated_at = COALESCE(
    GREATEST(content.updated_at, content.created_at, idea.created_at),
    now()
  )
FROM public.ideas AS idea
WHERE idea.promoted_to_content_id = content.id
  AND content.user_id IS NOT DISTINCT FROM idea.user_id
  -- Once lineage is set, a rerun must not overwrite later editorial edits.
  AND content.legacy_idea_id IS NULL;

-- Ideias demovidas reutilizam e restauram o conteúdo de origem, mantendo o
-- mesmo ID canônico. O arquivamento legado ganha timestamp determinístico.
UPDATE public.contents AS content
SET
  legacy_idea_id = idea.id,
  title = COALESCE(
    NULLIF(btrim(idea.title), ''),
    NULLIF(btrim(split_part(idea.text, E'\n', 1)), ''),
    NULLIF(btrim(content.title), ''),
    'Ideia sem título'
  ),
  notes = COALESCE(
    NULLIF(btrim(idea.notes), ''),
    CASE
      WHEN position(E'\n' IN idea.text) > 0
        THEN NULLIF(btrim(substring(idea.text FROM position(E'\n' IN idea.text) + 1)), '')
      ELSE NULL
    END,
    NULLIF(btrim(content.notes), '')
  ),
  status = 'Ideia',
  pilar_id = COALESCE(idea.pilar_id, content.pilar_id),
  series_id = COALESCE(idea.series_id, content.series_id),
  biblioteca_item_id = COALESCE(idea.origem_id, content.biblioteca_item_id),
  archived_at = CASE
    WHEN idea.archived OR idea.deleted_at IS NOT NULL
      THEN COALESCE(idea.deleted_at, idea.created_at, now())
    ELSE NULL
  END,
  deleted_at = NULL,
  created_at = LEAST(
    COALESCE(content.created_at, idea.created_at, now()),
    COALESCE(idea.created_at, content.created_at, now())
  ),
  updated_at = COALESCE(
    GREATEST(content.updated_at, content.created_at, idea.created_at),
    now()
  )
FROM public.ideas AS idea
WHERE idea.demoted_from_content_id = content.id
  AND content.user_id IS NOT DISTINCT FROM idea.user_id
  -- Prevent a rerun from demoting or re-archiving a creation changed later.
  AND content.legacy_idea_id IS NULL;

-- As demais ideias passam a ser conteúdos no estágio Ideia. A chave de
-- linhagem, e não o ID gerado do conteúdo, torna o backfill reexecutável.
INSERT INTO public.contents (
  id,
  user_id,
  title,
  status,
  series_id,
  pilar_id,
  biblioteca_item_id,
  notes,
  created_at,
  updated_at,
  deleted_at,
  archived_at,
  legacy_idea_id
)
SELECT
  gen_random_uuid()::text,
  idea.user_id,
  COALESCE(
    NULLIF(btrim(idea.title), ''),
    NULLIF(btrim(split_part(idea.text, E'\n', 1)), ''),
    'Ideia sem título'
  ),
  'Ideia',
  idea.series_id,
  idea.pilar_id,
  idea.origem_id,
  COALESCE(
    NULLIF(btrim(idea.notes), ''),
    CASE
      WHEN position(E'\n' IN idea.text) > 0
        THEN NULLIF(btrim(substring(idea.text FROM position(E'\n' IN idea.text) + 1)), '')
      ELSE NULL
    END
  ),
  COALESCE(idea.created_at, now()),
  COALESCE(idea.created_at, now()),
  NULL,
  CASE
    WHEN idea.archived OR idea.deleted_at IS NOT NULL
      THEN COALESCE(idea.deleted_at, idea.created_at, now())
    ELSE NULL
  END,
  idea.id
FROM public.ideas AS idea
WHERE NOT EXISTS (
  SELECT 1
  FROM public.contents AS existing
  WHERE existing.legacy_idea_id = idea.id
    AND existing.user_id IS NOT DISTINCT FROM idea.user_id
);

-- A PK de ideas é global, mas o índice inclui user_id para alinhar as buscas
-- com RLS e deixar explícito o isolamento por proprietário.
CREATE UNIQUE INDEX IF NOT EXISTS idx_contents_user_legacy_idea_unique
  ON public.contents (user_id, legacy_idea_id)
  NULLS NOT DISTINCT
  WHERE legacy_idea_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contents_user_status_updated_active
  ON public.contents (user_id, status, updated_at DESC, id)
  WHERE deleted_at IS NULL AND archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contents_user_archived_at
  ON public.contents (user_id, archived_at DESC, id)
  WHERE deleted_at IS NULL AND archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contents_user_origin_updated_active
  ON public.contents (user_id, biblioteca_item_id, updated_at DESC, id)
  WHERE deleted_at IS NULL
    AND archived_at IS NULL
    AND biblioteca_item_id IS NOT NULL;

-- Índices dos lados referenciais e do fallback legado. Mantê-los enquanto
-- public.ideas existir evita scans completos no rollback/compatibilidade.
CREATE INDEX IF NOT EXISTS idx_ideas_promoted_to_content_id
  ON public.ideas (promoted_to_content_id)
  WHERE promoted_to_content_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ideas_series_id
  ON public.ideas (series_id)
  WHERE series_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ideas_user_archived_created
  ON public.ideas (user_id, archived, created_at DESC)
  WHERE deleted_at IS NULL;

-- public.contents é uma tabela privada por usuário e exposta ao cliente.
-- Recriar as policies evita que uma policy permissiva antiga amplie o acesso:
-- policies do Postgres são OR por padrão.
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  existing_policy record;
BEGIN
  FOR existing_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'contents'
  LOOP
    EXECUTE format(
      'DROP POLICY %I ON public.contents',
      existing_policy.policyname
    );
  END LOOP;
END $$;

CREATE POLICY contents_select_own
  ON public.contents
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY contents_insert_own
  ON public.contents
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY contents_update_own
  ON public.contents
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY contents_delete_own
  ON public.contents
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.contents FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.contents TO authenticated;
GRANT ALL ON TABLE public.contents TO service_role;

-- Falhar a migration é preferível a concluir com perda, duplicação ou uma
-- constraint não validada. Esses checks também documentam o contrato de dados.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.ideas AS idea
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.contents AS content
      WHERE content.legacy_idea_id = idea.id
        AND content.user_id IS NOT DISTINCT FROM idea.user_id
    )
  ) THEN
    RAISE EXCEPTION
      'creation_hub migration incomplete: at least one legacy idea has no canonical content';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contents
    WHERE legacy_idea_id IS NOT NULL
    GROUP BY user_id, legacy_idea_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'creation_hub migration invalid: duplicate legacy idea lineage detected';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.contents
    WHERE status NOT IN ('Ideia', 'Roteiro', 'Produção', 'Postado')
  ) THEN
    RAISE EXCEPTION
      'creation_hub migration invalid: legacy content status remains';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.contents'::regclass
      AND conname = 'contents_status_allowed_check'
      AND convalidated
  ) THEN
    RAISE EXCEPTION
      'creation_hub migration invalid: contents status constraint is not validated';
  END IF;
END $$;
