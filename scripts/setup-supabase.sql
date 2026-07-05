-- =============================================================================
-- Content OS — setup completo para Supabase (projeto aftffcaychrfffefkeoj)
-- =============================================================================

-- ============================================================================
-- MIGRAÃ‡ÃƒO v2: Schema novo para Content OS
-- ============================================================================
-- AVISO: Execute no SQL Editor do Supabase.
-- Se tiver dados importantes nas tabelas antigas (books, campaigns, etc.),
-- faÃ§a backup antes de rodar.
-- ============================================================================


-- ============================================================================
-- 1. DROPAR TABELAS ANTIGAS
-- ============================================================================

DROP TABLE IF EXISTS public.book_annotations CASCADE;
DROP TABLE IF EXISTS public.results CASCADE;
DROP TABLE IF EXISTS public.partnerships CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.energy_logs CASCADE;
DROP TABLE IF EXISTS public.books CASCADE;


-- ============================================================================
-- 2. MODIFICAR TABELAS EXISTENTES
-- ============================================================================

-- dna_voz: adicionar id e updated_at, remover coluna pilares nÃ£o usada
ALTER TABLE public.dna_voz
  ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.dna_voz
  DROP COLUMN IF EXISTS pilares;


-- pilares: adicionar created_at e updated_at, remover colunas substituÃ­das por pilar_plataformas
ALTER TABLE public.pilares
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.pilares
  DROP COLUMN IF EXISTS hashtags_instagram,
  DROP COLUMN IF EXISTS hashtags_tiktok,
  DROP COLUMN IF EXISTS hashtags_youtube,
  DROP COLUMN IF EXISTS template_legenda,
  DROP COLUMN IF EXISTS meta_semanal_min,
  DROP COLUMN IF EXISTS meta_semanal_max;


-- series: adicionar created_at e updated_at, remover colunas substituÃ­das por junction tables
ALTER TABLE public.series
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.series
  DROP COLUMN IF EXISTS pilar_id,
  DROP COLUMN IF EXISTS plataformas_principais,
  DROP COLUMN IF EXISTS hashtags_por_plataforma;


-- cenarios: adicionar created_at
ALTER TABLE public.cenarios
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();


-- looks: renomear cenario_associado_id â†’ cenario_id, adicionar created_at
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'looks'
    AND column_name = 'cenario_associado_id'
  ) THEN
    ALTER TABLE public.looks RENAME COLUMN cenario_associado_id TO cenario_id;
  END IF;
END $$;

ALTER TABLE public.looks
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();


-- contents: adicionar colunas novas, migrar dados, remover colunas antigas
ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS pilar_id text,
  ADD COLUMN IF NOT EXISTS cenario_id text,
  ADD COLUMN IF NOT EXISTS biblioteca_item_id text,
  ADD COLUMN IF NOT EXISTS energia_necessaria text,
  ADD COLUMN IF NOT EXISTS classificacao text,
  ADD COLUMN IF NOT EXISTS publish_time time,
  ADD COLUMN IF NOT EXISTS publish_date_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recording_date_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referencias text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Migrar dados: pillar â†’ pilar_id, scenario â†’ cenario_id, livro_origem_id â†’ biblioteca_item_id
UPDATE public.contents SET pilar_id = pillar WHERE pilar_id IS NULL AND pillar IS NOT NULL;
UPDATE public.contents SET cenario_id = scenario WHERE cenario_id IS NULL AND scenario IS NOT NULL;
UPDATE public.contents SET biblioteca_item_id = livro_origem_id WHERE biblioteca_item_id IS NULL AND livro_origem_id IS NOT NULL;
UPDATE public.contents SET referencias = "references" WHERE referencias IS NULL AND "references" IS NOT NULL;
UPDATE public.contents SET publish_date_enabled = (publish_date IS NOT NULL);
UPDATE public.contents SET recording_date_enabled = (recording_date IS NOT NULL);

-- Converter tags de text para text[] (se necessÃ¡rio)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contents'
    AND column_name = 'tags' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.contents ADD COLUMN tags_new text[] NOT NULL DEFAULT '{}';
    UPDATE public.contents
      SET tags_new = ARRAY(
        SELECT trim(t) FROM unnest(string_to_array(tags, ',')) AS t WHERE trim(t) != ''
      )
      WHERE tags IS NOT NULL AND tags != '';
    ALTER TABLE public.contents DROP COLUMN tags;
    ALTER TABLE public.contents RENAME COLUMN tags_new TO tags;
  END IF;
