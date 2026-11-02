import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { AlertCircle, ChevronDown, ChevronRight, ChevronUp, Pencil } from 'lucide-react';
import { AppButton } from '../../../../components/ui/AppButton';
import { PlatformIcon } from '../../../../components/ui/PlatformIcon';
import { Surface } from '../../../../components/ui/Surface';
import { Text } from '../../../../components/ui/Text';
import { useAppContext } from '../../../../context/AppContext';
import { CONTENT_STATUS, normalizeContentStatus } from '../../../contents/lib/contentPipeline';
import type { Pilar, Platform, Serie } from '../../../../lib/database';
import type { DecisaoPeriodo } from '../../lib/editorialSettings';
import { expectativaNoIntervalo, lerFrequencia, type FrequenciaSerie } from '../../lib/frequenciaSerie';
import { AjustarMetasDialog } from './AjustarMetasDialog';
import type { PeriodoSelecionado } from './PeriodoEditorialControl';

export interface PlanoVigenteViewProps {
  periodo: PeriodoSelecionado;
  decisao: DecisaoPeriodo | null;
  platforms: readonly Platform[];
  series: readonly Serie[];
  pilares?: readonly Pilar[];
  limiteSemanal: number | null;
  onSalvarDecisao: (patch: Partial<Omit<DecisaoPeriodo, 'inicio' | 'fim'>>) => void;
  /** No Planejamento o card abre fechado, com "Ver detalhes". No Editorial fica sempre aberto. */
  recolhivel?: boolean;
}

interface ContaMetaExibicao {
  id: string;
  nome: string;
  handle: string;
  cor: string;
  /** Só existe quando foi escrita em "Ajustar metas". */
  producao: number | null;
  /** Vem da meta escrita ou do ritmo escrito; sem nenhum dos dois, a conta não tem meta. */
  publicacao: number | null;
  ritmoSemanal: string | null;
  realizados: number;
}

interface SerieFreqExibicao {
  id: string;
  nome: string;
  cor: string;
  frequencia: string;
  pilarNome?: string;
  /** null = sob demanda, sem número esperado. */
  metaEsperada: number | null;
  produzidos: number;
}

function formatarHandle(platform: Platform): string {
  if (!platform.handle) return '';
  if (platform.handle.startsWith('@') || platform.handle.includes('/') || platform.handle.includes('.')) {
    return platform.handle;
  }
  return `@${platform.handle}`;
}

function extrairDiasDePausa(texto: string): number {
  if (!texto) return 0;
  const matchRange = texto.match(/(\d{1,2})\s*a\s*(\d{1,2})/);
  if (matchRange) {
    const d1 = parseInt(matchRange[1], 10);
    const d2 = parseInt(matchRange[2], 10);
    if (!isNaN(d1) && !isNaN(d2) && d2 >= d1) {
      return d2 - d1 + 1;
    }
  }
  const matchDias = texto.match(/(\d+)\s*dias?/);
  if (matchDias) {
    return parseInt(matchDias[1], 10);
  }
  return 0;
}

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

function percentual(feitos: number, meta: number | null): number {
  return meta && meta > 0 ? Math.min(100, Math.round((feitos / meta) * 100)) : 0;
}

/** "3" vira "3 por semana"; texto escrito de outro jeito aparece como foi escrito. */
function textoDoRitmo(ritmo: string | undefined): string | null {
  const limpo = ritmo?.trim();
  if (!limpo) return null;
  return /^\d+$/.test(limpo) ? `${limpo} por semana` : limpo;
}

