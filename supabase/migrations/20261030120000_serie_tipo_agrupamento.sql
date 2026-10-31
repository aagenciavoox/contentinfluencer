-- Tipo do agrupamento (família, série ou quadro) e "sem pilar" de propósito.
-- Aditiva: colunas novas, sem backfill. Null no tipo = o app deduz pela árvore.

alter table public.series
  add column if not exists tipo_agrupamento text,
  add column if not exists sem_pilar boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'series_tipo_agrupamento_check'
  ) then
    alter table public.series
      add constraint series_tipo_agrupamento_check
      check (tipo_agrupamento is null or tipo_agrupamento in ('familia', 'serie', 'quadro'));
  end if;
end $$;

comment on column public.series.tipo_agrupamento is
  'Família, série ou quadro. Null = deduzido pela posição na árvore (parent_id).';
comment on column public.series.sem_pilar is
  'Verdadeiro: a série fica sem pilar e não herda o pilar do agrupamento superior.';
comment on column public.series.parent_id is
  'Agrupamento superior opcional ("Faz parte de"). Null = raiz.';

notify pgrst, 'reload schema';