END $$;

-- Remover colunas antigas de contents
ALTER TABLE public.contents
  DROP COLUMN IF EXISTS pillar,
  DROP COLUMN IF EXISTS scenario,
  DROP COLUMN IF EXISTS livro_origem_id,
  DROP COLUMN IF EXISTS format,
  DROP COLUMN IF EXISTS estimated_duration,
  DROP COLUMN IF EXISTS caption,
  DROP COLUMN IF EXISTS plataformas,
  DROP COLUMN IF EXISTS legendas,
  DROP COLUMN IF EXISTS "references";


-- ideas: renomear colunas, remover FK antiga para books
ALTER TABLE public.ideas
  DROP CONSTRAINT IF EXISTS ideas_livro_origem_id_fkey;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ideas'
    AND column_name = 'pillar'
  ) THEN
    ALTER TABLE public.ideas RENAME COLUMN pillar TO pilar_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ideas'
    AND column_name = 'livro_origem_id'
  ) THEN
    ALTER TABLE public.ideas RENAME COLUMN livro_origem_id TO origem_id;
  END IF;
END $$;


-- recording_blocks: adicionar colunas novas, remover content_ids (substituÃ­do por junction table)
ALTER TABLE public.recording_blocks
  ADD COLUMN IF NOT EXISTS look_label text,
  ADD COLUMN IF NOT EXISTS cenario_label text,
  ADD COLUMN IF NOT EXISTS production_notes text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}';

ALTER TABLE public.recording_blocks
  DROP COLUMN IF EXISTS content_ids;


-- golden_rules: adicionar novas colunas
ALTER TABLE public.golden_rules
  ADD COLUMN IF NOT EXISTS titulo text,
  ADD COLUMN IF NOT EXISTS cor text,
  ADD COLUMN IF NOT EXISTS condicao text NOT NULL DEFAULT 'recomendado',
  ADD COLUMN IF NOT EXISTS periodo text NOT NULL DEFAULT 'semana',
  ADD COLUMN IF NOT EXISTS valor integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minimo integer,
  ADD COLUMN IF NOT EXISTS maximo integer,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();


-- agenda_items: adicionar novas colunas, migrar type â†’ tipo, remover antigas
ALTER TABLE public.agenda_items
  ADD COLUMN IF NOT EXISTS time text,
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'Outro',
  ADD COLUMN IF NOT EXISTS projeto_id text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Migrar type â†’ tipo onde fizer sentido
UPDATE public.agenda_items
  SET tipo = CASE
    WHEN type IN ('ReuniÃ£o', 'Entrega', 'PublicaÃ§Ã£o', 'Outro') THEN type
    ELSE 'Outro'
  END
  WHERE tipo = 'Outro' AND type IS NOT NULL;

ALTER TABLE public.agenda_items
  DROP COLUMN IF EXISTS type,
  DROP COLUMN IF EXISTS slot_type,
  DROP COLUMN IF EXISTS external;


-- ============================================================================
-- 3. CRIAR NOVAS TABELAS
-- ============================================================================

-- platforms
CREATE TABLE IF NOT EXISTS public.platforms (
  id text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT platforms_pkey PRIMARY KEY (id)
);

-- user_preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id uuid NOT NULL REFERENCES auth.users(id),
  key text NOT NULL,
  value text NOT NULL,
  CONSTRAINT user_preferences_pkey PRIMARY KEY (user_id, key)
);

-- pilar_plataformas
CREATE TABLE IF NOT EXISTS public.pilar_plataformas (
  pilar_id text NOT NULL REFERENCES public.pilares(id) ON DELETE CASCADE,
  platform_id text NOT NULL REFERENCES public.platforms(id) ON DELETE CASCADE,
  hashtags text NOT NULL DEFAULT '',
  CONSTRAINT pilar_plataformas_pkey PRIMARY KEY (pilar_id, platform_id)
);

-- serie_pilares
CREATE TABLE IF NOT EXISTS public.serie_pilares (
  serie_id text NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  pilar_id text NOT NULL REFERENCES public.pilares(id) ON DELETE CASCADE,
  CONSTRAINT serie_pilares_pkey PRIMARY KEY (serie_id, pilar_id)
);

-- serie_plataformas
CREATE TABLE IF NOT EXISTS public.serie_plataformas (
  serie_id text NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
  platform_id text NOT NULL REFERENCES public.platforms(id) ON DELETE CASCADE,
  hashtags text NOT NULL DEFAULT '',
  CONSTRAINT serie_plataformas_pkey PRIMARY KEY (serie_id, platform_id)
);

