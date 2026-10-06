import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, CircleHelp } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { MoreMenu } from '../../../components/ui/MoreMenu';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { Tooltip } from '../../../components/ui/Tooltip';
import type { FuncaoEditorial, Pilar, Serie } from '../../../lib/database';
import { cn } from '../../../lib/utils';
import { excedentesDosPilares, formatarPeso } from '../lib/checkEditorialConfig';
import type { EditorialSettings } from '../lib/editorialSettings';
import {
  distribuirEspacos,
  percentuaisFechamEm100,
  rotuloEspacos,
  semanasDaContagem,
  somaEspacosSemana,
  totalDaContagem,
} from '../lib/distribuirEspacos';
import {
  FUNCAO_DESCRICOES,
  FUNCAO_LABELS,
  FUNCOES,
  FUNIL_DA_FUNCAO,
} from '../lib/funcoes';

type PercentDraft = Record<FuncaoEditorial, string>;
type EtapaId = 'topo' | 'meio' | 'fundo' | 'fora';

const AGRUPAMENTOS: Array<{ id: EtapaId; titulo: string }> = [
  { id: 'topo', titulo: 'Topo' },
  { id: 'meio', titulo: 'Meio' },
  { id: 'fundo', titulo: 'Fundo' },
  { id: 'fora', titulo: 'Fora do funil' },
];

const COLUNAS = 'grid grid-cols-[minmax(12rem,1.6fr)_9rem_8rem_4.5rem] items-center gap-3';

const campoClass =
  'h-11 w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]';

function draftVazio(): PercentDraft {
  return {
    atrair: '',
    converter: '',
    aprofundar: '',
    comunidade: '',
    acao: '',
    reter: '',
  };
}

function draftDaDistribuicao(value: EditorialSettings['distribuicaoFuncoes']): PercentDraft {
  const draft = draftVazio();
  if (!value) return draft;
  for (const funcao of FUNCOES) draft[funcao] = String(value[funcao]);
  return draft;
}

function lerInteiro(value: string, max: number): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isInteger(parsed) || parsed < 0) return 0;
  return Math.min(max, parsed);
}

function funcoesDaEtapa(etapa: EtapaId): FuncaoEditorial[] {
  return FUNCOES.filter(funcao => (FUNIL_DA_FUNCAO[funcao] ?? 'fora') === etapa);
}

function rotuloPeriodo(espacos: number): string {
  if (espacos <= 0) return 'Sem espaços na semana';
  const semanas = semanasDaContagem(espacos);
  const total = totalDaContagem(espacos);
  const semana = semanas === 1 ? '1 semana' : `${semanas} semanas`;
  return `${semana} · ${rotuloEspacos(total)}`;
}

function rotuloContagemSeries(quantidade: number): string {
  return quantidade === 1 ? '1 série' : `${quantidade} séries`;
}

function seriesAtivas(series: readonly Serie[]): Serie[] {
  return series.filter(serie => serie.ativa !== false);
}

