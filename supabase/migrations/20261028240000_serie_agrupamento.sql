-- Agrupar séries: pai opcional, conteúdo derivado, temporadas com identidade.
-- Sem backfill. Colunas nulas. Integridade de ciclo e de dono em toda escrita.

alter table public.series
  add column if not exists parent_id text,
  add column if not exists usa_temporadas boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'series_parent_id_fkey'
  ) then
    alter table public.series
      add constraint series_parent_id_fkey
      foreign key (parent_id) references public.series (id) on delete set null;
  end if;
end $$;

create index if not exists series_parent_id_idx on public.series (parent_id);
create index if not exists series_user_parent_idx on public.series (user_id, parent_id);

alter table public.contents
  add column if not exists origem_conteudo_id text,
  add column if not exists temporada_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'contents_origem_conteudo_id_fkey'
  ) then
    alter table public.contents
      add constraint contents_origem_conteudo_id_fkey
      foreign key (origem_conteudo_id) references public.contents (id) on delete set null;
  end if;
end $$;

create index if not exists contents_origem_conteudo_id_idx on public.contents (origem_conteudo_id);
create index if not exists contents_temporada_id_idx on public.contents (temporada_id);

create table if not exists public.temporadas (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  serie_id text not null references public.series (id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now(),
  constraint temporadas_nome_nao_vazio check (length(trim(nome)) > 0)
);

create unique index if not exists temporadas_escopo_nome_unico_idx
  on public.temporadas (serie_id, lower(trim(nome)));

create index if not exists temporadas_user_id_idx on public.temporadas (user_id);
create index if not exists temporadas_serie_id_idx on public.temporadas (serie_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'contents_temporada_id_fkey'
  ) then
    alter table public.contents
      add constraint contents_temporada_id_fkey
      foreign key (temporada_id) references public.temporadas (id) on delete set null;
  end if;
end $$;

alter table public.temporadas enable row level security;

drop policy if exists "User isolation" on public.temporadas;
create policy "User isolation" on public.temporadas
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.temporadas to authenticated;
grant select, insert, update, delete on public.temporadas to service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'temporadas'
  ) then
    alter publication supabase_realtime add table public.temporadas;
  end if;
end $$;

-- Trava a cadeia em ordem de id, recusa outro usuário, auto-vínculo e ciclo.
create or replace function public.impedir_ciclo_serie_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dono uuid;
  cursor_id text;
  visitados text[];
  ids text[];
  lock_id text;
begin
  if new.parent_id is null then
    return new;
  end if;

  if new.parent_id = new.id then
    raise exception 'série não pode ser pai de si mesma';
  end if;

  select user_id into dono from public.series where id = new.parent_id for update;
  if dono is null then
    raise exception 'série pai inexistente';
  end if;
  if dono is distinct from new.user_id then
    raise exception 'série pai pertence a outro usuário';
  end if;

  ids := array[new.id, new.parent_id];
  cursor_id := new.parent_id;
  visitados := array[new.id];

  while cursor_id is not null loop
    if cursor_id = any (visitados) then
      raise exception 'ciclo em series.parent_id';
    end if;
    visitados := visitados || cursor_id;
    select parent_id into cursor_id
    from public.series
    where id = cursor_id;
    if cursor_id is not null then
      ids := ids || cursor_id;
    end if;
  end loop;

  -- Ordena e trava de novo para duas gravações concorrentes não formarem ciclo.
  select array_agg(x order by x) into ids from unnest(ids) as x;
  foreach lock_id in array ids loop
    perform 1 from public.series where id = lock_id for update;
  end loop;

  -- Rechecagem depois dos locks.
  cursor_id := new.parent_id;
  visitados := array[new.id];
  while cursor_id is not null loop
    if cursor_id = any (visitados) then
      raise exception 'ciclo em series.parent_id';
    end if;
    visitados := visitados || cursor_id;
    select parent_id into cursor_id from public.series where id = cursor_id;
  end loop;

  return new;
end;
$$;

drop trigger if exists series_parent_ciclo on public.series;
create trigger series_parent_ciclo
  before insert or update of parent_id, user_id on public.series
  for each row
  execute function public.impedir_ciclo_serie_parent();

