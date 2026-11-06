-- Modo de sequência da série: como o Planejamento prioriza episódios em "Ver o que encaixa".
-- Null = ainda não escolhido (Fase 3 cai no ordenamento atual por peso/etapa).

alter table public.series
  add column if not exists modo_sequencia text;

alter table public.series
  drop constraint if exists series_modo_sequencia_valido;

alter table public.series
  add constraint series_modo_sequencia_valido
  check (
    modo_sequencia is null
    or modo_sequencia in ('intercalar', 'seguir_um', 'ordem_temporada')
  );

comment on column public.series.modo_sequencia is
  'Como priorizar episódios desta série no Planejamento: intercalar quadros, seguir um só, ou ordem da temporada (ordem_episodio).';

notify pgrst, 'reload schema';
