-- Situações por conta — parte 1 de 2 (expandir).
-- Aceita prevista e programada sem tirar agendada: o app lê agendada como prevista.
-- A parte 2 (reescrever dados e contrair) fica condicionada à liberação, junto com a parte 2 das etapas.

ALTER TABLE public.content_plataformas
  DROP CONSTRAINT IF EXISTS content_plataformas_status_check;

ALTER TABLE public.content_plataformas
  ADD CONSTRAINT content_plataformas_status_check
  CHECK (status IN (
    'agendada',
    'prevista',
    'programada',
    'publicada',
    'nao_publicada',
    'removida'
  ));

NOTIFY pgrst, 'reload schema';
