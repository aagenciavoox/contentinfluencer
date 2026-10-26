-- Período de leitura: vínculo opcional do evento com um livro da Biblioteca.
-- Permite período de leitura fora de projeto (agenda_items.projeto_id já aceita nulo).
-- Só adiciona: não apaga nem reescreve dados. Pode rodar mais de uma vez.

alter table public.agenda_items
  add column if not exists biblioteca_item_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'agenda_items_biblioteca_item_id_fkey'
      and conrelid = 'public.agenda_items'::regclass
  ) then
    alter table public.agenda_items
      add constraint agenda_items_biblioteca_item_id_fkey
      foreign key (biblioteca_item_id) references public.biblioteca_items (id) on delete set null;
  end if;
end $$;

create index if not exists agenda_items_biblioteca_item_id_idx
  on public.agenda_items (biblioteca_item_id)
  where biblioteca_item_id is not null;

notify pgrst, 'reload schema';
