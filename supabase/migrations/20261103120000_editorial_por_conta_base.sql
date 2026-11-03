-- Entrega 2, fase 2A: a base do editorial por conta.
--
-- Só acrescenta. Nenhum número da tela muda com esta migração: o app continua lendo
-- o que já lia até as fases seguintes usarem estas tabelas. Nada é apagado, nenhuma
-- meta por conta é copiada do ritmo geral e nenhum acompanhamento é ligado sozinho.
--
-- 1. Meta de cada conta, com vigência (ritmo, proporção própria, partes por formato).
-- 2. Método de cálculo registrado em cada decisão do período.
-- 3. Contas do post-it (a rede continua; conta única da rede preenche).
-- 4. Pausas com datas e escopo.
-- 5. Acompanhamento da série com escopo, início, término e espaçamento.
-- 6. Frequência da série por conta ou formato.
-- 7. Limites e exceções de concentração.
-- 8. Cor do quadro que acompanha a série.

-- ---------------------------------------------------------------------------
-- 1. Meta de cada conta, a partir de um domingo, até a próxima linha.
--    limite_semanal nulo: a conta não tem meta (a soma das contas fica incompleta).
--    proporcao_funcoes nula: a conta usa a proporção geral do Editorial.
--    parcelas_formato: quantas por semana de cada formato, dentro do limite da conta.
-- ---------------------------------------------------------------------------
create table if not exists public.editorial_conta_meta (
  user_id uuid not null references auth.users (id) on delete cascade,
  platform_id text not null references public.platforms (id) on delete cascade,
  vigente_desde date not null,
  limite_semanal integer check (limite_semanal is null or limite_semanal >= 0),
  proporcao_funcoes jsonb check (proporcao_funcoes is null or jsonb_typeof(proporcao_funcoes) = 'object'),
  parcelas_formato jsonb check (parcelas_formato is null or jsonb_typeof(parcelas_formato) = 'object'),
  created_at timestamptz not null default now(),
  primary key (user_id, platform_id, vigente_desde)
);

comment on table public.editorial_conta_meta is
  'Ritmo de publicações de uma conta a partir de vigente_desde, até a próxima linha da mesma conta.';
comment on column public.editorial_conta_meta.limite_semanal is
  'Publicações por semana nesta conta. Nulo = conta sem meta (consolidação incompleta), nunca zero.';
comment on column public.editorial_conta_meta.proporcao_funcoes is
  'Proporção por objetivo desta conta, em %. Nula = usa a proporção geral do Editorial.';
comment on column public.editorial_conta_meta.parcelas_formato is
  'Por formato: quantas por semana. Parcelas do limite da conta, não um total a somar de novo.';

-- ---------------------------------------------------------------------------
-- 2. Método de cálculo da decisão. Tudo o que existe hoje foi decidido contando
--    conteúdos únicos; a contagem por publicação virá como outro método, sem
--    recalcular os períodos antigos.
-- ---------------------------------------------------------------------------
alter table public.decisao_periodo
  add column if not exists metodo_calculo text not null default 'conteudos-v1';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'decisao_periodo_metodo_calculo_check'
      and conrelid = 'public.decisao_periodo'::regclass
  ) then
    alter table public.decisao_periodo
      add constraint decisao_periodo_metodo_calculo_check
      check (metodo_calculo in ('conteudos-v1', 'publicacoes-v2'));
  end if;
end $$;

comment on column public.decisao_periodo.metodo_calculo is
  'Como as metas deste período são contadas: conteudos-v1 (cada roteiro uma vez) ou publicacoes-v2 (por conta).';

-- ---------------------------------------------------------------------------
-- 3. Contas do post-it. A rede escolhida continua em `redes`.
--    Preenche só quando a rede tem uma única conta ativa; com duas ou mais contas
--    da mesma rede, o post-it fica sem conta para aquela rede (não cobre meta de conta).
-- ---------------------------------------------------------------------------
alter table public.planejamento_postits
  add column if not exists conta_ids text[] not null default '{}';

comment on column public.planejamento_postits.conta_ids is
  'Contas onde a reserva vai sair. Vazio = só a rede; reserva sem conta não cobre meta de conta.';

update public.planejamento_postits as p
set conta_ids = resolvidas.ids
from (
  select postit.id, array_agg(conta.platform_id order by conta.platform_id) as ids
  from public.planejamento_postits as postit
  cross join lateral unnest(postit.redes) as rede(nome)
  cross join lateral (
    select min(pl.id) as platform_id
    from public.platforms as pl
    where pl.ativo is true
      and (pl.user_id = postit.user_id or pl.user_id is null)
      and pl.rede = rede.nome
    having count(*) = 1
  ) as conta
  where cardinality(postit.redes) > 0
    and cardinality(postit.conta_ids) = 0
  group by postit.id
) as resolvidas
where p.id = resolvidas.id;

-- ---------------------------------------------------------------------------
-- 4. Pausas com datas e escopo. O texto livre de "Pausas & Exceções" continua
--    na decisão do período e só é lido quando as datas são inequívocas.
-- ---------------------------------------------------------------------------
create table if not exists public.editorial_pausa (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  inicio date not null,
  fim date not null,
  escopo text not null check (escopo in ('publicacao', 'producao', 'gravacao', 'conta', 'serie')),
  platform_id text references public.platforms (id) on delete cascade,
  serie_id text references public.series (id) on delete cascade,
  nota text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint editorial_pausa_intervalo check (inicio <= fim),
  constraint editorial_pausa_alvo check (
    (escopo = 'conta' and platform_id is not null and serie_id is null)
    or (escopo = 'serie' and serie_id is not null and platform_id is null)
    or (escopo in ('publicacao', 'producao', 'gravacao') and platform_id is null and serie_id is null)
  )
);

