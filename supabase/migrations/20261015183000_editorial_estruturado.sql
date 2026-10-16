-- Editorial, visão da aba Período e ficha da biblioteca saem de user_preferences.
-- O cache do navegador só espelha estas linhas; a gravação é aqui.

create or replace function public.try_parse_jsonb(raw text)
returns jsonb
language plpgsql
immutable
as $$
begin
  return raw::jsonb;
exception when others then
  return null;
end;
$$;

create table if not exists public.editorial_conta (
  user_id uuid primary key references auth.users (id) on delete cascade,
  limite_semanal integer check (limite_semanal is null or limite_semanal >= 0),
  reserva_fora_series_semanal integer check (reserva_fora_series_semanal is null or reserva_fora_series_semanal >= 0),
  rede_referencia_id text references public.platforms (id) on delete set null,
  reserva_prontos integer check (reserva_prontos is null or reserva_prontos >= 0),
  publico_linguagem text not null default '',
  disponibilidade text not null default '',
  hashtags_fora_series text not null default '',
  quick_series_create boolean not null default true,
  open_info_notices boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint editorial_conta_reserva_cabe_no_limite check (
    reserva_fora_series_semanal is null
    or limite_semanal is null
    or reserva_fora_series_semanal <= limite_semanal
  )
);

create table if not exists public.editorial_visao (
  user_id uuid primary key references auth.users (id) on delete cascade,
  modo text not null check (modo in ('semana', 'mes', 'intervalo')),
  inicio date not null,
  fim date not null,
  updated_at timestamptz not null default now(),
  constraint editorial_visao_intervalo check (inicio <= fim)
);

create table if not exists public.editorial_destino_padrao (
  user_id uuid not null references auth.users (id) on delete cascade,
  platform_id text not null references public.platforms (id) on delete cascade,
  primary key (user_id, platform_id)
);

create table if not exists public.editorial_limite_hashtag (
  user_id uuid not null references auth.users (id) on delete cascade,
  platform_id text not null references public.platforms (id) on delete cascade,
  limite integer not null check (limite >= 0),
  primary key (user_id, platform_id)
);

create table if not exists public.decisao_periodo (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  inicio date not null,
  fim date not null,
  prioridade text not null default '',
  meta_atrair integer check (meta_atrair is null or meta_atrair >= 0),
  meta_converter integer check (meta_converter is null or meta_converter >= 0),
  meta_aprofundar integer check (meta_aprofundar is null or meta_aprofundar >= 0),
  meta_comunidade integer check (meta_comunidade is null or meta_comunidade >= 0),
  meta_acao integer check (meta_acao is null or meta_acao >= 0),
  meta_reter integer check (meta_reter is null or meta_reter >= 0),
  unique (id, user_id),
  unique (user_id, inicio, fim),
  constraint decisao_periodo_intervalo check (inicio <= fim)
);

create table if not exists public.ajuste_semana (
  id uuid primary key default gen_random_uuid(),
  decisao_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  inicio date not null,
  fim date not null,
  limite integer not null check (limite >= 0),
  unique (decisao_id, inicio, fim),
  constraint ajuste_semana_intervalo check (inicio <= fim),
  constraint ajuste_semana_decisao_fkey
    foreign key (decisao_id, user_id)
    references public.decisao_periodo (id, user_id)
    on delete cascade
);

create index if not exists ajuste_semana_user_id_idx on public.ajuste_semana (user_id);
create index if not exists editorial_destino_padrao_platform_id_idx on public.editorial_destino_padrao (platform_id);
create index if not exists editorial_limite_hashtag_platform_id_idx on public.editorial_limite_hashtag (platform_id);

alter table public.biblioteca_items
  add column if not exists editora text,
  add column if not exists ano_publicacao text,
  add column if not exists isbn text,
  add column if not exists idioma text,
  add column if not exists traducao text,
  add column if not exists serie_colecao text,
  add column if not exists colecao_status text,
  add column if not exists colecao_nome text,
  add column if not exists genero_autor text,
  add column if not exists pais_autor text,
  add column if not exists raca_autor text,
  add column if not exists duracao text,
  add column if not exists episodios text,
  add column if not exists duracao_por_episodio text,
  add column if not exists roteirista text,
  add column if not exists distribuidora text,
  add column if not exists plataforma text,
  add column if not exists data_lancamento text,
  add column if not exists pais_origem text,
  add column if not exists faz_parte_de_serie text,
  add column if not exists nome_da_serie text,
  add column if not exists tags_personalizadas text[] not null default '{}',
  add column if not exists quem_indicou text,
  add column if not exists motivo_escolha text,
  add column if not exists capitulos_cobertos text[] not null default '{}';

alter table public.biblioteca_items
  drop constraint if exists biblioteca_items_colecao_status_check;
