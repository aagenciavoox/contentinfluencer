-- Escolha "Acompanhar continuidade na Saúde" por série ou quadro.
-- Só acrescenta a coluna: nenhum dado é alterado ou apagado. Todas começam desmarcadas.
alter table public.series
  add column if not exists acompanhar_continuidade boolean not null default false;
