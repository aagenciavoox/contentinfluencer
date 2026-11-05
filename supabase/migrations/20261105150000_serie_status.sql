-- Status da série e da wave: rascunho (organiza sem cobrar), ativa ou arquivada.
-- Idempotente: pode rodar mais de uma vez no SQL Editor.
-- Série: `ativa` fica por compatibilidade e acompanha o status (ativa = status 'ativa').
-- Quadro não fica em rascunho; quem fica é a série de cima.

alter table public.series
  add column if not exists status text;

update public.series
  set status = case when ativa is false then 'arquivada' else 'ativa' end
  where status is null;

alter table public.series
  alter column status set default 'ativa';

alter table public.series
  alter column status set not null;

alter table public.series
  drop constraint if exists series_status_valido;

alter table public.series
  add constraint series_status_valido
  check (
    status in ('rascunho', 'ativa', 'arquivada')
    and not (status = 'rascunho' and tipo_agrupamento = 'quadro')
  );

-- Quem grava só `ativa` (versões antigas do app e do MCP) continua coerente, e vice-versa.
create or replace function public.series_status_coerente()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status is null then
      new.status := case when new.ativa is false then 'arquivada' else 'ativa' end;
    end if;
  elsif new.status is distinct from old.status then
    null;
  elsif new.ativa is distinct from old.ativa then
    new.status := case when new.ativa then 'ativa' else 'arquivada' end;
  end if;
  new.ativa := new.status = 'ativa';
  return new;
end;
$$;

drop trigger if exists series_status_coerente on public.series;

create trigger series_status_coerente
  before insert or update on public.series
  for each row execute function public.series_status_coerente();

comment on column public.series.status is
  'rascunho: organiza sem entrar na Saúde nem nas metas; ativa; arquivada. Quadro não fica em rascunho. ativa = (status = ''ativa'').';

alter table public.temporadas
  add column if not exists status text;

update public.temporadas
  set status = 'ativa'
  where status is null;

alter table public.temporadas
  alter column status set default 'ativa';

alter table public.temporadas
  alter column status set not null;

alter table public.temporadas
  drop constraint if exists temporadas_status_valido;

alter table public.temporadas
  add constraint temporadas_status_valido
  check (status in ('rascunho', 'ativa', 'arquivada'));

comment on column public.temporadas.status is
  'Status da wave. rascunho: fora da Saúde e da conta da série; arquivada: sai da Saúde, os episódios publicados continuam contando na série.';

notify pgrst, 'reload schema';
