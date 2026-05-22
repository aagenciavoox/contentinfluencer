alter table public.contents
  add column if not exists publish_time time;

alter table public.content_plataformas
  add column if not exists publish_time time;

comment on column public.contents.publish_time is
  'Optional local posting time for the main publication date.';

comment on column public.content_plataformas.publish_time is
  'Optional local posting time for the platform-specific publication date.';
