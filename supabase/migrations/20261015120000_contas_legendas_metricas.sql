-- Contas, legendas da série e métricas por publicação.
--
-- Aditiva e idempotente. Não apaga nem reaponta vínculos: cada linha de
-- `platforms` passa a representar uma conta, e publicações, horários,
-- hashtags de pilar e série e métricas continuam ligados pelo mesmo
-- `platform_id`. Nenhuma publicação é criada, copiada ou fundida.
--
-- O que não dá para decidir sozinho fica listado na view `contas_revisao`,
-- para a pessoa resolver na tela Contas e horários.

-- ---------------------------------------------------------------------------
-- 1. Conta: plataforma, @ e a estrutura da conexão futura.
--    O estado de cadastro continua sendo `ativo`.
--    Cadastrar o @ não conecta a conta: `conexao_status` só muda pela integração.
-- ---------------------------------------------------------------------------

alter table public.platforms
  add column if not exists rede text,
  add column if not exists handle text,
  add column if not exists conexao_status text not null default 'nao_conectada',
  add column if not exists conexao_provedor text,
  add column if not exists conexao_conta_externa_id text,
  add column if not exists conexao_atualizada_em timestamptz,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'platforms_rede_check'
      and conrelid = 'public.platforms'::regclass
  ) then
    alter table public.platforms
      add constraint platforms_rede_check
      check (rede is null or rede in ('instagram', 'tiktok', 'youtube', 'outra'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'platforms_conexao_status_check'
      and conrelid = 'public.platforms'::regclass
  ) then
    alter table public.platforms
      add constraint platforms_conexao_status_check
      check (conexao_status in ('nao_conectada', 'conectada', 'expirada', 'erro'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'platforms_handle_check'
      and conrelid = 'public.platforms'::regclass
  ) then
    -- Guardado sem arroba e sem espaços. A tela mostra com @.
    alter table public.platforms
      add constraint platforms_handle_check
      check (handle is null or (handle <> '' and handle !~ '[@[:space:]]'));
  end if;
end $$;

-- Só nomes inequívocos ganham plataforma. Qualquer outro nome fica sem rede
-- e aparece na revisão, em vez de ser adivinhado.
update public.platforms
set rede = case lower(regexp_replace(nome, '\s+', '', 'g'))
  when 'instagram' then 'instagram'
  when 'tiktok' then 'tiktok'
  when 'youtube' then 'youtube'
  when 'blog' then 'outra'
end
where rede is null
  and lower(regexp_replace(nome, '\s+', '', 'g')) in ('instagram', 'tiktok', 'youtube', 'blog');

-- O @ identifica a conta na tela. Dois cadastros da mesma pessoa não podem
-- repetir o mesmo @ na mesma plataforma.
create unique index if not exists platforms_user_rede_handle_key
  on public.platforms (user_id, rede, lower(handle))
  where handle is not null and rede is not null;

-- ---------------------------------------------------------------------------
-- 2. Publicação: identificador externo, preenchido só pela integração.
--    O link e o código do post (`post_url`, `post_codigo`) já existem.
-- ---------------------------------------------------------------------------

alter table public.content_plataformas
  add column if not exists externo_id text;

create unique index if not exists content_plataformas_externo_id_key
  on public.content_plataformas (platform_id, externo_id)
  where externo_id is not null;

-- ---------------------------------------------------------------------------
-- 3. Série: legenda-base e versão por conta. Orientam os roteiros novos.
--    Vazio em `serie_plataformas.legenda` = a conta usa a legenda-base da série.
-- ---------------------------------------------------------------------------

alter table public.series
  add column if not exists legenda_base text;

alter table public.serie_plataformas
  add column if not exists legenda text;

-- ---------------------------------------------------------------------------
-- 4. Métricas: pertencem à publicação na conta, não ao conteúdo.
--    O mesmo vídeo em duas contas tem duas linhas de métrica.
-- ---------------------------------------------------------------------------

do $$
declare
  tipo_id text;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'content_metrics'
      and column_name = 'publicacao_id'
  ) then
    -- O tipo do id da publicação varia entre instalações antigas (text) e novas (uuid).
    select format_type(a.atttypid, a.atttypmod) into tipo_id
    from pg_attribute a
    where a.attrelid = 'public.content_plataformas'::regclass
      and a.attname = 'id'
      and not a.attisdropped;

    execute format(
      'alter table public.content_metrics add column publicacao_id %s references public.content_plataformas(id) on delete cascade',
      tipo_id
    );
  end if;
end $$;

alter table public.content_metrics
  add column if not exists origem text not null default 'manual',
  add column if not exists atualizado_em timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'content_metrics_origem_check'
      and conrelid = 'public.content_metrics'::regclass
  ) then
    alter table public.content_metrics
      add constraint content_metrics_origem_check
      check (origem in ('manual', 'importacao', 'api'));
  end if;
