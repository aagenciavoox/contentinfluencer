-- Descrição opcional na temporada, dentro do escopo da série.

alter table public.temporadas
  add column if not exists descricao text;

comment on column public.temporadas.descricao is
  'Descrição opcional da fase ou arco de episódios desta temporada.';

notify pgrst, 'reload schema';