-- biblioteca_generos
CREATE TABLE IF NOT EXISTS public.biblioteca_generos (
  id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  nome text NOT NULL,
  tipo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT biblioteca_generos_pkey PRIMARY KEY (id)
);

-- biblioteca_items
CREATE TABLE IF NOT EXISTS public.biblioteca_items (
  id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  tipo text NOT NULL DEFAULT 'livro',
  titulo text NOT NULL,
  autor_diretor text NOT NULL DEFAULT '',
  capa_url text,
  status text NOT NULL DEFAULT 'Quero ler',
  data_inicio timestamptz,
  data_fim timestamptz,
  avaliacao integer,
  notas_gerais text,
  potencial_conteudo integer,
  total_paginas integer,
  paginas_lidas integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT biblioteca_items_pkey PRIMARY KEY (id)
);

-- item_generos
CREATE TABLE IF NOT EXISTS public.item_generos (
  item_id text NOT NULL REFERENCES public.biblioteca_items(id) ON DELETE CASCADE,
  genero_id text NOT NULL REFERENCES public.biblioteca_generos(id) ON DELETE CASCADE,
  CONSTRAINT item_generos_pkey PRIMARY KEY (item_id, genero_id)
);

-- anotacoes
CREATE TABLE IF NOT EXISTS public.anotacoes (
  id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  item_id text NOT NULL REFERENCES public.biblioteca_items(id) ON DELETE CASCADE,
  texto text NOT NULL,
  tipo text NOT NULL,
  capitulo_ref text,
  content_potential boolean NOT NULL DEFAULT false,
  destilada boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT anotacoes_pkey PRIMARY KEY (id)
);

-- content_plataformas
CREATE TABLE IF NOT EXISTS public.content_plataformas (
  id text NOT NULL DEFAULT gen_random_uuid()::text,
  content_id text NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  platform_id text NOT NULL REFERENCES public.platforms(id) ON DELETE CASCADE,
  legenda text NOT NULL DEFAULT '',
  hashtags text NOT NULL DEFAULT '',
  publish_date date,
  publish_time time,
  publish_date_enabled boolean NOT NULL DEFAULT false,
  CONSTRAINT content_plataformas_pkey PRIMARY KEY (id)
);

-- projetos
CREATE TABLE IF NOT EXISTS public.projetos (
  id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'outro',
  status text NOT NULL DEFAULT 'Planejando',
  data_inicio date,
  data_fim date,
  meta_conteudos integer,
  biblioteca_item_id text REFERENCES public.biblioteca_items(id),
  brand text,
  brand_color text,
  value numeric,
  currency text NOT NULL DEFAULT 'BRL',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT projetos_pkey PRIMARY KEY (id)
);

-- projeto_etapas
CREATE TABLE IF NOT EXISTS public.projeto_etapas (
  id text NOT NULL,
  projeto_id text NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ordem integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  data_prazo date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projeto_etapas_pkey PRIMARY KEY (id)
);

-- projeto_conteudos
CREATE TABLE IF NOT EXISTS public.projeto_conteudos (
  projeto_id text NOT NULL REFERENCES public.projetos(id) ON DELETE CASCADE,
  content_id text NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  CONSTRAINT projeto_conteudos_pkey PRIMARY KEY (projeto_id, content_id)
);

-- recording_block_contents
CREATE TABLE IF NOT EXISTS public.recording_block_contents (
  block_id text NOT NULL REFERENCES public.recording_blocks(id) ON DELETE CASCADE,
  content_id text NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  gravado boolean NOT NULL DEFAULT false,
  CONSTRAINT recording_block_contents_pkey PRIMARY KEY (block_id, content_id)
);

-- templates
CREATE TABLE IF NOT EXISTS public.templates (
  id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  nome text NOT NULL,
  platform_id text REFERENCES public.platforms(id),
  series_id text REFERENCES public.series(id),
  type text NOT NULL DEFAULT 'roteiro',
  estrutura jsonb NOT NULL DEFAULT '[]',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT templates_pkey PRIMARY KEY (id)
);