function decimal(n: number): string {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

const UMA_VEZ_POR: Record<string, string> = { semana: 'Semanal', quinzena: 'Quinzenal', mes: 'Mensal' };

/** Mesmo texto para a frequência estruturada e a antiga, escrita à mão. */
function frequenciaDaSerie(freq: FrequenciaSerie): string {
  if (freq.unidade === 'sob-demanda' || freq.vezes == null) return 'Sob demanda';
  if (freq.vezes === 1) return UMA_VEZ_POR[freq.unidade] ?? `1x por ${freq.unidade}`;
  return `${freq.vezes}x por ${freq.unidade === 'mes' ? 'mês' : freq.unidade}`;
}

export function PlanoVigenteView({
  periodo,
  decisao,
  platforms,
  series,
  pilares = [],
  limiteSemanal,
  onSalvarDecisao,
  recolhivel = false,
}: PlanoVigenteViewProps) {
  const navigate = useNavigate();
  const { state } = useAppContext();
  const [ajustarModalAberto, setAjustarModalAberto] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const aberto = !recolhivel || expanded;

  const prioridadeTexto = decisao?.prioridade?.trim() ?? '';
  const pausaTexto = decisao?.pausaEditorial?.trim() ?? '';

  // Dias do período menos a pausa: é a base de todas as metas proporcionais.
  const totalDias = Math.max(1, differenceInCalendarDays(parseISO(periodo.fim), parseISO(periodo.inicio)) + 1);
  const diasPausa = extrairDiasDePausa(pausaTexto);
  const diasAtivos = Math.max(1, totalDias - diasPausa);
  const semanasAtivas = diasAtivos / 7;

  const conteudosDoPeriodo = state.contents.filter(c => {
    const data = c.publishDate || c.recordingDate;
    return Boolean(data && data >= periodo.inicio && data <= periodo.fim && !c.deletedAt);
  });

  const activePlatforms = platforms.filter(p => p.ativo);

  const contas: ContaMetaExibicao[] = activePlatforms.map(p => {
    // Horários dizem quando postar, não quantas vezes: o ritmo da conta só vem do que foi escrito.
    const metaSalva = decisao?.metasPorConta?.[p.id];
    const ritmoNum = parseInt(metaSalva?.ritmoSemanal?.replace(/\D/g, '') ?? '', 10);
    const publicacao = metaSalva?.publicacao
      ?? (Number.isFinite(ritmoNum) && ritmoNum > 0 ? Math.round(ritmoNum * semanasAtivas) : null);

    const conteudosDaConta = conteudosDoPeriodo.filter(c => {
      const temNaPlataforma = c.plataformas?.some(dest => dest.platformId === p.id);
      return temNaPlataforma || (!c.plataformas?.length && p.id === state.editorial.preferencias.redeReferenciaId);
    });

    const nomeMinusculo = p.nome.toLowerCase();
    const cor = nomeMinusculo.includes('instagram')
      ? 'var(--accent-pink)'
      : nomeMinusculo.includes('tiktok')
        ? 'var(--text-primary)'
        : 'var(--accent-red)';

    return {
      id: p.id,
      nome: p.nome,
      handle: formatarHandle(p),
      cor,
      producao: metaSalva?.producao ?? null,
      publicacao,
      ritmoSemanal: textoDoRitmo(metaSalva?.ritmoSemanal),
      realizados: conteudosDaConta.filter(c => normalizeContentStatus(c.status) === CONTENT_STATUS.POSTADO).length,
    };
  });

  const somaDasContas = (valores: Array<number | null>): number | null => {
    const escritos = valores.filter((v): v is number => v != null);
    return escritos.length > 0 ? escritos.reduce((soma, v) => soma + v, 0) : null;
  };

  // Produção e publicação seguem o mesmo ritmo semanal (aba Ritmo) vezes as semanas do período.
  // Um número escrito em "Ajustar metas" vale no lugar do calculado.
  const metaPeloRitmo = limiteSemanal ? Math.round(limiteSemanal * semanasAtivas) : null;
  const producaoCalculada = metaPeloRitmo ?? somaDasContas(contas.map(c => c.producao));
  const publicacaoCalculada = metaPeloRitmo ?? somaDasContas(contas.map(c => c.publicacao));
  const totalProducao = decisao?.metasProducao ?? producaoCalculada;
  const totalPublicacao = decisao?.metasPublicacao ?? publicacaoCalculada;

  const realizadosProducao = conteudosDoPeriodo.length;
  const realizadosPublicacao = conteudosDoPeriodo.filter(c => normalizeContentStatus(c.status) === CONTENT_STATUS.POSTADO).length;
  const pctProducao = percentual(realizadosProducao, totalProducao);
  const pctPublicacao = percentual(realizadosPublicacao, totalPublicacao);

  const resumoProducao = totalProducao == null ? 'Produção sem meta' : `${plural(totalProducao, 'roteiro', 'roteiros')} para produzir`;
  const resumoPublicacao = totalPublicacao == null ? 'publicação sem meta' : `${plural(totalPublicacao, 'post', 'posts')} para publicar`;
  const resumo = totalProducao == null && totalPublicacao == null
    ? 'Defina o ritmo semanal para calcular as metas.'
    : `${resumoProducao} · ${resumoPublicacao}`;

  const pilaresMap = new Map(pilares.map(p => [p.id, p.nome]));

  const seriesExibidas: SerieFreqExibicao[] = series
    .filter(s => s.ativa)
    .map(s => {
      const pilarId = s.pilarPrincipalId || s.pilarIds?.[0];
      const freq = lerFrequencia({
        frequenciaRecomendada: s.frequenciaRecomendada,
        vezes: s.frequenciaVezes,
        unidade: s.frequenciaUnidade,
        aPartirDe: s.frequenciaAPartirDe,
      });
      return {
        id: s.id,
        nome: s.name,
        cor: s.cor || 'var(--text-tertiary)',
        pilarNome: pilarId ? pilaresMap.get(pilarId) : undefined,
        frequencia: frequenciaDaSerie(freq),
        metaEsperada: expectativaNoIntervalo(freq, periodo.inicio, periodo.fim),
        produzidos: conteudosDoPeriodo.filter(c => c.seriesId === s.id).length,
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const textoDosDias = diasPausa > 0
    ? `${diasAtivos} dias (${diasPausa} de pausa fora) · ${decimal(semanasAtivas)} semanas`
    : `${diasAtivos} dias · ${decimal(semanasAtivas)} semanas`;

  const cardMetrica = 'rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 flex flex-col justify-between';

  return (
    <Surface
      variant="outlined"
      padding="none"
      className="w-full overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-elevated)] border-[var(--border-subtle)] p-4 sm:p-6 stack-md"
    >
      {/* Cabeçalho: o resumo do período e a ação de mudar as metas. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 stack-xs">
          <Text variant="sectionTitle" as="h2">Metas do período</Text>
          <Text variant="secondary" as="p" className="tabular-nums">
            {resumo}
          </Text>
          {prioridadeTexto ? (
            <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
              Prioridade: {prioridadeTexto}
            </Text>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <AppButton
            variant="secondary"
            size="sm"
            leftIcon={<Pencil className="h-3.5 w-3.5" />}
            onClick={() => setAjustarModalAberto(true)}
          >
            Ajustar metas
          </AppButton>
          {recolhivel ? (
            <AppButton
              variant="ghost"
              size="sm"
              aria-expanded={expanded}
              onClick={() => setExpanded(prev => !prev)}
              rightIcon={expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            >
              {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
            </AppButton>
          ) : null}
        </div>
      </div>

      {aberto ? (
        <div className={recolhivel ? 'stack-md pt-2 border-t border-[var(--border-subtle)]' : 'stack-md'}>
          {/* A pausa muda todas as contas abaixo, então vem antes delas. */}
          {pausaTexto ? (
            <div className="flex items-center gap-2 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-[var(--accent-orange)]" aria-hidden />
              <Text variant="body" as="span">
                <strong>Pausa:</strong> {pausaTexto}
              </Text>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className={cardMetrica}>
              <div>
                <div className="flex items-center justify-between">
                  <Text variant="label" as="span" className="uppercase tracking-wider">Produção</Text>
                  {totalProducao != null ? (
                    <Text variant="bodyStrong" as="span" className="text-[var(--text-secondary)] tabular-nums">{pctProducao}%</Text>
                  ) : null}
                </div>
                <Text variant="sectionTitle" as="p" className="mt-1.5 tabular-nums">
                  {totalProducao == null ? 'Sem meta' : plural(totalProducao, 'roteiro', 'roteiros')}
                </Text>
                <Text variant="meta" as="p" className="mt-0.5 text-[var(--text-secondary)] tabular-nums">
                  {totalProducao == null
                    ? `${plural(realizadosProducao, 'roteiro', 'roteiros')} com data no período`
                    : `${realizadosProducao} de ${totalProducao} com data no período`}
                  {decisao?.metasProducao != null ? ' · meta ajustada' : ''}
                </Text>
              </div>
              <div className="h-1.5 w-full bg-[var(--border-subtle)] rounded-[var(--radius-pill)] mt-3 overflow-hidden">
                <div className="h-full bg-[var(--accent-pink)] rounded-[var(--radius-pill)] transition-all duration-300" style={{ width: `${pctProducao}%` }} />
              </div>
            </div>

            <div className={cardMetrica}>
              <div>
                <div className="flex items-center justify-between">
                  <Text variant="label" as="span" className="uppercase tracking-wider">Publicação</Text>
                  {totalPublicacao != null ? (
                    <Text variant="bodyStrong" as="span" className="text-[var(--text-secondary)] tabular-nums">{pctPublicacao}%</Text>
                  ) : null}
                </div>
                <Text variant="sectionTitle" as="p" className="mt-1.5 tabular-nums">
                  {totalPublicacao == null ? 'Sem meta' : plural(totalPublicacao, 'post', 'posts')}
                </Text>
                <Text variant="meta" as="p" className="mt-0.5 text-[var(--text-secondary)] tabular-nums">
                  {totalPublicacao == null
                    ? `${plural(realizadosPublicacao, 'postado', 'postados')} no período`
                    : `${realizadosPublicacao} de ${totalPublicacao} postados`}
                  {decisao?.metasPublicacao != null ? ' · meta ajustada' : ''}
                </Text>
              </div>
              <div className="h-1.5 w-full bg-[var(--border-subtle)] rounded-[var(--radius-pill)] mt-3 overflow-hidden">
                <div className="h-full bg-[var(--accent-green)] rounded-[var(--radius-pill)] transition-all duration-300" style={{ width: `${pctPublicacao}%` }} />
              </div>
            </div>

            {/* De onde vem a meta de publicação: o ritmo da aba Ritmo vezes as semanas do período. */}
            <div className={cardMetrica}>
              <div>
                <Text variant="label" as="span" className="uppercase tracking-wider">Ritmo</Text>
                <Text variant="sectionTitle" as="p" className="mt-1.5 tabular-nums">
                  {limiteSemanal ? `${limiteSemanal} por semana` : 'Sem ritmo'}
                </Text>
                <Text variant="meta" as="p" className="mt-0.5 text-[var(--text-secondary)] tabular-nums">
                  {textoDosDias}
                </Text>
              </div>
              <div className="mt-3">
                <AppButton
                  variant="ghost"
                  size="sm"
                  rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
                  onClick={() => navigate('/editorial?aba=ajustes')}
                >
                  {limiteSemanal ? 'Editar ritmo' : 'Definir ritmo'}
                </AppButton>
              </div>
            </div>
          </div>

          <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 stack-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <Text variant="bodyStrong" as="h3">Por conta</Text>
              <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">Postados no período · a meta de cada conta vem de "Ajustar metas"</Text>
            </div>

            {contas.length === 0 ? (
              <div className="flex flex-wrap items-center gap-3">
                <Text variant="secondary" as="p">Nenhuma conta ativa.</Text>
                <AppButton variant="secondary" size="sm" onClick={() => navigate('/contas')}>Abrir contas</AppButton>
              </div>
            ) : (
              <ul className="stack-sm">
                {contas.map(conta => {
                  const pctConta = percentual(conta.realizados, conta.publicacao);
                  const detalhes = [
                    conta.publicacao == null
                      ? plural(conta.realizados, 'postado', 'postados')
                      : `${conta.realizados} de ${plural(conta.publicacao, 'post', 'posts')}`,
                    ...(conta.producao != null ? [plural(conta.producao, 'roteiro', 'roteiros')] : []),
                    ...(conta.ritmoSemanal ? [conta.ritmoSemanal] : []),
                  ];
                  return (
                    <li key={conta.id} className="stack-xs">
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <PlatformIcon platform={conta.nome} colored className="h-4 w-4 shrink-0" />
                          <Text variant="body" as="span" className="truncate">{conta.nome}</Text>
                          {conta.handle ? (
                            <Text variant="meta" as="span" className="text-[var(--text-tertiary)] hidden sm:inline">{conta.handle}</Text>
                          ) : null}
                        </div>
                        <Text variant="meta" as="span" className="text-[var(--text-secondary)] tabular-nums">
                          {detalhes.join(' · ')}
                        </Text>
                      </div>
                      {conta.publicacao != null ? (
                        <div className="h-2 w-full bg-[var(--border-subtle)] rounded-[var(--radius-pill)] overflow-hidden">
                          <div
                            className="h-full rounded-[var(--radius-pill)] transition-all duration-300"
                            style={{ width: `${pctConta}%`, backgroundColor: conta.cor }}
                          />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 stack-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <Text variant="bodyStrong" as="h3">Séries no período</Text>
              <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">Episódios com data no período e o que a frequência pede</Text>
            </div>

            {seriesExibidas.length === 0 ? (
              <div className="flex flex-wrap items-center gap-3">
                <Text variant="secondary" as="p">Nenhuma série ativa.</Text>
                <AppButton variant="secondary" size="sm" onClick={() => navigate('/series')}>Abrir séries</AppButton>
              </div>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                {seriesExibidas.map(serie => (
                  <li key={serie.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/series/${serie.id}`)}
                      className="-mx-2 flex w-[calc(100%+1rem)] items-start justify-between gap-3 rounded-[var(--radius-input)] px-2 py-2 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                    >
                      <span className="flex min-w-0 items-start gap-2">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-[var(--radius-pill)]" style={{ backgroundColor: serie.cor }} aria-hidden />
                        <span className="min-w-0">
                          <Text variant="body" as="span" className="block">{serie.nome}</Text>
                          {serie.pilarNome ? (
                            <Text variant="meta" as="span" className="block text-[var(--text-tertiary)]">{serie.pilarNome}</Text>
                          ) : null}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <Text variant="meta" as="span" className="block text-[var(--text-secondary)] tabular-nums">
                          {serie.metaEsperada == null ? plural(serie.produzidos, 'episódio', 'episódios') : `${serie.produzidos} de ${serie.metaEsperada}`}
                        </Text>
                        <Text variant="meta" as="span" className="block text-[var(--text-tertiary)]">{serie.frequencia}</Text>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
            Produção e publicação são o ritmo semanal vezes as semanas do período. Mudar o ritmo depois não altera períodos que já passaram.
          </Text>
        </div>
      ) : null}

      <AjustarMetasDialog
        open={ajustarModalAberto}
        onClose={() => setAjustarModalAberto(false)}
        periodo={periodo}
        decisao={decisao}
        platforms={activePlatforms}
        producaoCalculada={producaoCalculada}
        publicacaoCalculada={publicacaoCalculada}
        onSalvar={onSalvarDecisao}
      />
    </Surface>
  );
}
