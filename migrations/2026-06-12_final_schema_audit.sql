-- ============================================================================
-- MIGRATION FINAL — Auditoria de persistência (2026-06-12)
-- Compara database.ts (todas as escritas do app) com o schema atual do banco.
-- Idempotente: pode rodar mais de uma vez sem efeito colateral.
-- Substitui/inclui a migration 2026-06-12_add_projetos_color.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. projetos.color — usada por saveProjeto, não existe no banco.
--    Erro atual: "Could not find the 'color' column of 'projetos'"
-- ----------------------------------------------------------------------------
ALTER TABLE public.projetos ADD COLUMN IF NOT EXISTS color text;

-- ----------------------------------------------------------------------------
-- 2. content_metrics — saveContentMetric usa
--    upsert(..., { onConflict: 'content_id,platform_id' }),
--    mas não existe constraint única nessas colunas.
--    Erro: "there is no unique or exclusion constraint matching the
--    ON CONFLICT specification" → MÉTRICAS NÃO ESTÃO SENDO SALVAS HOJE.
-- ----------------------------------------------------------------------------
-- 2a. Remove duplicatas mantendo o registro mais recente
DELETE FROM public.content_metrics a
USING public.content_metrics b
WHERE a.content_id = b.content_id
  AND a.platform_id = b.platform_id
  AND (a.registered_at, a.id) < (b.registered_at, b.id);

-- 2b. Cria o índice único exigido pelo upsert
CREATE UNIQUE INDEX IF NOT EXISTS content_metrics_content_platform_key
  ON public.content_metrics (content_id, platform_id);

-- ----------------------------------------------------------------------------
-- 3. Foreign keys sem ON DELETE — hoje, deletar conteúdo/série/projeto/
--    plataforma/cenário/item de biblioteca FALHA silenciosamente quando há
--    linhas dependentes (o app faz hard delete e o Postgres bloqueia).
--    Tabelas de junção → CASCADE; referências fracas → SET NULL.
--    NOT VALID: não valida linhas antigas (órfãs), mas aplica o
--    comportamento de delete imediatamente.
-- ----------------------------------------------------------------------------

-- contents ← content_plataformas (junção)
ALTER TABLE public.content_plataformas
  DROP CONSTRAINT IF EXISTS content_plataformas_content_id_fkey;
