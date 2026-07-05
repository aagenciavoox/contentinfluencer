-- Aggregate content status counts server-side (avoids full row scan).
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
    SELECT status
    FROM public.contents
    WHERE user_id = auth.uid()
      AND deleted_at IS NULL
      AND (
        (p_list_mode = 'published' AND status = 'Postado')
        OR (p_list_mode IS DISTINCT FROM 'published' AND status <> 'Postado')
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
