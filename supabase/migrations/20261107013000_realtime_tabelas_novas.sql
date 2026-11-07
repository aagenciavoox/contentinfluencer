-- Avisa outras abas e aparelhos quando metas, vigência, pausa, exceção ou DNA mudam.
do $$
declare
  tabela text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    return;
  end if;
  foreach tabela in array array[
    'editorial_vigencia',
    'editorial_conta_meta',
    'editorial_pausa',
    'concentracao_excecao',
    'dna_voz',
    'serie_acompanhamento',
    'serie_meta'
  ] loop
    if to_regclass(format('public.%I', tabela)) is null then
      continue;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tabela
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tabela);
    end if;
  end loop;
end $$;
