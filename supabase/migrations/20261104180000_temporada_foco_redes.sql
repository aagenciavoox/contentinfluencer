-- Temporada pode focar um grupo de redes. Vazio = só agrupa, sem plataforma.

alter table public.temporadas
  add column if not exists foco_redes text[] not null default '{}';

alter table public.temporadas
  drop constraint if exists temporadas_foco_redes_validas;

alter table public.temporadas
  add constraint temporadas_foco_redes_validas
  check (
    foco_redes <@ array[
      'instagram', 'instagram-video', 'instagram-carrossel',
      'tiktok', 'tiktok-video', 'tiktok-carrossel',
      'youtube', 'youtube-shorts',
      'blog', 'outra'
    ]::text[]
  );

comment on column public.temporadas.foco_redes is
  'Redes que esta temporada cobre. Vazio = sem foco de plataforma: a temporada reúne episódios de qualquer quadro da série, sem ordem própria.';

notify pgrst, 'reload schema';
