alter table public.content_plataformas
  add column if not exists publication_kind text not null default 'post'
  check (publication_kind in ('post', 'repost'));

comment on column public.content_plataformas.publication_kind is
  'post = publicação original, repost = republicação do mesmo vídeo';
