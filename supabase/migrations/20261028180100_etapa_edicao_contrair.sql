-- Etapa Edição e "Publicado" no lugar de "Postado" — parte 2 de 2 (contrair).
--
-- Rode depois que o código novo estiver publicado: o app antigo não reconhece Edição nem Publicado.
-- Não mexe em updated_at, para o card não dizer "Editado hoje" sem ninguém ter editado.

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '2min';

-- Postado passa a se chamar Publicado.
UPDATE public.contents
SET status = 'Publicado'
WHERE status = 'Postado';

-- Vídeo já gravado sai de Produção e vai para Edição, ainda sem "pronto para publicar".
-- Nada indica quais já foram editados: a etiqueta "editar" nunca chegou a ser usada.
UPDATE public.contents
SET status = 'Edição'
WHERE status = 'Produção'
  AND recorded_at IS NOT NULL;

-- Aba aberta com o app antigo, ou integração antiga, ainda pode mandar "Postado": vira Publicado.
CREATE OR REPLACE FUNCTION public.contents_status_legado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Postado' THEN
    NEW.status := 'Publicado';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contents_status_legado ON public.contents;
CREATE TRIGGER contents_status_legado
  BEFORE INSERT OR UPDATE OF status ON public.contents
  FOR EACH ROW
  EXECUTE FUNCTION public.contents_status_legado();

ALTER TABLE public.contents
  DROP CONSTRAINT IF EXISTS contents_status_allowed_check;

ALTER TABLE public.contents
  ADD CONSTRAINT contents_status_allowed_check
  CHECK (status IN ('Ideia', 'Roteiro', 'Produção', 'Edição', 'Publicado'))
  NOT VALID;

ALTER TABLE public.contents
  VALIDATE CONSTRAINT contents_status_allowed_check;

NOTIFY pgrst, 'reload schema';
