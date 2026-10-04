alter table public.content_plataformas
  add column if not exists status text not null default 'agendada'
    check (status in ('agendada','publicada','nao_publicada','removida')),
  add column if not exists realizada_manual_em timestamptz,  -- o que a pessoa informou
  add column if not exists realizada_api_em timestamptz,     -- fase 3; nunca apaga a manual
  add column if not exists post_codigo text,
  add column if not exists post_url text,
  add column if not exists legenda_propria boolean not null default false,
  add column if not exists conta_na_grade boolean not null default true,  -- usado em reposts
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists content_plataformas_post_codigo_key
  on public.content_plataformas (platform_id, post_codigo) where post_codigo is not null;

alter table public.projetos
  add column if not exists aviso_dias smallint check (aviso_dias is null or aviso_dias between 0 and 120);

notify pgrst, 'reload schema';