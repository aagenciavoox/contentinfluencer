-- Marca anotações já transformadas em ideia/conteúdo (substitui book_annotations.destilada).
ALTER TABLE public.anotacoes
  ADD COLUMN IF NOT EXISTS destilada boolean NOT NULL DEFAULT false;
