-- Post-it rápido: redes onde o post vai sair. Só a plataforma, sem conta, formato ou horário.
-- A data continua opcional (date já é nullable desde 20261004223000).

alter table public.planejamento_postits
  add column if not exists redes text[] not null default '{}';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'planejamento_postits_redes_check'
      and conrelid = 'public.planejamento_postits'::regclass
  ) then
    alter table public.planejamento_postits
      add constraint planejamento_postits_redes_check
      check (redes <@ array['instagram', 'tiktok', 'youtube', 'outra']::text[]);
  end if;
end $$;
