-- Índices para os filtros mais usados na abertura do app (listas, contadores do menu, vínculos).
-- Só cria o que falta (IF NOT EXISTS). Já existiam: contents(user_id,status,deleted_at),
-- contents(user_id,deleted_at), contents(user_id,archived_at), content_temas(tema_id),
-- content_plataformas(content_id,platform_id), recording_blocks(user_id,created_at), ajuste_semana(user_id),
-- e as chaves primárias já cobrem content_temas(content_id), pilar_plataformas(pilar_id),
-- recording_block_contents(block_id) e editorial_limite_hashtag(user_id).
-- Em tabela pequena roda em segundos; se crescer muito, prefira CREATE INDEX CONCURRENTLY fora de transação.

-- Lista de roteiros ativos e contadores do menu (user_id + deleted_at is null + archived_at is null).
create index if not exists idx_contents_user_active
  on public.contents (user_id, status)
  where deleted_at is null and archived_at is null;

-- Contador de publicados: status = Postado OU posted_at preenchido.
create index if not exists idx_contents_user_posted_at
  on public.contents (user_id, posted_at)
  where deleted_at is null and posted_at is not null;

create index if not exists idx_temas_user_id
  on public.temas (user_id);

create index if not exists idx_pilares_user_id
  on public.pilares (user_id);

create index if not exists idx_series_user_id
  on public.series (user_id);

create index if not exists idx_platforms_user_id
  on public.platforms (user_id);

create index if not exists idx_biblioteca_items_user_deleted
  on public.biblioteca_items (user_id, deleted_at);

create index if not exists idx_ideas_user_id
  on public.ideas (user_id);