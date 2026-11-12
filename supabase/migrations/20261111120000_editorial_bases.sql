-- Três bases do Editorial (11/11/2026). Só acrescenta colunas e ajusta o modo da visão salva.
-- Não apaga nada: roteiros, conteúdos, séries e metas continuam como estão.

-- 1) Meta a cada 14 dias sem data de início: a segunda-feira da semana da primeira ativação.
--    Fica fixa depois de gravada (trocar o período ou religar o acompanhamento não muda).
alter table public.series
  add column if not exists frequencia_ancora date;

comment on column public.series.frequencia_ancora is
  'Meta a cada 14 dias sem início: segunda-feira da semana em que a meta foi ativada. Fixa depois de gravada.';

alter table public.serie_meta
  add column if not exists ancora date;

comment on column public.serie_meta.ancora is
  'Meta a cada 14 dias sem a_partir_de: segunda-feira da semana em que a meta foi ativada. Fixa depois de gravada.';

-- 2) Perfil editorial (Direção editorial) e avisos ligados/desligados (Editorial › Avisos).
alter table public.editorial_conta
  add column if not exists perfil_editorial jsonb,
  add column if not exists avisos jsonb not null default '{}'::jsonb;

comment on column public.editorial_conta.perfil_editorial is
  'Perfil editorial: publico, motivacaoPublico, linguagens, assuntos. publico_linguagem continua sendo lido como público quando este está vazio.';
comment on column public.editorial_conta.avisos is
  'Tipos de aviso desligados (false). Chave ausente = aviso ligado.';

-- O texto antigo "Público, linguagem e assuntos" vira o Público. A coluna antiga fica.
update public.editorial_conta
set perfil_editorial = jsonb_build_object(
  'publico', coalesce(publico_linguagem, ''),
  'motivacaoPublico', '',
  'linguagens', '',
  'assuntos', ''
)
where perfil_editorial is null;

-- 3) Semana salva antes desta versão abre como Personalizado, com as mesmas datas.
--    (As datas não mudam; só o modo.)
update public.editorial_visao
set modo = 'intervalo'
where modo = 'semana';