-- content_metrics
CREATE TABLE IF NOT EXISTS public.content_metrics (
  id text NOT NULL DEFAULT gen_random_uuid()::text,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  content_id text NOT NULL REFERENCES public.contents(id) ON DELETE CASCADE,
  platform_id text NOT NULL REFERENCES public.platforms(id),
  views integer,
  likes integer,
  comments integer,
  saves integer,
  shares integer,
  reposts integer,
  new_followers integer,
  accounts_reached integer,
  watch_time integer,
  retention_rate numeric,
  completion_rate numeric,
  qualitative_notes text,
  registered_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT content_metrics_content_platform_unique UNIQUE (content_id, platform_id)
);


-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

-- platforms
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platforms_select" ON public.platforms;
DROP POLICY IF EXISTS "platforms_insert" ON public.platforms;
DROP POLICY IF EXISTS "platforms_update" ON public.platforms;
DROP POLICY IF EXISTS "platforms_delete" ON public.platforms;
CREATE POLICY "platforms_select" ON public.platforms FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "platforms_insert" ON public.platforms FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "platforms_update" ON public.platforms FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "platforms_delete" ON public.platforms FOR DELETE USING (user_id = auth.uid());

-- user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prefs_all" ON public.user_preferences;
CREATE POLICY "prefs_all" ON public.user_preferences USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- pilar_plataformas
ALTER TABLE public.pilar_plataformas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pilar_plataformas_all" ON public.pilar_plataformas;
CREATE POLICY "pilar_plataformas_all" ON public.pilar_plataformas USING (
  pilar_id IN (SELECT id FROM public.pilares WHERE user_id = auth.uid())
);

-- serie_pilares
ALTER TABLE public.serie_pilares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "serie_pilares_all" ON public.serie_pilares;
CREATE POLICY "serie_pilares_all" ON public.serie_pilares USING (
  serie_id IN (SELECT id FROM public.series WHERE user_id = auth.uid())
);

-- serie_plataformas
ALTER TABLE public.serie_plataformas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "serie_plataformas_all" ON public.serie_plataformas;
CREATE POLICY "serie_plataformas_all" ON public.serie_plataformas USING (
  serie_id IN (SELECT id FROM public.series WHERE user_id = auth.uid())
);

-- biblioteca_generos
ALTER TABLE public.biblioteca_generos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "biblioteca_generos_all" ON public.biblioteca_generos;
CREATE POLICY "biblioteca_generos_all" ON public.biblioteca_generos USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- biblioteca_items
ALTER TABLE public.biblioteca_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "biblioteca_items_all" ON public.biblioteca_items;
CREATE POLICY "biblioteca_items_all" ON public.biblioteca_items USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- item_generos
ALTER TABLE public.item_generos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "item_generos_all" ON public.item_generos;
CREATE POLICY "item_generos_all" ON public.item_generos USING (
  item_id IN (SELECT id FROM public.biblioteca_items WHERE user_id = auth.uid())
);

-- anotacoes
ALTER TABLE public.anotacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anotacoes_all" ON public.anotacoes;
CREATE POLICY "anotacoes_all" ON public.anotacoes USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- content_plataformas
ALTER TABLE public.content_plataformas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "content_plataformas_all" ON public.content_plataformas;
CREATE POLICY "content_plataformas_all" ON public.content_plataformas USING (
  content_id IN (SELECT id FROM public.contents WHERE user_id = auth.uid())
);

-- projetos
ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projetos_all" ON public.projetos;
CREATE POLICY "projetos_all" ON public.projetos USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- projeto_etapas
ALTER TABLE public.projeto_etapas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projeto_etapas_all" ON public.projeto_etapas;
CREATE POLICY "projeto_etapas_all" ON public.projeto_etapas USING (
  projeto_id IN (SELECT id FROM public.projetos WHERE user_id = auth.uid())
);

-- projeto_conteudos
ALTER TABLE public.projeto_conteudos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projeto_conteudos_all" ON public.projeto_conteudos;
CREATE POLICY "projeto_conteudos_all" ON public.projeto_conteudos USING (
  projeto_id IN (SELECT id FROM public.projetos WHERE user_id = auth.uid())
);

-- recording_block_contents
ALTER TABLE public.recording_block_contents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rbc_all" ON public.recording_block_contents;
CREATE POLICY "rbc_all" ON public.recording_block_contents USING (
  block_id IN (SELECT id FROM public.recording_blocks WHERE user_id = auth.uid())
);

-- templates
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "templates_all" ON public.templates;
CREATE POLICY "templates_all" ON public.templates USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- content_metrics
ALTER TABLE public.content_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "content_metrics_all" ON public.content_metrics;
CREATE POLICY "content_metrics_all" ON public.content_metrics USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- ============================================================================
-- PRE-IMPLEMENTATION FOUNDATION
-- Date: 2026-04-30
-- Goal:
--   Prepare the database for the next UI/domain refactor without destructive
--   changes. This migration is additive and includes backfills for compatibility.
-- ============================================================================

