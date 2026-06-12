-- Habilita Supabase Realtime nas tabelas usadas pelo app (espelha REALTIME_TABLES no cliente).
-- Sem isso, browser e PWA na mesma conta nao recebem mudancas entre dispositivos.

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'agenda_items',
    'anotacoes',
    'biblioteca_generos',
    'biblioteca_items',
    'content_metrics',
    'content_plataformas',
    'contents',
    'cenarios',
    'dna_voz',
    'golden_rules',
    'ideas',
    'item_generos',
    'looks',
    'pilar_plataformas',
    'pilares',
    'platforms',
    'projeto_conteudos',
    'projeto_etapas',
    'projetos',
    'recording_block_contents',
    'recording_blocks',
    'serie_pilares',
    'serie_plataformas',
    'series',
    'templates',
    'user_preferences'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;
