-- ─── book_annotations — Supabase Migration ───────────────────────────────────
-- Adiciona colunas que o código usa mas que não existem no schema original.
-- Execute no SQL Editor do Supabase caso anotações não estejam sendo salvas.
--
-- Seguro rodar múltiplas vezes (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

-- 1. Adiciona user_id para vincular anotações ao usuário (necessário para RLS)
ALTER TABLE book_annotations
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Adiciona content_potential (boolean: se a anotação virou ideia de conteúdo)
ALTER TABLE book_annotations
  ADD COLUMN IF NOT EXISTS content_potential BOOLEAN NOT NULL DEFAULT false;

-- 3. Adiciona deleted_at para suportar soft-delete (padrão do restante do sistema)
ALTER TABLE book_annotations
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 4. Popula user_id nas anotações existentes via JOIN com books
UPDATE book_annotations ba
SET user_id = b.user_id
FROM books b
WHERE ba.livro_id = b.id
  AND ba.user_id IS NULL;

-- 5. Índice para queries por usuário
CREATE INDEX IF NOT EXISTS idx_book_annotations_user ON book_annotations(user_id);

-- 6. Row-Level Security — cada usuária só vê suas próprias anotações
ALTER TABLE book_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "book_annotations: owner access" ON book_annotations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
