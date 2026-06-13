-- Migration: posting_times table
-- Substitui o blob JSON em user_preferences por uma tabela real,
-- com suporte a horários diferentes por plataforma.
-- Data: 2026-06-13

CREATE TABLE IF NOT EXISTS posting_times (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_id UUID REFERENCES platforms(id) ON DELETE CASCADE, -- NULL = horário global
  weekday     SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  time        TEXT NOT NULL CHECK (time ~ '^\d{2}:\d{2}$'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, platform_id, weekday, time)
);

-- RLS
ALTER TABLE posting_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own posting_times"
  ON posting_times FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE posting_times;

-- Índice para queries por usuário + plataforma
CREATE INDEX IF NOT EXISTS posting_times_user_platform_idx
  ON posting_times (user_id, platform_id, weekday);

-- Coluna destilada em anotacoes (se não existir)
ALTER TABLE anotacoes ADD COLUMN IF NOT EXISTS destilada BOOLEAN NOT NULL DEFAULT FALSE;
