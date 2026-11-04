-- Post-its de planejamento: aceitar 'youtube-shorts' na lista de redes
alter table public.planejamento_postits drop constraint if exists planejamento_postits_redes_check;

alter table public.planejamento_postits
  add constraint planejamento_postits_redes_check
  check (redes <@ array['instagram', 'tiktok', 'youtube', 'youtube-shorts', 'blog', 'outra']::text[]);

comment on column public.planejamento_postits.redes is
  'Redes onde o post vai sair (instagram, tiktok, youtube, youtube-shorts, blog, outra).';

notify pgrst, 'reload schema';
