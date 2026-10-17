-- =============================================================================
-- Blog/site como rede própria + modo de escrita Carrossel nos roteiros
-- =============================================================================
-- Só adições seguras e idempotentes: pode rodar mais de uma vez sem efeito extra.
-- Nada é apagado: nenhum roteiro (contents), nenhuma conta, nenhum post-it.
-- Nenhuma conta é criada: Blog/site entra em Contas só quando a pessoa cadastrar.
-- Os únicos DROP são de regras de validação (check), recriadas na hora mais largas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Contas (platforms): aceitar a rede 'blog'
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'platforms' and column_name = 'rede'
  ) then
    -- Regra antiga só aceitava instagram, tiktok, youtube e outra. A nova inclui blog.
    alter table public.platforms drop constraint if exists platforms_rede_check;
    alter table public.platforms
      add constraint platforms_rede_check
      check (rede is null or rede in ('instagram', 'tiktok', 'youtube', 'blog', 'outra'));

    -- Só contas comprovadamente de blog mudam de 'outra' (ou sem rede) para 'blog':
    -- o nome, sem espaços e sem maiúsculas, é exatamente blog, site, blog/site, blogsite ou blog-site.
    -- Qualquer outra conta marcada como 'outra' (newsletter, podcast…) continua como está.
    -- Proteção do índice único (pessoa, rede, @): se duas contas de blog da mesma pessoa
    -- têm o mesmo @, só uma muda; a outra fica como estava, sem erro e sem perder nada.
    with candidatas as (
      select p.id,
             p.user_id,
             lower(p.handle) as arroba,
             row_number() over (
               partition by p.user_id, lower(p.handle)
               order by (p.rede = 'outra') desc nulls last, p.created_at, p.id
             ) as ordem
        from public.platforms p
       where (p.rede = 'outra' or p.rede is null)
         and lower(regexp_replace(coalesce(p.nome, ''), '\s+', '', 'g'))
             in ('blog', 'site', 'blog/site', 'blogsite', 'blog-site')
    )
    update public.platforms alvo
       set rede = 'blog'
      from candidatas c
     where alvo.id = c.id
       and (
         c.arroba is null
         or (
           c.ordem = 1
           and not exists (
             select 1
               from public.platforms ja_blog
              where ja_blog.user_id is not distinct from c.user_id
                and ja_blog.rede = 'blog'
                and lower(ja_blog.handle) = c.arroba
           )
         )
       );

    -- Nenhuma conta nova é criada aqui: quem quiser Blog/site cadastra em Contas.
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Post-its do planejamento: aceitar 'blog' na lista de redes
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'planejamento_postits' and column_name = 'redes'
  ) then
    alter table public.planejamento_postits drop constraint if exists planejamento_postits_redes_check;
    alter table public.planejamento_postits
      add constraint planejamento_postits_redes_check
      check (redes <@ array['instagram', 'tiktok', 'youtube', 'blog', 'outra']::text[]);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 3. Roteiros (contents): modo de escrita e telas do carrossel
-- -----------------------------------------------------------------------------
-- Colunas novas com valor padrão: todo roteiro existente vira 'texto' e fica igual.
-- O texto do roteiro (script) não é tocado; as telas ficam numa coluna separada.
alter table public.contents
  add column if not exists writing_mode text not null default 'texto';

alter table public.contents
  add column if not exists carousel_slides jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'contents_writing_mode_check'
      and conrelid = 'public.contents'::regclass
  ) then
    alter table public.contents
      add constraint contents_writing_mode_check
      check (writing_mode in ('texto', 'carrossel'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'contents_carousel_slides_array_check'
      and conrelid = 'public.contents'::regclass
  ) then
    alter table public.contents
      add constraint contents_carousel_slides_array_check
      check (jsonb_typeof(carousel_slides) = 'array');
  end if;
end $$;

comment on column public.contents.writing_mode is
  'Modo de escrita do roteiro: texto (padrão) ou carrossel.';
comment on column public.contents.carousel_slides is
  'Telas do carrossel: [{id, html, images: [{id, value}], comments?}]. O script continua guardado.';

-- Avisa a API (PostgREST) que há colunas novas.
notify pgrst, 'reload schema';