begin;

-- ============================================================================
-- CONTENTS
-- Support:
-- - pre-recording vs production flow
-- - simple classification
-- - enabled/disabled schedule toggles
-- ============================================================================

alter table public.contents
  add column if not exists classificacao text,
  add column if not exists recording_date_enabled boolean not null default false,
  add column if not exists publish_date_enabled boolean not null default false;

update public.contents
set recording_date_enabled = true
where recording_date is not null
  and recording_date_enabled = false;

update public.contents
set publish_date_enabled = true
where publish_date is not null
  and publish_date_enabled = false;

create index if not exists idx_contents_user_status_deleted
  on public.contents (user_id, status)
  where deleted_at is null;

create index if not exists idx_contents_user_recording_date
  on public.contents (user_id, recording_date)
  where deleted_at is null;

create index if not exists idx_contents_user_publish_date
  on public.contents (user_id, publish_date)
  where deleted_at is null;

-- Optional safety constraint for the current known statuses.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contents_status_allowed_check'
  ) then
    alter table public.contents
      add constraint contents_status_allowed_check
      check (
        status in (
          'Ideia',
          'Roteiro',
          'Pronto para Gravar',
          'Gravado',
          'A Editar',
          'Editado',
          'Programado',
          'Postado'
        )
      ) not valid;
  end if;
end $$;

update public.contents
set status = 'Roteiro'
where status = 'Ideia'
  and coalesce(nullif(trim(script), ''), '') <> '';

-- ============================================================================
-- CONTENT_PLATAFORMAS
-- Support:
-- - posting date toggle in production/posting flow
-- ============================================================================

alter table public.content_plataformas
  add column if not exists publish_date_enabled boolean not null default false;

update public.content_plataformas
set publish_date_enabled = true
where publish_date is not null
  and publish_date_enabled = false;

create index if not exists idx_content_plataformas_content_platform
  on public.content_plataformas (content_id, platform_id);

-- ============================================================================
-- RECORDING BLOCKS
-- Support:
-- - operational ownership of look/scenario at block level
-- - future removal of global looks/scenarios from the sidebar flow
-- ============================================================================

alter table public.recording_blocks
  add column if not exists look_label text,
  add column if not exists cenario_label text,
  add column if not exists production_notes text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_recording_blocks_user_created
  on public.recording_blocks (user_id, created_at desc);

create index if not exists idx_recording_block_contents_gravado
  on public.recording_block_contents (block_id, gravado, ordem);

-- ============================================================================
-- TEMPLATES
-- Support:
-- - multiple template types
-- ============================================================================

alter table public.templates
  add column if not exists type text not null default 'roteiro';

create index if not exists idx_templates_user_type
  on public.templates (user_id, type, ativo);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'templates_type_allowed_check'
  ) then
    alter table public.templates
      add constraint templates_type_allowed_check
      check (type in ('roteiro', 'legenda', 'outro')) not valid;
  end if;
end $$;

-- ============================================================================
-- GOLDEN RULES
-- Support:
-- - measurable structure: title, minimum, maximum, period
-- - keep old fields for compatibility during rollout
-- ============================================================================

alter table public.golden_rules
  add column if not exists titulo text,
  add column if not exists cor text,
  add column if not exists condicao text not null default 'recomendado',
  add column if not exists periodo text not null default 'semana',
  add column if not exists valor integer not null default 0,
  add column if not exists minimo integer,
  add column if not exists maximo integer,
  add column if not exists created_at timestamptz not null default now();

update public.golden_rules
set titulo = coalesce(nullif(trim(descricao), ''), 'Regra sem titulo')
where titulo is null;

update public.golden_rules
set minimo = valor
where minimo is null
  and condicao = 'min';

update public.golden_rules
set maximo = valor
where maximo is null
  and condicao = 'max';

update public.golden_rules
set minimo = valor,
    maximo = valor
where (minimo is null or maximo is null)
  and condicao = 'recomendado';

create index if not exists idx_golden_rules_user_active
  on public.golden_rules (user_id, ativa, periodo);

-- ============================================================================
-- LIBRARY
-- Support:
-- - new item types: anime, manga
-- - analysis tab aggregates
-- - dynamic forms per type
-- ============================================================================