export function DistribuicaoFuncoesPanel({
  pilares,
  series,
  settings,
  plataformas,
  onOpenSerie,
  onOpenPilares,
  onChange,
  onChangeRede,
}: {
  pilares: Pilar[];
  series: Serie[];
  settings: EditorialSettings;
  plataformas: ReadonlyArray<{ id: string; nome: string; ativo?: boolean }>;
  onOpenSerie: (serieId: string) => void;
  onOpenPilares: () => void;
  onChange: (distribuicaoFuncoes: Record<FuncaoEditorial, number>) => void;
  onChangeRede: (redeReferenciaId: string | null) => void;
}) {
  const salva = JSON.stringify(settings.distribuicaoFuncoes);
  const [draft, setDraft] = useState<PercentDraft>(() => draftDaDistribuicao(settings.distribuicaoFuncoes));
  const somaPilares = somaEspacosSemana(pilares);
  const [espacosTexto, setEspacosTexto] = useState(() => (somaPilares > 0 ? String(somaPilares) : ''));
  const somaAnterior = useRef(somaPilares);

  useEffect(() => {
    const parsed = salva === 'null'
      ? null
      : JSON.parse(salva) as EditorialSettings['distribuicaoFuncoes'];
    setDraft(draftDaDistribuicao(parsed));
  }, [salva]);

  useEffect(() => {
    setEspacosTexto(atual => {
      const anterior = somaAnterior.current;
      somaAnterior.current = somaPilares;
      if (atual.trim() === '' || atual.trim() === String(anterior)) {
        return somaPilares > 0 ? String(somaPilares) : '';
      }
      return atual;
    });
  }, [somaPilares]);

  const numeros = useMemo(
    () => FUNCOES.map(funcao => lerInteiro(draft[funcao], 100)),
    [draft],
  );
  const soma = numeros.reduce((acc, valor) => acc + valor, 0);
  const fecha = percentuaisFechamEm100(numeros);
  const espacos = lerInteiro(espacosTexto, 999);
  const totalContagem = totalDaContagem(espacos);
  const previa = fecha && totalContagem > 0 ? distribuirEspacos(totalContagem, numeros) : null;
  const ativas = seriesAtivas(series);
  const semFuncao = ativas.filter(serie => !serie.funcaoPadrao);
  const variam = ativas.filter(serie => serie.funcaoPadrao === 'varia');
  const excedentes = excedentesDosPilares(pilares, series);
  const redes = plataformas.filter(plataforma => plataforma.ativo !== false);
  const redeAtual = plataformas.find(plataforma => plataforma.id === settings.redeReferenciaId) ?? null;
  const opcoesRede = redeAtual && !redes.some(plataforma => plataforma.id === redeAtual.id)
    ? [redeAtual, ...redes]
    : redes;
  const faltam = Math.max(0, 100 - soma);
  const passou = Math.max(0, soma - 100);

  const salvar = () => {
    if (!fecha) return;
    const distribuicaoFuncoes = Object.fromEntries(
      FUNCOES.map((funcao, index) => [funcao, numeros[index]]),
    ) as Record<FuncaoEditorial, number>;
    onChange(distribuicaoFuncoes);
  };

  const atualizar = (funcao: FuncaoEditorial, value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 3);
    const next = digits === '' ? '' : String(Math.min(100, Number.parseInt(digits, 10)));
    setDraft(previous => ({ ...previous, [funcao]: next }));
  };

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="stack-lg min-w-0">
      <Surface>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Text variant="label" as="span" className="mb-1.5 block">Rede de referência</Text>
            <MoreMenu
              label="Rede de referência"
              align="left"
              className="w-full"
              triggerClassName="h-11 w-full justify-between px-3 text-sm font-normal text-[var(--text-primary)]"
              trigger={(
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span className={cn('truncate', !redeAtual && 'text-[var(--text-tertiary)]')}>
                    {redeAtual?.nome ?? 'Selecionar rede'}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
                </span>
              )}
              items={[
                { id: 'nenhuma', label: 'Nenhuma', onClick: () => onChangeRede(null) },
                ...opcoesRede.map(plataforma => ({
                  id: plataforma.id,
                  label: plataforma.nome,
                  onClick: () => onChangeRede(plataforma.id),
                })),
              ]}
            />
          </div>
          <label>
            <Text variant="label" as="span" className="mb-1.5 block">Espaços por semana</Text>
            <input
              inputMode="numeric"
              aria-label="Espaços por semana"
              value={espacosTexto}
              placeholder="0"
              onChange={event => setEspacosTexto(event.target.value.replace(/\D/g, '').slice(0, 3))}
              className={campoClass}
            />
          </label>
          <div>
            <span className="mb-1.5 flex items-center gap-1">
              <Text variant="label" as="span">Período da prévia</Text>
              <Tooltip
                label="Menos de 8 espaços por semana olha 4 semanas. De 8 em diante, a prévia olha esta semana."
                side="top"
              >
                <CircleHelp className="h-3.5 w-3.5 text-[var(--text-tertiary)]" aria-hidden />
              </Tooltip>
            </span>
            <div className="flex h-11 items-center rounded-[var(--radius-input)] bg-[var(--bg-hover)] px-3">
              <Text variant="body" as="span">{rotuloPeriodo(espacos)}</Text>
            </div>
          </div>
        </div>
        {espacos !== somaPilares ? (
          <Text variant="meta" className="mt-3 block text-[var(--text-tertiary)]">
            Os pilares ativos somam {rotuloEspacos(somaPilares)} por semana. Este número vale só para a prévia.
          </Text>
        ) : null}
      </Surface>

        <Surface padding="none" className="min-w-0">
          <div className="p-4">
            <Text variant="sectionTitle">Distribuição por função</Text>
            <Text variant="secondary" className="mt-1">
              Defina como os espaços serão divididos entre as funções.
            </Text>
          </div>

          <div className="overflow-x-auto px-4 pb-4">
            <div className="min-w-[36rem]">
              <div className={cn(COLUNAS, 'px-3 pb-2')}>
                <Text variant="label" as="span">Função</Text>
                <Text variant="label" as="span">Séries</Text>
                <Text variant="label" as="span">Percentual</Text>
                <Text variant="label" as="span" className="text-right">Espaços</Text>
              </div>

              <div className="stack-sm">
                {AGRUPAMENTOS.map(grupo => {
                  const funcoes = funcoesDaEtapa(grupo.id);
                  const pct = funcoes.reduce((acc, funcao) => acc + numeros[FUNCOES.indexOf(funcao)], 0);
                  return (
                    <section key={grupo.id} aria-label={grupo.titulo} className="stack-sm">
                      <div className={cn(COLUNAS, 'rounded-[var(--radius-sm)] bg-[var(--bg-hover)] px-3 py-2')}>
                        <Text variant="bodyStrong">{grupo.titulo}</Text>
                        <span />
                        <span />
                        <Text variant="meta" as="span" className="text-right text-[var(--text-secondary)]">{pct}%</Text>
                      </div>
                      {funcoes.map(funcao => {
                        const indice = FUNCOES.indexOf(funcao);
                        const seriesDaFuncao = ativas.filter(serie => serie.funcaoPadrao === funcao);
                        return (
                          <div key={funcao} className={cn(COLUNAS, 'border-b border-[var(--border-color)] px-3 py-3')}>
                            <div className="min-w-0">
                              <Text variant="bodyStrong">{FUNCAO_LABELS[funcao]}</Text>
                              <Text variant="secondary" className="mt-0.5">{FUNCAO_DESCRICOES[funcao]}</Text>
                            </div>
                            <SeriesDaFuncao
                              series={seriesDaFuncao}
                              onOpen={onOpenSerie}
                            />
                            <label className="flex items-center gap-1.5" htmlFor={`distribuicao-${funcao}`}>
                              <input
                                id={`distribuicao-${funcao}`}
                                inputMode="numeric"
                                aria-label={`Percentual de ${FUNCAO_LABELS[funcao]}`}
                                value={draft[funcao]}
                                placeholder="0"
                                onChange={event => atualizar(funcao, event.target.value)}
                                className="h-9 w-14 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 text-center text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                              />
                              <Text variant="meta" as="span">%</Text>
                            </label>
                            <Text variant="meta" as="span" className="text-right text-[var(--text-tertiary)]">
                              {previa ? String(previa[indice]) : '—'}
                            </Text>
                          </div>
                        );
                      })}
                    </section>
                  );
                })}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ResumoSeries
                  titulo="Séries sem função"
                  descricao="Séries que ainda não têm uma função padrão."
                  series={semFuncao}
                  onOpen={onOpenSerie}
                />
                <ResumoSeries
                  titulo="Varia por conteúdo"
                  descricao="Cada roteiro desta série escolhe a própria função."
                  series={variam}
                  onOpen={onOpenSerie}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-color)] px-4 py-3">
            <div className="min-w-0">
              <Text variant="label" as="span">Total distribuído</Text>
              <Text variant="bodyStrong" className="mt-0.5">
                <span className={fecha ? 'text-[var(--accent-green)]' : passou > 0 ? 'text-[var(--accent-red)]' : undefined}>
                  {soma}%
                </span>
                {' / 100%'}
              </Text>
              <Text variant="meta" className="mt-0.5 block text-[var(--text-secondary)]">
                {fecha ? 'A soma fecha em 100%.' : 'A soma precisa fechar em 100%.'}
              </Text>
            </div>
            <AppButton
              variant={fecha ? 'primary' : 'secondary'}
              onClick={salvar}
              disabled={!fecha}
              disabledReason={fecha ? undefined : 'A soma fecha em 100 para salvar.'}
            >
              Salvar distribuição
            </AppButton>
          </div>
        </Surface>
      </div>

      <div className="stack-md">
          <Surface>
            <Text variant="sectionTitle">Prévia da distribuição</Text>
            <Text variant="spotlightTitle" as="p" className="mt-3">
              {soma}%{' '}
              <Text variant="secondary" as="span">de 100%</Text>
            </Text>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--bg-hover)]" aria-hidden>
              <div
                className={cn(
                  'h-full rounded-full',
                  passou > 0 ? 'bg-[var(--accent-red)]' : fecha ? 'bg-[var(--accent-green)]' : 'bg-[var(--text-tertiary)]',
                )}
                style={{ width: `${Math.min(100, soma)}%` }}
              />
            </div>
            <Text variant="secondary" className="mt-2">
              {passou > 0
                ? `Passou ${passou}% do total.`
                : fecha
                  ? 'A soma fecha em 100%.'
                  : `Faltam ${faltam}% para distribuir.`}
            </Text>
            <div className="mt-4 stack-sm">
              {AGRUPAMENTOS.map(grupo => {
                const funcoes = funcoesDaEtapa(grupo.id);
                const pct = funcoes.reduce((acc, funcao) => acc + numeros[FUNCOES.indexOf(funcao)], 0);
                const spaces = previa
                  ? funcoes.reduce((acc, funcao) => acc + previa[FUNCOES.indexOf(funcao)], 0)
                  : null;
                return (
                  <div key={grupo.id} className="flex items-center justify-between gap-3 border-b border-[var(--border-color)] py-2 last:border-b-0">
                    <Text variant="body" as="span">{grupo.titulo}</Text>
                    <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
                      {spaces == null ? `${pct}%` : `${pct}% · ${rotuloEspacos(spaces)}`}
                    </Text>
                  </div>
                );
              })}
            </div>
            <Text variant="meta" className="mt-3 block text-[var(--text-tertiary)]">
              {fecha
                ? 'O funil é calculado a partir das funções.'
                : 'O funil é calculado a partir das funções. Complete 100% para calcular os espaços.'}
            </Text>
          </Surface>

          {excedentes.length > 0 ? (
            <Surface className="border-[color-mix(in_srgb,var(--warning)_38%,var(--border-color))] bg-[var(--warning-bg)]">
              <Text variant="bodyStrong">Revisar espaços dos pilares</Text>
              <Text variant="secondary" className="mt-1">
                As séries ultrapassam os espaços de {excedentes.length} {excedentes.length === 1 ? 'pilar' : 'pilares'}.
              </Text>
              <div className="mt-3 overflow-hidden rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)]">
                <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] gap-2 border-b border-[var(--border-color)] px-3 py-2">
                  <Text variant="label" as="span">Pilar</Text>
                  <Text variant="label" as="span" className="text-right">Séries</Text>
                  <Text variant="label" as="span" className="text-right">Previsto</Text>
                </div>
                {excedentes.map(excedente => (
                  <div key={excedente.id} className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] gap-2 border-b border-[var(--border-color)] px-3 py-2 last:border-b-0">
                    <Text variant="body" as="span" className="truncate">{excedente.nome}</Text>
                    <Text variant="body" as="span" className="text-right">{formatarPeso(excedente.ocupado)}</Text>
                    <Text variant="body" as="span" className="text-right">{formatarPeso(excedente.previsto)}</Text>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={onOpenPilares}
                className="mt-3 text-sm font-medium text-[var(--brand-accent)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                Ajustar pilares →
              </button>
            </Surface>
          ) : null}
      </div>
    </div>
  );
}

