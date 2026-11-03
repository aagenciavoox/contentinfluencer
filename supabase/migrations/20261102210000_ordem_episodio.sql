-- Ordem dos episódios definida pelas setas na página da série.
-- Só adiciona: nada é apagado nem alterado nos conteúdos existentes.
-- Null = ainda sem posição; a lista segue a ordem de criação até a pessoa mover.
-- Sem backfill de propósito: atualizar todas as linhas poderia mexer em updated_at
-- ("Editados por último"); o app numera a lista na primeira vez que alguém usa as setas.

alter table public.contents
  add column if not exists ordem_episodio integer;

create index if not exists contents_ordem_episodio_idx
  on public.contents (series_id, temporada_id, ordem_episodio);

comment on column public.contents.ordem_episodio is
  'Posição do episódio na temporada (ou na lista direta da série). Null = sem posição definida.';