ALTER TABLE public.content_plataformas
  ADD CONSTRAINT content_plataformas_content_id_fkey
  FOREIGN KEY (content_id) REFERENCES public.contents(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.content_plataformas
  DROP CONSTRAINT IF EXISTS content_plataformas_platform_id_fkey;
ALTER TABLE public.content_plataformas
  ADD CONSTRAINT content_plataformas_platform_id_fkey
  FOREIGN KEY (platform_id) REFERENCES public.platforms(id) ON DELETE CASCADE NOT VALID;

-- contents ← content_metrics
ALTER TABLE public.content_metrics
  DROP CONSTRAINT IF EXISTS content_metrics_content_id_fkey;
ALTER TABLE public.content_metrics
  ADD CONSTRAINT content_metrics_content_id_fkey
  FOREIGN KEY (content_id) REFERENCES public.contents(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.content_metrics
  DROP CONSTRAINT IF EXISTS content_metrics_platform_id_fkey;
ALTER TABLE public.content_metrics
  ADD CONSTRAINT content_metrics_platform_id_fkey
  FOREIGN KEY (platform_id) REFERENCES public.platforms(id) ON DELETE CASCADE NOT VALID;

-- contents ← projeto_conteudos / recording_block_contents (junções)
ALTER TABLE public.projeto_conteudos
  DROP CONSTRAINT IF EXISTS projeto_conteudos_content_id_fkey;
ALTER TABLE public.projeto_conteudos
  ADD CONSTRAINT projeto_conteudos_content_id_fkey
  FOREIGN KEY (content_id) REFERENCES public.contents(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.recording_block_contents
  DROP CONSTRAINT IF EXISTS recording_block_contents_content_id_fkey;
ALTER TABLE public.recording_block_contents
  ADD CONSTRAINT recording_block_contents_content_id_fkey
  FOREIGN KEY (content_id) REFERENCES public.contents(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.recording_block_contents
  DROP CONSTRAINT IF EXISTS recording_block_contents_block_id_fkey;
ALTER TABLE public.recording_block_contents
  ADD CONSTRAINT recording_block_contents_block_id_fkey
  FOREIGN KEY (block_id) REFERENCES public.recording_blocks(id) ON DELETE CASCADE NOT VALID;

-- contents ← ideas.promoted_to_content_id / results.content_id (referências fracas)
ALTER TABLE public.ideas
  DROP CONSTRAINT IF EXISTS ideas_promoted_to_content_id_fkey;
ALTER TABLE public.ideas
  ADD CONSTRAINT ideas_promoted_to_content_id_fkey
  FOREIGN KEY (promoted_to_content_id) REFERENCES public.contents(id) ON DELETE SET NULL NOT VALID;

ALTER TABLE public.results
  DROP CONSTRAINT IF EXISTS results_content_id_fkey;
ALTER TABLE public.results
  ADD CONSTRAINT results_content_id_fkey
  FOREIGN KEY (content_id) REFERENCES public.contents(id) ON DELETE SET NULL NOT VALID;

-- series ← contents / ideas / templates (SET NULL) e junções (CASCADE)
ALTER TABLE public.contents
  DROP CONSTRAINT IF EXISTS contents_series_id_fkey;
ALTER TABLE public.contents
  ADD CONSTRAINT contents_series_id_fkey
  FOREIGN KEY (series_id) REFERENCES public.series(id) ON DELETE SET NULL NOT VALID;

ALTER TABLE public.ideas
  DROP CONSTRAINT IF EXISTS ideas_series_id_fkey;
ALTER TABLE public.ideas
  ADD CONSTRAINT ideas_series_id_fkey
  FOREIGN KEY (series_id) REFERENCES public.series(id) ON DELETE SET NULL NOT VALID;

ALTER TABLE public.templates
  DROP CONSTRAINT IF EXISTS templates_series_id_fkey;
ALTER TABLE public.templates
  ADD CONSTRAINT templates_series_id_fkey
  FOREIGN KEY (series_id) REFERENCES public.series(id) ON DELETE SET NULL NOT VALID;

ALTER TABLE public.templates
  DROP CONSTRAINT IF EXISTS templates_platform_id_fkey;
ALTER TABLE public.templates
  ADD CONSTRAINT templates_platform_id_fkey
  FOREIGN KEY (platform_id) REFERENCES public.platforms(id) ON DELETE SET NULL NOT VALID;

ALTER TABLE public.serie_pilares
  DROP CONSTRAINT IF EXISTS serie_pilares_serie_id_fkey;
ALTER TABLE public.serie_pilares
  ADD CONSTRAINT serie_pilares_serie_id_fkey
  FOREIGN KEY (serie_id) REFERENCES public.series(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.serie_pilares
  DROP CONSTRAINT IF EXISTS serie_pilares_pilar_id_fkey;
ALTER TABLE public.serie_pilares
  ADD CONSTRAINT serie_pilares_pilar_id_fkey
  FOREIGN KEY (pilar_id) REFERENCES public.pilares(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.serie_plataformas
  DROP CONSTRAINT IF EXISTS serie_plataformas_serie_id_fkey;
ALTER TABLE public.serie_plataformas
  ADD CONSTRAINT serie_plataformas_serie_id_fkey
  FOREIGN KEY (serie_id) REFERENCES public.series(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.serie_plataformas
  DROP CONSTRAINT IF EXISTS serie_plataformas_platform_id_fkey;
ALTER TABLE public.serie_plataformas
  ADD CONSTRAINT serie_plataformas_platform_id_fkey
  FOREIGN KEY (platform_id) REFERENCES public.platforms(id) ON DELETE CASCADE NOT VALID;

-- pilares ← pilar_plataformas (junção)
ALTER TABLE public.pilar_plataformas
  DROP CONSTRAINT IF EXISTS pilar_plataformas_pilar_id_fkey;
ALTER TABLE public.pilar_plataformas
  ADD CONSTRAINT pilar_plataformas_pilar_id_fkey
  FOREIGN KEY (pilar_id) REFERENCES public.pilares(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.pilar_plataformas
  DROP CONSTRAINT IF EXISTS pilar_plataformas_platform_id_fkey;
ALTER TABLE public.pilar_plataformas
  ADD CONSTRAINT pilar_plataformas_platform_id_fkey
  FOREIGN KEY (platform_id) REFERENCES public.platforms(id) ON DELETE CASCADE NOT VALID;

-- projetos ← projeto_etapas / projeto_conteudos (CASCADE)
ALTER TABLE public.projeto_etapas
  DROP CONSTRAINT IF EXISTS projeto_etapas_projeto_id_fkey;
ALTER TABLE public.projeto_etapas
  ADD CONSTRAINT projeto_etapas_projeto_id_fkey
  FOREIGN KEY (projeto_id) REFERENCES public.projetos(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.projeto_conteudos
  DROP CONSTRAINT IF EXISTS projeto_conteudos_projeto_id_fkey;
ALTER TABLE public.projeto_conteudos
  ADD CONSTRAINT projeto_conteudos_projeto_id_fkey
  FOREIGN KEY (projeto_id) REFERENCES public.projetos(id) ON DELETE CASCADE NOT VALID;

-- projetos ← agenda_items.projeto_id (não tinha FK; órfãos passam a SET NULL)
ALTER TABLE public.agenda_items
  DROP CONSTRAINT IF EXISTS agenda_items_projeto_id_fkey;
ALTER TABLE public.agenda_items
  ADD CONSTRAINT agenda_items_projeto_id_fkey
  FOREIGN KEY (projeto_id) REFERENCES public.projetos(id) ON DELETE SET NULL NOT VALID;

-- projetos.biblioteca_item_id (referência fraca)
ALTER TABLE public.projetos
  DROP CONSTRAINT IF EXISTS projetos_biblioteca_item_id_fkey;
ALTER TABLE public.projetos
  ADD CONSTRAINT projetos_biblioteca_item_id_fkey
  FOREIGN KEY (biblioteca_item_id) REFERENCES public.biblioteca_items(id) ON DELETE SET NULL NOT VALID;

-- biblioteca_items ← anotacoes / item_generos (CASCADE)
ALTER TABLE public.anotacoes
  DROP CONSTRAINT IF EXISTS anotacoes_item_id_fkey;
ALTER TABLE public.anotacoes
  ADD CONSTRAINT anotacoes_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES public.biblioteca_items(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.item_generos
  DROP CONSTRAINT IF EXISTS item_generos_item_id_fkey;
ALTER TABLE public.item_generos
  ADD CONSTRAINT item_generos_item_id_fkey
  FOREIGN KEY (item_id) REFERENCES public.biblioteca_items(id) ON DELETE CASCADE NOT VALID;

ALTER TABLE public.item_generos
  DROP CONSTRAINT IF EXISTS item_generos_genero_id_fkey;
ALTER TABLE public.item_generos
  ADD CONSTRAINT item_generos_genero_id_fkey
  FOREIGN KEY (genero_id) REFERENCES public.biblioteca_generos(id) ON DELETE CASCADE NOT VALID;

-- cenarios ← looks.cenario_id (SET NULL — deletar cenário não pode travar)
ALTER TABLE public.looks
  DROP CONSTRAINT IF EXISTS looks_cenario_associado_id_fkey;
ALTER TABLE public.looks
  DROP CONSTRAINT IF EXISTS looks_cenario_id_fkey;
ALTER TABLE public.looks
  ADD CONSTRAINT looks_cenario_id_fkey
  FOREIGN KEY (cenario_id) REFERENCES public.cenarios(id) ON DELETE SET NULL NOT VALID;

-- ----------------------------------------------------------------------------
-- 4. updated_at automático — o app nunca envia updated_at; sem trigger,
--    a coluna fica congelada no valor do INSERT.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pilares','series','dna_voz','biblioteca_items','contents','projetos','templates']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      t
    );
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Recarrega o cache de schema do PostgREST (API do Supabase)
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
