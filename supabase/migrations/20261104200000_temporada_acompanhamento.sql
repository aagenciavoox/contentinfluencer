-- Wave com meta e acompanhamento próprios, no mesmo modelo da série:
-- o acompanhamento fica em serie_acompanhamento (escopo 'temporada') e a meta em serie_meta.
-- Nada vai para colunas soltas em temporadas.
--
-- ritmo_proprio: a wave anda no próprio ritmo. Ligado, os episódios dela saem da conta da série
-- de cima (não contam duas vezes). Só vale quando a wave tem meta própria; o app grava ligado
-- por padrão quando há meta.

-- 1. Acompanhamento por temporada.
alter table public.serie_acompanhamento
  add column if not exists temporada_id text references public.temporadas (id) on delete cascade,
  add column if not exists ritmo_proprio boolean not null default true;

alter table public.serie_acompanhamento
  drop constraint if exists serie_acompanhamento_escopo_check;

alter table public.serie_acompanhamento
  add constraint serie_acompanhamento_escopo_check
  check (escopo in ('geral', 'conta', 'formato', 'temporada'));

alter table public.serie_acompanhamento
  drop constraint if exists serie_acompanhamento_escopo;

alter table public.serie_acompanhamento
  add constraint serie_acompanhamento_escopo check (
    (escopo = 'geral' and platform_id is null and formato is null and temporada_id is null)
    or (escopo = 'conta' and platform_id is not null and formato is null and temporada_id is null)
    or (escopo = 'formato' and formato is not null and temporada_id is null)
    or (escopo = 'temporada' and temporada_id is not null and platform_id is null and formato is null)
  );

drop index if exists public.serie_acompanhamento_escopo_uniq;
create unique index if not exists serie_acompanhamento_escopo_uniq
  on public.serie_acompanhamento (serie_id, escopo, coalesce(platform_id, ''), coalesce(formato, ''), coalesce(temporada_id, ''));
create index if not exists serie_acompanhamento_temporada_idx
  on public.serie_acompanhamento (temporada_id) where temporada_id is not null;

comment on column public.serie_acompanhamento.temporada_id is
  'Escopo temporada: a wave acompanhada. Conta só os episódios desta temporada.';
comment on column public.serie_acompanhamento.ritmo_proprio is
  'Escopo temporada: a wave tem ritmo próprio e os episódios dela saem da conta da série de cima. Só vale com meta própria (serie_meta da temporada).';

-- 2. Meta da temporada.
alter table public.serie_meta
  add column if not exists temporada_id text references public.temporadas (id) on delete cascade;

alter table public.serie_meta
  drop constraint if exists serie_meta_escopo;

alter table public.serie_meta
  add constraint serie_meta_escopo check (
    (temporada_id is null and (platform_id is not null or formato is not null))
    or (temporada_id is not null and platform_id is null and formato is null)
  );

drop index if exists public.serie_meta_escopo_uniq;
create unique index if not exists serie_meta_escopo_uniq
  on public.serie_meta (serie_id, coalesce(platform_id, ''), coalesce(formato, ''), coalesce(temporada_id, ''));

comment on column public.serie_meta.temporada_id is
  'Meta própria da wave. Sem conta nem formato.';

notify pgrst, 'reload schema';