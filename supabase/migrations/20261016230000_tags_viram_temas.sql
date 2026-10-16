-- Tags de usuário viram temas. Tema é o único jeito de agrupar roteiros.
-- Em contents.tags ficam só as marcas internas de produção: gravar e editar.
-- Idempotente: rodar de novo não duplica tema nem vínculo.

do $$
declare
  v_temas_criados integer := 0;
  v_vinculos_criados integer := 0;
  v_conteudos_limpos integer := 0;
begin
  if to_regclass('public.temas') is null or to_regclass('public.content_temas') is null then
    raise notice 'tags_viram_temas: tabelas de temas ausentes; rode 20261004233000_temas_roteiro.sql antes.';
    return;
  end if;

  create temporary table tmp_tags_usuario on commit drop as
  select distinct
    c.id as content_id,
    c.user_id,
    regexp_replace(btrim(regexp_replace(btrim(t.tag), '^#+', '')), '\s+', ' ', 'g') as nome
  from public.contents c
  cross join lateral unnest(coalesce(c.tags, '{}'::text[])) as t(tag)
  where c.user_id is not null
    and lower(btrim(t.tag)) not in ('gravar', 'editar');

  delete from tmp_tags_usuario where nome = '' or lower(nome) in ('gravar', 'editar');

  -- Um tema por nome e por pessoa; aproveita o que já existe (sem diferenciar maiúsculas).
  with novos as (
    select distinct on (user_id, lower(nome)) user_id, nome
    from tmp_tags_usuario
    order by user_id, lower(nome), nome
  ), inseridos as (
    insert into public.temas (id, user_id, nome)
    select gen_random_uuid()::text, n.user_id, n.nome
    from novos n
    where not exists (
      select 1 from public.temas t
      where t.user_id = n.user_id and lower(btrim(t.nome)) = lower(n.nome)
    )
    on conflict do nothing
    returning 1
  )
  select count(*) into v_temas_criados from inseridos;

  with vinculos as (
    insert into public.content_temas (content_id, tema_id)
    select distinct u.content_id, t.id
    from tmp_tags_usuario u
    join public.temas t
      on t.user_id = u.user_id and lower(btrim(t.nome)) = lower(u.nome)
    on conflict (content_id, tema_id) do nothing
    returning 1
  )
  select count(*) into v_vinculos_criados from vinculos;

  -- Deixa em tags só gravar/editar (minúsculo, sem repetir, na ordem original).
  with limpos as (
    update public.contents c
    set tags = coalesce((
      select array_agg(p.tag order by p.ord)
      from (
        select distinct on (lower(btrim(x.tag))) lower(btrim(x.tag)) as tag, x.ord
        from unnest(c.tags) with ordinality as x(tag, ord)
        where lower(btrim(x.tag)) in ('gravar', 'editar')
        order by lower(btrim(x.tag)), x.ord
      ) p
    ), '{}'::text[])
    where exists (
      select 1 from unnest(coalesce(c.tags, '{}'::text[])) as y(tag)
      where lower(btrim(y.tag)) not in ('gravar', 'editar') or y.tag <> lower(btrim(y.tag))
    )
    returning 1
  )
  select count(*) into v_conteudos_limpos from limpos;

  raise notice 'tags_viram_temas: % temas criados, % vínculos criados, % conteúdos com tags limpas',
    v_temas_criados, v_vinculos_criados, v_conteudos_limpos;
end $$;

notify pgrst, 'reload schema';
