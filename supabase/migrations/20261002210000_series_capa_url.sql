-- Optional cover for a content series (upload or external URL).
alter table public.series
  add column if not exists capa_url text;
