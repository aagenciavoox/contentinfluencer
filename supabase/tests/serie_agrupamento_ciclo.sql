-- Teste de escrita concorrente dos gatilhos de ciclo.
-- Rodar no SQL editor do projeto (ou psql) com um usuário autenticado de teste.
-- Duas sessões: A.parent=B e B.parent=A; a segunda deve falhar com ciclo.

begin;

create temporary table if not exists _ciclo_probe (
  passo text primary key,
  ok boolean not null,
  detalhe text
);

do $$
declare
  u uuid := coalesce(auth.uid(), '00000000-0000-0000-0000-000000000001'::uuid);
  id_a text := 'ciclo-test-a';
  id_b text := 'ciclo-test-b';
begin
  delete from public.series where id in (id_a, id_b);

  insert into public.series (id, user_id, name, template, notes, ativa)
  values
    (id_a, u, 'Ciclo A', '', '', true),
    (id_b, u, 'Ciclo B', '', '', true);

  update public.series set parent_id = id_b where id = id_a;

  begin
    update public.series set parent_id = id_a where id = id_b;
    insert into _ciclo_probe values ('parent_ciclo', false, 'esperava exceção de ciclo');
  exception when others then
    insert into _ciclo_probe values ('parent_ciclo', true, sqlerrm);
  end;

  -- Outro usuário
  begin
    update public.series set parent_id = id_a, user_id = '00000000-0000-0000-0000-000000000099'::uuid
    where id = id_b;
    insert into _ciclo_probe values ('parent_outro_user', false, 'esperava exceção de usuário');
  exception when others then
    insert into _ciclo_probe values ('parent_outro_user', true, sqlerrm);
  end;

  delete from public.series where id in (id_a, id_b);
end $$;

select * from _ciclo_probe;

rollback;
