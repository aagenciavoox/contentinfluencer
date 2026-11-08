-- Ordem do post-it dentro do dia. Nulo continua na ordem de criação.

alter table public.planejamento_postits
  add column if not exists ordem integer;

comment on column public.planejamento_postits.ordem is
  'Posição do post-it dentro do dia. Nulo segue a ordem de criação.';
