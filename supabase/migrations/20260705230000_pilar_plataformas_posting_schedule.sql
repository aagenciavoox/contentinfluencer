ALTER TABLE pilar_plataformas
  ADD COLUMN IF NOT EXISTS melhores_dias smallint[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS janela_inicio text
    CHECK (janela_inicio IS NULL OR janela_inicio ~ '^\d{2}:\d{2}$'),
  ADD COLUMN IF NOT EXISTS janela_fim text
    CHECK (janela_fim IS NULL OR janela_fim ~ '^\d{2}:\d{2}$');
