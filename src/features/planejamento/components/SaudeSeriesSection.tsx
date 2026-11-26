import { Fragment } from 'react';
import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { cn } from '../../../lib/utils';
import { ANCORA_CONFERENCIA } from '../../editorial/lib/abasEditorial';
import {
  rotuloDaSituacaoNoRecorte,
  situacaoDaJanela,
  situacaoDoRecorte,
  textoDaMetaNoRecorte,
} from '../../editorial/lib/apuracaoSerie';
import type { GradeEntry } from '../../editorial/lib/gradeEntries';
import type { LinhaDoEscopoNaSaude } from '../lib/continuidadePorEscopoNaSaude';
import { textoDoProgresso } from '../lib/episodioNaTemporada';
import type { IntervaloSaude } from '../lib/saudeActions';
import {
  rotuloIntervalo,
  TEXTO_ACOMPANHADA_SEM_RITMO,
  textoMaisPraFechar,
  type Continuidade,
  type LinhaContinuidade,
} from '../lib/saudeIndicadores';

type SituacaoVisual = {
  rotulo: string;
  tone: 'ok' | 'erro' | 'aviso' | 'neutro';
};

function situacaoDaLinha(
  linha: LinhaContinuidade<GradeEntry>,
  hojeIso: string,
  escoposDaLinha: readonly LinhaDoEscopoNaSaude[],
): SituacaoVisual {
  const futurosExcesso = linha.intervalos.filter(
    intervalo => intervalo.fim >= hojeIso && intervalo.quantidade > intervalo.meta && !intervalo.pausada,
  );
  const temEscopoAtencao = escoposDaLinha.some(escopo => escopo.atencao);

  if (linha.intervalos.length === 0) {
    if (temEscopoAtencao) return { rotulo: 'Revisar', tone: 'aviso' };
    if (escoposDaLinha.some(escopo => escopo.semFrequencia)) return { rotulo: 'Sem ritmo', tone: 'neutro' };
    return { rotulo: 'Acompanhada', tone: 'neutro' };
  }

  const situacao = situacaoDoRecorte(linha.intervalos, hojeIso);
  if (situacao === 'abaixo') return { rotulo: 'Pendente', tone: 'erro' };
  if (futurosExcesso.length > 0 || temEscopoAtencao) return { rotulo: 'Excesso', tone: 'aviso' };
  if (situacao === 'no-prazo') return { rotulo: 'No prazo', tone: 'aviso' };
  if (situacao === 'pausada') return { rotulo: 'Pausada', tone: 'neutro' };
  return { rotulo: rotuloDaSituacaoNoRecorte(situacao), tone: 'ok' };
}

const badgeToneClass: Record<SituacaoVisual['tone'], string> = {
  ok: 'bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--text-primary)]',
  erro: 'bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--text-primary)]',
  aviso: 'bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] text-[var(--text-primary)]',
  neutro: 'bg-[var(--bg-hover)] text-[var(--text-secondary)]',
};

const dotToneClass: Record<SituacaoVisual['tone'], string> = {
  ok: 'bg-[var(--success)]',
  erro: 'bg-[var(--danger)]',
  aviso: 'bg-[var(--warning)]',
  neutro: 'bg-[var(--text-tertiary)]',
};

function SituacaoPill({ situacao }: { situacao: SituacaoVisual }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2 py-0.5',
        badgeToneClass[situacao.tone],
      )}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotToneClass[situacao.tone])} aria-hidden />
      <Text variant="label" as="span" className="text-current">
        {situacao.rotulo}
      </Text>
    </span>
  );
}

