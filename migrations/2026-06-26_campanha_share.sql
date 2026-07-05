-- Migration: campanha share token + drive url
-- 2026-06-26
--
-- Adds drive_url and share_token to projetos, and creates a SECURITY DEFINER
-- function that allows public (anon) read of a campaign via its share token.

-- 1. Novas colunas

ALTER TABLE projetos
  ADD COLUMN IF NOT EXISTS drive_url    TEXT,
  ADD COLUMN IF NOT EXISTS share_token  UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS projetos_share_token_idx
  ON projetos (share_token);

-- 2. Funcao publica (SECURITY DEFINER = acesso sem auth)

CREATE OR REPLACE FUNCTION get_campanha_publica(p_token UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id
    FROM projetos
   WHERE share_token = p_token
     AND deleted_at IS NULL;

  IF v_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN (
    SELECT json_build_object(
      'projeto', json_build_object(
        'id',            p.id,
        'nome',          p.nome,
        'tipo',          p.tipo,
        'status',        p.status,
        'brand',         p.brand,
        'brand_color',   p.brand_color,
        'color',         p.color,
        'drive_url',     p.drive_url,
        'data_inicio',   p.data_inicio,
        'data_fim',      p.data_fim,
        'meta_conteudos',p.meta_conteudos,
        'notes',         p.notes,
        'created_at',    p.created_at
      ),
      'etapas', COALESCE((
        SELECT json_agg(
          json_build_object(
            'id', e.id, 'nome', e.nome, 'ordem', e.ordem,
            'status', e.status, 'data_prazo', e.data_prazo
          )
          ORDER BY e.ordem
        )
        FROM projeto_etapas e WHERE e.projeto_id = v_id
      ), '[]'::json),
      'agenda_items', COALESCE((
        SELECT json_agg(
          json_build_object(
            'id', a.id, 'title', a.title,
            'date', a.date, 'time', a.time, 'tipo', a.tipo
          )
          ORDER BY a.date, a.time
        )
        FROM agenda_items a WHERE a.projeto_id = v_id
      ), '[]'::json),
      'conteudos', COALESCE((
        SELECT json_agg(
          json_build_object(
            'id', c.id, 'title', c.title, 'status', c.status,
            'publish_date', c.publish_date, 'publish_time', c.publish_time,
            'posted_at', c.posted_at, 'link', c.link
          )
          ORDER BY c.publish_date NULLS LAST
        )
        FROM contents c
        INNER JOIN projeto_conteudos pc ON pc.content_id = c.id
        WHERE pc.projeto_id = v_id AND c.deleted_at IS NULL
      ), '[]'::json),
      'metrics', COALESCE((
        SELECT json_agg(
          json_build_object(
            'id', cm.id, 'content_id', cm.content_id, 'platform_id', cm.platform_id,
            'views', cm.views, 'likes', cm.likes, 'comments', cm.comments,
            'saves', cm.saves, 'shares', cm.shares, 'reposts', cm.reposts,
            'new_followers', cm.new_followers, 'accounts_reached', cm.accounts_reached,
            'watch_time', cm.watch_time, 'retention_rate', cm.retention_rate,
            'completion_rate', cm.completion_rate, 'registered_at', cm.registered_at
          )
        )
        FROM content_metrics cm
        INNER JOIN projeto_conteudos pc ON pc.content_id = cm.content_id
        WHERE pc.projeto_id = v_id
      ), '[]'::json),
      'platforms', COALESCE((
        SELECT json_agg(DISTINCT json_build_object('id', pl.id, 'nome', pl.nome))
        FROM platforms pl
        INNER JOIN content_metrics cm ON cm.platform_id = pl.id
        INNER JOIN projeto_conteudos pc ON pc.content_id = cm.content_id
        WHERE pc.projeto_id = v_id
      ), '[]'::json)
    )
    FROM projetos p WHERE p.id = v_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_campanha_publica(UUID) TO anon;
