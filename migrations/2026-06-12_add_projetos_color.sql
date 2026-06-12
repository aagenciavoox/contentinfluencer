-- Adiciona a coluna `color` em `projetos`.
-- Ela já existe no schema.sql e é usada por saveProjeto (database.ts),
-- mas nunca foi aplicada no banco — causava:
-- "Could not find the 'color' column of 'projetos' in the schema cache"

ALTER TABLE public.projetos ADD COLUMN IF NOT EXISTS color text;

-- Força o PostgREST (API do Supabase) a recarregar o cache de schema
NOTIFY pgrst, 'reload schema';
