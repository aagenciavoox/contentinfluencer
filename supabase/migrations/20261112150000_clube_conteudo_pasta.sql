-- O conteúdo do clube pode ficar numa pasta. O id e a série de origem não mudam.

alter table public.clube_conteudos
  add column if not exists pasta_id text references public.clube_pastas (id) on delete set null;

create index if not exists clube_conteudos_pasta_id_idx
  on public.clube_conteudos (pasta_id)
  where pasta_id is not null;

create or replace function public.vinculo_do_clube_do_mesmo_usuario()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  dono_clube uuid;
  dono_conteudo uuid;
  pasta_clube text;
  pasta_dono uuid;
begin
  select user_id into dono_clube from public.clubes where id = new.clube_id;
  select user_id into dono_conteudo from public.contents where id = new.content_id;
  if dono_clube is null
    or dono_conteudo is null
    or dono_clube is distinct from new.user_id
    or dono_conteudo is distinct from new.user_id
  then
    raise exception 'vínculo de clube inválido';
  end if;

  if new.pasta_id is not null then
    select clube_id, user_id into pasta_clube, pasta_dono
    from public.clube_pastas
    where id = new.pasta_id;
    if pasta_clube is null
      or pasta_clube is distinct from new.clube_id
      or pasta_dono is distinct from new.user_id
    then
      raise exception 'pasta de clube inválida';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists clube_conteudos_mesmo_usuario on public.clube_conteudos;
create trigger clube_conteudos_mesmo_usuario
  before insert or update of clube_id, content_id, pasta_id on public.clube_conteudos
  for each row
  execute function public.vinculo_do_clube_do_mesmo_usuario();
