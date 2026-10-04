alter table public.contents
  add column if not exists recording_time time;

comment on column public.contents.recording_time is
  'Optional local time for the recording date.';