end $$;

update public.content_metrics
set atualizado_em = created_at
where atualizado_em is null;

-- Liga cada métrica antiga à publicação só quando existe exatamente uma
-- publicação original do conteúdo naquela conta. Com zero ou mais de uma,
-- fica sem vínculo e entra na revisão.
with candidatas as (
  select m.id as metrica_id,
         (array_agg(cp.id))[1] as publicacao_id,
         count(*) as total
  from public.content_metrics m
  join public.content_plataformas cp
    on cp.content_id = m.content_id
   and cp.platform_id = m.platform_id
   and coalesce(cp.publication_kind, 'post') = 'post'
  where m.publicacao_id is null
  group by m.id
)
update public.content_metrics m
set publicacao_id = c.publicacao_id
from candidatas c
where m.id = c.metrica_id
  and c.total = 1;

-- Uma linha por publicação. As antigas, ainda sem publicação, mantêm a regra
-- de uma por conteúdo e conta.
alter table public.content_metrics
  drop constraint if exists content_metrics_content_platform_unique;

create unique index if not exists content_metrics_publicacao_key
  on public.content_metrics (publicacao_id)
  where publicacao_id is not null;

create unique index if not exists content_metrics_legado_key
  on public.content_metrics (content_id, platform_id)
  where publicacao_id is null;

-- ---------------------------------------------------------------------------
-- 5. Revisão: casos que a migração não resolve sozinha.
--    `security_invoker` faz a view respeitar o RLS de quem consulta.
-- ---------------------------------------------------------------------------

create or replace view public.contas_revisao
with (security_invoker = true) as
select * from (
  -- Nome que não indica a plataforma: a pessoa escolhe.
  select p.user_id,
         'conta_sem_plataforma'::text as caso,
         p.id::text as referencia,
         p.nome::text as detalhe
  from public.platforms p
  where p.user_id is not null
    and p.rede is null
) conta_sem_plataforma
union all
select * from (
  -- Duas contas da mesma plataforma, com o mesmo nome e sem @.
  select p.user_id,
         'contas_indistintas'::text,
         p.id::text,
         p.nome::text
  from public.platforms p
  where p.user_id is not null
    and p.rede is not null
    and p.handle is null
    and exists (
      select 1 from public.platforms q
      where q.user_id = p.user_id
        and q.id <> p.id
        and q.rede = p.rede
        and q.handle is null
        and lower(btrim(q.nome)) = lower(btrim(p.nome))
    )
) contas_indistintas
union all
select * from (
  -- Mais de uma publicação original do mesmo conteúdo na mesma conta.
  select c.user_id,
         'publicacao_repetida'::text,
         cp.content_id::text || ':' || cp.platform_id::text,
         c.title::text
  from public.content_plataformas cp
  join public.contents c on c.id = cp.content_id
  where coalesce(cp.publication_kind, 'post') = 'post'
  group by c.user_id, cp.content_id, cp.platform_id, c.title
  having count(*) > 1
) publicacao_repetida
union all
select * from (
  -- Publicação num cadastro compartilhado, sem dono: ele não guarda @ nem conexão.
  select c.user_id,
         'publicacao_em_cadastro_compartilhado'::text,
         cp.id::text,
         c.title::text
  from public.content_plataformas cp
  join public.platforms p on p.id = cp.platform_id
  join public.contents c on c.id = cp.content_id
  where p.user_id is null
) publicacao_em_cadastro_compartilhado
union all
select * from (
  -- Métrica antiga sem publicação única para receber.
  select m.user_id,
         'metrica_sem_publicacao'::text,
         m.id::text,
         coalesce(c.title, '')::text
  from public.content_metrics m
  left join public.contents c on c.id = m.content_id
  where m.publicacao_id is null
) metrica_sem_publicacao
union all
select * from (
  -- Link do tempo em que o conteúdo tinha um link só, ainda sem publicação.
  select c.user_id,
         'link_sem_publicacao'::text,
         c.id::text,
         c.title::text
  from public.contents c
  where c.deleted_at is null
    and nullif(btrim(c.link), '') is not null
    and not exists (
      select 1 from public.content_plataformas cp
      where cp.content_id = c.id
        and cp.post_url = c.link
    )
) link_sem_publicacao;

revoke all on public.contas_revisao from anon;
grant select on public.contas_revisao to authenticated;

notify pgrst, 'reload schema';
