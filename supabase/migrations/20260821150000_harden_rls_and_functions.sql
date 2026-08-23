-- Harden trigger/search_path functions and wrap auth.uid() in (select ...) for RLS initplan.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;

ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.strip_html_text(text) SET search_path = public;

ALTER POLICY "User isolation" ON public.agenda_items
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "anotacoes_all" ON public.anotacoes
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY "Users can manage their own config" ON public.app_config
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "biblioteca_generos_all" ON public.biblioteca_generos
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY "biblioteca_items_all" ON public.biblioteca_items
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY "User isolation" ON public.book_annotations
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "book_annotations: owner access" ON public.book_annotations
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "User isolation" ON public.books
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "campaigns: owner access" ON public.campaigns
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "User isolation" ON public.cenarios
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "content_metrics_all" ON public.content_metrics
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY "content_plataformas_all" ON public.content_plataformas
  USING (content_id IN (
    SELECT contents.id FROM contents
    WHERE contents.user_id = (select auth.uid())
  ));

ALTER POLICY "User isolation" ON public.dna_voz
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "User isolation" ON public.energy_logs
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "User isolation" ON public.golden_rules
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "User isolation" ON public.ideas
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "item_generos_all" ON public.item_generos
  USING (item_id IN (
    SELECT biblioteca_items.id FROM biblioteca_items
    WHERE biblioteca_items.user_id = (select auth.uid())
  ));

ALTER POLICY "User isolation" ON public.looks
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "User isolation" ON public.partnerships
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "pilar_plataformas_all" ON public.pilar_plataformas
  USING (pilar_id IN (
    SELECT pilares.id FROM pilares
    WHERE pilares.user_id = (select auth.uid())
  ));

ALTER POLICY "User isolation" ON public.pilares
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "platforms_delete" ON public.platforms
  USING (user_id = (select auth.uid()));

ALTER POLICY "platforms_insert" ON public.platforms
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY "platforms_select" ON public.platforms
  USING ((user_id IS NULL) OR (user_id = (select auth.uid())));

ALTER POLICY "platforms_update" ON public.platforms
  USING (user_id = (select auth.uid()));

ALTER POLICY "Users can see their own profile" ON public.profiles
  USING ((select auth.uid()) = id);

ALTER POLICY "projeto_conteudos_all" ON public.projeto_conteudos
  USING (projeto_id IN (
    SELECT projetos.id FROM projetos
    WHERE projetos.user_id = (select auth.uid())
  ))
  WITH CHECK (projeto_id IN (
    SELECT projetos.id FROM projetos
    WHERE projetos.user_id = (select auth.uid())
  ));

ALTER POLICY "projeto_etapas_all" ON public.projeto_etapas
  USING (projeto_id IN (
    SELECT projetos.id FROM projetos
    WHERE projetos.user_id = (select auth.uid())
  ))
  WITH CHECK (projeto_id IN (
    SELECT projetos.id FROM projetos
    WHERE projetos.user_id = (select auth.uid())
  ));

ALTER POLICY "projetos_all" ON public.projetos
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY "rbc_all" ON public.recording_block_contents
  USING (block_id IN (
    SELECT recording_blocks.id FROM recording_blocks
    WHERE recording_blocks.user_id = (select auth.uid())
  ));

ALTER POLICY "User isolation" ON public.recording_blocks
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "User isolation" ON public.results
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "serie_pilares_all" ON public.serie_pilares
  USING (serie_id IN (
    SELECT series.id FROM series
    WHERE series.user_id = (select auth.uid())
  ));

ALTER POLICY "serie_plataformas_all" ON public.serie_plataformas
  USING (serie_id IN (
    SELECT series.id FROM series
    WHERE series.user_id = (select auth.uid())
  ));

ALTER POLICY "User isolation" ON public.series
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "templates_all" ON public.templates
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

ALTER POLICY "prefs_all" ON public.user_preferences
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));
