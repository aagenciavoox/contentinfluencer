import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Clock,
  HelpCircle,
  Layers,
  Pin,
  Sparkles,
  Tag,
  Target,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { readStoredJson, writeStoredJson } from '../../../lib/browserStorage';
import type { Content, Pilar, Serie, Tema } from '../../../lib/database';
import type { GradeCounts } from '../../editorial/lib/gradeCounts';
import type { PreparoDoPeriodo } from '../lib/monthHealth';
import { distribuicaoPorPilar } from '../lib/periodoDaSaude';
import { distribuicaoAssuntosNaSaude } from '../lib/distribuicaoAssuntosNaSaude';
import { cn } from '../../../lib/utils';
import type { GradeEntry } from '../../editorial/lib/gradeEntries';
import { rotuloIntervalo, textoMaisPraFechar, textoRitmoAbaixo, textoSemObjetivo, type Continuidade, type LinhaContinuidade, type DistribuicaoObjetivos } from '../lib/saudeIndicadores';
import { textoDaJanela } from '../../editorial/lib/apuracaoSerie';
import { ItensDaSaudeDialog, type ListaDaSaude } from './ItensDaSaudeDialog';
import type { LinhaDoEscopoNaSaude } from '../lib/continuidadePorEscopoNaSaude';
import type { PublicacoesNaSaude } from '../lib/publicacoesNaSaude';
import { pontosParaRevisar, type AvisoOrientacao } from '../lib/orientacaoEditorial';
import { blocoDoAviso, detalheDoAviso } from '../lib/detalheDoAviso';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { secoesSalvas, type IntervaloSaude } from '../lib/saudeActions';
import { withDetailBack } from '../../../lib/navigation/detailBack';

const STORAGE_EXPANDED_KEY = 'content-os:saude-editorial-expanded';
const STORAGE_SECOES_KEY = 'content-os:saude-editorial-secoes-v2';
const STORAGE_SCROLL_KEY = 'content-os:saude-editorial-scroll';

const SECOES_IDS = ['urgencias', 'producao', 'series', 'objetivos', 'contas', 'pilares-assuntos'];
const SECOES_PADRAO = ['urgencias'];

export interface SaudeEditorialPanelProps {
  /** "Período: 16/10 – 30/12": o período salvo no Editorial que a saúde cobre. */
  rotuloPeriodo: string;
  /** Quando o calendário mostra datas fora do período. */
  avisoPeriodo?: string | null;
  foraDoPrazo?: readonly GradeEntry[];
  roteiroIds?: readonly string[];
  onResolverData?: (item: GradeEntry) => void;
  counts: GradeCounts & {
    preparo?: PreparoDoPeriodo;
    limite?: number | null;
    previsto?: number;
    postIts?: number;
  };
  series?: readonly Serie[];
  pilares: readonly Pilar[];
  temas?: readonly Tema[];
  contents?: readonly Content[];
  /** Objetivo de cada item (o do conteúdo, senão da série, senão do post-it) sobre todos os itens. */
  objetivos?: DistribuicaoObjetivos<GradeEntry>;
  /** Séries e quadros com meta, conferidos intervalo a intervalo. */
  continuidade?: Continuidade<GradeEntry>;
  /** Acompanhamentos por conta ou formato, cada um à parte. */
  escopos?: readonly LinhaDoEscopoNaSaude[];
  /** Publicações por conta no trecho e a soma das contas. */
  publicacoes?: PublicacoesNaSaude;
  /**
   * completo: card inline expansível.
   * faixa: linha horizontal compacta no topo da tela com botão "Ver análise".
   * analise: visual completo dentro do drawer com acordeons independentes.
   */
  modo?: 'completo' | 'faixa' | 'analise';
  onVerAnalise?: () => void;
  onFechar?: () => void;
  /** Avisos do trecho, cada um no seu bloco (Continuidade, Concentração ou Produção). */
  avisos?: readonly AvisoOrientacao[];
  onLocalizarAviso?: (aviso: AvisoOrientacao) => void;
  /** "Instagram · Reels" quando o calendário está filtrado. */
  filtroRotulo?: string | null;
  onAddReserva: () => void;
  onOpenGravacao: (contentIds?: string[]) => void;
  onPlanejarIntervalo?: (params: IntervaloSaude & { serieId: string }) => void;
  onReorganizarEpisodios?: (params: IntervaloSaude & { itemIds: string[] }) => void;
  className?: string;
}

function AvisoDetalhado({
  aviso,
  onLocalizar,
}: {
  aviso: AvisoOrientacao;
  onLocalizar?: (aviso: AvisoOrientacao) => void;
}) {
  const detalhe = detalheDoAviso(aviso);
  return (
    <li className="stack-xs rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-2.5">
      <div className="flex items-start justify-between gap-2">
        <Text variant="bodyStrong" as="p" className="text-[var(--text-primary)]">
          {aviso.texto}
        </Text>
        {onLocalizar ? (
          <button
            type="button"
            onClick={() => onLocalizar(aviso)}
            className="shrink-0 text-[var(--brand-accent-text)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] rounded-[var(--radius-sm)]"
          >
            <Text variant="meta" as="span" className="text-[var(--brand-accent-text)]">
              Localizar
            </Text>
          </button>
        ) : null}
      </div>
      <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
        {detalhe.intervalo ? `Intervalo: ${detalhe.intervalo} · ` : ''}
        {detalhe.acao}
      </Text>
    </li>
  );
}

