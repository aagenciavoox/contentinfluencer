import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Tag } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import type { Pilar } from '../../../lib/database';
import { cn } from '../../../lib/utils';
import type { FaixasNoPeriodo, LinhaDeFaixa } from '../../editorial/lib/faixasEditoriais';
import { COR_DA_FUNCAO } from '../../editorial/lib/funcoes';
import type { GradeEntry } from '../../editorial/lib/gradeEntries';
import { detalheDoAviso } from '../lib/detalheDoAviso';
import type { DistribuicaoAssuntos } from '../lib/distribuicaoAssuntosNaSaude';
import type { AvisoOrientacao } from '../lib/orientacaoEditorial';
import type { PublicacoesNaSaude } from '../lib/publicacoesNaSaude';
import { textoSemObjetivo, type DistribuicaoObjetivos } from '../lib/saudeIndicadores';
import type { ListaDaSaude } from './ItensDaSaudeDialog';

function textoFaixaConta(linha: LinhaDeFaixa): string {
  if (!linha.faixa) return `${linha.rotulo}: ${linha.valor}`;
  const partes = [
    linha.faixa.minimo != null ? `mín ${linha.faixa.minimo}` : null,
    `meta ${linha.faixa.meta}`,
    linha.faixa.maximo != null ? `máx ${linha.faixa.maximo}` : null,
  ].filter((parte): parte is string => parte != null);
  return `${linha.rotulo}: ${linha.valor} (${partes.join(' · ')})`;
}

