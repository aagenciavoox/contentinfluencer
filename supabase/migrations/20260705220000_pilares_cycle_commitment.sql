ALTER TABLE pilares
  ADD COLUMN IF NOT EXISTS frequencia_semanal smallint
    CHECK (frequencia_semanal IS NULL OR frequencia_semanal BETWEEN 0 AND 14),
  ADD COLUMN IF NOT EXISTS meta_ciclo smallint
    CHECK (meta_ciclo IS NULL OR meta_ciclo BETWEEN 0 AND 60);