function SeriesDaFuncao({
  series,
  onOpen,
}: {
  series: Serie[];
  onOpen: (serieId: string) => void;
}) {
  if (series.length === 0) {
    return <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">Nenhuma série</Text>;
  }

  return (
    <MoreMenu
      label={rotuloContagemSeries(series.length)}
      align="left"
      triggerClassName="h-auto w-auto gap-1 border-0 bg-transparent px-0 text-sm font-medium text-[var(--brand-accent)] hover:bg-transparent"
      trigger={(
        <>
          <span>{rotuloContagemSeries(series.length)}</span>
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </>
      )}
      items={series.map(serie => ({
        id: serie.id,
        label: serie.name?.trim() || 'Série sem nome',
        onClick: () => onOpen(serie.id),
      }))}
    />
  );
}

function ResumoSeries({
  titulo,
  descricao,
  series,
  onOpen,
}: {
  titulo: string;
  descricao: string;
  series: Serie[];
  onOpen: (serieId: string) => void;
}) {
  const numero = (
    <Text variant="sectionTitle" as="span">{series.length}</Text>
  );

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-3">
      <Text variant="bodyStrong">{titulo}</Text>
      <div className="mt-2 flex items-start gap-3">
        {series.length > 0 ? (
          <MoreMenu
            label={`Abrir ${titulo.toLocaleLowerCase('pt-BR')}`}
            align="left"
            triggerClassName="h-auto w-auto border-0 bg-transparent px-0 hover:bg-transparent"
            trigger={numero}
            items={series.map(serie => ({
              id: serie.id,
              label: serie.name?.trim() || 'Série sem nome',
              onClick: () => onOpen(serie.id),
            }))}
          />
        ) : numero}
        <Text variant="meta" className="text-[var(--text-secondary)]">{descricao}</Text>
      </div>
    </div>
  );
}
