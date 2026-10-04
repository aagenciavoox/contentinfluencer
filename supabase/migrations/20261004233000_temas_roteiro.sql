-- Temas de roteiro: rótulo leve (Halloween), separado de série, pilar e função.
-- Uma série continua sendo a linha editorial. Um tema só nomeia o roteiro.

create table if not exists public.temas (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint temas_nome_nao_vazio check (char_length(btrim(nome)) > 0)
);

create unique index if not exists temas_user_nome_idx
  on public.temas (user_id, lower(btrim(nome)));

create table if not exists public.content_temas (
  content_id text not null references public.contents (id) on delete cascade,
  tema_id text not null references public.temas (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (content_id, tema_id)
);

create index if not exists content_temas_tema_id_idx
  on public.content_temas (tema_id);

alter table public.temas enable row level security;
alter table public.content_temas enable row level security;

drop policy if exists "User isolation" on public.temas;
create policy "User isolation"
  on public.temas
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "User isolation" on public.content_temas;
create policy "User isolation"
  on public.content_temas
  for all
  to authenticated
  using (
    exists (
      select 1 from public.contents
      where contents.id = content_temas.content_id
        and contents.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.temas
      where temas.id = content_temas.tema_id
        and temas.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.contents
      where contents.id = content_temas.content_id
        and contents.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.temas
      where temas.id = content_temas.tema_id
        and temas.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.temas to authenticated;
grant select, insert, update, delete on public.temas to service_role;
grant select, insert, update, delete on public.content_temas to authenticated;
grant select, insert, update, delete on public.content_temas to service_role;

comment on table public.temas is
  'Rótulo leve de roteiro, como Halloween. Não é série, pilar nem função.';
comment on table public.content_temas is
  'Vínculo muitos-para-muitos entre roteiro e tema.';

do $$
begin
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_updated_at'
  ) then
    execute 'drop trigger if exists set_updated_at on public.temas';
    execute 'create trigger set_updated_at before update on public.temas for each row execute function public.set_updated_at()';
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'temas'
     ) then
    alter publication supabase_realtime add table public.temas;
  end if;

  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'content_temas'
     ) then
    alter publication supabase_realtime add table public.content_temas;
  end if;
end $$;

notify pgrst, 'reload schema';
