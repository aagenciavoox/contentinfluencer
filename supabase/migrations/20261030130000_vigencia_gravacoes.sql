-- Vigência das diretrizes e limite de gravações por dia.
-- Só acrescenta. O app grava sem estas colunas até a migração ser aplicada.

-- 1. Limite de gravações por dia, para o aviso do Planejamento. Vazio = sem limite.
alter table public.editorial_conta
  add column if not exists limite_gravacoes_dia smallint
    check (limite_gravacoes_dia is null or limite_gravacoes_dia > 0);

comment on column public.editorial_conta.limite_gravacoes_dia is
  'Quantas gravações cabem em um dia. Null = sem limite.';

-- 2. Vigência: o limite semanal e a proporção que valiam em cada semana.
--    Mudar a estratégia cria uma linha a partir da semana da mudança; as semanas
--    anteriores continuam avaliadas pelos valores antigos.
create table if not exists public.editorial_vigencia (
  user_id uuid not null references auth.users (id) on delete cascade,
  vigente_desde date not null,
  limite_semanal integer check (limite_semanal is null or limite_semanal >= 0),
  proporcao_funcoes jsonb check (proporcao_funcoes is null or jsonb_typeof(proporcao_funcoes) = 'object'),
  created_at timestamptz not null default now(),
  primary key (user_id, vigente_desde)
);

comment on table public.editorial_vigencia is
  'Limite semanal e proporção por objetivo a partir de um domingo. Vale até a próxima linha.';

-- Os valores de hoje passam a ser a referência de todo o histórico anterior.
insert into public.editorial_vigencia (user_id, vigente_desde, limite_semanal, proporcao_funcoes)
select user_id, date '2000-01-02', limite_semanal, proporcao_funcoes
from public.editorial_conta
on conflict (user_id, vigente_desde) do nothing;

alter table public.editorial_vigencia enable row level security;

drop policy if exists "User isolation" on public.editorial_vigencia;
create policy "User isolation" on public.editorial_vigencia
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.editorial_vigencia to authenticated;
grant select, insert, update, delete on public.editorial_vigencia to service_role;

notify pgrst, 'reload schema';
