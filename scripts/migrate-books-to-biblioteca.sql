-- =============================================================================
-- Migração: books + book_annotations → biblioteca_items + anotacoes (+ gêneros)
-- Projeto: aftffcaychrfffefkeoj
--
-- Cenário A — Tabelas antigas ainda existem com dados:
--   Rode só a seção "MIGRAR DADOS" (a partir do passo 2).
--
-- Cenário B — Tabelas foram apagadas na v2; você tem backup SQL/CSV:
--   1) Rode a seção "STAGING" (recria books / book_annotations)
--   2) Importe o backup nessas tabelas (Table Editor ou COPY)
--   3) Rode "MIGRAR DADOS"
--   4) Confira contagens; depois opcionalmente "LIMPAR STAGING"
-- =============================================================================

begin;

-- =============================================================================
-- 1) STAGING — recria estrutura legada (igual ao que você tinha)
-- =============================================================================

create table if not exists public.books (
  id text not null,
  titulo text not null,
  autor text not null default ''::text,
  generos jsonb not null default '[]'::jsonb,
  capa_url text null,
  status_leitura text not null default 'Quero ler'::text,
  data_inicio timestamptz null,
  data_fim timestamptz null,
  avaliacao integer null,
  notas_gerais text null,
  created_at timestamptz null default now(),
  deleted_at timestamptz null,
  paginas_lidas integer null,
  total_paginas integer null,
  user_id uuid null default auth.uid(),
  editora text null,
  ano_publicacao integer null,
  isbn text null,
  idioma text null,
  traducao text null,
  serie_colecao text null,
  quem_indicou text null,
  motivo_escolha text null,
  potencial_conteudo text null,
  capitulos_cobertos text[] null default '{}'::text[],
  constraint books_pkey primary key (id),
  constraint books_user_id_fkey foreign key (user_id) references auth.users (id)
);

create table if not exists public.book_annotations (
  id text not null,
  livro_id text not null,
  texto text not null,
  tipo text not null,
  capitulo_ref text null,
  destilada boolean not null default false,
  created_at timestamptz null default now(),
  deleted_at timestamptz null,
  user_id uuid null default auth.uid(),
  content_potential boolean null default false,
  constraint book_annotations_pkey primary key (id),
  constraint book_annotations_livro_id_fkey foreign key (livro_id) references books (id) on delete cascade,
  constraint book_annotations_user_id_fkey foreign key (user_id) references auth.users (id)
);

create index if not exists idx_book_annotations_livro on public.book_annotations (livro_id);
create index if not exists idx_book_annotations_active on public.book_annotations (id) where (deleted_at is null);
create index if not exists idx_book_annotations_user on public.book_annotations (user_id);
create index if not exists idx_books_active on public.books (id) where (deleted_at is null);

-- Garante coluna metadata no destino (foundation)
alter table public.biblioteca_items
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- =============================================================================
-- 2) MIGRAR DADOS — books → biblioteca_items
-- =============================================================================

insert into public.biblioteca_items (
  id,
  user_id,
  tipo,
  titulo,
  autor_diretor,
  capa_url,
  status,
  data_inicio,
  data_fim,
  avaliacao,
  notas_gerais,
  potencial_conteudo,
  total_paginas,
  paginas_lidas,
  created_at,
  updated_at,
  deleted_at,
  metadata
)
select
  b.id,
  b.user_id,
  'livro'::text,
  b.titulo,
  coalesce(b.autor, ''),
  b.capa_url,
  coalesce(nullif(trim(b.status_leitura), ''), 'Quero ler'),
  b.data_inicio,
  b.data_fim,
  b.avaliacao,
  b.notas_gerais,
  case
    when b.potencial_conteudo ~ '^[1-3]$' then b.potencial_conteudo::integer
    when lower(coalesce(b.potencial_conteudo, '')) in ('3', 'alto', 'high') then 3
    when lower(coalesce(b.potencial_conteudo, '')) in ('2', 'medio', 'médio', 'medium') then 2
    when lower(coalesce(b.potencial_conteudo, '')) in ('1', 'baixo', 'low') then 1
    else null
  end,
  b.total_paginas,
  b.paginas_lidas,
  coalesce(b.created_at, now()),
  coalesce(b.created_at, now()),
  b.deleted_at,
  jsonb_strip_nulls(jsonb_build_object(
    'legacy_source', 'books',
    'editora', b.editora,
    'ano_publicacao', b.ano_publicacao,
    'isbn', b.isbn,
    'idioma', b.idioma,
    'traducao', b.traducao,
    'serie_colecao', b.serie_colecao,
    'quem_indicou', b.quem_indicou,
    'motivo_escolha', b.motivo_escolha,
    'potencial_conteudo_raw', b.potencial_conteudo,
    'capitulos_cobertos', to_jsonb(coalesce(b.capitulos_cobertos, '{}'::text[])),
    'generos_legacy', b.generos
  ))
