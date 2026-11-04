-- Quadro (e a linha da série) pode focar um grupo de redes. Vazio = sem foco.
-- A temporada, quando tem redes, continua mandando na hora de criar o episódio.

alter table public.series
  add column if not exists foco_redes text[] not null default '{}';

alter table public.series
  drop constraint if exists series_foco_redes_validas;

alter table public.series
  add constraint series_foco_redes_validas
  check (
    foco_redes <@ array[
      'instagram', 'instagram-video', 'instagram-carrossel',
      'tiktok', 'tiktok-video', 'tiktok-carrossel',
      'youtube', 'youtube-shorts',
      'blog', 'outra'
    ]::text[]
  );

comment on column public.series.foco_redes is
  'Redes em que os episódios novos deste quadro nascem, quando a temporada não escolhe as suas. Vazio = sem foco.';

notify pgrst, 'reload schema';
