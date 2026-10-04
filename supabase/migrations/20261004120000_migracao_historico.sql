-- Rodar só depois que as séries tiverem função padrão configurada no produto.
-- Não é executado pelo app. Conferir as contagens do plano antes e depois.

-- 1. Publicações de conteúdos postados viram "publicada", com a data que existia.
update public.content_plataformas cp
set status = 'publicada',
    realizada_manual_em = coalesce(cp.realizada_manual_em, c.posted_at,
      (coalesce(cp.publish_date, left(c.publish_date::text, 10)::date) + time '12:00'))
from public.contents c
where cp.content_id = c.id and c.status = 'Postado' and cp.status = 'agendada';

-- 2. Link antigo do conteúdo vira código do post do Instagram.
update public.content_plataformas cp
set post_url = c.link,
    post_codigo = substring(c.link from 'instagram\.com/(?:reels?|p|tv)/([A-Za-z0-9_-]+)')
from public.contents c, public.platforms p
where cp.content_id = c.id and p.id = cp.platform_id and p.nome ilike 'instagram%'
  and c.link ilike '%instagram.com/%' and cp.post_codigo is null and cp.publication_kind = 'post';

-- 3. Congela a classificação dos postados com a função da série.
update public.contents c
set funcao = s.funcao_padrao, funcao_origem = 'migrada',
    classificacao_congelada_em = coalesce(c.posted_at, now())
from public.series s
where c.series_id = s.id and c.status = 'Postado' and c.funcao is null
  and s.funcao_padrao is not null and s.funcao_padrao <> 'varia';

-- 4. Postados sem série: só congela, sem função (dá para ajustar à mão depois).
update public.contents set classificacao_congelada_em = coalesce(posted_at, now())
where status = 'Postado' and classificacao_congelada_em is null;
