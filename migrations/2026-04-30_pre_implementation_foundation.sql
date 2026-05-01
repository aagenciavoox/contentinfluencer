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
  add column if not exists minimo integer,
  add column if not exists maximo integer;

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
