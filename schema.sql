-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.agenda_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  date date NOT NULL,
  time time without time zone,
  tipo text NOT NULL DEFAULT 'Outro'::text,
  projeto_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT agenda_items_pkey PRIMARY KEY (id),
  CONSTRAINT agenda_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.anotacoes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid NOT NULL,
  texto text NOT NULL,
  tipo text NOT NULL DEFAULT 'Anotação'::text,
  capitulo_ref text,
  content_potential boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT anotacoes_pkey PRIMARY KEY (id),
  CONSTRAINT anotacoes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT anotacoes_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.biblioteca_items(id)
);
CREATE TABLE public.biblioteca_generos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  tipo text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT biblioteca_generos_pkey PRIMARY KEY (id),
  CONSTRAINT biblioteca_generos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.biblioteca_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'livro'::text,
  titulo text NOT NULL,
  autor_diretor text NOT NULL DEFAULT ''::text,
  capa_url text,
  status text NOT NULL DEFAULT 'Quero consumir'::text,
  data_inicio date,
  data_fim date,
  avaliacao smallint CHECK (avaliacao >= 1 AND avaliacao <= 5),
  notas_gerais text,
  potencial_conteudo smallint CHECK (potencial_conteudo >= 1 AND potencial_conteudo <= 3),
  total_paginas integer,
  paginas_lidas integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT biblioteca_items_pkey PRIMARY KEY (id),
  CONSTRAINT biblioteca_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.cenarios (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text NOT NULL DEFAULT ''::text,
  tempo_setup_minutos integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cenarios_pkey PRIMARY KEY (id),
  CONSTRAINT cenarios_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.content_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content_id uuid NOT NULL,
  platform_id uuid NOT NULL,
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
  registered_at date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT content_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT content_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT content_metrics_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.contents(id),
  CONSTRAINT content_metrics_platform_id_fkey FOREIGN KEY (platform_id) REFERENCES public.platforms(id)
);
CREATE TABLE public.content_plataformas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL,
  platform_id uuid NOT NULL,
  legenda text NOT NULL DEFAULT ''::text,
  hashtags text NOT NULL DEFAULT ''::text,
  publish_date date,
  CONSTRAINT content_plataformas_pkey PRIMARY KEY (id),
  CONSTRAINT content_plataformas_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.contents(id),
  CONSTRAINT content_plataformas_platform_id_fkey FOREIGN KEY (platform_id) REFERENCES public.platforms(id)
);
CREATE TABLE public.contents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'Ideia'::text,
  slot_type text,
  series_id uuid,
  pilar_id uuid,
  look_id uuid,
  cenario_id uuid,
  biblioteca_item_id uuid,
  formato_visual text,
  energia_necessaria text,
  publish_date date,
  recording_date date,
  link text,
  script text,
  script_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags ARRAY NOT NULL DEFAULT '{}'::text[],
  notes text,
  referencias text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT contents_pkey PRIMARY KEY (id),
  CONSTRAINT contents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT contents_series_id_fkey FOREIGN KEY (series_id) REFERENCES public.series(id),
  CONSTRAINT contents_pilar_id_fkey FOREIGN KEY (pilar_id) REFERENCES public.pilares(id),
  CONSTRAINT contents_look_id_fkey FOREIGN KEY (look_id) REFERENCES public.looks(id),
  CONSTRAINT contents_cenario_id_fkey FOREIGN KEY (cenario_id) REFERENCES public.cenarios(id),
  CONSTRAINT contents_biblioteca_item_id_fkey FOREIGN KEY (biblioteca_item_id) REFERENCES public.biblioteca_items(id)
);
CREATE TABLE public.dna_voz (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  promessa_central text NOT NULL DEFAULT ''::text,
  publico text NOT NULL DEFAULT ''::text,
  tom text NOT NULL DEFAULT ''::text,
  nao_faco ARRAY NOT NULL DEFAULT '{}'::text[],
  alertas ARRAY NOT NULL DEFAULT '{}'::text[],
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT dna_voz_pkey PRIMARY KEY (id),
  CONSTRAINT dna_voz_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.golden_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  descricao text NOT NULL DEFAULT ''::text,
  tipo text NOT NULL,
  condicao text NOT NULL DEFAULT 'max'::text,
  periodo text NOT NULL DEFAULT 'semana'::text,
  valor integer NOT NULL DEFAULT 1,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT golden_rules_pkey PRIMARY KEY (id),
  CONSTRAINT golden_rules_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.ideas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  text text NOT NULL,
  pilar_id uuid,
  series_id uuid,
  origem_id uuid,
  promoted_to_content_id uuid,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ideas_pkey PRIMARY KEY (id),
  CONSTRAINT ideas_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT ideas_pilar_id_fkey FOREIGN KEY (pilar_id) REFERENCES public.pilares(id),
  CONSTRAINT ideas_series_id_fkey FOREIGN KEY (series_id) REFERENCES public.series(id),
  CONSTRAINT ideas_origem_id_fkey FOREIGN KEY (origem_id) REFERENCES public.biblioteca_items(id),
  CONSTRAINT ideas_promoted_to_content_id_fkey FOREIGN KEY (promoted_to_content_id) REFERENCES public.contents(id)
);
CREATE TABLE public.item_generos (
  item_id uuid NOT NULL,
  genero_id uuid NOT NULL,
  CONSTRAINT item_generos_pkey PRIMARY KEY (item_id, genero_id),
  CONSTRAINT item_generos_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.biblioteca_items(id),
  CONSTRAINT item_generos_genero_id_fkey FOREIGN KEY (genero_id) REFERENCES public.biblioteca_generos(id)
);
CREATE TABLE public.looks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  numero integer NOT NULL,
  descricao text NOT NULL DEFAULT ''::text,
  cenario_id uuid,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT looks_pkey PRIMARY KEY (id),
  CONSTRAINT looks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT looks_cenario_id_fkey FOREIGN KEY (cenario_id) REFERENCES public.cenarios(id)
);
CREATE TABLE public.pilar_plataformas (
  pilar_id uuid NOT NULL,
  platform_id uuid NOT NULL,
  hashtags text NOT NULL DEFAULT ''::text,
  CONSTRAINT pilar_plataformas_pkey PRIMARY KEY (pilar_id, platform_id),
  CONSTRAINT pilar_plataformas_pilar_id_fkey FOREIGN KEY (pilar_id) REFERENCES public.pilares(id),
  CONSTRAINT pilar_plataformas_platform_id_fkey FOREIGN KEY (platform_id) REFERENCES public.platforms(id)
);
CREATE TABLE public.pilares (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  descricao text NOT NULL DEFAULT ''::text,
  cor text NOT NULL DEFAULT '#888888'::text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pilares_pkey PRIMARY KEY (id),
  CONSTRAINT pilares_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.platforms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT platforms_pkey PRIMARY KEY (id),
  CONSTRAINT platforms_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.projeto_conteudos (
  projeto_id uuid NOT NULL,
  content_id uuid NOT NULL,
  CONSTRAINT projeto_conteudos_pkey PRIMARY KEY (projeto_id, content_id),
  CONSTRAINT projeto_conteudos_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.contents(id),
  CONSTRAINT projeto_conteudos_projeto_id_fkey FOREIGN KEY (projeto_id) REFERENCES public.projetos(id)
);
CREATE TABLE public.projeto_etapas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  projeto_id uuid NOT NULL,
  nome text NOT NULL,
  ordem smallint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente'::text,
  data_prazo date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT projeto_etapas_pkey PRIMARY KEY (id),
  CONSTRAINT projeto_etapas_projeto_id_fkey FOREIGN KEY (projeto_id) REFERENCES public.projetos(id)
);
CREATE TABLE public.projetos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'outro'::text,
  status text NOT NULL DEFAULT 'Planejando'::text,
  data_inicio date,
  data_fim date,
  meta_conteudos integer,
  biblioteca_item_id uuid,
  brand text,
  brand_color text,
  value numeric,
  currency text NOT NULL DEFAULT 'BRL'::text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT projetos_pkey PRIMARY KEY (id),
  CONSTRAINT projetos_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT projetos_biblioteca_item_id_fkey FOREIGN KEY (biblioteca_item_id) REFERENCES public.biblioteca_items(id)
);
CREATE TABLE public.recording_block_contents (
  block_id uuid NOT NULL,
  content_id uuid NOT NULL,
  ordem smallint NOT NULL DEFAULT 0,
  gravado boolean NOT NULL DEFAULT false,
  CONSTRAINT recording_block_contents_pkey PRIMARY KEY (block_id, content_id),
  CONSTRAINT recording_block_contents_block_id_fkey FOREIGN KEY (block_id) REFERENCES public.recording_blocks(id),
  CONSTRAINT recording_block_contents_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.contents(id)
);
CREATE TABLE public.recording_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recording_blocks_pkey PRIMARY KEY (id),
  CONSTRAINT recording_blocks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.serie_pilares (
  serie_id uuid NOT NULL,
  pilar_id uuid NOT NULL,
  CONSTRAINT serie_pilares_pkey PRIMARY KEY (serie_id, pilar_id),
  CONSTRAINT serie_pilares_serie_id_fkey FOREIGN KEY (serie_id) REFERENCES public.series(id),
  CONSTRAINT serie_pilares_pilar_id_fkey FOREIGN KEY (pilar_id) REFERENCES public.pilares(id)
);
CREATE TABLE public.serie_plataformas (
  serie_id uuid NOT NULL,
  platform_id uuid NOT NULL,
  hashtags text NOT NULL DEFAULT ''::text,
  CONSTRAINT serie_plataformas_pkey PRIMARY KEY (serie_id, platform_id),
  CONSTRAINT serie_plataformas_serie_id_fkey FOREIGN KEY (serie_id) REFERENCES public.series(id),
  CONSTRAINT serie_plataformas_platform_id_fkey FOREIGN KEY (platform_id) REFERENCES public.platforms(id)
);
CREATE TABLE public.series (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  template text NOT NULL DEFAULT ''::text,
  notes text NOT NULL DEFAULT ''::text,
  slot_padrao text,
  formato_visual_padrao text,
  estrutura_roteiro text,
  bordao text,
  cor text,
  ativa boolean NOT NULL DEFAULT true,
  frequencia_recomendada text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT series_pkey PRIMARY KEY (id),
  CONSTRAINT series_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  platform_id uuid,
  series_id uuid,
  estrutura jsonb NOT NULL DEFAULT '[]'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT templates_pkey PRIMARY KEY (id),
  CONSTRAINT templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT templates_platform_id_fkey FOREIGN KEY (platform_id) REFERENCES public.platforms(id),
  CONSTRAINT templates_series_id_fkey FOREIGN KEY (series_id) REFERENCES public.series(id)
);
CREATE TABLE public.user_preferences (
  user_id uuid NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  CONSTRAINT user_preferences_pkey PRIMARY KEY (user_id, key),
  CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);