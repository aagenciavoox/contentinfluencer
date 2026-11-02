-- Plano do período (Editorial › Plano Vigente): nível da prioridade, pausa, metas totais de
-- produção e publicação e metas por conta. Até aqui esses campos só ficavam na tela e sumiam
-- ao recarregar. Vazio não é zero: sem número, a meta segue o ritmo semanal.

alter table public.decisao_periodo
  add column if not exists prioridade_nivel text,
  add column if not exists pausa_editorial text,
  add column if not exists meta_producao integer
    check (meta_producao is null or meta_producao >= 0),
  add column if not exists meta_publicacao integer
    check (meta_publicacao is null or meta_publicacao >= 0),
  add column if not exists metas_por_conta jsonb
    check (metas_por_conta is null or jsonb_typeof(metas_por_conta) = 'object');

comment on column public.decisao_periodo.prioridade_nivel is
  'Nível da prioridade do período: Alta, Média ou Baixa.';
comment on column public.decisao_periodo.pausa_editorial is
  'Pausas e exceções do período, em texto. Os dias citados saem da conta das metas.';
comment on column public.decisao_periodo.meta_producao is
  'Meta de roteiros escrita à mão. Nula: segue o ritmo semanal vezes as semanas do período.';
comment on column public.decisao_periodo.meta_publicacao is
  'Meta de posts escrita à mão. Nula: segue o ritmo semanal vezes as semanas do período.';
comment on column public.decisao_periodo.metas_por_conta is
  'Por id da conta: { producao, publicacao, ritmoSemanal }. Conta sem entrada não tem meta própria.';

notify pgrst, 'reload schema';
