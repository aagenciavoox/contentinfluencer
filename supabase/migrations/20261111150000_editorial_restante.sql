-- Restante do Editorial/Séries (aditiva: só colunas novas e a troca de uma regra de check).
-- Nada aqui apaga roteiros, séries, temporadas, metas ou publicações.

-- 1) Destino da série/quadro = conta + formato. Nulo = segue a dedução atual do app.
alter table public.serie_plataformas
  add column if not exists formato text;

alter table public.serie_plataformas
  drop constraint if exists serie_plataformas_formato_check;

alter table public.serie_plataformas
  add constraint serie_plataformas_formato_check
  check (formato is null or formato in ('short', 'video-longo', 'reels', 'carrossel', 'stories'));

comment on column public.serie_plataformas.formato is
  'Formato do destino padrão da série ou quadro nesta conta (short, video-longo, reels, carrossel, stories). Nulo = dedução do app.';

-- 2) Data em que a temporada foi arquivada. A partir dela os episódios voltam para a meta da série.
--    Temporadas já arquivadas ficam com nulo e mantêm a regra antiga.
alter table public.temporadas
  add column if not exists arquivada_em date;

comment on column public.temporadas.arquivada_em is
  'Dia em que a temporada foi arquivada. Antes dele vale o acompanhamento próprio; a partir dele os episódios voltam para a série.';

-- 3) Indicadores opcionais da rotina de criação (faixa mínimo/meta/máximo).
alter table public.editorial_conta
  add column if not exists indicadores_producao jsonb;

comment on column public.editorial_conta.indicadores_producao is
  'Indicadores opcionais: roteiros revisados por semana e vídeos por dia de gravação, cada um com {minimo, meta, maximo}.';

-- 4) Legenda-base do pilar.
alter table public.pilares
  add column if not exists legenda_base text;

comment on column public.pilares.legenda_base is
  'Legenda-base sugerida para os roteiros do pilar. Opcional.';

-- 5) Stories como formato da publicação (Instagram). Troca só a regra de check; os dados ficam.
alter table public.content_plataformas
  drop constraint if exists content_plataformas_formato_publicacao_check;

alter table public.content_plataformas
  add constraint content_plataformas_formato_publicacao_check
  check (
    formato_publicacao is null
    or formato_publicacao in ('short', 'video-longo', 'reels', 'carrossel', 'stories')
  );

notify pgrst, 'reload schema';