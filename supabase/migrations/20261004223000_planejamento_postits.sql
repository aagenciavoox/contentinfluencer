-- Post-its de planejamento: etapa anterior à ideia. Não são contents nem eventos.

create table if not exists public.planejamento_postits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  texto text not null default '',
  date date,
  content_id uuid references public.contents (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.planejamento_postits enable row level security;

drop policy if exists "User isolation" on public.planejamento_postits;
create policy "User isolation"
  on public.planejamento_postits
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.planejamento_postits to authenticated;
grant select, insert, update, delete on public.planejamento_postits to service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'planejamento_postits'
     ) then
    alter publication supabase_realtime add table public.planejamento_postits;
  end if;
end $$;