from public.books b
where b.user_id is not null
on conflict (id) do update set
  user_id = excluded.user_id,
  titulo = excluded.titulo,
  autor_diretor = excluded.autor_diretor,
  capa_url = excluded.capa_url,
  status = excluded.status,
  data_inicio = excluded.data_inicio,
  data_fim = excluded.data_fim,
  avaliacao = excluded.avaliacao,
  notas_gerais = excluded.notas_gerais,
  potencial_conteudo = excluded.potencial_conteudo,
  total_paginas = excluded.total_paginas,
  paginas_lidas = excluded.paginas_lidas,
  updated_at = now(),
  deleted_at = excluded.deleted_at,
  metadata = public.biblioteca_items.metadata || excluded.metadata;

-- =============================================================================
-- 3) Gêneros — books.generos (jsonb) → biblioteca_generos + item_generos
-- =============================================================================

insert into public.biblioteca_generos (id, user_id, nome, tipo, created_at)
select distinct
  b.user_id::text || ':livro:' || lower(trim(g.genero)) as id,
  b.user_id,
  trim(g.genero) as nome,
  'livro'::text as tipo,
  now()
from public.books b
cross join lateral jsonb_array_elements_text(
  case
    when jsonb_typeof(b.generos) = 'array' then b.generos
    else '[]'::jsonb
  end
) as g(genero)
where b.user_id is not null
  and trim(g.genero) <> ''
on conflict (id) do nothing;

insert into public.item_generos (item_id, genero_id)
select distinct
  b.id as item_id,
  b.user_id::text || ':livro:' || lower(trim(g.genero)) as genero_id
from public.books b
cross join lateral jsonb_array_elements_text(
  case
    when jsonb_typeof(b.generos) = 'array' then b.generos
    else '[]'::jsonb
  end
) as g(genero)
where b.user_id is not null
  and trim(g.genero) <> ''
on conflict (item_id, genero_id) do nothing;

-- =============================================================================
-- 4) Anotações — book_annotations → anotacoes
-- =============================================================================

insert into public.anotacoes (
  id,
  user_id,
  item_id,
  texto,
  tipo,
  capitulo_ref,
  content_potential,
  created_at,
  deleted_at
)
select
  ba.id,
  coalesce(ba.user_id, bi.user_id),
  ba.livro_id,
  ba.texto,
  ba.tipo,
  ba.capitulo_ref,
  coalesce(ba.content_potential, false),
  coalesce(ba.created_at, now()),
  ba.deleted_at
from public.book_annotations ba
inner join public.biblioteca_items bi on bi.id = ba.livro_id
where coalesce(ba.user_id, bi.user_id) is not null
on conflict (id) do update set
  user_id = excluded.user_id,
  item_id = excluded.item_id,
  texto = excluded.texto,
  tipo = excluded.tipo,
  capitulo_ref = excluded.capitulo_ref,
  content_potential = excluded.content_potential,
  deleted_at = excluded.deleted_at;

-- =============================================================================
-- 5) Atualizar FKs em conteúdos/ideias que ainda apontam para books
-- =============================================================================

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contents' and column_name = 'livro_origem_id'
  ) then
    update public.contents c
    set biblioteca_item_id = c.livro_origem_id
    where c.biblioteca_item_id is null
      and c.livro_origem_id is not null
      and exists (select 1 from public.biblioteca_items bi where bi.id = c.livro_origem_id);
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ideas' and column_name = 'livro_origem_id'
  ) then
    update public.ideas i
    set origem_id = i.livro_origem_id
    where i.origem_id is null
      and i.livro_origem_id is not null
      and exists (select 1 from public.biblioteca_items bi where bi.id = i.livro_origem_id);
  end if;
end $$;

-- Projetos/campanhas que usavam livro_id (se campaigns ainda existir)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'campaigns'
  ) then
    insert into public.projetos (
      id, user_id, nome, tipo, status, data_inicio, data_fim,
      meta_conteudos, biblioteca_item_id, created_at, updated_at, deleted_at
    )
    select
      c.id,
      c.user_id,
      c.nome,
      'outro',
      c.status,
      nullif(c.data_inicio, '')::date,
      nullif(c.data_fim, '')::date,
      coalesce(c.meta_conteudos, 0),
      c.livro_id,
      coalesce(nullif(c.created_at, '')::timestamptz, now()),
      now(),
      c.deleted_at
    from public.campaigns c
    where c.user_id is not null
      and not exists (select 1 from public.projetos p where p.id = c.id)
    on conflict (id) do nothing;
  end if;
end $$;

commit;

-- =============================================================================
-- Conferência (rode separado)
-- =============================================================================
-- select 'books' as t, count(*) from public.books
-- union all select 'biblioteca_items', count(*) from public.biblioteca_items
-- union all select 'book_annotations', count(*) from public.book_annotations
-- union all select 'anotacoes', count(*) from public.anotacoes;

notify pgrst, 'reload schema';

-- =============================================================================
-- 6) LIMPAR STAGING — só depois de conferir os números
-- =============================================================================
-- drop table if exists public.book_annotations cascade;
-- drop table if exists public.books cascade;
