-- Marcação explícita de pauta (post-it e conteúdo). Texto deixa de ser o único sinal.
ALTER TABLE public.planejamento_postits
  ADD COLUMN IF NOT EXISTS pauta_definida boolean;

ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS pauta_definida boolean;

COMMENT ON COLUMN public.planejamento_postits.pauta_definida IS
  'true = pauta marcada; false = sem pauta; null = herda do texto.';

COMMENT ON COLUMN public.contents.pauta_definida IS
  'true = pauta marcada; false = sem pauta; null = herda de scriptOrigem/texto.';

NOTIFY pgrst, 'reload schema';
