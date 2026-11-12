-- Pasta de clube ao lado da árvore de séries.
-- O conteúdo de série continua com series_id. O clube só aponta para o mesmo id.
-- Peça exclusiva: series_id nulo e clube_id preenchido.

create table if not exists public.clubes (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  cor text,
  origem text not null default 'outro',
  url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clubes_nome_nao_vazio check (length(trim(nome)) > 0),
  constraint clubes_origem_valida check (origem in ('catarse', 'apoiase', 'outro')),
  constraint clubes_cor_hex check (cor is null or cor ~ '^#[0-9A-Fa-f]{6}$')
);

create index if not exists clubes_user_id_idx on public.clubes (user_id);

alter table public.contents
  add column if not exists clube_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'contents_clube_id_fkey'
  ) then
    alter table public.contents
      add constraint contents_clube_id_fkey
      foreign key (clube_id) references public.clubes (id) on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'contents_clube_sem_serie'
  ) then
    alter table public.contents
      add constraint contents_clube_sem_serie
      check (clube_id is null or series_id is null);
  end if;
end $$;

create index if not exists contents_clube_id_idx
  on public.contents (clube_id)
  where clube_id is not null;

create table if not exists public.clube_conteudos (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  clube_id text not null references public.clubes (id) on delete cascade,
  content_id text not null references public.contents (id) on delete cascade,
  ordem integer not null,
  created_at timestamptz not null default now(),
  constraint clube_conteudos_ordem_positiva check (ordem > 0)
);

create unique index if not exists clube_conteudos_clube_content_idx
  on public.clube_conteudos (clube_id, content_id);

create index if not exists clube_conteudos_clube_ordem_idx
  on public.clube_conteudos (clube_id, ordem);

create index if not exists clube_conteudos_content_id_idx
  on public.clube_conteudos (content_id);

create index if not exists clube_conteudos_user_id_idx
  on public.clube_conteudos (user_id);

alter table public.clubes enable row level security;
alter table public.clube_conteudos enable row level security;

drop policy if exists "User isolation" on public.clubes;
create policy "User isolation" on public.clubes
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "User isolation" on public.clube_conteudos;
create policy "User isolation" on public.clube_conteudos
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.clubes to authenticated;
grant select, insert, update, delete on public.clubes to service_role;
grant select, insert, update, delete on public.clube_conteudos to authenticated;
grant select, insert, update, delete on public.clube_conteudos to service_role;

-- O dono do clube e o do conteúdo têm de ser a mesma pessoa. RLS esconde o clube alheio.
create or replace function public.clube_do_mesmo_usuario()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  dono uuid;
begin
  if new.clube_id is null then
    return new;
  end if;

  select user_id into dono from public.clubes where id = new.clube_id;
  if dono is null or dono is distinct from new.user_id then
    raise exception 'clube inexistente';
  end if;
  return new;
end;
$$;

drop trigger if exists contents_clube_do_mesmo_usuario on public.contents;
create trigger contents_clube_do_mesmo_usuario
  before insert or update of clube_id on public.contents
  for each row
  execute function public.clube_do_mesmo_usuario();

create or replace function public.vinculo_do_clube_do_mesmo_usuario()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  dono_clube uuid;
  dono_conteudo uuid;
begin
  select user_id into dono_clube from public.clubes where id = new.clube_id;
  select user_id into dono_conteudo from public.contents where id = new.content_id;
  if dono_clube is null
    or dono_conteudo is null
    or dono_clube is distinct from new.user_id
    or dono_conteudo is distinct from new.user_id
  then
    raise exception 'vínculo de clube inválido';
  end if;
  return new;
end;
$$;

drop trigger if exists clube_conteudos_mesmo_usuario on public.clube_conteudos;
create trigger clube_conteudos_mesmo_usuario
  before insert or update of clube_id, content_id on public.clube_conteudos
  for each row
  execute function public.vinculo_do_clube_do_mesmo_usuario();

revoke all on function public.clube_do_mesmo_usuario() from public;
revoke all on function public.vinculo_do_clube_do_mesmo_usuario() from public;
grant execute on function public.clube_do_mesmo_usuario() to authenticated, service_role;
grant execute on function public.vinculo_do_clube_do_mesmo_usuario() to authenticated, service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'clubes'
  ) then
    alter publication supabase_realtime add table public.clubes;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'clube_conteudos'
  ) then
    alter publication supabase_realtime add table public.clube_conteudos;
  end if;
end $$;