alter table public.biblioteca_items
  add constraint biblioteca_items_colecao_status_check
  check (colecao_status is null or colecao_status in ('sim', 'nao'));

alter table public.biblioteca_items
  drop constraint if exists biblioteca_items_faz_parte_de_serie_check;
alter table public.biblioteca_items
  add constraint biblioteca_items_faz_parte_de_serie_check
  check (faz_parte_de_serie is null or faz_parte_de_serie in ('sim', 'nao'));

alter table public.editorial_conta enable row level security;
alter table public.editorial_visao enable row level security;
alter table public.editorial_destino_padrao enable row level security;
alter table public.editorial_limite_hashtag enable row level security;
alter table public.decisao_periodo enable row level security;
alter table public.ajuste_semana enable row level security;

do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'editorial_conta',
    'editorial_visao',
    'editorial_destino_padrao',
    'editorial_limite_hashtag',
    'decisao_periodo',
    'ajuste_semana'
  ]
  loop
    execute format('drop policy if exists "User isolation" on public.%I', tabela);
    execute format(
      'create policy "User isolation" on public.%I for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      tabela
    );
    execute format('grant select, insert, update, delete on public.%I to authenticated', tabela);
    execute format('grant select, insert, update, delete on public.%I to service_role', tabela);
  end loop;
end $$;

do $$
declare
  rec record;
  doc jsonb;
  pref jsonb;
  periodo jsonb;
  ajuste jsonb;
  versao int;
  limite int;
  reserva int;
  rede text;
  decisao uuid;
  dia text;
  hora text;
