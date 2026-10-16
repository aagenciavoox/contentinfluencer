-- Séries: "formato de publicação" (formato_visual_padrao) e "formato de apresentação"
-- (formato_apresentacao) passam a aceitar vários valores: text -> text[].
-- Preserva o valor antigo como lista de um item. Se o app novo gravou uma lista em JSON
-- ('["Reels","Carrossel"]') antes desta migração, ela vira text[] de verdade.
-- Idempotente: só converte a coluna que ainda não é array.

create or replace function pg_temp.criaki_formato_lista(valor text)
returns text[]
language plpgsql
as $$
declare
  limpo text := btrim(coalesce(valor, ''));
begin
  if limpo = '' then
    return '{}'::text[];
  end if;
  if limpo ~ '^\[.*\]$' then
    begin
      return coalesce(
        (select array_agg(btrim(item)) from jsonb_array_elements_text(limpo::jsonb) as item where btrim(item) <> ''),
        '{}'::text[]
      );
    exception when others then
      return array[limpo];
    end;
  end if;
  return array[limpo];
end;
$$;

do $$
declare
  coluna text;
begin
  foreach coluna in array array['formato_visual_padrao', 'formato_apresentacao'] loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'series' and column_name = coluna
    ) then
      execute format('alter table public.series add column %I text[]', coluna);
    elsif exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'series'
        and column_name = coluna and data_type <> 'ARRAY'
    ) then
      execute format('alter table public.series alter column %I drop default', coluna);
      execute format(
        'alter table public.series alter column %1$I type text[] using pg_temp.criaki_formato_lista(%1$I::text)',
        coluna
      );
    end if;
  end loop;
end $$;

alter table public.series alter column formato_visual_padrao set default '{}'::text[];
alter table public.series alter column formato_apresentacao set default '{}'::text[];

update public.series set formato_visual_padrao = '{}'::text[] where formato_visual_padrao is null;
update public.series set formato_apresentacao = '{}'::text[] where formato_apresentacao is null;

notify pgrst, 'reload schema';