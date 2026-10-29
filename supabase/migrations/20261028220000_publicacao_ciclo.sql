-- Repost = novo ciclo no mesmo conteúdo. Ciclo 1 e métricas dele ficam intactos.
-- Sem dados de repost no banco atual: default 1 basta; não há migração de linhas.

ALTER TABLE public.content_plataformas
  ADD COLUMN IF NOT EXISTS ciclo integer NOT NULL DEFAULT 1
  CHECK (ciclo >= 1);

COMMENT ON COLUMN public.content_plataformas.ciclo IS
  'Ciclo de publicação do conteúdo. 1 = original; 2+ = reaproveitamento/repost.';

NOTIFY pgrst, 'reload schema';