export function SaudeEquilibrioSection({
  pilaresNaConta,
  previstosPorPilar,
  totalPrevistosPilares,
  itensPorPilar,
  itensSemPilar,
  textoSemPauta,
  objetivos,
  distribuicaoAssuntos,
  publicacoes,
  faixasContas,
  avisosConcentracao,
  equilibrioStatus,
  onAbrirLista,
  onAbrirEditorialDirecao,
  onLocalizarAviso,
}: {
  pilaresNaConta: readonly Pilar[];
  previstosPorPilar: ReadonlyMap<string, number>;
  totalPrevistosPilares: number;
  itensPorPilar: ReadonlyMap<string, readonly GradeEntry[]>;
  itensSemPilar: readonly GradeEntry[];
  textoSemPauta: string | null;
  objetivos?: DistribuicaoObjetivos<GradeEntry>;
  distribuicaoAssuntos: DistribuicaoAssuntos;
  publicacoes?: PublicacoesNaSaude;
  faixasContas: FaixasNoPeriodo['contas'];
  avisosConcentracao: readonly AvisoOrientacao[];
  equilibrioStatus: { tone: 'ok' | 'aviso' | 'neutro'; rotulo: string };
  onAbrirLista: (lista: ListaDaSaude) => void;
  onAbrirEditorialDirecao: () => void;
  onLocalizarAviso?: (aviso: AvisoOrientacao) => void;
}) {
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false);

  const temAssuntos =
    distribuicaoAssuntos.linhas.length > 0 ||
    distribuicaoAssuntos.semAssunto.length > 0 ||
    avisosConcentracao.length > 0;
  const temContas = Boolean(publicacoes && publicacoes.contas.length > 0) || faixasContas.length > 0;
  const temComplemento = temAssuntos || temContas;
  const temConcentracao = distribuicaoAssuntos.linhas.some(linha => linha.concentrado);

  const resumoComplemento = [
    distribuicaoAssuntos.linhas.length > 0
      ? `${distribuicaoAssuntos.linhas.length} ${distribuicaoAssuntos.linhas.length === 1 ? 'assunto' : 'assuntos'}`
      : null,
    publicacoes && publicacoes.contas.length > 0
      ? `${publicacoes.contas.length} ${publicacoes.contas.length === 1 ? 'conta' : 'contas'}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Surface
      id="saude-equilibrio"
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
              1
            </Text>
          </span>
          <div className="min-w-0">
            <Text variant="itemTitle" as="h3" className="text-[var(--text-primary)] leading-tight">
              Está equilibrado?
            </Text>
            <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
              Comparação em tempo real entre o planejado e as diretrizes do Editorial
            </Text>
          </div>
        </div>

        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1',
            equilibrioStatus.tone === 'ok'
              ? 'text-[var(--success)]'
              : equilibrioStatus.tone === 'aviso'
                ? 'text-[var(--warning)]'
                : 'text-[var(--text-secondary)]',
          )}
        >
          {equilibrioStatus.tone === 'ok' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          ) : equilibrioStatus.tone === 'aviso' ? (
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          ) : null}
          <Text variant="meta" as="span" className="text-current">
            {equilibrioStatus.rotulo}
          </Text>
        </span>
      </div>

      {/* 2 Colunas lado a lado: Pilares + Objetivos */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Coluna A: Balanço por Pilar */}
        <div className="flex flex-col justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-3.5">
          <div className="stack-sm">
            <div className="flex items-center justify-between gap-2">
              <Text variant="bodyStrong" as="h4" className="text-[var(--text-primary)]">
                Balanço por pilar
              </Text>
              <Text variant="meta" as="span" className="text-[var(--text-tertiary)] tabular-nums">
                {totalPrevistosPilares} {totalPrevistosPilares === 1 ? 'peça' : 'peças'}
              </Text>
            </div>

            {pilaresNaConta.length === 0 ? (
              <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                Nenhum pilar ativo cadastrado.
              </Text>
            ) : (
              <div className="stack-sm">
                {pilaresNaConta.map(pilar => {
                  const previstos = previstosPorPilar.get(pilar.id) ?? 0;
                  const pct = totalPrevistosPilares > 0 ? Math.round((previstos / totalPrevistosPilares) * 100) : 0;
                  const barColor = pilar.cor || 'var(--brand-accent)';
                  const itensDoPilar = itensPorPilar.get(pilar.id) ?? [];

                  return (
                    <div key={pilar.id} className="stack-xs">
                      <button
                        type="button"
                        disabled={itensDoPilar.length === 0}
                        onClick={() =>
                          onAbrirLista({
                            titulo: pilar.nome,
                            subtitulo: `${previstos} ${previstos === 1 ? 'previsto' : 'previstos'}${totalPrevistosPilares > 0 ? ` (${pct}%)` : ''}`,
                            itens: itensDoPilar,
                          })
                        }
                        className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] text-left enabled:hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:cursor-default"
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: barColor }}
                            aria-hidden
                          />
                          <Text variant="meta" as="span" className="truncate text-[var(--text-primary)]">
                            {pilar.nome}
                            {pilar.ativo === false ? ' (inativo)' : ''}
                          </Text>
                        </span>
                        <Text variant="meta" as="span" className="shrink-0 tabular-nums text-[var(--text-secondary)]">
                          <strong className="text-[var(--text-primary)]">{pct}%</strong> ({previstos})
                        </Text>
                      </button>

                      <div className="h-1.5 w-full overflow-hidden rounded-[var(--radius-pill)] bg-[var(--bg-hover)]">
                        <div
                          className="h-full rounded-[var(--radius-pill)] transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.max(pct, previstos > 0 ? 4 : 0))}%`,
                            backgroundColor: barColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-2">
            {itensSemPilar.length > 0 ? (
              <button
                type="button"
                onClick={() => onAbrirLista({ titulo: 'Sem pilar', itens: itensSemPilar })}
                className="w-fit rounded-[var(--radius-sm)] text-left text-[var(--brand-accent-text)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <Text variant="meta" as="span" className="text-[var(--brand-accent-text)]">
                  Sem pilar: {itensSemPilar.length} {itensSemPilar.length === 1 ? 'item' : 'itens'} (ver e atribuir) ›
                </Text>
              </button>
            ) : textoSemPauta ? (
              <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                {textoSemPauta}
              </Text>
            ) : (
              <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
                {totalPrevistosPilares > 0
                  ? 'Todas as peças planejadas estão associadas a um pilar.'
                  : 'Nenhuma peça planejada neste período.'}
              </Text>
            )}
          </div>
        </div>

        {/* Coluna B: Distribuição por Objetivo */}
        <div className="flex flex-col justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-3.5">
          <div className="stack-sm">
            <div className="flex items-center justify-between gap-2">
              <Text variant="bodyStrong" as="h4" className="text-[var(--text-primary)]">
                Distribuição por objetivo
              </Text>
              <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">
                Diretriz editorial
              </Text>
            </div>

            {!objetivos || objetivos.total === 0 ? (
              <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                Nenhum conteúdo previsto no período.
              </Text>
            ) : (
              <div className="stack-sm">
                {objetivos.linhas.map(linha => {
                  const barColor = COR_DA_FUNCAO[linha.funcao] ?? 'var(--brand-accent)';
                  const desvioAlto =
                    linha.desejadoPct != null && Math.abs(linha.previstoPct - linha.desejadoPct) >= 15;

                  return (
                    <div key={linha.funcao} className="stack-xs">
                      <button
                        type="button"
                        onClick={() => onAbrirLista({ titulo: linha.rotulo, itens: linha.itens })}
                        className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] text-left hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                      >
                        <Text variant="meta" as="span" className="truncate text-[var(--text-primary)]">
                          {linha.rotulo}
                        </Text>
                        <Text variant="meta" as="span" className="shrink-0 tabular-nums text-[var(--text-secondary)]">
                          <strong
                            className={desvioAlto ? 'text-[var(--warning)]' : 'text-[var(--text-primary)]'}
                          >
                            {linha.previstoPct}%
                          </strong>
                          {linha.desejadoPct != null
                            ? ` / Meta ${linha.desejadoPct}%`
                            : ` (${linha.quantidade} ${linha.quantidade === 1 ? 'peça' : 'peças'})`}
                        </Text>
                      </button>

                      <div className="h-1.5 w-full overflow-hidden rounded-[var(--radius-pill)] bg-[var(--bg-hover)]">
                        <div
                          className="h-full rounded-[var(--radius-pill)] transition-all duration-300"
                          style={{
                            width: `${Math.min(100, Math.max(linha.previstoPct, linha.quantidade > 0 ? 4 : 0))}%`,
                            backgroundColor: barColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-2">
            {objetivos && objetivos.semObjetivo.length > 0 ? (
              <button
                type="button"
                onClick={() =>
                  onAbrirLista({
                    titulo: 'Sem objetivo',
                    subtitulo: textoSemObjetivo(objetivos) ?? undefined,
                    itens: objetivos.semObjetivo,
                  })
                }
                className="w-fit rounded-[var(--radius-sm)] text-left text-[var(--brand-accent-text)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <Text variant="meta" as="span" className="text-[var(--brand-accent-text)]">
                  {objetivos.semObjetivo.length} sem objetivo (definir) ›
                </Text>
              </button>
            ) : objetivos && !objetivos.temProporcao ? (
              <button
                type="button"
                onClick={onAbrirEditorialDirecao}
                className="w-fit rounded-[var(--radius-sm)] text-left text-[var(--brand-accent-text)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <Text variant="meta" as="span" className="text-[var(--brand-accent-text)]">
                  Definir distribuição no Editorial ›
                </Text>
              </button>
            ) : (
              <>
                <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
                  Total no período
                </Text>
                <Text variant="label" as="span" className="tabular-nums text-[var(--text-primary)]">
                  {objetivos?.total ?? 0} {(objetivos?.total ?? 0) === 1 ? 'peça' : 'peças'}
                </Text>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bloco complementar recolhido: Assuntos & Publicações por Conta */}
      {temComplemento ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)]">
          <button
            type="button"
            aria-expanded={mostrarDetalhes}
            onClick={() => setMostrarDetalhes(prev => !prev)}
            className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-card)] px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
          >
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <Text variant="label" as="span" className="text-[var(--text-primary)]">
                Assuntos e contas
              </Text>
              {resumoComplemento ? (
                <Text variant="meta" as="span" className="text-[var(--text-secondary)] tabular-nums">
                  {resumoComplemento}
                </Text>
              ) : null}
              {temConcentracao ? <Badge variant="warning">Concentrado (&gt;33%)</Badge> : null}
            </div>
            <span className="text-[var(--text-tertiary)] shrink-0">
              {mostrarDetalhes ? <ChevronUp className="h-4 w-4" aria-hidden /> : <ChevronDown className="h-4 w-4" aria-hidden />}
            </span>
          </button>

          {mostrarDetalhes ? (
            <div className="grid grid-cols-1 gap-4 border-t border-[var(--border-subtle)] p-3.5 md:grid-cols-2">
              {/* Assuntos & Concentração */}
              <div className="stack-sm">
                <div className="flex items-center justify-between gap-2">
                  <Text variant="eyebrow" as="h4" className="text-[var(--text-tertiary)]">
                    Assuntos & concentração
                  </Text>
                  <Text variant="meta" as="span" className="text-[var(--text-secondary)] tabular-nums">
                    {distribuicaoAssuntos.linhas.length} {distribuicaoAssuntos.linhas.length === 1 ? 'assunto' : 'assuntos'}
                  </Text>
                </div>

                {distribuicaoAssuntos.linhas.length === 0 ? (
                  <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                    {distribuicaoAssuntos.totalPautas === 0
                      ? 'Nenhuma pauta prevista no período.'
                      : 'Nenhum assunto atribuído às pautas deste período.'}
                  </Text>
                ) : (
                  <div className="stack-xs">
                    {distribuicaoAssuntos.linhas.map(linha => (
                      <div key={linha.id} className="stack-xs">
                        <button
                          type="button"
                          onClick={() =>
                            onAbrirLista({
                              titulo: `Assunto: ${linha.nome}`,
                              subtitulo: `${linha.pautas} ${linha.pautas === 1 ? 'pauta' : 'pautas'} (${linha.pct}% do período)`,
                              itens: linha.itens,
                            })
                          }
                          className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] text-left hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                        >
                          <span className="flex min-w-0 items-center gap-1.5">
                            <Tag className="h-3 w-3 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
                            <Text variant="meta" as="span" className="truncate text-[var(--text-primary)]">
                              {linha.nome}
                            </Text>
                            {linha.concentrado ? <Badge variant="warning">&gt;33%</Badge> : null}
                          </span>
                          <Text variant="meta" as="span" className="shrink-0 tabular-nums text-[var(--text-secondary)]">
                            {linha.pautas} · {linha.pct}%
                          </Text>
                        </button>
                        <div className="h-1.5 w-full overflow-hidden rounded-[var(--radius-pill)] bg-[var(--bg-hover)]">
                          <div
                            className={cn(
                              'h-full rounded-[var(--radius-pill)]',
                              linha.concentrado ? 'bg-[var(--warning)]' : 'bg-[var(--brand-accent)]',
                            )}
                            style={{ width: `${Math.min(100, Math.max(linha.pct, 4))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {distribuicaoAssuntos.semAssunto.length > 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      onAbrirLista({
                        titulo: 'Pautas sem assunto',
                        subtitulo: `${distribuicaoAssuntos.semAssunto.length} pautas sem assunto`,
                        itens: distribuicaoAssuntos.semAssunto,
                      })
                    }
                    className="w-fit rounded-[var(--radius-sm)] text-left text-[var(--brand-accent-text)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <Text variant="meta" as="span" className="text-[var(--brand-accent-text)]">
                      Sem assunto: {distribuicaoAssuntos.semAssunto.length} ({distribuicaoAssuntos.semAssuntoPct}%) ›
                    </Text>
                  </button>
                ) : null}

                {avisosConcentracao.length > 0 ? (
                  <ul className="stack-xs border-t border-[var(--border-subtle)] pt-2">
                    {avisosConcentracao.map(aviso => {
                      const detalhe = detalheDoAviso(aviso);
                      return (
                        <li key={aviso.id} className="stack-xs">
                          <div className="flex items-start justify-between gap-2">
                            <Text variant="meta" as="p" className="text-[var(--text-primary)]">
                              {aviso.texto}
                            </Text>
                            {onLocalizarAviso ? (
                              <button
                                type="button"
                                onClick={() => onLocalizarAviso(aviso)}
                                className="shrink-0 rounded-[var(--radius-sm)] text-[var(--brand-accent-text)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                              >
                                <Text variant="meta" as="span" className="text-[var(--brand-accent-text)]">
                                  Localizar
                                </Text>
                              </button>
                            ) : null}
                          </div>
                          <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
                            {detalhe.acao}
                          </Text>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>

              {/* Publicações por Conta & Faixas */}
              <div className="stack-sm">
                <div className="flex items-center justify-between gap-2">
                  <Text variant="eyebrow" as="h4" className="text-[var(--text-tertiary)]">
                    Publicações por conta
                  </Text>
                  {publicacoes ? (
                    <Text variant="meta" as="span" className="text-[var(--text-secondary)] tabular-nums">
                      {publicacoes.metaForaDoFiltro
                        ? `${publicacoes.total} na seleção`
                        : publicacoes.meta == null
                          ? `${publicacoes.total} publicações`
                          : `${publicacoes.total} de ${publicacoes.meta}`}
                    </Text>
                  ) : null}
                </div>

                {!publicacoes || publicacoes.contas.length === 0 ? (
                  <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                    Nenhuma publicação distribuída por conta neste período.
                  </Text>
                ) : (
                  <ul className="stack-xs">
                    {publicacoes.contas.map(conta => {
                      const faixaConta = faixasContas.find(item => item.id === conta.id);
                      return (
                        <li
                          key={conta.id}
                          className="rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2.5 stack-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Text variant="bodyStrong" as="span" className="text-[var(--text-primary)]">
                              {conta.nome}
                            </Text>
                            <Text variant="meta" as="span" className="tabular-nums text-[var(--text-secondary)]">
                              {publicacoes.metaForaDoFiltro
                                ? `${conta.total} na seleção`
                                : conta.meta == null
                                  ? `${conta.total} publicações`
                                  : `${conta.total} de ${conta.meta}`}
                            </Text>
                          </div>
                          {conta.formatos.length > 0 ? (
                            <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
                              {conta.formatos.map(item => `${item.rotulo} ${item.total}`).join(' · ')}
                            </Text>
                          ) : null}
                          {faixaConta?.total?.faixa ? (
                            <Text variant="meta" as="p" className="text-[var(--text-secondary)] tabular-nums">
                              {textoFaixaConta(faixaConta.total)}
                            </Text>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Surface>
  );
}
