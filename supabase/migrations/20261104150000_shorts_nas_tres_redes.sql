-- Roteiros e ideias que já saíam no Instagram, TikTok e YouTube eram o vídeo curto.
-- A coluna de formato nasceu nula de propósito (a tela deduz), mas a escolha de Shorts
-- precisa ficar gravada para o ícone não voltar a ser o YouTube longo.
update public.content_plataformas as cp
set formato_publicacao = 'short',
    updated_at = now()
where cp.formato_publicacao is null
  and cp.status is distinct from 'removida'
  and cp.platform_id in (select id from public.platforms where rede = 'youtube')
  and cp.content_id in (
    select c.id
    from public.contents as c
    where c.deleted_at is null
      and c.writing_mode is distinct from 'youtube'
      and exists (
        select 1
        from public.content_plataformas as ig
        join public.platforms as pig on pig.id = ig.platform_id
        where ig.content_id = c.id
          and pig.rede = 'instagram'
      )
      and exists (
        select 1
        from public.content_plataformas as tk
        join public.platforms as ptk on ptk.id = tk.platform_id
        where tk.content_id = c.id
          and ptk.rede = 'tiktok'
      )
      and exists (
        select 1
        from public.content_plataformas as yt
        join public.platforms as pyt on pyt.id = yt.platform_id
        where yt.content_id = c.id
          and pyt.rede = 'youtube'
          and yt.status is distinct from 'removida'
      )
  );
