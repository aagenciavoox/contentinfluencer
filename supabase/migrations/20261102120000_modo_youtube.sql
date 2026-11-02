-- Modo de escrita YouTube: o roteiro continua em `script`, com seções e blocos "Na tela".
-- A proposta do vídeo é uma frase curta sobre o que o vídeo entrega.

alter table public.contents
  add column if not exists proposta text;

alter table public.contents
  drop constraint if exists contents_writing_mode_check;

alter table public.contents
  add constraint contents_writing_mode_check
  check (writing_mode in ('texto', 'carrossel', 'youtube'));

comment on column public.contents.writing_mode is
  'Modo de escrita do roteiro: texto (padrão), youtube ou carrossel.';
comment on column public.contents.proposta is
  'Proposta do vídeo (modo YouTube): o que o vídeo promete entregar.';

notify pgrst, 'reload schema';
