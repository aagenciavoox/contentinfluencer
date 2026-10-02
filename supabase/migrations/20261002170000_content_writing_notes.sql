-- Área de notas ao lado do roteiro no modo de escrita.
alter table public.contents
  add column if not exists writing_notes text;