function SecaoAccordion({
  id,
  titulo,
  resumo,
  aberta,
  onToggle,
  alerta = 'ok',
  icon: Icon,
  children,
}: {
  id: string;
  titulo: string;
  resumo?: React.ReactNode;
  aberta: boolean;
  onToggle: () => void;
  alerta?: 'erro' | 'aviso' | 'ok';
  icon: typeof Calendar;
  children: React.ReactNode;
}) {
  const dotColor =
    alerta === 'erro'
      ? 'bg-[var(--accent-red)]'
      : alerta === 'aviso'
      ? 'bg-[var(--accent-orange)]'
      : 'bg-[var(--accent-green)]';

  return (
    <section
      id={`secao-${id}`}
      aria-label={titulo}
      className={cn(
        'rounded-[var(--radius-card)] border bg-[var(--bg-primary)] transition-all',
        alerta === 'erro'
          ? 'border-[color-mix(in_srgb,var(--accent-red)_30%,var(--border-subtle))]'
          : alerta === 'aviso'
          ? 'border-[color-mix(in_srgb,var(--accent-orange)_30%,var(--border-subtle))]'
          : 'border-[var(--border-subtle)]'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={aberta}
        className="flex w-full items-center justify-between gap-3 p-3.5 sm:p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] rounded-[var(--radius-card)]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={cn('h-2 w-2 rounded-full shrink-0', dotColor)} aria-hidden />
          <Icon className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
          <Text variant="bodyStrong" as="h3" className="text-[var(--text-primary)] truncate">
            {titulo}
          </Text>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {resumo ? (
            <span className="hidden sm:inline-block">
              <Text variant="meta" as="span" className="text-[var(--text-secondary)] tabular-nums">
                {resumo}
              </Text>
            </span>
          ) : null}
          <span className="p-1 text-[var(--text-tertiary)]">
            {aberta ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </div>
      </button>

      {/* Resumo visível em telas menores quando recolhido */}
      {!aberta && resumo ? (
        <div className="px-3.5 pb-3 sm:hidden">
          <Text variant="meta" as="p" className="text-[var(--text-secondary)] tabular-nums">
            {resumo}
          </Text>
        </div>
      ) : null}

      {aberta ? (
        <div className="border-t border-[var(--border-subtle)] p-3.5 sm:p-4 stack-md">
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function SaudeEditorialPanel({
  rotuloPeriodo,
  avisoPeriodo,
  counts,
  foraDoPrazo: pendenciasForaDoPrazo,
  roteiroIds: idsParaGravar = [],
  onResolverData,
  series = [],
  pilares,
  temas = [],
  contents = [],
  objetivos,
  continuidade,
  escopos = [],
  publicacoes,
  modo = 'completo',
  onVerAnalise,
  onFechar,
  avisos = [],
  onLocalizarAviso,
  filtroRotulo,
  onAddReserva,
  onOpenGravacao,
  onPlanejarIntervalo,
  onReorganizarEpisodios,
  className,
}: SaudeEditorialPanelProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const retornoPlanejamento = `${location.pathname}${location.search}`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [lista, setLista] = useState<ListaDaSaude | null>(null);
  const [expanded, setExpandedRaw] = useState(() => readStoredJson(STORAGE_EXPANDED_KEY, false));

  // Multi-open accordion state persisted in localStorage
  const [secoesAbertas, setSecoesAbertas] = useState<Set<string>>(() => {
    const salvo = readStoredJson<unknown>(STORAGE_SECOES_KEY, SECOES_PADRAO);
    return secoesSalvas(salvo, SECOES_IDS);
  });

  const [seriesAbertas, setSeriesAbertas] = useState<Set<string>>(() => {
    const salvo = readStoredJson<unknown>('content-os:saude-editorial-series', []);
    return new Set(Array.isArray(salvo) ? salvo.filter((id): id is string => typeof id === 'string') : []);
  });
  const guardarAbertura = (id: string, aberta: boolean) => {
    setSeriesAbertas(prev => {
      if (prev.has(id) === aberta) return prev;
      const next = new Set(prev);
      if (aberta) next.add(id); else next.delete(id);
      writeStoredJson('content-os:saude-editorial-series', [...next]);
      return next;
    });
  };
  const toggleSecao = (id: string) => {
    setSecoesAbertas(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeStoredJson(STORAGE_SECOES_KEY, Array.from(next));
      return next;
    });
  };

  const toggleExpanded = () => {
    setExpandedRaw(prev => {
      const next = !prev;
      writeStoredJson(STORAGE_EXPANDED_KEY, next);
      return next;
    });
  };

  const hojeIso = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  // Preservação da rolagem do painel lateral/drawer
  useEffect(() => {
    if (modo !== 'analise') return;
    const scrollParent = rootRef.current?.closest('.overflow-y-auto') ?? rootRef.current?.parentElement;
    if (!scrollParent) return;

    const savedScroll = readStoredJson<number>(STORAGE_SCROLL_KEY, 0);
    let restaurando = savedScroll > 0;
    const restaurar = () => {
      if (!restaurando) return;
      scrollParent.scrollTop = savedScroll;
      if (scrollParent.scrollHeight - scrollParent.clientHeight >= savedScroll) restaurando = false;
    };
    const frame = requestAnimationFrame(restaurar);
    const observer = new ResizeObserver(restaurar);
    if (rootRef.current) observer.observe(rootRef.current);
    const handleScroll = () => {
      if (!restaurando) writeStoredJson(STORAGE_SCROLL_KEY, scrollParent.scrollTop);
    };
    const interagir = () => { restaurando = false; };
    scrollParent.addEventListener('scroll', handleScroll, {passive: true});
    scrollParent.addEventListener('pointerdown', interagir, {passive: true});
    scrollParent.addEventListener('wheel', interagir, {passive: true});
    scrollParent.addEventListener('touchstart', interagir, {passive: true});
    scrollParent.addEventListener('keydown', interagir);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      if (!restaurando) writeStoredJson(STORAGE_SCROLL_KEY, scrollParent.scrollTop);
      scrollParent.removeEventListener('scroll', handleScroll);
      scrollParent.removeEventListener('pointerdown', interagir);
      scrollParent.removeEventListener('wheel', interagir);
      scrollParent.removeEventListener('touchstart', interagir);
      scrollParent.removeEventListener('keydown', interagir);
    };
  }, [modo]);

  const preenchidos = counts.previsto ?? counts.somaPlanejado ?? 0;
  const comFiltro = Boolean(filtroRotulo);
  const metaTotal = comFiltro ? null : counts.limite ?? null;
  const percentualGeral = metaTotal != null && metaTotal > 0 ? Math.min(100, Math.round((preenchidos / metaTotal) * 100)) : 0;

  const preparo = counts.preparo;
  const gravacao = preparo?.gravacao ?? 0;
  const escrita = preparo?.escrita ?? 0;
  const edicao = preparo?.edicao ?? 0;

  const previstosPorPilar = new Map(counts.pilares.map(linha => [linha.id, linha.planejado]));
  const pilaresNaConta = pilares.filter(p => p.ativo !== false || (previstosPorPilar.get(p.id) ?? 0) > 0);
  const itensSemPilar = counts.itens.filter(item => !item.pilarId);
  const faltamParaMeta = metaTotal == null ? 0 : Math.max(0, metaTotal - preenchidos);
  const distribuicao = distribuicaoPorPilar(pilaresNaConta.map(p => p.id), counts.pilares, preenchidos);

  const distribuicaoAssuntos = useMemo(() => {
    return distribuicaoAssuntosNaSaude({
      itens: counts.itens ?? [],
      contents,
      temas,
    });
  }, [counts.itens, contents, temas]);

  const emAnalise = modo === 'analise';
  const aberto = emAnalise || (modo === 'completo' && expanded);
  const avisosDe = (bloco: ReturnType<typeof blocoDoAviso>) => avisos.filter(aviso => blocoDoAviso(aviso) === bloco);
  const revisar = pontosParaRevisar(avisos.filter(a => blocoDoAviso(a) !== 'continuidade'));

  // 1. Urgências & Hoje: Publicações com data anterior a hoje não realizadas, e pendências de hoje
  const foraDoPrazo = useMemo(() => {
    return pendenciasForaDoPrazo ?? (counts.itens ?? []).filter(item => {
      if (!item.data || item.data >= hojeIso) return false;
      if (item.realizada || item.etapa === 'postado') return false;
      return true;
    });
  }, [counts.itens, hojeIso, pendenciasForaDoPrazo]);

  const deHoje = useMemo(() => {
    return (counts.itens ?? []).filter(item => item.data === hojeIso);
  }, [counts.itens, hojeIso]);

  const pendentesHoje = useMemo(() => {
    return deHoje.filter(item => !item.realizada && item.etapa !== 'postado');
  }, [deHoje]);

  const avisosVespera = useMemo(() => {
    return avisos.filter(a => a.tipo === 'vespera-sem-pronto');
  }, [avisos]);

  const roteiroIds = [...idsParaGravar];
  const roteirosParaGravar = [...new Map(counts.itens.filter(item => roteiroIds.includes(item.contentId)).map(item => [item.contentId, item])).values()];

  // 3. Séries: Avaliação agrupada por série (futuro vs passado)
  const linhasContinuidade = useMemo(() => {
    const linhas: LinhaContinuidade<GradeEntry>[] = [...(continuidade?.linhas ?? [])];
    for (const escopo of escopos) {
      if (linhas.some(linha => linha.serieId === escopo.serieId)) continue;
      const serie = series.find(s => s.id === escopo.serieId);
      linhas.push({chave: escopo.serieId, serieId: escopo.serieId, nome: serie?.name ?? 'Série', tipo: 'serie', paiNome: null,
        frequencia: 'Acompanhamento por conta ou formato', intervalos: [], abaixo: [], reservadas: [],
        concentrada: false, semEpisodios: false, foraDoPeriodo: 0, precisaAtencao: escopo.atencao, itens: []});
    }
    return linhas;
  }, [continuidade, escopos, series]);

  const seriesAbaixo = useMemo(() => {
    return linhasContinuidade.filter(l => {
      const futuros = l.intervalos.filter(i => i.fim >= hojeIso);
      return futuros.some(i => i.abaixo && !i.pausada && !i.parcial);
    });
  }, [linhasContinuidade, hojeIso]);

  const seriesConcentradas = useMemo(() => {
    return linhasContinuidade.filter(l => {
      const futuros = l.intervalos.filter(i => i.fim >= hojeIso);
      return futuros.some(i => i.quantidade > i.meta && !i.pausada);
    });
  }, [linhasContinuidade, hojeIso]);

  const seriesComPendencias = linhasContinuidade.filter(l => seriesAbaixo.includes(l) || seriesConcentradas.includes(l)
    || (l.diasSeguidos ?? []).some(d => d.seguinte >= hojeIso)
    || (l.distancias ?? []).some(d => d.fim >= hojeIso)
    || escopos.some(e => e.serieId === l.serieId && e.atencao));

  // Status visual geral
  const statusGeral = foraDoPrazo.length > 0 ? 'erro' : seriesComPendencias.length > 0 || gravacao > 0 ? 'aviso' : 'ok';

  // --- Modo FAIXA: Linha horizontal compacta para topo da página ---
  if (modo === 'faixa') {
    return (
      <Surface
        variant="outlined"
        padding="none"
        className={cn(
          'w-full overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-elevated)] border-[var(--border-subtle)] p-3 sm:p-4 shadow-[var(--shadow-soft)]',
          className
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-full shrink-0',
                statusGeral === 'erro' ? 'bg-[var(--accent-red)]' : statusGeral === 'aviso' ? 'bg-[var(--accent-orange)]' : 'bg-[var(--accent-green)]'
              )}
              aria-hidden
            />
            <Text variant="bodyStrong" as="h2" className="text-[var(--text-primary)]">
              Saúde Editorial — {rotuloPeriodo}
            </Text>

            {foraDoPrazo.length > 0 ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] bg-[color-mix(in_srgb,var(--accent-red)_15%,var(--bg-elevated))] text-[var(--accent-red)] border border-[color-mix(in_srgb,var(--accent-red)_30%,transparent)]">
                <Text variant="meta" as="span">
                  {foraDoPrazo.length} {foraDoPrazo.length === 1 ? 'data passou' : 'datas passaram'}
                </Text>
              </span>
            ) : null}

            <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
              <Text variant="meta" as="span">
                {comFiltro
                  ? `${preenchidos} na seleção`
                  : metaTotal == null
                  ? `${preenchidos} previstos`
                  : `${preenchidos}/${metaTotal} espaços`}
              </Text>
            </span>

            {gravacao > 0 ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] bg-[color-mix(in_srgb,var(--brand-accent)_15%,var(--bg-elevated))] text-[var(--brand-accent-text)] border border-[color-mix(in_srgb,var(--brand-accent)_30%,transparent)]">
                <Text variant="meta" as="span">
                  {gravacao} para gravar
                </Text>
              </span>
            ) : null}

            {seriesAbaixo.length > 0 ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--surface-subtle)] dark:bg-[var(--bg-secondary)]/20 text-[var(--text-primary)] dark:text-[var(--border-color)] border border-[var(--border-color)] dark:border-[var(--accent-orange)]/30">
                <Text variant="meta" as="span">
                  {seriesComPendencias.length} {seriesComPendencias.length === 1 ? 'série para revisar' : 'séries para revisar'}
                </Text>
              </span>
            ) : null}

            {revisar > 0 ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                <Text variant="meta" as="span">
                  {revisar} {revisar === 1 ? 'aviso' : 'avisos'}
                </Text>
              </span>
            ) : null}

            {filtroRotulo ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                <Text variant="meta" as="span">Filtro: {filtroRotulo}</Text>
              </span>
            ) : null}
          </div>

          <AppButton variant="secondary" size="sm" onClick={onVerAnalise} className="shrink-0">
            Ver análise
          </AppButton>
        </div>
      </Surface>
    );
  }

  // --- Modo COMPLETO ou ANÁLISE (Drawer com 6 seções independentes) ---
  return (
    <div ref={rootRef} className={cn('w-full stack-md', className)}>
      <Surface
        variant="outlined"
        padding="none"
        className="w-full overflow-hidden rounded-[var(--radius-card)] bg-[var(--bg-elevated)] border-[var(--border-subtle)] shadow-[var(--shadow-soft)] p-4 sm:p-6"
      >
        {/* Top Header */}
        {avisoPeriodo ? (
          <Text variant="meta" as="p" className="mb-2 text-[var(--text-tertiary)]">
            {avisoPeriodo}
          </Text>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-full shrink-0',
                statusGeral === 'erro' ? 'bg-[var(--accent-red)]' : statusGeral === 'aviso' ? 'bg-[var(--accent-orange)]' : 'bg-[var(--accent-green)]'
              )}
              aria-hidden
            />
            <Text variant="sectionTitle" as="h2" className="text-[var(--text-primary)]">
              Saúde Editorial — {rotuloPeriodo}
            </Text>
            {filtroRotulo ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-pill)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                <Text variant="meta" as="span">Filtro: {filtroRotulo}</Text>
              </span>
            ) : null}
          </div>

          {emAnalise ? (
            onFechar ? (
              <AppButton variant="ghost" size="sm" onClick={onFechar} className="shrink-0">
                Fechar
              </AppButton>
            ) : null
          ) : (
            <button
              type="button"
              onClick={toggleExpanded}
              className="inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] rounded-[var(--radius-sm)] px-2 py-1"
            >
              <Text variant="meta" as="span">
                {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
              </Text>
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {aberto && (
          <div className="stack-md mt-4 pt-3 border-t border-[var(--border-subtle)]">
            {/* Resumo visual no topo (Cards de Resultado) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* Card 1: Urgências */}
              <button
                type="button"
                onClick={() => toggleSecao('urgencias')}
                className={cn(
                  'rounded-[var(--radius-card)] border p-3 text-left transition-all hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
                  foraDoPrazo.length > 0
                    ? 'border-[color-mix(in_srgb,var(--accent-red)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent-red)_6%,var(--bg-primary))]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-primary)]'
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <Text variant="label" as="span" className="text-[var(--text-tertiary)] uppercase tracking-wider truncate">
                    Hoje & Em aberto
                  </Text>
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full shrink-0',
                      foraDoPrazo.length > 0 ? 'bg-[var(--accent-red)]' : pendentesHoje.length > 0 ? 'bg-[var(--accent-orange)]' : 'bg-[var(--accent-green)]'
                    )}
                  />
                </div>
                <div className="mt-1">
                  <Text variant="bodyStrong" as="p" className="text-[var(--text-primary)] truncate">
                    {foraDoPrazo.length > 0
                      ? `${foraDoPrazo.length} com data passada`
                      : pendentesHoje.length > 0
                      ? `${pendentesHoje.length} em aberto`
                      : 'Em dia'}
                  </Text>
                </div>
              </button>

              {/* Card 2: Volume */}
              <button
                type="button"
                onClick={() => toggleSecao('urgencias')}
                className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3 text-left transition-all hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                <div className="flex items-center justify-between gap-1">
                  <Text variant="label" as="span" className="text-[var(--text-tertiary)] uppercase tracking-wider truncate">
                    Volume
                  </Text>
                  {metaTotal != null ? (
                    <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
                      {percentualGeral}%
                    </Text>
                  ) : null}
                </div>
                <div className="mt-1">
                  <Text variant="bodyStrong" as="p" className="text-[var(--text-primary)] truncate">
                    {comFiltro
                      ? `${preenchidos} na seleção`
                      : metaTotal == null
                      ? `${preenchidos} previstos`
                      : `${preenchidos} de ${metaTotal} espaços`}
                  </Text>
                </div>
              </button>

              {/* Card 3: Produção */}
              <button
                type="button"
                onClick={() => toggleSecao('producao')}
                className={cn(
                  'rounded-[var(--radius-card)] border p-3 text-left transition-all hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
                  gravacao > 0
                    ? 'border-[color-mix(in_srgb,var(--brand-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--brand-accent)_6%,var(--bg-primary))]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-primary)]'
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <Text variant="label" as="span" className="text-[var(--text-tertiary)] uppercase tracking-wider truncate">
                    Produção
                  </Text>
                  <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', gravacao > 0 ? 'bg-[var(--brand-accent)]' : 'bg-[var(--accent-green)]')} />
                </div>
                <div className="mt-1">
                  <Text variant="bodyStrong" as="p" className="text-[var(--text-primary)] truncate">
                    {gravacao} para gravar
                  </Text>
                </div>
              </button>

              {/* Card 4: Séries */}
              <button
                type="button"
                onClick={() => toggleSecao('series')}
                className={cn(
                  'rounded-[var(--radius-card)] border p-3 text-left transition-all hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]',
                  seriesComPendencias.length > 0
                    ? 'border-[var(--border-color)] bg-[var(--surface-subtle)] dark:bg-[var(--bg-secondary)]/15 dark:border-[var(--accent-orange)]/30'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-primary)]'
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <Text variant="label" as="span" className="text-[var(--text-tertiary)] uppercase tracking-wider truncate">
                    Séries
                  </Text>
                  <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', seriesComPendencias.length > 0 ? 'bg-[var(--accent-orange)]' : 'bg-[var(--accent-green)]')} />
                </div>
                <div className="mt-1">
                  <Text variant="bodyStrong" as="p" className="text-[var(--text-primary)] truncate">
                    {seriesComPendencias.length > 0 ? `${seriesComPendencias.length} para revisar` : 'Frequência em dia'}
                  </Text>
                </div>
              </button>

              {/* Card 5: Objetivos */}
              <button
                type="button"
                onClick={() => toggleSecao('objetivos')}
                className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3 text-left transition-all hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                <div className="flex items-center justify-between gap-1">
                  <Text variant="label" as="span" className="text-[var(--text-tertiary)] uppercase tracking-wider truncate">
                    Objetivos
                  </Text>
                  <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', objetivos?.semObjetivo.length ? 'bg-[var(--accent-orange)]' : 'bg-[var(--accent-green)]')} />
                </div>
                <div className="mt-1">
                  <Text variant="bodyStrong" as="p" className="text-[var(--text-primary)] truncate">
                    {objetivos?.semObjetivo.length ? `${objetivos.semObjetivo.length} sem objetivo` : 'Equilibrado'}
                  </Text>
                </div>
              </button>

              {/* Card 6: Assuntos & Pilares */}
              <button
                type="button"
                onClick={() => toggleSecao('pilares-assuntos')}
                className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3 text-left transition-all hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                <div className="flex items-center justify-between gap-1">
                  <Text variant="label" as="span" className="text-[var(--text-tertiary)] uppercase tracking-wider truncate">
                    Assuntos & Pilares
                  </Text>
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full shrink-0',
                      distribuicaoAssuntos.semAssunto.length > 0 ? 'bg-[var(--accent-orange)]' : 'bg-[var(--accent-green)]'
                    )}
                  />
                </div>
                <div className="mt-1">
                  <Text variant="bodyStrong" as="p" className="text-[var(--text-primary)] truncate">
                    {distribuicaoAssuntos.linhas.length} {distribuicaoAssuntos.linhas.length === 1 ? 'assunto' : 'assuntos'}
                  </Text>
                </div>
              </button>
            </div>

            {/* SEÇÕES EM ACORDEON INDEPENDENTE (Multi-Open) */}
            <div className="stack-md mt-2">
              {/* ---------------- 1. HOJE & URGÊNCIAS ---------------- */}
              <SecaoAccordion
                id="urgencias"
                titulo="1. Hoje & Em aberto"
                icon={AlertCircle}
                aberta={secoesAbertas.has('urgencias')}
                onToggle={() => toggleSecao('urgencias')}
                alerta={foraDoPrazo.length > 0 ? 'erro' : pendentesHoje.length > 0 || avisosVespera.length > 0 ? 'aviso' : 'ok'}
                resumo={
                  foraDoPrazo.length > 0
                    ? `${foraDoPrazo.length} com data passada`
                    : pendentesHoje.length > 0
                    ? `${pendentesHoje.length} em aberto hoje`
                    : `${deHoje.length} hoje · em dia`
                }
              >
                {/* Publicações com data passada */}
                {foraDoPrazo.length > 0 ? (
                  <div className="rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--accent-red)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent-red)_8%,var(--bg-elevated))] p-3.5 stack-sm">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-[var(--accent-red)] shrink-0" />
                      <Text variant="bodyStrong" as="h4" className="text-[var(--accent-red)]">
                        {foraDoPrazo.length} {foraDoPrazo.length === 1 ? 'publicação pode ser retomada' : 'publicações podem ser retomadas'}
                      </Text>
                    </div>
                    <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                      Publicações com data anterior a hoje que ainda não foram marcadas como postadas nem reprogramadas.
                    </Text>

                    <ul className="stack-xs mt-1">
                      {foraDoPrazo.map(item => {
                        const content = contents.find(c => c.id === item.contentId);
                        const tituloItem = content?.title || (item.postItId ? 'Post-it sem roteiro' : 'Conteúdo');
                        const dataFmt = item.data ? format(parseISO(item.data), 'dd/MM') : 'Sem data';

                        return (
                          <li
                            key={item.id}
                            className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)]"
                          >
                            <div className="min-w-0">
                              <Text variant="bodyStrong" as="span" className="text-[var(--text-primary)] truncate block">
                                {tituloItem}
                              </Text>
                              <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">
                                Previsto para {dataFmt} · Etapa: {item.etapa ?? 'planejamento'}
                              </Text>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              {onResolverData ? <AppButton variant="secondary" size="sm" onClick={() => onResolverData(item)}>Resolver data</AppButton> : null}
                            {item.contentId && contents.some(c => c.id === item.contentId) ? (
                              <AppButton
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  navigate(
                                    buildContentDetailRoute(
                                      item.contentId,
                                      item.etapa === 'roteiro' ? 'roteiro' : 'publicacao'
                                    ),
                                    withDetailBack(retornoPlanejamento)
                                  )
                                }
                                className="shrink-0"
                              >
                                Abrir conteúdo
                              </AppButton>
                            ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                {/* Conteúdos de Hoje */}
                {deHoje.length > 0 ? (
                  <div className="stack-xs">
                    <Text variant="label" as="h4" className="tracking-wider text-[var(--text-tertiary)] uppercase">
                      Previstos para hoje · {deHoje.length}
                    </Text>
                    <ul className="stack-xs">
                      {deHoje.map(item => {
                        const content = contents.find(c => c.id === item.contentId);
                        const tituloItem = content?.title || (item.postItId ? 'Post-it sem roteiro' : 'Conteúdo de hoje');
                        const concluido = item.realizada || item.etapa === 'postado';

                        return (
                          <li
                            key={item.id}
                            className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)]"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={cn(
                                  'h-2 w-2 rounded-full shrink-0',
                                  concluido ? 'bg-[var(--accent-green)]' : 'bg-[var(--accent-orange)]'
                                )}
                              />
                              <div className="min-w-0">
                                <Text variant="body" as="span" className="text-[var(--text-primary)] truncate block">
                                  {tituloItem}
                                </Text>
                                <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
                                  {concluido ? 'Publicado' : `Etapa: ${item.etapa ?? 'planejamento'}`}
                                </Text>
                              </div>
                            </div>

                            {item.contentId ? (
                              <AppButton
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  navigate(
                                    buildContentDetailRoute(
                                      item.contentId,
                                      item.etapa === 'roteiro' ? 'roteiro' : 'publicacao'
                                    ),
                                    withDetailBack(retornoPlanejamento)
                                  )
                                }
                                className="shrink-0"
                              >
                                Abrir conteúdo
                              </AppButton>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                {/* Avisos de Véspera */}
                {avisosVespera.length > 0 ? (
                  <ul className="stack-xs border-t border-[var(--border-subtle)] pt-2">
                    {avisosVespera.map(aviso => (
                      <AvisoDetalhado key={aviso.id} aviso={aviso} onLocalizar={onLocalizarAviso} />
                    ))}
                  </ul>
                ) : null}

                {foraDoPrazo.length === 0 && pendentesHoje.length === 0 && avisosVespera.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--accent-green)] shrink-0" />
                    <Text variant="meta" as="p">
                      Tudo em dia para hoje e nada com data passada esperando.
                    </Text>
                  </div>
                ) : null}

                {/* Banner de Espaços e Reserva quando faltam para meta */}
                {faltamParaMeta > 0 ? (
                  <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-subtle)] dark:bg-[var(--bg-secondary)]/15 dark:border-[var(--accent-orange)]/30 p-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[var(--text-primary)] dark:text-[var(--border-color)]">
                      <AlertCircle className="h-4 w-4 shrink-0 text-[var(--accent-orange)]" />
                      <Text variant="body" as="span" className="text-[var(--text-primary)] dark:text-[var(--border-color)]">
                        {preenchidos} de {metaTotal} espaços: mais {faltamParaMeta} pra fechar o período.
                      </Text>
                    </div>
                    <AppButton
                      variant="secondary"
                      size="sm"
                      onClick={onAddReserva}
                      className="border-[var(--accent-orange)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] shrink-0"
                    >
                      Adicionar reserva
                    </AppButton>
                  </div>
                ) : null}
              </SecaoAccordion>

              {/* ---------------- 2. PRODUÇÃO & GRAVAÇÃO ---------------- */}
              <SecaoAccordion
                id="producao"
                titulo="2. Produção & Gravação"
                icon={Clapperboard}
                aberta={secoesAbertas.has('producao')}
                onToggle={() => toggleSecao('producao')}
                alerta={gravacao > 0 ? 'aviso' : 'ok'}
                resumo={`${roteiroIds.length} disponíveis para gravar · ${edicao} em edição · ${escrita} em escrita`}
              >
                {/* Banner Principal de Gravação com Roteiros Pré-selecionados */}
                {roteiroIds.length > 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[color-mix(in_srgb,var(--brand-accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--brand-accent)_8%,var(--bg-elevated))] p-3.5">
                    <div className="min-w-0">
                      <Text variant="bodyStrong" as="h4" className="text-[var(--text-primary)]">
                        {roteiroIds.length === 1 ? '1 roteiro disponível para gravar' : `${roteiroIds.length} roteiros disponíveis para gravar`}
                      </Text>
                      <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                        Prepare uma sessão de gravação com os roteiros deste período pré-selecionados.
                      </Text>
                    </div>
                    <AppButton
                      variant="primary"
                      size="sm"
                      count={roteiroIds.length}
                      onClick={() => onOpenGravacao(roteiroIds)}
                      className="shrink-0"
                    >
                      Preparar sessão
                    </AppButton>
                  </div>
                ) : null}

                {/* Lista de Roteiros Prontos para Gravar */}
                {roteirosParaGravar.length > 0 ? (
                  <div className="stack-xs">
                    <Text variant="label" as="h4" className="tracking-wider text-[var(--text-tertiary)] uppercase">
                      Roteiros aguardando gravação · {roteirosParaGravar.length}
                    </Text>
                    <ul className="stack-xs">
                      {roteirosParaGravar.map(item => {
                        const content = contents.find(c => c.id === item.contentId);
                        const tituloItem = content?.title || 'Roteiro sem título';
                        const dataFmt = item.data ? format(parseISO(item.data), 'dd/MM') : 'Sem data';

                        return (
                          <li
                            key={item.id}
                            className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)]"
                          >
                            <div className="min-w-0">
                              <Text variant="bodyStrong" as="span" className="text-[var(--text-primary)] truncate block">
                                {tituloItem}
                              </Text>
                              <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
                                Data prevista: {dataFmt} · Status: Produção
                              </Text>
                            </div>

                            {item.contentId ? (
                              <AppButton
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  navigate(
                                    buildContentDetailRoute(item.contentId, 'gravacao'),
                                    withDetailBack(retornoPlanejamento)
                                  )
                                }
                                className="shrink-0"
                              >
                                Abrir roteiro
                              </AppButton>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                {/* Resumo de outras etapas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[var(--border-subtle)]">
                  <div className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                      {escrita} ideia(s) em escrita
                    </Text>
                  </div>
                  <div className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)]">
                    <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                      {edicao} peça(s) em edição
                    </Text>
                  </div>
                </div>

                {/* Avisos de Produção */}
                {avisosDe('producao').length > 0 ? (
                  <ul className="stack-xs border-t border-[var(--border-subtle)] pt-2">
                    {avisosDe('producao').map(aviso => (
                      <AvisoDetalhado key={aviso.id} aviso={aviso} onLocalizar={onLocalizarAviso} />
                    ))}
                  </ul>
                ) : null}
              </SecaoAccordion>

              {/* ---------------- 3. SÉRIES & CONTINUIDADE ---------------- */}
              <SecaoAccordion
                id="series"
                titulo="3. Séries & Continuidade"
                icon={Layers}
                aberta={secoesAbertas.has('series')}
                onToggle={() => toggleSecao('series')}
                alerta={seriesAbaixo.length > 0 ? 'aviso' : seriesConcentradas.length > 0 ? 'aviso' : 'ok'}
                resumo={
                  seriesComPendencias.length > 0
                    ? `${seriesAbaixo.length === 1 ? '1 série com ritmo em aberto' : `${seriesAbaixo.length} séries com ritmo em aberto`}`
                    : seriesConcentradas.length > 0
                    ? `${seriesConcentradas.length} com excesso`
                    : seriesComPendencias.length > 0 ? `${seriesComPendencias.length} para revisar` : `${linhasContinuidade.length} acompanhadas · em dia`
                }
              >
                {(!continuidade || continuidade.nenhumaAcompanhada) && escopos.length === 0 ? (
                  <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] text-[var(--text-secondary)] stack-xs">
                    <Text variant="body" as="p">
                      Nada marcado para acompanhamento neste período.
                    </Text>
                    <button
                      type="button"
                      onClick={() => navigate('/editorial?aba=continuidade')}
                      className="w-fit text-left text-[var(--brand-accent-text)] hover:underline focus-visible:outline-none"
                    >
                      <Text variant="meta" as="span" className="text-[var(--brand-accent-text)]">
                        Escolha no Editorial quais séries acompanhar ›
                      </Text>
                    </button>
                  </div>
                ) : (
                  <div className="stack-sm">
                    {/* Lista Agrupada por Série */}
                    {linhasContinuidade.map(linha => {
                      const futuros = linha.intervalos.filter(i => i.fim >= hojeIso);
                      const passados = linha.intervalos.filter(i => i.fim < hojeIso);
                      const futurosAbaixo = futuros.filter(i => i.abaixo && !i.pausada && !i.parcial);
                      const futurosExcesso = futuros.filter(i => i.quantidade > i.meta && !i.pausada);

                      const temAtencao = futurosAbaixo.length > 0 || futurosExcesso.length > 0 || escopos.some(e => e.serieId === linha.serieId && e.atencao);

                      return (
                        <details
                          key={linha.chave ?? linha.serieId}
                          open={seriesAbertas.has(linha.chave ?? linha.serieId)}
                          onToggle={event => guardarAbertura(linha.chave ?? linha.serieId, event.currentTarget.open)}
                          className={cn(
                            'rounded-[var(--radius-card)] border p-3.5 stack-sm transition-all',
                            temAtencao
                              ? 'border-[var(--border-color)] bg-[var(--surface-subtle)]/40 dark:bg-[var(--bg-secondary)]/10 dark:border-[var(--accent-orange)]/30'
                              : 'border-[var(--border-subtle)] bg-[var(--surface-subtle)]'
                          )}
                        >
                          {/* Cabeçalho da Série */}
                          <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Text variant="bodyStrong" as="h4" className="text-[var(--text-primary)]">
                                  {linha.nome}
                                </Text>
                                {linha.tipo === 'quadro' ? (
                                  <Badge variant="neutral" className="px-1.5 py-0">
                                    {linha.paiNome ? `Quadro de ${linha.paiNome}` : 'Quadro'}
                                  </Badge>
                                ) : linha.tipo === 'temporada' ? (
                                  <Badge variant="neutral" className="px-1.5 py-0">
                                    {linha.paiNome ? `Temporada de ${linha.paiNome}` : 'Temporada'}
                                  </Badge>
                                ) : null}
                              </div>
                              <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                                {linha.frequencia}
                                {futurosAbaixo.length > 0 || futurosExcesso.length > 0 ? (
                                  <span className="ml-1 text-[var(--accent-orange)]">· {[
                                    futurosAbaixo.length > 0 ? (futurosAbaixo.length === 1 ? '1 intervalo com ritmo em aberto' : `${futurosAbaixo.length} intervalos com ritmo em aberto`) : '',
                                    futurosExcesso.length > 0 ? futurosExcesso.length + ' intervalo(s) com excesso' : '',
                                  ].filter(Boolean).join(' · ')}</span>
                                ) : passados.length > 0 && futuros.length === 0 ? (
                                  <span className="ml-1 text-[var(--text-tertiary)]">· {passados.length} intervalo(s) encerrado(s)</span>
                                ) : escopos.some(e => e.serieId === linha.serieId && e.atencao) ? (
                                  <span className="ml-1 text-[var(--accent-orange)]">· Revisar acompanhamento</span>
                                ) : (
                                  <span className="ml-1 text-[var(--accent-green)]">· Em dia</span>
                                )}

                              </Text>
                            </div>

                            <button
                              type="button"
                              onClick={event => {
                                event.stopPropagation();
                                const alvo = linha.temporadaId ? `t:${linha.temporadaId}` : `s:${linha.serieId}`;
                                navigate(`/editorial?aba=continuidade&editar=${encodeURIComponent(alvo)}`);
                              }}
                              className="text-[var(--brand-accent-text)] hover:underline inline-flex items-center gap-1 focus-visible:outline-none"
                            >
                              <Text variant="meta" as="span" className="text-[var(--brand-accent-text)]">
                                Ajustar meta
                              </Text>
                            </button>
                          </summary>

                          {/* Intervalos Futuros (Ações de Planejamento) */}
                          {futuros.length > 0 ? (
                            <div className="stack-xs mt-1">
                              {futuros.map(intervalo => {
                                const itensDoIntervalo = linha.itens.filter(
                                  i => i.data && i.data >= intervalo.inicio && i.data <= intervalo.fim
                                );
                                const itemIds = itensDoIntervalo
                                  .map(i => i.contentId || i.postItId)
                                  .filter(Boolean) as string[];

                                const abaixo = intervalo.abaixo && !intervalo.pausada && !intervalo.parcial;
                                const excesso = intervalo.quantidade > intervalo.meta && !intervalo.pausada;

                                if (abaixo) {
                                  const faltam = Math.max(1, intervalo.meta - intervalo.quantidade);
                                  return (
                                    <div
                                      key={intervalo.inicio}
                                      className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] dark:bg-[var(--bg-secondary)]/20 border border-[var(--border-color)] dark:border-[var(--accent-orange)]/30"
                                    >
                                      <div>
                                        <Text variant="bodyStrong" as="span" className="text-[var(--text-primary)] dark:text-[var(--border-color)]">
                                          {rotuloIntervalo(intervalo)}
                                        </Text>
                                        <Text variant="meta" as="span" className="ml-2 text-[var(--text-secondary)]">
                                          {intervalo.quantidade} de {intervalo.meta} {intervalo.meta === 1 ? 'episódio' : 'episódios'} ({textoMaisPraFechar(faltam, intervalo)})
                                        </Text>
                                      </div>

                                      {onPlanejarIntervalo ? (
                                        <AppButton
                                          variant="secondary"
                                          size="sm"
                                          onClick={() =>
                                            onPlanejarIntervalo({
                                              serieId: linha.serieId,
                                              inicio: intervalo.inicio,
                                              fim: intervalo.fim,
                                            })
                                          }
                                          className="border-[var(--accent-orange)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] dark:border-[var(--accent-orange)] dark:text-[var(--border-color)]"
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
                                      className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-[var(--radius-sm)] bg-[color-mix(in_srgb,var(--accent-orange)_10%,var(--bg-elevated))] border border-[color-mix(in_srgb,var(--accent-orange)_30%,transparent)]"
                                    >
                                      <div>
                                        <Text variant="bodyStrong" as="span" className="text-[var(--text-primary)]">
                                          {rotuloIntervalo(intervalo)}
                                        </Text>
                                        <Text variant="meta" as="span" className="ml-2 text-[var(--text-secondary)]">
                                          {intervalo.quantidade} previstos · frequência de {intervalo.meta}
                                        </Text>
                                      </div>

                                      {onReorganizarEpisodios ? (
                                        <AppButton
                                          variant="secondary"
                                          size="sm"
                                          onClick={() =>
                                            onReorganizarEpisodios({
                                              inicio: intervalo.inicio,
                                              fim: intervalo.fim,
                                              itemIds,
                                            })
                                          }
                                          className="border-[var(--accent-orange)] text-[var(--accent-orange)]"
                                        >
                                          Reorganizar episódios
                                        </AppButton>
                                      ) : null}
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    key={intervalo.inicio}
                                    className="flex items-center justify-between gap-2 px-2 py-1 text-[var(--text-secondary)]"
                                  >
                                    <Text variant="meta" as="span">
                                      {rotuloIntervalo(intervalo)}: {intervalo.quantidade} de {intervalo.meta} episódios
                                      {intervalo.pausada ? ' (em pausa)' : intervalo.parcial ? ' (parcial)' : ' · em dia'}
                                    </Text>
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}

                          {(linha.diasSeguidos ?? []).filter(d => d.seguinte >= hojeIso).map(d => (
                            <Surface key={d.dia} variant="info" padding="sm" className="flex flex-wrap items-center justify-between gap-2">
                              <Text variant="meta">Episódios em dias seguidos: {format(parseISO(d.dia), 'dd/MM')} e {format(parseISO(d.seguinte), 'dd/MM')}</Text>
                              {onReorganizarEpisodios ? <AppButton variant="secondary" size="sm" onClick={() => onReorganizarEpisodios({inicio: d.dia, fim: d.seguinte, itemIds: d.contentIds})}>Reorganizar episódios</AppButton> : null}
                            </Surface>
                          ))}
                          {(linha.distancias ?? []).filter(d => d.fim >= hojeIso).map(d => (
                            <Surface key={d.inicio} variant="info" padding="sm" className="flex flex-wrap items-center justify-between gap-2">
                              <Text variant="meta">{d.dias} dias sem episódio: {format(parseISO(d.inicio), 'dd/MM')} a {format(parseISO(d.fim), 'dd/MM')}</Text>
                              {onPlanejarIntervalo ? <AppButton variant="secondary" size="sm" onClick={() => onPlanejarIntervalo({serieId: linha.serieId, inicio: d.inicio, fim: d.fim})}>Planejar neste intervalo</AppButton> : null}
                            </Surface>
                          ))}

                          {/* Intervalos Encerrados no Passado (Histórico para Consulta, sem Ações de Planejamento) */}
                          {passados.length > 0 ? (
                            <details open={seriesAbertas.has('historico:' + linha.serieId)} onToggle={event => guardarAbertura('historico:' + linha.serieId, event.currentTarget.open)} className="mt-1 pt-1 border-t border-[var(--border-subtle)]">
                              <summary className="cursor-pointer">
                                <Text variant="meta" as="span" className="text-[var(--text-tertiary)] hover:underline">
                                  Histórico de intervalos encerrados — {passados.length}
                                </Text>
                              </summary>
                              <ul className="mt-1 stack-xs pl-2">
                                {passados.map(intervalo => (
                                  <li key={intervalo.inicio}>
                                    <Text
                                      variant="meta"
                                      as="span"
                                      className={cn(
                                        'tabular-nums',
                                        intervalo.abaixo ? 'text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]'
                                      )}
                                    >
                                      {rotuloIntervalo(intervalo)}: {intervalo.quantidade} de {intervalo.meta} episódios
                                      {intervalo.abaixo ? ` (${textoRitmoAbaixo(intervalo.fim, hojeIso)})` : ' (cumprido)'}
                                    </Text>
                                  </li>
                                ))}
                              </ul>
                            </details>
                          ) : null}

                          {/* Reservas em post-it */}
                          {linha.reservadas.length > 0 ? (
                            <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
                              {linha.reservadas.length === 1 ? '1 intervalo reservado' : `${linha.reservadas.length} intervalos reservados`} com post-it.
                            </Text>
                          ) : null}
                    {/* Escopos por Conta/Formato */}
                    {escopos.some(escopo => escopo.serieId === linha.serieId) ? (
                      <div className="stack-xs border-t border-[var(--border-subtle)] pt-2">
                        <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
                          Por conta ou formato
                        </Text>
                        <ul className="stack-xs">
                          {escopos.filter(escopo => escopo.serieId === linha.serieId).map(linha => (
                            <li key={linha.id}>
                              <button
                                type="button"
                                onClick={() => navigate(`/editorial?aba=continuidade&editar=${encodeURIComponent(`s:${linha.serieId}`)}`)}
                                className="w-full text-left rounded-[var(--radius-sm)] hover:underline focus-visible:outline-none"
                              >
                                <Text variant="body" as="span" className="block text-[var(--text-primary)]">
                                  {linha.titulo}
                                </Text>
                                <Text variant="meta" as="span" className={cn('block', linha.atencao ? 'text-[var(--accent-orange)]' : 'text-[var(--text-secondary)]')}>
                                  {linha.texto}
                                </Text>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                        </details>
                      );
                    })}

                    {/* Pendências de Configuração de Frequência */}
                    {continuidade && continuidade.pendencias.length > 0 ? (
                      <div className="stack-xs border-t border-[var(--border-subtle)] pt-2">
                        <Text variant="meta" as="p" className="text-[var(--text-tertiary)]">
                          {continuidade.resumoPendencias}
                        </Text>
                        <ul className="stack-xs">
                          {continuidade.pendencias.map(pendencia => (
                            <li key={`${pendencia.temporadaId ?? pendencia.serieId}:${pendencia.motivo}`}>
                              <button
                                type="button"
                                onClick={() => {
                                  const alvo = pendencia.temporadaId ? `t:${pendencia.temporadaId}` : `s:${pendencia.serieId}`;
                                  navigate(`/editorial?aba=continuidade&editar=${encodeURIComponent(alvo)}`);
                                }}
                                className="w-full text-left rounded-[var(--radius-sm)] hover:underline focus-visible:outline-none"
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
              </SecaoAccordion>

              {/* ---------------- 4. OBJETIVOS & FUNIL ---------------- */}
              <SecaoAccordion
                id="objetivos"
                titulo="4. Objetivos & Funil"
                icon={Target}
                aberta={secoesAbertas.has('objetivos')}
                onToggle={() => toggleSecao('objetivos')}
                alerta={objetivos?.semObjetivo.length ? 'aviso' : 'ok'}
                resumo={
                  objetivos
                    ? objetivos.semObjetivo.length > 0
                      ? `${objetivos.semObjetivo.length} sem objetivo`
                      : 'Equilibrado'
                    : 'Sem dados'
                }
              >
                {!objetivos || objetivos.total === 0 ? (
                  <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                    Nenhum conteúdo previsto no período.
                  </Text>
                ) : (
                  <div className="stack-sm">
                    {/* Alerta de Distribuição Incompleta com Botão de Ação Direta */}
                    {objetivos.semObjetivo.length > 0 ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--surface-subtle)] dark:bg-[var(--bg-secondary)]/15 dark:border-[var(--accent-orange)]/30 p-3.5">
                        <div className="min-w-0">
                          <Text variant="bodyStrong" as="h4" className="text-[var(--text-primary)] dark:text-[var(--border-color)]">
                            Distribuição incompleta: {objetivos.semObjetivo.length} de {objetivos.total} conteúdos sem objetivo
                          </Text>
                          <Text variant="meta" as="p" className="text-[var(--text-primary)] dark:text-[var(--border-color)]">
                            Defina o objetivo editorial de cada peça para equilibrar seu funil.
                          </Text>
                        </div>
                        <AppButton
                          variant="secondary"
                          size="sm"
                          count={objetivos.semObjetivo.length}
                          onClick={() =>
                            setLista({
                              titulo: 'Sem objetivo',
                              subtitulo: textoSemObjetivo(objetivos) ?? undefined,
                              itens: objetivos.semObjetivo,
                            })
                          }
                          className="border-[var(--accent-orange)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] shrink-0"
                        >
                          Definir objetivos
                        </AppButton>
                      </div>
                    ) : null}

                    {/* Barras de Distribuição das Funções */}
                    <div className="stack-sm">
                      {objetivos.linhas.map(linha => (
                        <div key={linha.funcao} className="stack-xs">
                          <button
                            type="button"
                            onClick={() => setLista({ titulo: linha.rotulo, itens: linha.itens })}
                            className="flex w-full items-baseline justify-between gap-2 text-left rounded-[var(--radius-sm)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
                          >
                            <Text variant="bodyStrong" as="span" className="text-[var(--text-primary)] truncate">
                              {linha.rotulo}
                            </Text>
                            <Text variant="meta" as="span" className="text-[var(--text-secondary)] shrink-0 tabular-nums">
                              {linha.quantidade} previstos ({linha.previstoPct}%)
                              {linha.desejadoPct != null ? ` · meta ${linha.desejadoPct}%` : ''}
                            </Text>
                          </button>
                          <div className="h-1.5 w-full bg-[var(--border-subtle)] rounded-[var(--radius-pill)] overflow-hidden">
                            <div
                              className="h-full bg-[var(--brand-accent)] rounded-[var(--radius-pill)] transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(linha.previstoPct, linha.quantidade > 0 ? 5 : 0))}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {!objetivos.temProporcao ? (
                      <button
                        type="button"
                        onClick={() => navigate('/editorial?aba=ajustes')}
                        className="w-fit text-left text-[var(--brand-accent-text)] hover:underline focus-visible:outline-none"
                      >
                        <Text variant="meta" as="span" className="text-[var(--brand-accent-text)]">
                          Definir a proporção desejada no Editorial ›
                        </Text>
                      </button>
                    ) : null}
                  </div>
                )}
              </SecaoAccordion>

              {/* ---------------- 5. PUBLICAÇÕES POR CONTA ---------------- */}
              {publicacoes && publicacoes.contas.length > 0 ? (
                <SecaoAccordion
                  id="contas"
                  titulo="5. Publicações por Conta"
                  icon={Calendar}
                  aberta={secoesAbertas.has('contas')}
                  onToggle={() => toggleSecao('contas')}
                  alerta="ok"
                  resumo={`${publicacoes.total} publicações · ${publicacoes.contas.length} contas`}
                >
                  <Text variant="bodyStrong" as="p" className="text-[var(--text-primary)] tabular-nums">
                    {publicacoes.metaForaDoFiltro
                      ? `${publicacoes.total} publicações na seleção`
                      : publicacoes.meta == null
                      ? `${publicacoes.total} publicações no trecho · sem meta definida`
                      : `${publicacoes.total} de ${publicacoes.meta} publicações${publicacoes.incompleta ? ' (soma parcial)' : ''}`}
                  </Text>

                  <ul className="stack-sm mt-1">
                    {publicacoes.contas.map(conta => (
                      <li key={conta.id} className="p-2.5 rounded-[var(--radius-sm)] bg-[var(--surface-subtle)] border border-[var(--border-subtle)] stack-xs">
                        <div className="flex items-center justify-between gap-2">
                          <Text variant="bodyStrong" as="span" className="text-[var(--text-primary)]">
                            {conta.nome}
                          </Text>
                          <Text variant="meta" as="span" className="text-[var(--text-secondary)] tabular-nums">
                            {publicacoes.metaForaDoFiltro
                              ? `${conta.total} na seleção`
                              : conta.meta == null
                              ? `${conta.total} publicações`
                              : `${conta.total} de ${conta.meta}`}
                          </Text>
                        </div>
                        {conta.formatos.length > 0 ? (
                          <Text variant="meta" as="span" className="text-[var(--text-tertiary)]">
                            {conta.formatos.map(item => `${item.rotulo} ${item.total}`).join(' · ')}
                          </Text>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </SecaoAccordion>
              ) : null}

              {/* ---------------- 6. PILARES & ASSUNTOS ---------------- */}
              <SecaoAccordion
                id="pilares-assuntos"
                titulo="6. Pilares & Assuntos"
                icon={Tag}
                aberta={secoesAbertas.has('pilares-assuntos')}
                onToggle={() => toggleSecao('pilares-assuntos')}
                alerta={distribuicaoAssuntos.linhas.some(l => l.concentrado) ? 'aviso' : 'ok'}
                resumo={`${pilaresNaConta.length} pilares · ${distribuicaoAssuntos.linhas.length} assuntos`}
              >
                {/* Pilares */}
                <div className="stack-sm">
                  <Text variant="label" as="h4" className="tracking-wider text-[var(--text-tertiary)] uppercase">
                    Distribuição dos Pilares
                  </Text>
                  <div className="stack-sm">
                    {pilaresNaConta.map((pilar, index) => {
                      const pautas = distribuicao.linhas[index]?.pautas ?? 0;
                      const atualPct = distribuicao.linhas[index]?.atualPct ?? 0;
                      const barColor = pilar.cor || (index === 0 ? '#84cc16' : index === 1 ? '#ec4899' : '#374151');
                      return (
                        <div key={pilar.id} className="stack-xs">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: barColor }} aria-hidden />
                              <Text variant="body" as="span" className="text-[var(--text-primary)] truncate">
                                {pilar.nome}{pilar.ativo === false ? ' (inativo)' : ''}
                              </Text>
                            </div>
                            <Text variant="meta" as="span" className="text-[var(--text-secondary)] shrink-0 tabular-nums">
                              {pautas} · {atualPct}%
                            </Text>
                          </div>
                          <div className="h-1.5 w-full bg-[var(--border-subtle)] rounded-[var(--radius-pill)] overflow-hidden">
                            <div
                              className="h-full rounded-[var(--radius-pill)] transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(atualPct, pautas > 0 ? 5 : 0))}%`, backgroundColor: barColor }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {itensSemPilar.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setLista({ titulo: 'Sem pilar', itens: itensSemPilar })}
                      className="w-fit text-left text-[var(--brand-accent-text)] hover:underline focus-visible:outline-none"
                    >
                      <Text variant="meta" as="span" className="text-[var(--brand-accent-text)]">
                        Sem pilar: {itensSemPilar.length} {itensSemPilar.length === 1 ? 'item' : 'itens'} (ver e atribuir) ›
                      </Text>
                    </button>
                  ) : null}
                </div>

                {/* Assuntos & Variedade */}
                <div className="stack-sm pt-3 border-t border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between gap-2">
                    <Text variant="label" as="h4" className="tracking-wider text-[var(--text-tertiary)] uppercase">
                      Assuntos & Concentração
                    </Text>
                    {distribuicaoAssuntos.linhas.length > 0 ? (
                      <Text variant="meta" as="span" className="text-[var(--text-secondary)] tabular-nums">
                        {distribuicaoAssuntos.linhas.length} {distribuicaoAssuntos.linhas.length === 1 ? 'assunto' : 'assuntos'}
                      </Text>
                    ) : null}
                  </div>

                  {distribuicaoAssuntos.linhas.length === 0 ? (
                    <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
                      {distribuicaoAssuntos.totalPautas === 0
                        ? 'Nenhuma pauta prevista no período.'
                        : 'Nenhum assunto atribuído às pautas deste período.'}
                    </Text>
                  ) : (
                    <div className="stack-sm">
                      {distribuicaoAssuntos.linhas.map(linha => (
                        <div key={linha.id} className="stack-xs">
                          <button
                            type="button"
                            onClick={() =>
                              setLista({
                                titulo: `Assunto: ${linha.nome}`,
                                subtitulo: `${linha.pautas} ${linha.pautas === 1 ? 'pauta' : 'pautas'} (${linha.pct}% do período)`,
                                itens: linha.itens,
                              })
                            }
                            className="flex w-full items-center justify-between gap-3 text-left rounded-[var(--radius-sm)] hover:underline focus-visible:outline-none"
                          >
                            <span className="flex items-center gap-1.5 min-w-0">
                              <Tag className="h-3 w-3 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
                              <Text variant="bodyStrong" as="span" className="text-[var(--text-primary)] truncate">
                                {linha.nome}
                              </Text>
                              {linha.concentrado ? (
                                <Badge variant="neutral" className="bg-[color-mix(in_srgb,var(--accent-orange)_20%,var(--bg-elevated))] text-[var(--accent-orange)] px-1.5 py-0">
                                  Concentrado (&gt;33%)
                                </Badge>
                              ) : null}
                            </span>
                            <Text variant="meta" as="span" className="text-[var(--text-secondary)] shrink-0 tabular-nums">
                              {linha.pautas} · {linha.pct}%
                            </Text>
                          </button>
                          <div className="h-1.5 w-full bg-[var(--border-subtle)] rounded-[var(--radius-pill)] overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-[var(--radius-pill)] transition-all duration-300',
                                linha.concentrado ? 'bg-[var(--accent-orange)]' : 'bg-[var(--brand-accent)]'
                              )}
                              style={{ width: `${Math.min(100, Math.max(linha.pct, 5))}%` }}
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
                        setLista({
                          titulo: 'Pautas sem assunto',
                          subtitulo: `${distribuicaoAssuntos.semAssunto.length} pautas sem assunto`,
                          itens: distribuicaoAssuntos.semAssunto,
                        })
                      }
                      className="w-fit text-left text-[var(--brand-accent-text)] hover:underline focus-visible:outline-none"
                    >
                      <Text variant="meta" as="span" className="text-[var(--brand-accent-text)]">
                        Sem assunto: {distribuicaoAssuntos.semAssunto.length} pautas ({distribuicaoAssuntos.semAssuntoPct}%) ›
                      </Text>
                    </button>
                  ) : null}

                  {avisosDe('concentracao').length > 0 ? (
                    <ul className="stack-xs border-t border-[var(--border-subtle)] pt-2">
                      {avisosDe('concentracao').map(aviso => (
                        <AvisoDetalhado key={aviso.id} aviso={aviso} onLocalizar={onLocalizarAviso} />
                      ))}
                    </ul>
                  ) : null}
                </div>
              </SecaoAccordion>
            </div>
          </div>
        )}

        <ItensDaSaudeDialog lista={lista} onClose={() => setLista(null)} />
      </Surface>
    </div>
  );
}
