-- Blocos do YouTube longo: nome, roteiro e referências de imagem, som e vídeo.
-- Nulo enquanto o roteiro ainda é só o texto corrido.

alter table public.contents
  add column if not exists youtube_blocos jsonb;

comment on column public.contents.youtube_blocos is
  'Blocos do modo YouTube longo. Cada item tem nome, roteiro e referências. Nulo enquanto a visão em colunas não foi aberta.';

notify pgrst, 'reload schema';
