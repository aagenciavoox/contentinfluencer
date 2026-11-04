-- Dias de gravação e antecedência do aviso de postagem.
-- Só acrescenta. O app grava sem estas colunas até a migração ser aplicada.

alter table public.editorial_conta
  add column if not exists dias_gravacao smallint[] not null default '{}';

alter table public.editorial_conta
  add column if not exists antecedencia_postagem_dias smallint;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'editorial_conta_dias_gravacao_check'
      and conrelid = 'public.editorial_conta'::regclass
  ) then
    alter table public.editorial_conta
      add constraint editorial_conta_dias_gravacao_check
      check (dias_gravacao <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'editorial_conta_antecedencia_postagem_dias_check'
      and conrelid = 'public.editorial_conta'::regclass
  ) then
    alter table public.editorial_conta
      add constraint editorial_conta_antecedencia_postagem_dias_check
      check (antecedencia_postagem_dias is null or antecedencia_postagem_dias >= 0);
  end if;
end $$;

comment on column public.editorial_conta.dias_gravacao is
  'Dias ISO em que grava (1=segunda … 7=domingo). Vazio desliga o lote do dia de gravar.';

comment on column public.editorial_conta.antecedencia_postagem_dias is
  'Quantos dias antes da postagem avisar o que falta. Null desliga a antecedência.';

notify pgrst, 'reload schema';