create index if not exists editorial_pausa_user_inicio_idx on public.editorial_pausa (user_id, inicio);

comment on table public.editorial_pausa is
  'Pausa com datas. Gravação não reduz publicação; pausa de série não vira falta de frequência.';

-- ---------------------------------------------------------------------------
-- 5. Acompanhamento da série. Não tem frequência própria: usa a meta da série
--    (ou a da conta/formato em serie_meta). Quem estava marcado vira acompanhamento
--    geral ativo; a coluna antiga fica até o app ler só daqui.
-- ---------------------------------------------------------------------------
create table if not exists public.serie_acompanhamento (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  serie_id text not null references public.series (id) on delete cascade,
  escopo text not null default 'geral' check (escopo in ('geral', 'conta', 'formato')),
  platform_id text references public.platforms (id) on delete cascade,
  formato text,
  ativo boolean not null default true,
  inicio date,
  termino date,
  distancia_max_dias smallint check (distancia_max_dias is null or distancia_max_dias > 0),
  evitar_dias_seguidos boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint serie_acompanhamento_periodo check (inicio is null or termino is null or inicio <= termino),
  constraint serie_acompanhamento_escopo check (
    (escopo = 'geral' and platform_id is null and formato is null)
    or (escopo = 'conta' and platform_id is not null and formato is null)
    or (escopo = 'formato' and formato is not null)
  )
);

create unique index if not exists serie_acompanhamento_escopo_uniq
  on public.serie_acompanhamento (serie_id, escopo, coalesce(platform_id, ''), coalesce(formato, ''));
create index if not exists serie_acompanhamento_user_idx on public.serie_acompanhamento (user_id);

comment on column public.serie_acompanhamento.evitar_dias_seguidos is
  'Regra opcional de espaçamento: avisa episódios em dias seguidos. Desligada por padrão.';

-- Só se a coluna antiga existir (migração 20261102240000); senão não há quem trazer.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'series' and column_name = 'acompanhar_continuidade'
  ) then
    insert into public.serie_acompanhamento (user_id, serie_id, escopo, ativo)
    select s.user_id::uuid, s.id, 'geral', true
    from public.series as s
    where s.acompanhar_continuidade is true
      and s.deleted_at is null
    on conflict do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Frequência da série por conta ou formato. A frequência geral continua nas
--    colunas da própria série. Ciclo de 14 dias sempre com data de início.
-- ---------------------------------------------------------------------------
create table if not exists public.serie_meta (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  serie_id text not null references public.series (id) on delete cascade,
  platform_id text references public.platforms (id) on delete cascade,
  formato text,
  vezes smallint not null check (vezes > 0),
  unidade text not null check (unidade in ('semana', 'quinzena', 'mes')),
  a_partir_de date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint serie_meta_ancora check (unidade <> 'quinzena' or a_partir_de is not null),
  constraint serie_meta_escopo check (platform_id is not null or formato is not null)
);

create unique index if not exists serie_meta_escopo_uniq
  on public.serie_meta (serie_id, coalesce(platform_id, ''), coalesce(formato, ''));
create index if not exists serie_meta_user_idx on public.serie_meta (user_id);

-- ---------------------------------------------------------------------------
-- 7. Concentração. Limites nulos = os de hoje (obra 2× em 7 dias; assunto acima
--    de 1/3 com pelo menos 3 pautas). Exceção intencional com escopo e validade.
-- ---------------------------------------------------------------------------
alter table public.editorial_conta
  add column if not exists concentracao jsonb
    check (concentracao is null or jsonb_typeof(concentracao) = 'object');

comment on column public.editorial_conta.concentracao is
  'Limites de variedade: { obraRepeticoes, obraJanelaDias, assuntoFracaoMax, assuntoMinPautas }. Nulo = limites padrão.';

create table if not exists public.concentracao_excecao (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo text not null check (tipo in ('obra', 'assunto')),
  alvo_id text not null,
  platform_id text references public.platforms (id) on delete cascade,
  inicio date not null,
  fim date not null,
  nota text not null default '',
  created_at timestamptz not null default now(),
  constraint concentracao_excecao_intervalo check (inicio <= fim)
);

create index if not exists concentracao_excecao_user_idx on public.concentracao_excecao (user_id, fim);

comment on table public.concentracao_excecao is
  'Concentração marcada como intencional. Não desliga outros avisos e vence no fim.';

-- ---------------------------------------------------------------------------
-- 8. Cor do quadro que acompanha a série. Começa desligado em todos:
--    nenhum quadro passa a herdar pela igualdade das cores.
-- ---------------------------------------------------------------------------
alter table public.series
  add column if not exists usa_cor_da_serie boolean not null default false;

comment on column public.series.usa_cor_da_serie is
  'Quadro com "Usar da série": a cor vem da série na hora. Falso = a cor gravada no quadro.';

-- ---------------------------------------------------------------------------
-- Acesso: cada pessoa só vê e grava as próprias linhas.
-- ---------------------------------------------------------------------------
do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'editorial_conta_meta', 'editorial_pausa', 'serie_acompanhamento', 'serie_meta', 'concentracao_excecao'
  ] loop
    execute format('alter table public.%I enable row level security', tabela);
    execute format('drop policy if exists "User isolation" on public.%I', tabela);
    execute format(
      'create policy "User isolation" on public.%I for all to authenticated '
      'using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      tabela
    );
    execute format('grant select, insert, update, delete on public.%I to authenticated', tabela);
    execute format('grant select, insert, update, delete on public.%I to service_role', tabela);
  end loop;
end $$;

notify pgrst, 'reload schema';