alter table public.biblioteca_items
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists total_minutos integer,
  add column if not exists minutos_consumidos integer,
  add column if not exists episodios_totais integer,
  add column if not exists episodios_consumidos integer,
  add column if not exists paginas_lidas_override integer,
  add column if not exists paginas_totais_override integer;

create index if not exists idx_biblioteca_items_user_tipo_status
  on public.biblioteca_items (user_id, tipo, status)
  where deleted_at is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'biblioteca_items_tipo_allowed_check'
  ) then
    alter table public.biblioteca_items
      add constraint biblioteca_items_tipo_allowed_check
      check (tipo in ('livro', 'filme', 'serie', U&'s\00E9rie', 'anime', 'manga', 'outro')) not valid;
  end if;
end $$;

-- Normalize the old accented value so the app can migrate to ASCII-safe keys later if desired.
update public.biblioteca_items
set tipo = 'serie'
where tipo = U&'s\00E9rie';

-- ============================================================================
-- SERIES
-- Support:
-- - existing hashtag system already lives in serie_plataformas
-- - add indexes to make merge/suggestion queries cheaper
-- ============================================================================

create index if not exists idx_serie_plataformas_serie_platform
  on public.serie_plataformas (serie_id, platform_id);

create index if not exists idx_pilar_plataformas_pilar_platform
  on public.pilar_plataformas (pilar_id, platform_id);

-- ============================================================================
-- USER PREFERENCES
-- Support:
-- - module flags
-- - future per-user feature toggles without extra tables
-- ============================================================================

insert into public.user_preferences (user_id, key, value)
select distinct user_id, 'modules', '{"regras":true,"series":true,"pilares":true,"analise":true,"looks":true}'::text
from public.contents
where user_id is not null
on conflict (user_id, key) do nothing;

insert into public.user_preferences (user_id, key, value)
select distinct user_id, 'modules', '{"regras":true,"series":true,"pilares":true,"analise":true,"looks":true}'::text
from public.biblioteca_items
where user_id is not null
on conflict (user_id, key) do nothing;

-- ============================================================================
-- COMMENTS FOR ROLLOUT CLARITY
-- ============================================================================

comment on column public.contents.classificacao is
  'Simple editorial classification used in the roteiro tab.';

comment on column public.contents.recording_date_enabled is
  'Explicit toggle for whether recording_date is active in production flow.';

comment on column public.contents.publish_date_enabled is
  'Explicit toggle for whether publish_date is active in production flow.';

comment on column public.recording_blocks.look_label is
  'Block-level look selection/label, replacing future dependency on global looks.';

comment on column public.recording_blocks.cenario_label is
  'Block-level scenario selection/label, replacing future dependency on global scenarios.';

comment on column public.templates.type is
  'Template category: roteiro, legenda, outro.';

comment on column public.golden_rules.titulo is
  'Human-readable title for the measurable rule model.';

comment on column public.golden_rules.minimo is
  'Minimum value expected in the selected period.';

comment on column public.golden_rules.maximo is
  'Maximum value allowed in the selected period.';

comment on column public.biblioteca_items.metadata is
  'Flexible metadata for dynamic library item forms.';

commit;
alter table public.contents
  add column if not exists publish_time time;

alter table public.content_plataformas
  add column if not exists publish_time time;

comment on column public.contents.publish_time is
  'Optional local posting time for the main publication date.';

comment on column public.content_plataformas.publish_time is
  'Optional local posting time for the platform-specific publication date.';
-- Restores RLS policies required by project persistence.

ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projetos_all" ON public.projetos;
CREATE POLICY "projetos_all" ON public.projetos
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.projeto_etapas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projeto_etapas_all" ON public.projeto_etapas;
CREATE POLICY "projeto_etapas_all" ON public.projeto_etapas
  USING (
    projeto_id IN (SELECT id FROM public.projetos WHERE user_id = auth.uid())
  )
  WITH CHECK (
    projeto_id IN (SELECT id FROM public.projetos WHERE user_id = auth.uid())
  );

ALTER TABLE public.projeto_conteudos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projeto_conteudos_all" ON public.projeto_conteudos;
CREATE POLICY "projeto_conteudos_all" ON public.projeto_conteudos
  USING (
    projeto_id IN (SELECT id FROM public.projetos WHERE user_id = auth.uid())
  )
  WITH CHECK (
    projeto_id IN (SELECT id FROM public.projetos WHERE user_id = auth.uid())
  );
NOTIFY pgrst, 'reload schema';
