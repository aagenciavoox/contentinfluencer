-- Etapa Edição e "Publicado" no lugar de "Postado" — parte 1 de 2 (expandir).
--
-- Só acrescenta: o app publicado hoje continua funcionando com o banco depois desta parte.
-- Rode antes de publicar o código novo. A parte 2 (contrair) move os dados e fecha a regra.

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '2min';

ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS edicao_concluida_em timestamptz,
  ADD COLUMN IF NOT EXISTS edicao_dispensada boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.contents.edicao_concluida_em IS
  'Quando a edição foi concluída ou dispensada. Preenchido: Edição · Pronto para publicar.';
COMMENT ON COLUMN public.contents.edicao_dispensada IS
  'Verdadeiro quando a pessoa dispensou a edição em vez de concluí-la.';

-- Aceita as etapas novas sem tirar a antiga: o app atual ainda grava "Postado".
ALTER TABLE public.contents
  DROP CONSTRAINT IF EXISTS contents_status_allowed_check;

ALTER TABLE public.contents
  ADD CONSTRAINT contents_status_allowed_check
  CHECK (status IN ('Ideia', 'Roteiro', 'Produção', 'Edição', 'Publicado', 'Postado'))
  NOT VALID;

ALTER TABLE public.contents
  VALIDATE CONSTRAINT contents_status_allowed_check;

-- Contador por etapa: publicado vale com o nome novo e com o antigo.
CREATE OR REPLACE FUNCTION public.get_content_status_counts(
  p_list_mode text,
  p_series_id text DEFAULT NULL,
  p_pilar_id text DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH filtered AS (
    SELECT CASE WHEN status = 'Postado' THEN 'Publicado' ELSE status END AS status
    FROM public.contents
    WHERE user_id = auth.uid()
      AND deleted_at IS NULL
      AND (
        (p_list_mode = 'published' AND status IN ('Publicado', 'Postado'))
        OR (p_list_mode IS DISTINCT FROM 'published' AND status NOT IN ('Publicado', 'Postado'))
      )
      AND (p_series_id IS NULL OR series_id = p_series_id)
      AND (p_pilar_id IS NULL OR pilar_id = p_pilar_id)
      AND (
        p_search IS NULL
        OR btrim(p_search) = ''
        OR title ILIKE ('%' || p_search || '%')
        OR notes ILIKE ('%' || p_search || '%')
      )
  ),
  by_status AS (
    SELECT status, COUNT(*)::int AS cnt
    FROM filtered
    GROUP BY status
  )
  SELECT
    jsonb_build_object('Todos', (SELECT COUNT(*)::int FROM filtered))
    || COALESCE((SELECT jsonb_object_agg(status, cnt) FROM by_status), '{}'::jsonb);
$$;

GRANT EXECUTE ON FUNCTION public.get_content_status_counts(text, text, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
