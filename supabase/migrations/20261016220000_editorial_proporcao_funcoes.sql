-- Proporção fixa por objetivo (função editorial), em %. Vale para todos os períodos.
-- A meta de cada período é proporção × limite; decisao_periodo.meta_* passa a ser o ajuste
-- daquele período e continua valendo como antes.
-- Formato: {"atrair": 30, "converter": 20, ...}. Chave ausente = sem proporção. Null = não definida.

alter table public.editorial_conta
  add column if not exists proporcao_funcoes jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'editorial_conta_proporcao_funcoes_check'
      and conrelid = 'public.editorial_conta'::regclass
  ) then
    alter table public.editorial_conta
      add constraint editorial_conta_proporcao_funcoes_check
      check (proporcao_funcoes is null or jsonb_typeof(proporcao_funcoes) = 'object');
  end if;
end $$;

comment on column public.editorial_conta.proporcao_funcoes is
  'Proporção por função editorial em % (0–100). Meta do período = proporção × limite; ajuste em decisao_periodo.meta_* passa na frente.';
