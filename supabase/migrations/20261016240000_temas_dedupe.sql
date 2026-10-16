-- Junta temas repetidos da mesma pessoa que so diferem em maiusculas, acentos,
-- espacos ou "#" (ex.: "Vampiro", "vampíro", "#Vampiro  "). Fica o mais antigo;
-- os roteiros dos repetidos passam para ele. Idempotente. NAO foi rodada.

do $$
declare
  v_movidos integer := 0;
  v_apagados integer := 0;
begin
  if to_regclass('public.temas') is null or to_regclass('public.content_temas') is null then
    raise notice 'temas_dedupe: tabelas de temas ausentes.';
    return;
  end if;

  create temporary table tmp_temas_chave on commit drop as
  select
    t.id,
    t.user_id,
    t.created_at,
    lower(regexp_replace(btrim(regexp_replace(btrim(translate(t.nome,
      'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
      'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn')), '^#+', '')), '\s+', ' ', 'g')) as chave
  from public.temas t;

  create temporary table tmp_temas_mapa on commit drop as
  select k.id as tema_id, first_value(k.id) over (
           partition by k.user_id, k.chave order by k.created_at, k.id
         ) as manter_id
  from tmp_temas_chave k;

  delete from tmp_temas_mapa where tema_id = manter_id;

  with movidos as (
    insert into public.content_temas (content_id, tema_id)
    select distinct ct.content_id, m.manter_id
    from public.content_temas ct
    join tmp_temas_mapa m on m.tema_id = ct.tema_id
    on conflict (content_id, tema_id) do nothing
    returning 1
  )
  select count(*) into v_movidos from movidos;

  with apagados as (
    delete from public.temas t
    using tmp_temas_mapa m
    where t.id = m.tema_id
    returning 1
  )
  select count(*) into v_apagados from apagados;

  raise notice 'temas_dedupe: % vinculos movidos, % temas repetidos apagados', v_movidos, v_apagados;
end $$;

notify pgrst, 'reload schema';