function DetalhesDaSerie({
  linha,
  hojeIso,
  escoposDaLinha,
  historicoAberto,
  onToggleHistorico,
  onPlanejarIntervalo,
  onReorganizarEpisodios,
  onEditarMeta,
}: {
  linha: LinhaContinuidade<GradeEntry>;
  hojeIso: string;
  escoposDaLinha: readonly LinhaDoEscopoNaSaude[];
  historicoAberto: boolean;
  onToggleHistorico: (aberta: boolean) => void;
  onPlanejarIntervalo?: (params: IntervaloSaude & { serieId: string }) => void;
  onReorganizarEpisodios?: (params: IntervaloSaude & { itemIds: string[] }) => void;
  onEditarMeta: (alvo: string) => void;
}) {
  const futuros = linha.intervalos.filter(intervalo => intervalo.fim >= hojeIso);
  const passados = linha.intervalos.filter(intervalo => intervalo.fim < hojeIso);
  const alvoEditorial = linha.temporadaId ? `t:${linha.temporadaId}` : `s:${linha.serieId}`;

  return (
    <div className="stack-sm rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/series/${linha.serieId}/editar`}
            className="rounded-[var(--radius-sm)] text-[var(--brand-accent-text)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <Text variant="meta" as="span" className="text-[var(--brand-accent-text)]">
              Abrir série ›
            </Text>
          </Link>
          {linha.reservadas.length > 0 ? (
            <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">
              · {linha.reservadas.length === 1 ? '1 intervalo reservado' : `${linha.reservadas.length} intervalos reservados`} com post-it
            </Text>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onEditarMeta(alvoEditorial)}
          className="rounded-[var(--radius-sm)] text-[var(--brand-accent-text)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <Text variant="meta" as="span" className="text-[var(--brand-accent-text)]">
            Ajustar meta
          </Text>
        </button>
      </div>

      {futuros.length > 0 ? (
        <div className="stack-xs">
          {futuros.map(intervalo => {
            const itensDoIntervalo = linha.itens.filter(
              item => item.data && item.data >= intervalo.inicio && item.data <= intervalo.fim,
            );
            const itemIds = itensDoIntervalo
              .map(item => item.contentId || item.postItId)
              .filter(Boolean) as string[];
            const situacao = situacaoDaJanela(intervalo, hojeIso);
            const excesso = intervalo.quantidade > intervalo.meta && !intervalo.pausada;
            const faltam = Math.max(0, intervalo.meta - intervalo.quantidade);

            if ((situacao === 'no-prazo' || situacao === 'abaixo') && faltam > 0) {
              return (
                <div
                  key={intervalo.inicio}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2.5"
                >
                  <div className="min-w-0">
                    <Text variant="bodyStrong" as="span" className="text-[var(--text-primary)]">
                      {rotuloIntervalo(intervalo)}
                    </Text>
                    <Text variant="meta" as="span" className="ml-2 text-[var(--text-secondary)]">
                      {intervalo.quantidade} de {intervalo.meta} {intervalo.meta === 1 ? 'episódio' : 'episódios'} · até{' '}
                      {format(parseISO(intervalo.fim), 'dd/MM')} ({textoMaisPraFechar(faltam, intervalo)})
                    </Text>
                  </div>
                  {onPlanejarIntervalo ? (
                    <AppButton
                      variant="secondary"
                      size="xs"
                      onClick={() =>
                        onPlanejarIntervalo({
                          serieId: linha.serieId,
                          inicio: intervalo.inicio,
                          fim: intervalo.fim,
                        })
                      }
                    >
                      Planejar neste intervalo
                    </AppButton>
                  ) : null}
                </div>
              );
            }

            if (excesso) {
              return (
                <div
                  key={intervalo.inicio}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--warning)_35%,transparent)] bg-[var(--warning-bg)] p-2.5"
                >
                  <div className="min-w-0">
                    <Text variant="bodyStrong" as="span" className="text-[var(--text-primary)]">
                      {rotuloIntervalo(intervalo)}
                    </Text>
                    <Text variant="meta" as="span" className="ml-2 text-[var(--text-secondary)]">
                      {intervalo.quantidade} previstos · ritmo de {intervalo.meta}
                    </Text>
                  </div>
                  {onReorganizarEpisodios ? (
                    <AppButton
                      variant="secondary"
                      size="xs"
                      onClick={() =>
                        onReorganizarEpisodios({
                          inicio: intervalo.inicio,
                          fim: intervalo.fim,
                          itemIds,
                        })
                      }
                    >
                      Reorganizar episódios
                    </AppButton>
                  ) : null}
                </div>
              );
            }

            return (
              <div key={intervalo.inicio} className="px-1 py-0.5">
                <Text variant="meta" as="span" className="text-[var(--text-secondary)] tabular-nums">
                  {rotuloIntervalo(intervalo)}: {intervalo.quantidade} de {intervalo.meta} episódios ·{' '}
                  {rotuloDaSituacaoNoRecorte(situacao)}
                </Text>
              </div>
            );
          })}
        </div>
      ) : null}

      {(linha.diasSeguidos ?? [])
        .filter(item => item.seguinte >= hojeIso)
        .map(item => (
          <Surface
            key={item.dia}
            variant="info"
            padding="sm"
            className="flex flex-wrap items-center justify-between gap-2"
          >
            <Text variant="meta">
              Episódios em dias seguidos: {format(parseISO(item.dia), 'dd/MM')} e {format(parseISO(item.seguinte), 'dd/MM')}
            </Text>
            {onReorganizarEpisodios ? (
              <AppButton
                variant="secondary"
                size="xs"
                onClick={() =>
                  onReorganizarEpisodios({
                    inicio: item.dia,
                    fim: item.seguinte,
                    itemIds: item.contentIds,
                  })
                }
              >
                Reorganizar episódios
              </AppButton>
            ) : null}
          </Surface>
        ))}

      {(linha.distancias ?? [])
        .filter(item => item.fim >= hojeIso)
        .map(item => (
          <Surface
            key={item.inicio}
            variant="info"
            padding="sm"
            className="flex flex-wrap items-center justify-between gap-2"
          >
            <Text variant="meta">
              {item.dias} dias sem episódio: {format(parseISO(item.inicio), 'dd/MM')} a{' '}
              {format(parseISO(item.fim), 'dd/MM')}
            </Text>
            {onPlanejarIntervalo ? (
              <AppButton
                variant="secondary"
                size="xs"
                onClick={() =>
                  onPlanejarIntervalo({
                    serieId: linha.serieId,
                    inicio: item.inicio,
                    fim: item.fim,
                  })
                }
              >
                Planejar neste intervalo
              </AppButton>
            ) : null}
          </Surface>
        ))}

      {escoposDaLinha.length > 0 ? (
        <div className="stack-xs border-t border-[var(--border-subtle)] pt-2">
          <Text variant="eyebrow" as="p" className="text-[var(--text-tertiary)]">
            Por conta ou formato
          </Text>
          <ul className="stack-xs">
            {escoposDaLinha.map(escopo => (
              <li key={escopo.id}>
                <button
                  type="button"
                  onClick={() => onEditarMeta(`s:${escopo.serieId}`)}
                  className="w-full rounded-[var(--radius-sm)] text-left hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                >
                  <Text variant="meta" as="span" className="block text-[var(--text-primary)]">
                    {escopo.titulo}
                  </Text>
                  <Text
                    variant="meta"
                    as="span"
                    className={cn('block', escopo.atencao ? 'text-[var(--warning)]' : 'text-[var(--text-secondary)]')}
                  >
                    {escopo.texto}
                  </Text>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {passados.length > 0 ? (
        <details
          open={historicoAberto}
          onToggle={event => onToggleHistorico(event.currentTarget.open)}
          className="border-t border-[var(--border-subtle)] pt-2"
        >
          <summary className="cursor-pointer">
            <Text variant="meta" as="span" className="text-[var(--text-tertiary)] hover:underline">
              Histórico de intervalos encerrados — {passados.length}
            </Text>
          </summary>
          <ul className="mt-1.5 stack-xs pl-2">
            {passados.map(intervalo => (
              <li key={intervalo.inicio}>
                <Text
                  variant="meta"
                  as="span"
                  className={cn(
                    'tabular-nums',
                    intervalo.abaixo ? 'text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]',
                  )}
                >
                  {rotuloIntervalo(intervalo)}: {intervalo.quantidade} de {intervalo.meta} episódios ·{' '}
                  {rotuloDaSituacaoNoRecorte(situacaoDaJanela(intervalo, hojeIso))}
                </Text>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

export function SaudeSeriesSection({
  linhasContinuidade,
  escopos,
  continuidade,
  nenhumaAcompanhada,
  semFrequencia,
  hojeIso,
  recorte,
  seriesAbertas,
  onToggleSerie,
  onPlanejarIntervalo,
  onReorganizarEpisodios,
  onEditarMeta,
  onIrParaSeries,
}: {
  linhasContinuidade: readonly LinhaContinuidade<GradeEntry>[];
  escopos: readonly LinhaDoEscopoNaSaude[];
  continuidade?: Continuidade<GradeEntry>;
  nenhumaAcompanhada: boolean;
  semFrequencia: { total: number; texto: string } | null;
  hojeIso: string;
  recorte: { inicio: string; fim: string };
  seriesAbertas: ReadonlySet<string>;
  onToggleSerie: (chave: string, aberta: boolean) => void;
  onPlanejarIntervalo?: (params: IntervaloSaude & { serieId: string }) => void;
  onReorganizarEpisodios?: (params: IntervaloSaude & { itemIds: string[] }) => void;
  onEditarMeta: (alvo: string) => void;
  onIrParaSeries: () => void;
}) {
  return (
    <Surface
      id={ANCORA_CONFERENCIA}
      as="section"
      variant="outlined"
      padding="md"
      className="scroll-mt-4 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-elevated)] stack-md"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <span
            aria-hidden
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--brand-accent)_12%,transparent)] text-[var(--brand-accent-text)]"
          >
            <Text variant="label" as="span" className="text-current">
              3
            </Text>
          </span>
          <div className="min-w-0">
            <Text variant="itemTitle" as="h3" className="text-[var(--text-primary)] leading-tight">
              As séries estão em dia?
            </Text>
            <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
              Conferência de frequência, periodicidade e presença na grade do período
            </Text>
          </div>
        </div>

        <Text variant="meta" as="span" className="shrink-0 text-[var(--text-secondary)] tabular-nums">
          {linhasContinuidade.length} {linhasContinuidade.length === 1 ? 'série ativa' : 'séries ativas'}
        </Text>
      </div>

      {nenhumaAcompanhada ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-3.5 stack-xs">
          <Text variant="body" as="p" className="text-[var(--text-secondary)]">
            Nada marcado para acompanhamento neste período.
          </Text>
          <button
            type="button"
            onClick={onIrParaSeries}
            className="w-fit rounded-[var(--radius-sm)] text-left text-[var(--brand-accent-text)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <Text variant="meta" as="span" className="text-[var(--brand-accent-text)]">
              Editar séries ›
            </Text>
          </button>
        </div>
      ) : (
        <div className="stack-sm">
          {semFrequencia ? (
            <div
              role="status"
              className="rounded-[var(--radius-card)] border p-3 stack-xs"
              style={{
                backgroundColor: 'var(--warning-bg)',
                borderColor: 'color-mix(in srgb, var(--warning) 30%, transparent)',
              }}
            >
              <Text variant="bodyStrong" as="p" className="text-[var(--text-primary)]">
                {semFrequencia.texto}
              </Text>
              <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                {TEXTO_ACOMPANHADA_SEM_RITMO}
              </Text>
            </div>
          ) : null}

          {/* Tabela completa no desktop (720px) */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  <th scope="col" className="py-2.5 pr-3">
                    <Text variant="eyebrow" as="span" className="text-[var(--text-tertiary)]">
                      Série
                    </Text>
                  </th>
                  <th scope="col" className="px-3 py-2.5">
                    <Text variant="eyebrow" as="span" className="text-[var(--text-tertiary)]">
                      Ritmo
                    </Text>
                  </th>
                  <th scope="col" className="px-3 py-2.5">
                    <Text variant="eyebrow" as="span" className="text-[var(--text-tertiary)]">
                      Situação
                    </Text>
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-center">
                    <Text variant="eyebrow" as="span" className="text-[var(--text-tertiary)]">
                      Com data
                    </Text>
                  </th>
                  <th scope="col" className="py-2.5 pl-3 text-right">
                    <Text variant="eyebrow" as="span" className="text-[var(--text-tertiary)]">
                      Publicados
                    </Text>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {linhasContinuidade.map(linha => {
                  const chave = linha.chave ?? linha.serieId;
                  const aberta = seriesAbertas.has(chave);
                  const escoposDaLinha = escopos.filter(escopo => escopo.serieId === linha.serieId);
                  const situacao = situacaoDaLinha(linha, hojeIso, escoposDaLinha);
                  const publicados = new Set(linha.itens.filter(item => item.realizada).map(item => item.contentId)).size;
                  const comData = new Set(linha.itens.filter(item => item.data && !item.realizada).map(item => item.contentId)).size;
                  const metaRecorte = linha.intervalos.length > 0 ? textoDaMetaNoRecorte(linha.intervalos, recorte) : null;
                  const subtituloSerie = [
                    linha.tipo === 'quadro'
                      ? linha.paiNome
                        ? `Quadro de ${linha.paiNome}`
                        : 'Quadro'
                      : linha.tipo === 'temporada'
                        ? linha.paiNome
                          ? `Temporada de ${linha.paiNome}`
                          : 'Temporada'
                        : null,
                    linha.tipo === 'temporada' && linha.progresso && linha.progresso.total > 0
                      ? textoDoProgresso(linha.progresso, linha.progresso.limiteDias)
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ');

                  return (
                    <Fragment key={chave}>
                      <tr className="transition-colors hover:bg-[var(--bg-primary)]">
                        <td className="py-3 pr-3 align-middle">
                          <button
                            type="button"
                            aria-expanded={aberta}
                            onClick={() => onToggleSerie(chave, !aberta)}
                            className="flex w-full items-start gap-2 rounded-[var(--radius-sm)] text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                          >
                            <span className="mt-0.5 shrink-0 text-[var(--text-tertiary)]">
                              {aberta ? (
                                <ChevronDown className="h-4 w-4" aria-hidden />
                              ) : (
                                <ChevronRight className="h-4 w-4" aria-hidden />
                              )}
                            </span>
                            <span className="min-w-0">
                              <Text variant="bodyStrong" as="span" className="block truncate text-[var(--text-primary)]">
                                {linha.nome}
                              </Text>
                              {subtituloSerie ? (
                                <Text variant="meta" as="span" className="block truncate text-[var(--text-tertiary)]">
                                  {subtituloSerie}
                                </Text>
                              ) : null}
                            </span>
                          </button>
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <Text variant="meta" as="span" className="block text-[var(--text-secondary)]">
                            {linha.frequencia}
                          </Text>
                          {metaRecorte ? (
                            <Text variant="meta" as="span" className="block text-[var(--text-tertiary)]">
                              {metaRecorte}
                            </Text>
                          ) : null}
                        </td>
                        <td className="px-3 py-3 align-middle">
                          <SituacaoPill situacao={situacao} />
                        </td>
                        <td className="px-3 py-3 text-center align-middle">
                          <Text
                            variant="bodyStrong"
                            as="span"
                            className={cn(
                              'font-mono tabular-nums',
                              situacao.tone === 'erro'
                                ? 'text-[var(--danger)]'
                                : situacao.tone === 'ok'
                                  ? 'text-[var(--success)]'
                                  : 'text-[var(--text-primary)]',
                            )}
                          >
                            {comData}
                          </Text>
                        </td>
                        <td className="py-3 pl-3 text-right align-middle">
                          <Text variant="meta" as="span" className="font-mono tabular-nums text-[var(--text-secondary)]">
                            {publicados}
                          </Text>
                        </td>
                      </tr>

                      {aberta ? (
                        <tr>
                          <td colSpan={5} className="pb-3 pt-1">
                            <DetalhesDaSerie
                              linha={linha}
                              hojeIso={hojeIso}
                              escoposDaLinha={escoposDaLinha}
                              historicoAberto={seriesAbertas.has(`historico:${linha.serieId}`)}
                              onToggleHistorico={open => onToggleSerie(`historico:${linha.serieId}`, open)}
                              onPlanejarIntervalo={onPlanejarIntervalo}
                              onReorganizarEpisodios={onReorganizarEpisodios}
                              onEditarMeta={onEditarMeta}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cartões compactos no celular (< md) */}
          <ul className="stack-sm md:hidden">
            {linhasContinuidade.map(linha => {
              const chave = linha.chave ?? linha.serieId;
              const aberta = seriesAbertas.has(chave);
              const escoposDaLinha = escopos.filter(escopo => escopo.serieId === linha.serieId);
              const situacao = situacaoDaLinha(linha, hojeIso, escoposDaLinha);
              const publicados = new Set(linha.itens.filter(item => item.realizada).map(item => item.contentId)).size;
              const comData = new Set(linha.itens.filter(item => item.data && !item.realizada).map(item => item.contentId)).size;
              const metaRecorte = linha.intervalos.length > 0 ? textoDaMetaNoRecorte(linha.intervalos, recorte) : null;

              return (
                <li
                  key={chave}
                  className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 stack-sm"
                >
                  <button
                    type="button"
                    aria-expanded={aberta}
                    onClick={() => onToggleSerie(chave, !aberta)}
                    className="flex w-full items-start justify-between gap-2 rounded-[var(--radius-sm)] text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <div className="min-w-0 stack-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Text variant="bodyStrong" as="span" className="text-[var(--text-primary)]">
                          {linha.nome}
                        </Text>
                        {linha.tipo === 'quadro' ? (
                          <Badge variant="neutral">{linha.paiNome ? `Quadro · ${linha.paiNome}` : 'Quadro'}</Badge>
                        ) : linha.tipo === 'temporada' ? (
                          <Badge variant="neutral">{linha.paiNome ? `Temp. · ${linha.paiNome}` : 'Temporada'}</Badge>
                        ) : null}
                      </div>
                      <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                        {linha.frequencia}
                        {metaRecorte ? ` · ${metaRecorte}` : ''}
                      </Text>
                      <Text variant="meta" as="p" className="tabular-nums text-[var(--text-tertiary)]">
                        {comData} com data · {publicados} {publicados === 1 ? 'publicado' : 'publicados'}
                      </Text>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <SituacaoPill situacao={situacao} />
                      <span className="text-[var(--text-tertiary)]">
                        {aberta ? <ChevronDown className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
                      </span>
                    </div>
                  </button>

                  {aberta ? (
                    <DetalhesDaSerie
                      linha={linha}
                      hojeIso={hojeIso}
                      escoposDaLinha={escoposDaLinha}
                      historicoAberto={seriesAbertas.has(`historico:${linha.serieId}`)}
                      onToggleHistorico={open => onToggleSerie(`historico:${linha.serieId}`, open)}
                      onPlanejarIntervalo={onPlanejarIntervalo}
                      onReorganizarEpisodios={onReorganizarEpisodios}
                      onEditarMeta={onEditarMeta}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>

          {/* Pendências de configuração de frequência */}
          {continuidade && continuidade.pendencias.length > 0 ? (
            <div className="stack-xs border-t border-[var(--border-subtle)] pt-3">
              <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
                {continuidade.resumoPendencias}
              </Text>
              <ul className="stack-xs">
                {continuidade.pendencias.map(pendencia => (
                  <li key={`${pendencia.temporadaId ?? pendencia.serieId}:${pendencia.motivo}`}>
                    <button
                      type="button"
                      onClick={() =>
                        onEditarMeta(pendencia.temporadaId ? `t:${pendencia.temporadaId}` : `s:${pendencia.serieId}`)
                      }
                      className="w-full rounded-[var(--radius-sm)] text-left hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    >
                      <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
                        {pendencia.nome}: {pendencia.texto}
                      </Text>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </Surface>
  );
}
