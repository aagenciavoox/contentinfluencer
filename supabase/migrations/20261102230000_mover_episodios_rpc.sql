-- Mover e reordenar episódios numa transação só: todos mudam ou nenhum muda.
-- Não apaga dados: cria uma função e recria o trigger set_updated_at de contents com condição.
-- Depende de contents.ordem_episodio (20261102210000_ordem_episodio). A linha abaixo é a mesma
-- da migration pendente (if not exists), então a ordem de aplicação não quebra; o índice continua lá.

alter table public.contents
  add column if not exists ordem_episodio integer;

-- O trigger set_updated_at da tabela contents grava updated_at = now() em todo UPDATE.
-- Recriado com o mesmo nome e a mesma função (que não muda; pode ser usada por outras tabelas),
-- mas só dispara quando algo além de ordem_episodio/updated_at mudou: reordenar não mexe em
-- "Editados por último". Nenhum dado é alterado. Quando a condição é falsa, um updated_at enviado
-- pelo app continua sendo gravado como veio.
drop trigger if exists set_updated_at on public.contents;
create trigger set_updated_at
  before update on public.contents
  for each row
  when ((to_jsonb(new) - 'ordem_episodio' - 'updated_at') is distinct from (to_jsonb(old) - 'ordem_episodio' - 'updated_at'))
  execute function public.set_updated_at();

-- p_itens: episódios que mudam de quadro e/ou temporada, já com pilar e objetivo recalculados
--   pelo app (só os herdados mudam; escolha manual fica). Estes ganham updated_at = now(): mover é edição.
-- p_ordem: ids na ordem final da série (1, 2, 3...). Grava só ordem_episodio, sem updated_at,
--   para reordenar não mexer em "Editados por último".
-- SECURITY INVOKER: valem as políticas de RLS de quem chama. Além disso, filtra por auth.uid() e
-- recusa a operação inteira se algum id não for do usuário.
create or replace function public.mover_episodios(
  p_itens jsonb default '[]'::jsonb,
  p_ordem text[] default null
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_itens jsonb := coalesce(p_itens, '[]'::jsonb);
  v_esperados integer;
  v_alterados integer := 0;
  v_encontrados integer;
begin
  if v_user is null then
    raise exception 'sessão ausente' using errcode = '42501';
  end if;
  if jsonb_typeof(v_itens) <> 'array' then
    raise exception 'p_itens precisa ser uma lista' using errcode = '22023';
  end if;

  v_esperados := jsonb_array_length(v_itens);
  if v_esperados > 0 then
    if (select count(distinct i->>'id') from jsonb_array_elements(v_itens) as i) <> v_esperados then
      raise exception 'episódio repetido em p_itens' using errcode = '22023';
    end if;

    update public.contents c
       set series_id = i.series_id,
           temporada_id = i.temporada_id,
           pilar_id = i.pilar_id,
           pilar_origem = i.pilar_origem,
           funcao = i.funcao,
           funcao_origem = i.funcao_origem,
           updated_at = now()
      from jsonb_to_recordset(v_itens) as i(
        id text,
        series_id text,
        temporada_id text,
        pilar_id text,
        pilar_origem text,
        funcao text,
        funcao_origem text
      )
     where c.id = i.id
       and c.user_id = v_user
       and c.deleted_at is null;
    get diagnostics v_alterados = row_count;

    if v_alterados <> v_esperados then
      raise exception 'episódio inexistente, apagado ou de outro usuário' using errcode = 'P0002';
    end if;
  end if;

  if p_ordem is not null and cardinality(p_ordem) > 0 then
    if (select count(distinct x) from unnest(p_ordem) as x) <> cardinality(p_ordem) then
      raise exception 'episódio repetido em p_ordem' using errcode = '22023';
    end if;

    select count(*) into v_encontrados
      from public.contents c
     where c.id = any (p_ordem)
       and c.user_id = v_user;
    if v_encontrados <> cardinality(p_ordem) then
      raise exception 'episódio inexistente ou de outro usuário na ordem' using errcode = 'P0002';
    end if;

    update public.contents c
       set ordem_episodio = o.posicao::integer
      from unnest(p_ordem) with ordinality as o(id, posicao)
     where c.id = o.id
       and c.user_id = v_user
       and c.ordem_episodio is distinct from o.posicao::integer;
  end if;

  return v_alterados;
end;
$$;

revoke all on function public.mover_episodios(jsonb, text[]) from public;
grant execute on function public.mover_episodios(jsonb, text[]) to authenticated;

comment on function public.mover_episodios(jsonb, text[]) is
  'Move episódios (quadro, temporada, pilar/objetivo herdados) e grava a ordem da série numa transação. Ordem não toca updated_at.';

notify pgrst, 'reload schema';