begin
  for rec in
    select user_id, value from public.user_preferences where key = 'editorial_settings'
  loop
    doc := public.try_parse_jsonb(rec.value);
    if doc is null or jsonb_typeof(doc) <> 'object' then
      continue;
    end if;

    versao := case when coalesce(doc->>'versao', '') ~ '^[0-9]+$' then (doc->>'versao')::int else 0 end;
    pref := case when versao >= 2 and jsonb_typeof(doc->'preferencias') = 'object' then doc->'preferencias' else '{}'::jsonb end;

    limite := case
      when versao >= 2 and coalesce(pref->>'limiteSemanal', '') ~ '^[0-9]+$' then (pref->>'limiteSemanal')::int
      else null
    end;
    reserva := case
      when versao >= 2 and coalesce(pref->>'reservaForaSeriesSemanal', '') ~ '^[0-9]+$' then (pref->>'reservaForaSeriesSemanal')::int
      else null
    end;
    if limite is not null and reserva is not null and reserva > limite then
      reserva := limite;
    end if;

    rede := case
      when versao >= 2 then nullif(btrim(pref->>'redeReferenciaId'), '')
      else nullif(btrim(doc->>'redeReferenciaId'), '')
    end;
    if rede is not null and not exists (select 1 from public.platforms p where p.id = rede) then
      rede := null;
    end if;

    insert into public.editorial_conta (
      user_id, limite_semanal, reserva_fora_series_semanal, rede_referencia_id, reserva_prontos,
      publico_linguagem, disponibilidade, hashtags_fora_series, quick_series_create, open_info_notices
    )
    values (
      rec.user_id,
      limite,
      reserva,
      rede,
      case
        when versao >= 2 and coalesce(pref->>'reservaProntos', '') ~ '^[0-9]+$' then (pref->>'reservaProntos')::int
        when coalesce(doc->>'estoqueDesejado', '') ~ '^[0-9]+$' then (doc->>'estoqueDesejado')::int
        else null
      end,
      case when versao >= 2 then coalesce(pref->>'publicoLinguagem', '') else '' end,
      case when versao >= 2 then coalesce(pref->>'disponibilidade', '') else '' end,
      case when versao >= 2 then coalesce(pref->>'hashtagsForaSeries', '') else '' end,
      case when jsonb_typeof(doc->'quickSeriesCreate') = 'boolean' then (doc->>'quickSeriesCreate')::boolean else true end,
      case when jsonb_typeof(doc->'openInfoNotices') = 'boolean' then (doc->>'openInfoNotices')::boolean else true end
    )
    on conflict (user_id) do nothing;

    insert into public.editorial_destino_padrao (user_id, platform_id)
    select rec.user_id, elem
    from jsonb_array_elements_text(case when jsonb_typeof(doc->'destinosPadrao') = 'array' then doc->'destinosPadrao' else '[]'::jsonb end) elem
    join public.platforms p on p.id = elem
    on conflict do nothing;

    insert into public.editorial_limite_hashtag (user_id, platform_id, limite)
    select rec.user_id, chave, valor::int
    from jsonb_each_text(case when jsonb_typeof(doc->'limitesHashtags') = 'object' then doc->'limitesHashtags' else '{}'::jsonb end) as pares(chave, valor)
    join public.platforms p on p.id = chave
    where valor ~ '^[0-9]+$'
    on conflict do nothing;

    if versao >= 2 and jsonb_typeof(doc->'periodos') = 'array' then
      for periodo in
        select value from jsonb_array_elements(doc->'periodos')
      loop
        if coalesce(periodo->>'inicio', '') !~ '^\d{4}-\d{2}-\d{2}$' then continue; end if;
        if coalesce(periodo->>'fim', '') !~ '^\d{4}-\d{2}-\d{2}$' then continue; end if;
        if (periodo->>'inicio') > (periodo->>'fim') then continue; end if;

        insert into public.decisao_periodo (
          user_id, inicio, fim, prioridade,
          meta_atrair, meta_converter, meta_aprofundar, meta_comunidade, meta_acao, meta_reter
        )
        values (
          rec.user_id,
          (periodo->>'inicio')::date,
          (periodo->>'fim')::date,
          coalesce(periodo->>'prioridade', ''),
          case when coalesce(periodo#>>'{metas,atrair}', '') ~ '^[0-9]+$' then (periodo#>>'{metas,atrair}')::int else null end,
          case when coalesce(periodo#>>'{metas,converter}', '') ~ '^[0-9]+$' then (periodo#>>'{metas,converter}')::int else null end,
          case when coalesce(periodo#>>'{metas,aprofundar}', '') ~ '^[0-9]+$' then (periodo#>>'{metas,aprofundar}')::int else null end,
          case when coalesce(periodo#>>'{metas,comunidade}', '') ~ '^[0-9]+$' then (periodo#>>'{metas,comunidade}')::int else null end,
          case when coalesce(periodo#>>'{metas,acao}', '') ~ '^[0-9]+$' then (periodo#>>'{metas,acao}')::int else null end,
          case when coalesce(periodo#>>'{metas,reter}', '') ~ '^[0-9]+$' then (periodo#>>'{metas,reter}')::int else null end
        )
        on conflict (user_id, inicio, fim) do update
          set prioridade = excluded.prioridade,
              meta_atrair = excluded.meta_atrair,
              meta_converter = excluded.meta_converter,
              meta_aprofundar = excluded.meta_aprofundar,
              meta_comunidade = excluded.meta_comunidade,
              meta_acao = excluded.meta_acao,
              meta_reter = excluded.meta_reter
        returning id into decisao;

        if jsonb_typeof(periodo->'ajustesSemana') = 'array' then
          for ajuste in
            select value from jsonb_array_elements(periodo->'ajustesSemana')
          loop
            if coalesce(ajuste->>'inicio', '') !~ '^\d{4}-\d{2}-\d{2}$' then continue; end if;
            if coalesce(ajuste->>'fim', '') !~ '^\d{4}-\d{2}-\d{2}$' then continue; end if;
            if (ajuste->>'inicio') > (ajuste->>'fim') then continue; end if;
            if coalesce(ajuste->>'limite', '') !~ '^[0-9]+$' then continue; end if;
            insert into public.ajuste_semana (decisao_id, user_id, inicio, fim, limite)
            values (
              decisao,
              rec.user_id,
              (ajuste->>'inicio')::date,
              (ajuste->>'fim')::date,
              (ajuste->>'limite')::int
            )
            on conflict (decisao_id, inicio, fim) do update set limite = excluded.limite;
          end loop;
        end if;
      end loop;
    end if;
  end loop;

  for rec in
    select user_id, value from public.user_preferences where key = 'editorial_periodo'
  loop
    doc := public.try_parse_jsonb(rec.value);
    if doc is null then continue; end if;
    if coalesce(doc->>'modo', '') not in ('semana', 'mes', 'intervalo') then continue; end if;
    if coalesce(doc->>'inicio', '') !~ '^\d{4}-\d{2}-\d{2}$' then continue; end if;
    if coalesce(doc->>'fim', '') !~ '^\d{4}-\d{2}-\d{2}$' then continue; end if;
    if (doc->>'inicio') > (doc->>'fim') then continue; end if;
    insert into public.editorial_visao (user_id, modo, inicio, fim)
    values (rec.user_id, doc->>'modo', (doc->>'inicio')::date, (doc->>'fim')::date)
    on conflict (user_id) do nothing;
  end loop;

  for rec in
    select user_id, value from public.user_preferences where key = 'posting_times'
  loop
    doc := public.try_parse_jsonb(rec.value);
    if doc is null or jsonb_typeof(doc) <> 'object' then continue; end if;
    for dia, hora in
      select chave, elem
      from jsonb_each(doc) as dias(chave, lista)
      cross join lateral jsonb_array_elements_text(case when jsonb_typeof(lista) = 'array' then lista else '[]'::jsonb end) elem
      where chave ~ '^[0-6]$' and elem ~ '^\d{2}:\d{2}$'
    loop
      insert into public.posting_times (user_id, platform_id, weekday, time)
      select rec.user_id, null, dia::smallint, hora
      where not exists (
        select 1 from public.posting_times p
        where p.user_id = rec.user_id
          and p.platform_id is null
          and p.weekday = dia::smallint
          and p.time = hora
      );
    end loop;
  end loop;
end $$;

with fichas as (
  select
    user_id,
    substring(key from '^(?:item_meta|book_meta):(.+)$') as item_id,
    case when key like 'item_meta:%' then 1 else 2 end as prioridade,
    public.try_parse_jsonb(value) as doc
  from public.user_preferences
  where key like 'item_meta:%' or key like 'book_meta:%'
),
escolhida as (
  select distinct on (user_id, item_id) user_id, item_id, doc
  from fichas
  where doc is not null and jsonb_typeof(doc) = 'object'
  order by user_id, item_id, prioridade
)
update public.biblioteca_items b
set
  editora = nullif(btrim(escolhida.doc->>'editora'), ''),
  ano_publicacao = nullif(btrim(escolhida.doc->>'anoPublicacao'), ''),
  isbn = nullif(btrim(escolhida.doc->>'isbn'), ''),
  idioma = nullif(btrim(escolhida.doc->>'idioma'), ''),
  traducao = nullif(btrim(escolhida.doc->>'traducao'), ''),
  serie_colecao = nullif(btrim(escolhida.doc->>'serieColecao'), ''),
  colecao_status = case when escolhida.doc->>'colecaoStatus' in ('sim', 'nao') then escolhida.doc->>'colecaoStatus' else null end,
  colecao_nome = nullif(btrim(escolhida.doc->>'colecaoNome'), ''),
  genero_autor = nullif(btrim(escolhida.doc->>'generoAutor'), ''),
  pais_autor = nullif(btrim(escolhida.doc->>'paisAutor'), ''),
  raca_autor = nullif(btrim(escolhida.doc->>'racaAutor'), ''),
  duracao = nullif(btrim(escolhida.doc->>'duracao'), ''),
  episodios = nullif(btrim(escolhida.doc->>'episodios'), ''),
  duracao_por_episodio = nullif(btrim(escolhida.doc->>'duracaoPorEpisodio'), ''),
  roteirista = nullif(btrim(escolhida.doc->>'roteirista'), ''),
  distribuidora = nullif(btrim(escolhida.doc->>'distribuidora'), ''),
  plataforma = nullif(btrim(escolhida.doc->>'plataforma'), ''),
  data_lancamento = nullif(btrim(escolhida.doc->>'dataLancamento'), ''),
  pais_origem = nullif(btrim(escolhida.doc->>'paisOrigem'), ''),
  faz_parte_de_serie = case when escolhida.doc->>'fazParteDeSerie' in ('sim', 'nao') then escolhida.doc->>'fazParteDeSerie' else null end,
  nome_da_serie = nullif(btrim(escolhida.doc->>'nomeDaSerie'), ''),
  tags_personalizadas = coalesce(
    (
      select array_agg(elem) from jsonb_array_elements_text(
        case when jsonb_typeof(escolhida.doc->'tagsPersonalizadas') = 'array' then escolhida.doc->'tagsPersonalizadas' else '[]'::jsonb end
      ) elem
      where btrim(elem) <> ''
    ),
    '{}'
  ),
  quem_indicou = nullif(btrim(escolhida.doc->>'quemIndicou'), ''),
  motivo_escolha = nullif(btrim(escolhida.doc->>'motivoEscolha'), ''),
  capitulos_cobertos = coalesce(
    (
      select array_agg(elem) from jsonb_array_elements_text(
        case when jsonb_typeof(escolhida.doc->'capitulosCobertos') = 'array' then escolhida.doc->'capitulosCobertos' else '[]'::jsonb end
      ) elem
      where btrim(elem) <> ''
    ),
    '{}'
  )
from escolhida
where b.id = escolhida.item_id and b.user_id = escolhida.user_id;

delete from public.user_preferences
where key in ('editorial_settings', 'editorial_periodo', 'posting_times')
   or key like 'item_meta:%'
   or key like 'book_meta:%';

drop function public.try_parse_jsonb(text);

do $$
declare
  tabela text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach tabela in array array[
      'editorial_conta',
      'editorial_visao',
      'editorial_destino_padrao',
      'editorial_limite_hashtag',
      'decisao_periodo',
      'ajuste_semana'
    ]
    loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tabela
      ) then
        execute format('alter publication supabase_realtime add table public.%I', tabela);
      end if;
    end loop;
  end if;
end $$;

notify pgrst, 'reload schema';
