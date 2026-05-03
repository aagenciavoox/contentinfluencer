-- Restores RLS policies required by project persistence.

ALTER TABLE public.projetos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projetos_all" ON public.projetos;
CREATE POLICY "projetos_all" ON public.projetos
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.projeto_etapas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projeto_etapas_all" ON public.projeto_etapas;
CREATE POLICY "projeto_etapas_all" ON public.projeto_etapas
  USING (
    projeto_id IN (SELECT id FROM public.projetos WHERE user_id = auth.uid())
  )
  WITH CHECK (
    projeto_id IN (SELECT id FROM public.projetos WHERE user_id = auth.uid())
  );

ALTER TABLE public.projeto_conteudos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projeto_conteudos_all" ON public.projeto_conteudos;
CREATE POLICY "projeto_conteudos_all" ON public.projeto_conteudos
  USING (
    projeto_id IN (SELECT id FROM public.projetos WHERE user_id = auth.uid())
  )
  WITH CHECK (
    projeto_id IN (SELECT id FROM public.projetos WHERE user_id = auth.uid())
  );
