-- Semana da Saude/Editorial passa a segunda-domingo (INICIO_DA_SEMANA = 1).
-- Reescreve datas ancoradas em domingo para a segunda seguinte (+1 dia).
-- Idempotente: so mexe quando extract(dow)=0; depois do +1 a data vira segunda (dow=1)
-- e uma segunda execucao nao desloca de novo. Tambem evita colisao de chave unica.

-- 1) ajuste_semana: semana fechada domingo-sabado (inicio=domingo, fim=inicio+6).
update public.ajuste_semana
set
  inicio = (inicio + 1),
  fim = (fim + 1)
where extract(dow from inicio) = 0
  and fim = inicio + 6
  and not exists (
    select 1
    from public.ajuste_semana as outra
    where outra.decisao_id = ajuste_semana.decisao_id
      and outra.inicio = ajuste_semana.inicio + 1
      and outra.fim = ajuste_semana.fim + 1
  );

-- 2) editorial_vigencia.vigente_desde: ancora da semana (era domingo).
update public.editorial_vigencia
set vigente_desde = (vigente_desde + 1)
where extract(dow from vigente_desde) = 0
  and not exists (
    select 1
    from public.editorial_vigencia as outra
    where outra.user_id = editorial_vigencia.user_id
      and outra.vigente_desde = editorial_vigencia.vigente_desde + 1
  );

-- 3) editorial_conta_meta.vigente_desde: ancora da semana da conta (era domingo).
update public.editorial_conta_meta
set vigente_desde = (vigente_desde + 1)
where extract(dow from vigente_desde) = 0
  and not exists (
    select 1
    from public.editorial_conta_meta as outra
    where outra.user_id = editorial_conta_meta.user_id
      and outra.platform_id = editorial_conta_meta.platform_id
      and outra.vigente_desde = editorial_conta_meta.vigente_desde + 1
  );

-- 4) editorial_visao: periodo gravado como semana domingo-sabado.
--    Sem isso, lerPeriodoSalvo com semanaDe(segunda) deslocaria a janela errada.
update public.editorial_visao
set
  inicio = (inicio + 1),
  fim = (fim + 1)
where modo = 'semana'
  and extract(dow from inicio) = 0
  and fim = inicio + 6;
