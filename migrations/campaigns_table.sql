-- ─── Campaigns — Supabase Migration ──────────────────────────────────────────
-- Executar no SQL Editor do Supabase para ativar persistência de campanhas

CREATE TABLE IF NOT EXISTS campaigns (
  id               TEXT        PRIMARY KEY,
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome             TEXT        NOT NULL,
  livro_id         TEXT        REFERENCES books(id) ON DELETE SET NULL,
  data_inicio      TEXT,
  data_fim         TEXT,
  meta_conteudos   INTEGER     NOT NULL DEFAULT 0,
  status           TEXT        NOT NULL DEFAULT 'Planejando', -- 'Planejando' | 'Em Execução' | 'Concluída'
  created_at       TEXT        NOT NULL,
  deleted_at       TIMESTAMPTZ                              -- soft delete
);

CREATE INDEX IF NOT EXISTS idx_campaigns_user    ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_livro   ON campaigns(livro_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status  ON campaigns(status);

-- Row-Level Security: cada usuária só vê seus próprios dados
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns: owner access" ON campaigns
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
