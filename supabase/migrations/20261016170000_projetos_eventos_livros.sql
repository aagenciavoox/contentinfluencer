-- Projetos: link do Drive, token de compartilhamento e tipo personalizado.
-- Eventos: observações, intervalo (período de leitura) e livro do projeto.
-- Não converte tipos já gravados (campanha, producao, Entrega).

alter table public.projetos
  add column if not exists drive_url text,
  add column if not exists share_token uuid,
  add column if not exists tipo_personalizado text;

update public.projetos
set share_token = gen_random_uuid()
where share_token is null;

alter table public.projetos
  alter column share_token set default gen_random_uuid();

create unique index if not exists projetos_share_token_idx
  on public.projetos (share_token);

alter table public.agenda_items
  add column if not exists notes text,
  add column if not exists date_end date,
  add column if not exists projeto_livro_id text;

alter table public.agenda_items
  drop constraint if exists agenda_items_date_end_check;

alter table public.agenda_items
  add constraint agenda_items_date_end_check
  check (date_end is null or date_end >= date);

create table if not exists public.projeto_livros (
  id text primary key,
  projeto_id text not null references public.projetos (id) on delete cascade,
  user_id uuid not null default auth.uid(),
  nome text not null,
  biblioteca_item_id text references public.biblioteca_items (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists projeto_livros_projeto_id_idx
  on public.projeto_livros (projeto_id);

alter table public.agenda_items
  drop constraint if exists agenda_items_projeto_livro_id_fkey;

alter table public.agenda_items
  add constraint agenda_items_projeto_livro_id_fkey
  foreign key (projeto_livro_id) references public.projeto_livros (id) on delete set null;

alter table public.projeto_livros enable row level security;

drop policy if exists projeto_livros_all on public.projeto_livros;
create policy projeto_livros_all
  on public.projeto_livros
  for all
  to authenticated
  using (
    projeto_id in (
      select projetos.id
      from public.projetos
      where projetos.user_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    and projeto_id in (
      select projetos.id
      from public.projetos
      where projetos.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.projeto_livros to authenticated;
grant select, insert, update, delete on public.projeto_livros to service_role;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'projeto_livros'
     ) then
    alter publication supabase_realtime add table public.projeto_livros;
  end if;
end $$;

notify pgrst, 'reload schema';
