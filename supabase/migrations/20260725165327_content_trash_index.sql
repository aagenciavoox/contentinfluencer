-- Mantém a lixeira responsiva sem ampliar os índices usados pelos conteúdos ativos.
CREATE INDEX IF NOT EXISTS idx_contents_user_deleted_at
  ON public.contents (user_id, deleted_at DESC, id)
  WHERE deleted_at IS NOT NULL;
