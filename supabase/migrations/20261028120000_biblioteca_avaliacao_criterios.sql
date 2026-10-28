-- Avaliação do livro por critério (personagens, escrita, cenário, divertimento, envolvimento, plot).
-- JSON com notas de 0 a 5, de meia em meia. A coluna avaliacao (1..5) segue como a média arredondada.
-- Só adiciona: não apaga nem reescreve dados. Pode rodar mais de uma vez.

alter table public.biblioteca_items
  add column if not exists avaliacao_criterios jsonb;

notify pgrst, 'reload schema';