create or replace function public.impedir_ciclo_conteudo_origem()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dono uuid;
  cursor_id text;
  visitados text[];
  ids text[];
  lock_id text;
begin
  if new.origem_conteudo_id is null then
    return new;
  end if;

  if new.origem_conteudo_id = new.id then
    raise exception 'conteúdo não pode derivar de si mesmo';
  end if;

  select user_id into dono from public.contents where id = new.origem_conteudo_id for update;
  if dono is null then
    raise exception 'conteúdo de origem inexistente';
  end if;
  if dono is distinct from new.user_id then
    raise exception 'conteúdo de origem pertence a outro usuário';
  end if;

  ids := array[new.id, new.origem_conteudo_id];
  cursor_id := new.origem_conteudo_id;
  visitados := array[new.id];

  while cursor_id is not null loop
    if cursor_id = any (visitados) then
      raise exception 'ciclo em contents.origem_conteudo_id';
    end if;
    visitados := visitados || cursor_id;
    select origem_conteudo_id into cursor_id
    from public.contents
    where id = cursor_id;
    if cursor_id is not null then
      ids := ids || cursor_id;
    end if;
  end loop;

  select array_agg(x order by x) into ids from unnest(ids) as x;
  foreach lock_id in array ids loop
    perform 1 from public.contents where id = lock_id for update;
  end loop;

  cursor_id := new.origem_conteudo_id;
  visitados := array[new.id];
  while cursor_id is not null loop
    if cursor_id = any (visitados) then
      raise exception 'ciclo em contents.origem_conteudo_id';
    end if;
    visitados := visitados || cursor_id;
    select origem_conteudo_id into cursor_id from public.contents where id = cursor_id;
  end loop;

  return new;
end;
$$;

drop trigger if exists contents_origem_ciclo on public.contents;
create trigger contents_origem_ciclo
  before insert or update of origem_conteudo_id, user_id on public.contents
  for each row
  execute function public.impedir_ciclo_conteudo_origem();

create or replace function public.temporada_mesmo_dono()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dono_serie uuid;
  dono_temp uuid;
begin
  if new.temporada_id is null then
    return new;
  end if;

  select t.user_id, s.user_id
    into dono_temp, dono_serie
  from public.temporadas t
  join public.series s on s.id = t.serie_id
  where t.id = new.temporada_id
  for update of t;

  if dono_temp is null then
    raise exception 'temporada inexistente';
  end if;
  if dono_temp is distinct from new.user_id or dono_serie is distinct from new.user_id then
    raise exception 'temporada pertence a outro usuário';
  end if;

  return new;
end;
$$;

drop trigger if exists contents_temporada_dono on public.contents;
create trigger contents_temporada_dono
  before insert or update of temporada_id, user_id on public.contents
  for each row
  execute function public.temporada_mesmo_dono();

create or replace function public.temporada_serie_mesmo_dono()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dono uuid;
begin
  select user_id into dono from public.series where id = new.serie_id for update;
  if dono is null then
    raise exception 'série da temporada inexistente';
  end if;
  if dono is distinct from new.user_id then
    raise exception 'série da temporada pertence a outro usuário';
  end if;
  return new;
end;
$$;

drop trigger if exists temporadas_serie_dono on public.temporadas;
create trigger temporadas_serie_dono
  before insert or update of serie_id, user_id on public.temporadas
  for each row
  execute function public.temporada_serie_mesmo_dono();

notify pgrst, 'reload schema';

comment on column public.series.parent_id is
  'Série pai opcional. Null = raiz. Sem tipo familia/serie/quadro.';
comment on column public.series.usa_temporadas is
  'Quando verdadeiro, este registro é o escopo das temporadas da subárvore.';
comment on column public.contents.origem_conteudo_id is
  'Conteúdo do qual este deriva. Distinto de republicação (content_plataformas.ciclo).';
comment on column public.contents.temporada_id is
  'Temporada do escopo ativo. Null = sem temporada.';
comment on table public.temporadas is
  'Temporadas com identidade no escopo de uma série. Mesma grafia (trim + lower) reutiliza a linha.';
