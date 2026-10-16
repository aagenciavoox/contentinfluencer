-- Permite o tipo 'quadrinho' em biblioteca_items.tipo.
-- Recria a check constraint com a lista anterior + 'quadrinho'. Mantém NOT VALID
-- (como a original) para não travar a tabela validando linhas antigas.
alter table public.biblioteca_items
  drop constraint if exists biblioteca_items_tipo_allowed_check;

alter table public.biblioteca_items
  add constraint biblioteca_items_tipo_allowed_check
  check (tipo in ('livro', 'quadrinho', 'filme', 'serie', U&'s\00E9rie', 'anime', 'manga', 'outro')) not valid;
