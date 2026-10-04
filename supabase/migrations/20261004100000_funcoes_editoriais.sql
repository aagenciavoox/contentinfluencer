alter table public.series
  add column if not exists funcao_padrao text
    check (funcao_padrao is null or funcao_padrao in
      ('atrair','converter','aprofundar','comunidade','acao','reter','varia')),
  add column if not exists pilar_principal_id text references public.pilares(id) on delete set null,
  add column if not exists formato_apresentacao text,
  add column if not exists energia_padrao text
    check (energia_padrao is null or energia_padrao in ('baixa','média','alta')),
  add column if not exists motivo_salvar text,
  add column if not exists motivo_enviar text;
-- "Elemento fixo" reaproveita a coluna bordao; "Formato de publicação", a formato_visual_padrao.

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'series' and column_name = 'funil_padrao') then
    execute $q$
      update public.series set funcao_padrao = case funil_padrao
        when 'topo' then 'atrair' when 'meio' then 'aprofundar' when 'fundo' then 'converter' end
      where funcao_padrao is null and funil_padrao is not null
    $q$;
  end if;
end $$;

alter table public.series drop column if exists funil_padrao;

alter table public.contents
  drop column if exists funil,
  add column if not exists funcao text
    check (funcao is null or funcao in ('atrair','converter','aprofundar','comunidade','acao','reter')),
  add column if not exists funcao_origem text
    check (funcao_origem is null or funcao_origem in ('herdada','escolhida','nenhuma','aplicada','migrada')),
  add column if not exists classificacao_congelada_em timestamptz,
  add column if not exists conta_na_grade boolean not null default true,
  add column if not exists legenda_base text,
  add column if not exists livro_ids text[] not null default '{}';

create index if not exists contents_livro_ids_gin on public.contents using gin (livro_ids);

-- Pilar principal: um dos pilares já vinculados (revise as séries com mais de um).
update public.series s set pilar_principal_id = (
  select sp.pilar_id from public.serie_pilares sp where sp.serie_id = s.id order by sp.pilar_id limit 1
) where s.pilar_principal_id is null;

-- Vários livros por roteiro: leva o livro atual para a lista.
update public.contents set livro_ids = array[biblioteca_item_id]
where biblioteca_item_id is not null and livro_ids = '{}';

notify pgrst, 'reload schema';
