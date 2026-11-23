-- Modelo único do YouTube longo: título e descrição na série, puxados no episódio.
-- A legenda-base continua sendo a dos Shorts e das outras redes.

alter table public.series
  add column if not exists youtube_titulo_base text;

alter table public.series
  add column if not exists youtube_descricao_base text;

alter table public.contents
  add column if not exists youtube_titulo text;

alter table public.contents
  add column if not exists youtube_descricao text;

comment on column public.series.youtube_titulo_base is
  'Título-base do vídeo longo. Episódio novo puxa. Shorts usam a legenda.';

comment on column public.series.youtube_descricao_base is
  'Descrição-base do vídeo longo. Um modelo por série, não por conta.';

comment on column public.contents.youtube_titulo is
  'Título do vídeo longo neste episódio. Vazio na criação pode receber o modelo da série.';

comment on column public.contents.youtube_descricao is
  'Descrição do vídeo longo neste episódio. Shorts não usam este campo.';

notify pgrst, 'reload schema';
