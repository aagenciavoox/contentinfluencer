-- Meta por conta, formato ou wave aceita blocos fechados do calendário.
-- bimestre: jan–fev, mar–abr, mai–jun, jul–ago, set–out, nov–dez.
-- trimestre: jan–mar, abr–jun, jul–set, out–dez.
-- semestre: jan–jun e jul–dez.
-- A data de início continua obrigatória só na quinzena (ciclos de 14 dias).

do $$
declare
  nome text;
begin
  for nome in
    select c.conname
    from pg_constraint as c
    where c.conrelid = 'public.serie_meta'::regclass
      and c.contype = 'c'
      and c.conname not in ('serie_meta_ancora', 'serie_meta_escopo')
      and pg_get_constraintdef(c.oid) ilike '%unidade%'
      and pg_get_constraintdef(c.oid) not ilike '%a_partir_de%'
      and pg_get_constraintdef(c.oid) not ilike '%platform_id%'
      and pg_get_constraintdef(c.oid) not ilike '%temporada_id%'
  loop
    execute format('alter table public.serie_meta drop constraint %I', nome);
  end loop;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'serie_meta_unidade_check'
      and conrelid = 'public.serie_meta'::regclass
  ) then
    alter table public.serie_meta
      add constraint serie_meta_unidade_check
      check (unidade in ('semana', 'quinzena', 'mes', 'bimestre', 'trimestre', 'semestre'));
  end if;
end $$;

comment on column public.serie_meta.unidade is
  'semana, quinzena (ciclo de 14 dias, exige a_partir_de), mes, bimestre, trimestre ou semestre. Os três últimos são blocos fechados a partir de janeiro.';
