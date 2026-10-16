-- Histórico de progresso da Biblioteca + unidade de progresso por item.
-- Idempotente: pode rodar mais de uma vez.

-- 1) Unidade de progresso do item (nula = padrão do formato no app).
alter table public.biblioteca_items
  add column if not exists unidade_progresso text;

alter table public.biblioteca_items
  drop constraint if exists biblioteca_items_unidade_progresso_check;

alter table public.biblioteca_items
  add constraint biblioteca_items_unidade_progresso_check
  check (unidade_progresso is null or unidade_progresso in ('paginas', 'capitulos', 'episodios', 'minutos'));

-- Mangá passa a contar em capítulos.
update public.biblioteca_items
  set unidade_progresso = 'capitulos'
  where tipo = 'manga' and unidade_progresso is null;

-- 2) Eventos de progresso (cada vez que o progresso muda).
create table if not exists public.biblioteca_progresso_eventos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id text not null references public.biblioteca_items (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  delta numeric not null,
  valor_atual numeric not null,
  unidade text not null check (unidade in ('paginas', 'capitulos', 'episodios', 'minutos')),
  created_at timestamptz not null default now()
);

create index if not exists biblioteca_progresso_eventos_user_occurred_idx
  on public.biblioteca_progresso_eventos (user_id, occurred_at);

create index if not exists biblioteca_progresso_eventos_item_idx
  on public.biblioteca_progresso_eventos (item_id);

alter table public.biblioteca_progresso_eventos enable row level security;

-- Mesmo padrão de biblioteca_items: cada usuário só vê e grava o que é seu.
drop policy if exists "biblioteca_progresso_eventos_all" on public.biblioteca_progresso_eventos;
create policy "biblioteca_progresso_eventos_all" on public.biblioteca_progresso_eventos
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
