-- Capa e descrição do clube, pastas dentro dele, e séries vinculadas pelo mesmo id.
-- A série continua na árvore. O vínculo só faz ela aparecer no clube.

alter table public.clubes
  add column if not exists descricao text,
  add column if not exists capa_url text;

create table if not exists public.clube_pastas (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  clube_id text not null references public.clubes (id) on delete cascade,
  nome text not null,
  ordem integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clube_pastas_nome_nao_vazio check (length(trim(nome)) > 0),
  constraint clube_pastas_ordem_positiva check (ordem > 0)
);

create index if not exists clube_pastas_clube_ordem_idx
  on public.clube_pastas (clube_id, ordem);

create index if not exists clube_pastas_user_id_idx
  on public.clube_pastas (user_id);

create table if not exists public.clube_series (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  clube_id text not null references public.clubes (id) on delete cascade,
  serie_id text not null references public.series (id) on delete cascade,
  pasta_id text references public.clube_pastas (id) on delete set null,
  ordem integer not null,
  created_at timestamptz not null default now(),
  constraint clube_series_ordem_positiva check (ordem > 0)
);

create unique index if not exists clube_series_clube_serie_idx
  on public.clube_series (clube_id, serie_id);

create index if not exists clube_series_clube_ordem_idx
  on public.clube_series (clube_id, ordem);

create index if not exists clube_series_serie_id_idx
  on public.clube_series (serie_id);

create index if not exists clube_series_pasta_id_idx
  on public.clube_series (pasta_id)
  where pasta_id is not null;

create index if not exists clube_series_user_id_idx
  on public.clube_series (user_id);

alter table public.clube_pastas enable row level security;
alter table public.clube_series enable row level security;

drop policy if exists "User isolation" on public.clube_pastas;
create policy "User isolation" on public.clube_pastas
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "User isolation" on public.clube_series;
create policy "User isolation" on public.clube_series
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.clube_pastas to authenticated;
grant select, insert, update, delete on public.clube_pastas to service_role;
grant select, insert, update, delete on public.clube_series to authenticated;
grant select, insert, update, delete on public.clube_series to service_role;

create or replace function public.clube_pasta_do_mesmo_usuario()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  dono uuid;
begin
  select user_id into dono from public.clubes where id = new.clube_id;
  if dono is null or dono is distinct from new.user_id then
    raise exception 'pasta de clube inválida';
  end if;
  return new;
end;
$$;

drop trigger if exists clube_pastas_mesmo_usuario on public.clube_pastas;
create trigger clube_pastas_mesmo_usuario
  before insert or update of clube_id on public.clube_pastas
  for each row
  execute function public.clube_pasta_do_mesmo_usuario();

create or replace function public.clube_serie_do_mesmo_usuario()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  dono_clube uuid;
  dono_serie uuid;
  pasta_clube text;
  pasta_dono uuid;
begin
  select user_id into dono_clube from public.clubes where id = new.clube_id;
  select user_id into dono_serie from public.series where id = new.serie_id;
  if dono_clube is null
    or dono_serie is null
    or dono_clube is distinct from new.user_id
    or dono_serie is distinct from new.user_id
  then
    raise exception 'vínculo de série inválido';
  end if;

  if new.pasta_id is not null then
    select clube_id, user_id into pasta_clube, pasta_dono
    from public.clube_pastas
    where id = new.pasta_id;
    if pasta_clube is null
      or pasta_clube is distinct from new.clube_id
      or pasta_dono is distinct from new.user_id
    then
      raise exception 'pasta de clube inválida';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists clube_series_mesmo_usuario on public.clube_series;
create trigger clube_series_mesmo_usuario
  before insert or update of clube_id, serie_id, pasta_id on public.clube_series
  for each row
  execute function public.clube_serie_do_mesmo_usuario();

revoke all on function public.clube_pasta_do_mesmo_usuario() from public;
revoke all on function public.clube_serie_do_mesmo_usuario() from public;
grant execute on function public.clube_pasta_do_mesmo_usuario() to authenticated, service_role;
grant execute on function public.clube_serie_do_mesmo_usuario() to authenticated, service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'clube_pastas'
  ) then
    alter publication supabase_realtime add table public.clube_pastas;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'clube_series'
  ) then
    alter publication supabase_realtime add table public.clube_series;
  end if;
end $$;
