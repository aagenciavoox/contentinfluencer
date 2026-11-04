-- Formato de cada publicação, por conta. Por enquanto só o YouTube usa: Shorts ou vídeo longo.
-- Nulo = sem escolha: vale o formato do conteúdo e, no YouTube, sem nada escrito, o app deduz
-- (roteiro no modo YouTube = vídeo longo; o resto = Shorts). Nada é preenchido aqui: a dedução
-- é feita na leitura, então mudar de ideia na ficha não depende de dado antigo.
alter table public.content_plataformas
  add column if not exists formato_publicacao text
    check (formato_publicacao is null or formato_publicacao in ('short', 'video-longo'));

comment on column public.content_plataformas.formato_publicacao is
  'Formato escolhido para esta publicação (YouTube: short ou video-longo). Nulo = segue o conteúdo ou a dedução do app.';

notify pgrst, 'reload schema';
