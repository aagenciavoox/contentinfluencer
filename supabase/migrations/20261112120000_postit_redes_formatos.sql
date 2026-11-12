-- Post-its: aceitar os formatos de rede que o app já grava (Reels, vídeo, carrossel).
-- A tela permite instagram-video, instagram-carrossel, tiktok-video e tiktok-carrossel,
-- mas o check antigo só tinha instagram, tiktok, youtube, youtube-shorts, blog e outra.
-- Sem isso, salvar um post-it com Reels ou carrossel falha e aparece o aviso genérico de conexão.

alter table public.planejamento_postits drop constraint if exists planejamento_postits_redes_check;

alter table public.planejamento_postits
  add constraint planejamento_postits_redes_check
  check (redes <@ array[
    'instagram', 'instagram-video', 'instagram-carrossel',
    'tiktok', 'tiktok-video', 'tiktok-carrossel',
    'youtube', 'youtube-shorts',
    'blog', 'outra'
  ]::text[]);

comment on column public.planejamento_postits.redes is
  'Redes e formatos onde o post vai sair (instagram, instagram-video, instagram-carrossel, tiktok, tiktok-video, tiktok-carrossel, youtube, youtube-shorts, blog, outra).';

notify pgrst, 'reload schema';
