-- Origem da contagem e da herança editorial.
-- Aditiva: não apaga frequencia_semanal nem meta_ciclo (continuam em pilares).

alter table public.contents
  add column if not exists rede_referencia_congelada_id text;

alter table public.contents
  add column if not exists script_origem text;

alter table public.contents
  add column if not exists conta_na_grade_origem text;

alter table public.contents
  add column if not exists pilar_origem text;

-- rede_referencia_congelada_id fica nula de propósito. A rede de referência
-- mora nas preferências do usuário (JSON), não numa coluna. O app congela
-- o id na próxima publicação, quando já conhece essa preferência.

update public.contents
set conta_na_grade_origem = case
  when conta_na_grade = false and (
    lower(btrim(coalesce(formato_visual, ''))) in ('stories', 'story', 'live')
    or funcao = 'reter'
  ) then 'regra'
  when conta_na_grade = false then 'manual'
  when conta_na_grade = true and (
    lower(btrim(coalesce(formato_visual, ''))) in ('stories', 'story', 'live')
    or funcao = 'reter'
  ) then 'manual'
  else 'regra'
end
where conta_na_grade_origem is null;

-- O boolean conta_na_grade não muda aqui. A regra nova entra na leitura.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'contents_script_origem_check'
      and conrelid = 'public.contents'::regclass
  ) then
    alter table public.contents
      add constraint contents_script_origem_check
      check (script_origem is null or script_origem in ('modelo', 'autor'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'contents_conta_na_grade_origem_check'
      and conrelid = 'public.contents'::regclass
  ) then
    alter table public.contents
      add constraint contents_conta_na_grade_origem_check
      check (conta_na_grade_origem is null or conta_na_grade_origem in ('regra', 'manual'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'contents_pilar_origem_check'
      and conrelid = 'public.contents'::regclass
  ) then
    alter table public.contents
      add constraint contents_pilar_origem_check
      check (pilar_origem is null or pilar_origem in ('herdada', 'escolhida', 'nenhuma'));
  end if;
end $$;

alter table public.planejamento_postits
  add column if not exists serie_id text,
  add column if not exists pilar_id text,
  add column if not exists objetivo text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'planejamento_postits_objetivo_check'
      and conrelid = 'public.planejamento_postits'::regclass
  ) then
    alter table public.planejamento_postits
      add constraint planejamento_postits_objetivo_check
      check (objetivo is null or objetivo in (
        'atrair', 'converter', 'aprofundar', 'comunidade', 'acao', 'reter'
      ));
  end if;
end $$;

alter table public.series
  add column if not exists frequencia_vezes integer,
  add column if not exists frequencia_unidade text,
  add column if not exists frequencia_a_partir_de date;

notify pgrst, 'reload schema';
