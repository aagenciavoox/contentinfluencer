-- O formato da publicação também guarda vídeo e carrossel no Instagram e no TikTok.
-- YouTube continua em short ou video-longo. Nulo segue a dedução do app.

alter table public.content_plataformas
  drop constraint if exists content_plataformas_formato_publicacao_check;

alter table public.content_plataformas
  add constraint content_plataformas_formato_publicacao_check
  check (
    formato_publicacao is null
    or formato_publicacao in ('short', 'video-longo', 'reels', 'carrossel')
  );

comment on column public.content_plataformas.formato_publicacao is
  'Formato escolhido nesta publicação: short, video-longo, reels ou carrossel. Nulo = segue o conteúdo ou a dedução do app.';

notify pgrst, 'reload schema';
