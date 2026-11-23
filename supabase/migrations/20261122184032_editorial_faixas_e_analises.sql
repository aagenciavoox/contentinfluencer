-- Faixas gerais, faixas por conta, ciência do aviso e análises de período.
-- Só acrescenta colunas e tabelas. Não apaga nem reescreve linhas. Não toca em contents.
-- decisao_periodo e ajuste_semana ficam como estão.

-- A) Faixas gerais por semana, contadas por roteiro.
--    limite_semanal continua e passa a ser a META de postagens.
--    Gravações: meta vazia = não acompanha.
alter table public.editorial_vigencia
  add column if not exists minimo_semanal integer check (minimo_semanal is null or minimo_semanal >= 0),
  add column if not exists maximo_semanal integer check (maximo_semanal is null or maximo_semanal >= 0),
  add column if not exists gravacao_minimo_semanal integer check (gravacao_minimo_semanal is null or gravacao_minimo_semanal >= 0),
  add column if not exists gravacao_meta_semanal integer check (gravacao_meta_semanal is null or gravacao_meta_semanal > 0),
  add column if not exists gravacao_maximo_semanal integer check (gravacao_maximo_semanal is null or gravacao_maximo_semanal >= 0);

alter table public.editorial_conta
  add column if not exists minimo_semanal integer check (minimo_semanal is null or minimo_semanal >= 0),
  add column if not exists maximo_semanal integer check (maximo_semanal is null or maximo_semanal >= 0),
  add column if not exists gravacao_minimo_semanal integer check (gravacao_minimo_semanal is null or gravacao_minimo_semanal >= 0),
  add column if not exists gravacao_meta_semanal integer check (gravacao_meta_semanal is null or gravacao_meta_semanal > 0),
  add column if not exists gravacao_maximo_semanal integer check (gravacao_maximo_semanal is null or gravacao_maximo_semanal >= 0);

comment on column public.editorial_vigencia.limite_semanal is
  'META geral de postagens por semana, contada por roteiro (um roteiro em 3 contas = 1).';
comment on column public.editorial_vigencia.gravacao_meta_semanal is
  'META geral de gravações por semana, por roteiro, só peças de câmera. Nulo = não acompanha.';

-- B) Faixas por conta e por formato. parcelas_formato continua sendo a meta.
alter table public.editorial_conta_meta
  add column if not exists minimo_semanal integer check (minimo_semanal is null or minimo_semanal >= 0),
  add column if not exists maximo_semanal integer check (maximo_semanal is null or maximo_semanal >= 0),
  add column if not exists faixas_formato jsonb
    check (faixas_formato is null or jsonb_typeof(faixas_formato) = 'object');

comment on column public.editorial_conta_meta.faixas_formato is
  'Por formato: {minimo, maximo}. A meta do formato fica em parcelas_formato. O grupo (gravação ou produção) sai do formato.';
comment on column public.editorial_conta_meta.limite_semanal is
  'Total opcional da conta por semana. Nulo = o total é a soma dos formatos.';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'editorial_conta_meta_faixa_ordem') then
    alter table public.editorial_conta_meta add constraint editorial_conta_meta_faixa_ordem check (
      (minimo_semanal is null or limite_semanal is null or minimo_semanal <= limite_semanal)
      and (maximo_semanal is null or limite_semanal is null or maximo_semanal >= limite_semanal)
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'editorial_vigencia_faixa_ordem') then
    alter table public.editorial_vigencia add constraint editorial_vigencia_faixa_ordem check (
      (minimo_semanal is null or limite_semanal is null or minimo_semanal <= limite_semanal)
      and (maximo_semanal is null or limite_semanal is null or maximo_semanal >= limite_semanal)
      and (gravacao_minimo_semanal is null or gravacao_meta_semanal is null or gravacao_minimo_semanal <= gravacao_meta_semanal)
      and (gravacao_maximo_semanal is null or gravacao_meta_semanal is null or gravacao_maximo_semanal >= gravacao_meta_semanal)
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'editorial_conta_faixa_ordem') then
    alter table public.editorial_conta add constraint editorial_conta_faixa_ordem check (
      (minimo_semanal is null or limite_semanal is null or minimo_semanal <= limite_semanal)
      and (maximo_semanal is null or limite_semanal is null or maximo_semanal >= limite_semanal)
      and (gravacao_minimo_semanal is null or gravacao_meta_semanal is null or gravacao_minimo_semanal <= gravacao_meta_semanal)
      and (gravacao_maximo_semanal is null or gravacao_meta_semanal is null or gravacao_maximo_semanal >= gravacao_meta_semanal)
    );
  end if;
end $$;

-- C) Ciência do aviso. semana_inicio = segunda da semana em que o aviso apareceu.
create table if not exists public.editorial_aviso_ciente (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  semana_inicio date not null,
  tipo text not null check (tipo in (
    'gravacao-acima', 'gravacao-abaixo', 'precisa-gravar',
    'postagem-acima', 'postagem-abaixo',
    'conta-acima', 'conta-abaixo',
    'formato-acima', 'formato-abaixo',
    'producao-acima', 'producao-abaixo'
  )),
  platform_id text references public.platforms (id) on delete cascade,
  formato text,
  nota text not null default '',
  created_at timestamptz not null default now()
);

create unique index if not exists editorial_aviso_ciente_unico
  on public.editorial_aviso_ciente (user_id, semana_inicio, tipo, coalesce(platform_id, ''), coalesce(formato, ''));

comment on table public.editorial_aviso_ciente is
  'A pessoa confirmou que quer fazer a mais. Não bloqueia. platform_id nulo = aviso geral.';

-- D) Leituras da conta ao longo do tempo. Manual hoje, API depois, mesma tabela.
create table if not exists public.conta_metrica (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  platform_id text not null references public.platforms (id) on delete cascade,
  registrado_em date not null,
  seguidores integer check (seguidores is null or seguidores >= 0),
  alcance bigint check (alcance is null or alcance >= 0),
  visualizacoes bigint check (visualizacoes is null or visualizacoes >= 0),
  interacoes bigint check (interacoes is null or interacoes >= 0),
  janela_dias smallint check (janela_dias is null or janela_dias > 0),
  extras jsonb not null default '{}'::jsonb check (jsonb_typeof(extras) = 'object'),
  origem text not null default 'manual' check (origem in ('manual', 'importacao', 'api')),
  externo_ref text,
  nota text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists conta_metrica_dia_origem
  on public.conta_metrica (user_id, platform_id, registrado_em, origem);

-- E) Período de análise. Não alimenta a Saúde.
create table if not exists public.periodo_analise (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  nome text not null default '',
  inicio date not null,
  fim date not null,
  o_que_mudei text not null default '',
  conclusao text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint periodo_analise_intervalo check (inicio <= fim)
);

create table if not exists public.periodo_analise_conta (
  periodo_id uuid not null references public.periodo_analise (id) on delete cascade,
  platform_id text not null references public.platforms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (periodo_id, platform_id)
);

do $$
declare tabela text;
begin
  foreach tabela in array array['editorial_aviso_ciente', 'conta_metrica', 'periodo_analise', 'periodo_analise_conta'] loop
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
