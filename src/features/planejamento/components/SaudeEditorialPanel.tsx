import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from 'lucide-react';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { Text } from '../../../components/ui/Text';
import { readStoredJson, writeStoredJson } from '../../../lib/browserStorage';
import type { Content, Pilar, Serie, Tema } from '../../../lib/database';
import { withDetailBack } from '../../../lib/navigation/detailBack';
import { cn } from '../../../lib/utils';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { situacaoDoRecorte } from '../../editorial/lib/apuracaoSerie';
import type { FaixasNoPeriodo, LinhaDeFaixa } from '../../editorial/lib/faixasEditoriais';
import type { GradeCounts } from '../../editorial/lib/gradeCounts';
import type { GradeEntry } from '../../editorial/lib/gradeEntries';
import type { LinhaDoEscopoNaSaude } from '../lib/continuidadePorEscopoNaSaude';
import { blocoDoAviso, detalheDoAviso } from '../lib/detalheDoAviso';
import { distribuicaoAssuntosNaSaude } from '../lib/distribuicaoAssuntosNaSaude';
import type { PreparoDoPeriodo } from '../lib/monthHealth';
import type { AvisoOrientacao } from '../lib/orientacaoEditorial';
import type { PublicacoesNaSaude } from '../lib/publicacoesNaSaude';
import type { IntervaloSaude } from '../lib/saudeActions';
import {
  resumoSemFrequencia,
  type Continuidade,
  type DistribuicaoObjetivos,
  type LinhaContinuidade,
} from '../lib/saudeIndicadores';
import { ItensDaSaudeDialog, type ListaDaSaude } from './ItensDaSaudeDialog';
import { SaudeEquilibrioSection } from './SaudeEquilibrioSection';
import { SaudeFaltaAlgoSection, type AlertaCardItem } from './SaudeFaltaAlgoSection';
import { SaudePlacar, type PlacarSinal } from './SaudePlacar';
import { SaudeSeriesSection } from './SaudeSeriesSection';

const STORAGE_SCROLL_KEY = 'content-os:saude-editorial-scroll';
const STORAGE_SERIES_KEY = 'content-os:saude-editorial-series';

export interface SaudeEditorialPanelProps {
  /** Rótulo do período coberto pela Saúde (ex.: "11 a 17 nov"). */
  rotuloPeriodo: string;
  /** Rótulo curto do recorte atual (ex.: "Semana visível", "Mês visível", "Intervalo"). */
  escopoRotulo?: string;
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
  /** Objetivo de cada item sobre todos os itens do período. */
  objetivos?: DistribuicaoObjetivos<GradeEntry>;
  /** Séries e quadros com meta, conferidos intervalo a intervalo. */
  continuidade?: Continuidade<GradeEntry>;
  /** Acompanhamentos por conta ou formato, cada um à parte. */
  escopos?: readonly LinhaDoEscopoNaSaude[];
  /** Publicações por conta no trecho e a soma das contas. */
  publicacoes?: PublicacoesNaSaude;
  modo?: 'completo' | 'faixa' | 'analise';
  onVerAnalise?: () => void;
  onFechar?: () => void;
  onPeriodoAnterior?: () => void;
  onProximoPeriodo?: () => void;
  /** Avisos do trecho. */
  avisos?: readonly AvisoOrientacao[];
  /** Faixas da semana escaladas no trecho. */
  faixas?: FaixasNoPeriodo | null;
  onLocalizarAviso?: (aviso: AvisoOrientacao) => void;
  /** "Instagram · Reels" quando o calendário está filtrado. */
  filtroRotulo?: string | null;
  onAddReserva: () => void;
  onOpenGravacao: (contentIds?: string[]) => void;
  onPlanejarIntervalo?: (params: IntervaloSaude & { serieId: string }) => void;
  onReorganizarEpisodios?: (params: IntervaloSaude & { itemIds: string[] }) => void;
  className?: string;
}

function formatarFaixaCurta(linha: LinhaDeFaixa | undefined): string | null {
  if (!linha?.faixa) return null;
  return [
    linha.faixa.minimo != null ? `Mín ${linha.faixa.minimo}` : null,
    `Meta ${linha.faixa.meta}`,
    linha.faixa.maximo != null ? `Máx ${linha.faixa.maximo}` : null,
  ]
    .filter((parte): parte is string => parte != null)
    .join(' · ');
}

function capitalizar(texto: string): string {
  if (!texto) return texto;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function categoriaDoAviso(aviso: AvisoOrientacao): {
  rotulo: string;
  tone: AlertaCardItem['tone'];
  icone: AlertaCardItem['acaoIcone'];
} {
  const bloco = blocoDoAviso(aviso);
  if (aviso.tipo === 'vespera-sem-pronto' || aviso.tipo === 'gravacao-antecedencia') {
    return { rotulo: 'Esteira', tone: 'aviso', icone: 'gravacao' };
  }
  if (aviso.tipo === 'faixa-abaixo' || aviso.tipo === 'faixa-acima' || aviso.tipo === 'faixa-config') {
    return { rotulo: 'Volume e faixa', tone: 'aviso', icone: 'editorial' };
  }
  if (aviso.tipo === 'capacidade-semana' || aviso.tipo === 'gravacoes-no-dia' || aviso.tipo === 'videos-dia-abaixo' || aviso.tipo === 'videos-dia-acima') {
    return { rotulo: 'Capacidade', tone: 'aviso', icone: 'gravacao' };
  }
  if (bloco === 'continuidade') {
    return { rotulo: 'Espaço na grade', tone: 'erro', icone: 'calendario' };
  }
  return { rotulo: 'Variedade', tone: 'neutro', icone: 'localizar' };
}

export function SaudeEditorialPanel({
  rotuloPeriodo,
  escopoRotulo,
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
  onFechar,
  onPeriodoAnterior,
  onProximoPeriodo,
  avisos = [],
  faixas = null,
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
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [lista, setLista] = useState<ListaDaSaude | null>(null);

  const [seriesAbertas, setSeriesAbertas] = useState<Set<string>>(() => {
    const salvo = readStoredJson<unknown>(STORAGE_SERIES_KEY, []);
    return new Set(Array.isArray(salvo) ? salvo.filter((id): id is string => typeof id === 'string') : []);
  });

  const guardarAberturaSerie = (id: string, aberta: boolean) => {
    setSeriesAbertas(prev => {
      if (prev.has(id) === aberta) return prev;
      const next = new Set(prev);
      if (aberta) next.add(id);
      else next.delete(id);
      writeStoredJson(STORAGE_SERIES_KEY, [...next]);
      return next;
    });
  };

  useEffect(() => {
    if (location.hash.replace(/^#/, '') !== 'conferencia-series') return;
    const id = window.setTimeout(() => {
      document.getElementById('conferencia-series')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(id);
  }, [location.hash]);

  // Preservação da rolagem interna do drawer
  useEffect(() => {
    if (location.hash.replace(/^#/, '') === 'conferencia-series') return;
    const scrollParent = scrollRef.current;
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
    observer.observe(scrollParent);
    const handleScroll = () => {
      if (!restaurando) writeStoredJson(STORAGE_SCROLL_KEY, scrollParent.scrollTop);
    };
    const interagir = () => {
      restaurando = false;
    };
    scrollParent.addEventListener('scroll', handleScroll, { passive: true });
    scrollParent.addEventListener('pointerdown', interagir, { passive: true });
    scrollParent.addEventListener('wheel', interagir, { passive: true });
    scrollParent.addEventListener('touchstart', interagir, { passive: true });
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
  }, [location.hash]);

  const hojeIso = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const preenchidos = counts.previsto ?? counts.somaPlanejado ?? 0;
  const comFiltro = Boolean(filtroRotulo);
  const metaTotal = comFiltro ? null : counts.limite ?? null;
  const faltamParaMeta = metaTotal == null ? 0 : Math.max(0, metaTotal - preenchidos);

  const preparo = counts.preparo;
  const gravacao = preparo?.gravacao ?? 0;
  const escrita = preparo?.escrita ?? 0;
  const edicao = preparo?.edicao ?? 0;

  const previstosPorPilar = useMemo(
    () => new Map(counts.pilares.map(linha => [linha.id, linha.planejado])),
    [counts.pilares],
  );
  const pilaresNaConta = useMemo(
    () => pilares.filter(p => p.ativo !== false || (previstosPorPilar.get(p.id) ?? 0) > 0),
    [pilares, previstosPorPilar],
  );
  const itensPorPilar = useMemo(() => {
    const map = new Map<string, GradeEntry[]>();
    for (const item of counts.itens) {
      if (!item.pilarId) continue;
      const atual = map.get(item.pilarId);
      if (atual) atual.push(item);
      else map.set(item.pilarId, [item]);
    }
    return map;
  }, [counts.itens]);
  const itensSemPilar = useMemo(
    () => counts.itens.filter(item => !item.pilarId),
    [counts.itens],
  );
  const totalPrevistosPilares = pilaresNaConta.reduce(
    (soma, pilar) => soma + (previstosPorPilar.get(pilar.id) ?? 0),
    0,
  );
  const pilaresComItens = pilaresNaConta.filter(pilar => (previstosPorPilar.get(pilar.id) ?? 0) > 0).length;

  const textoExcesso =
    !comFiltro && counts.excesso != null && counts.excesso > 0
      ? counts.notaSoma ?? `O período tem ${preenchidos} e o limite é ${metaTotal}.`
      : null;
  const textoSemPauta =
    counts.espacosLivres > 0
      ? counts.espacosLivres === 1
        ? '1 espaço sem pauta.'
        : `${counts.espacosLivres} espaços sem pauta.`
      : null;

  const distribuicaoAssuntos = useMemo(
    () => distribuicaoAssuntosNaSaude({ itens: counts.itens ?? [], contents, temas }),
    [counts.itens, contents, temas],
  );

  const foraDoPrazo = useMemo(
    () =>
      pendenciasForaDoPrazo ??
      (counts.itens ?? []).filter(item => {
        if (!item.data || item.data >= hojeIso) return false;
        if (item.realizada || item.etapa === 'postado') return false;
        return true;
      }),
    [counts.itens, hojeIso, pendenciasForaDoPrazo],
  );

  const deHoje = useMemo(
    () => (counts.itens ?? []).filter(item => item.data === hojeIso),
    [counts.itens, hojeIso],
  );
  const pendentesHoje = useMemo(
    () => deHoje.filter(item => !item.realizada && item.etapa !== 'postado'),
    [deHoje],
  );

  const roteiroIds = [...idsParaGravar];
  const roteirosParaGravar = useMemo(
    () => [...new Map(counts.itens.filter(item => roteiroIds.includes(item.contentId)).map(item => [item.contentId, item])).values()],
    [counts.itens, roteiroIds],
  );

  // Séries e continuidade
  const linhasContinuidade = useMemo(() => {
    const linhas: LinhaContinuidade<GradeEntry>[] = [...(continuidade?.linhas ?? [])];
    for (const escopo of escopos) {
      if (linhas.some(linha => linha.serieId === escopo.serieId)) continue;
      const serie = series.find(item => item.id === escopo.serieId);
      linhas.push({
        chave: escopo.serieId,
        serieId: escopo.serieId,
        nome: serie?.name ?? 'Série',
        tipo: 'serie',
        paiNome: null,
        frequencia: 'Acompanhamento por conta ou formato',
        intervalos: [],
        abaixo: [],
        reservadas: [],
        concentrada: false,
        semEpisodios: false,
        foraDoPeriodo: 0,
        precisaAtencao: escopo.atencao,
        itens: [],
      });
    }
    return linhas;
  }, [continuidade, escopos, series]);

  const seriesAbaixo = useMemo(
    () => linhasContinuidade.filter(linha => situacaoDoRecorte(linha.intervalos, hojeIso) === 'abaixo'),
    [linhasContinuidade, hojeIso],
  );
  const seriesConcentradas = useMemo(
    () =>
      linhasContinuidade.filter(linha =>
        linha.intervalos.some(intervalo => intervalo.fim >= hojeIso && intervalo.quantidade > intervalo.meta && !intervalo.pausada),
      ),
    [linhasContinuidade, hojeIso],
  );
  const seriesComPendencias = useMemo(
    () =>
      linhasContinuidade.filter(
        linha =>
          seriesAbaixo.includes(linha) ||
          seriesConcentradas.includes(linha) ||
          (linha.diasSeguidos ?? []).some(item => item.seguinte >= hojeIso) ||
          (linha.distancias ?? []).some(item => item.fim >= hojeIso) ||
          escopos.some(escopo => escopo.serieId === linha.serieId && escopo.atencao),
      ),
    [linhasContinuidade, seriesAbaixo, seriesConcentradas, escopos],
  );
  const nenhumaAcompanhada = (!continuidade || continuidade.nenhumaAcompanhada) && escopos.length === 0;
  const semFrequencia = useMemo(
    () =>
      resumoSemFrequencia([
        ...(continuidade?.pendencias ?? []).filter(pendencia => pendencia.motivo === 'sem-frequencia'),
        ...escopos
          .filter(escopo => escopo.semFrequencia)
          .map(escopo => ({ serieId: escopo.serieId, tipo: escopo.tipo ?? ('serie' as const) })),
      ]),
    [continuidade?.pendencias, escopos],
  );

  // Cálculo do Sinal 1: Equilíbrio
  const maiorDesvioObjetivo = useMemo(() => {
    if (!objetivos || !objetivos.temProporcao || objetivos.total === 0) return null;
    let maior: number | null = null;
    for (const linha of objetivos.linhas) {
      if (linha.desejadoPct == null) continue;
      const diff = linha.previstoPct - linha.desejadoPct;
      if (maior === null || Math.abs(diff) > Math.abs(maior)) maior = diff;
    }
    return maior;
  }, [objetivos]);

  const equilibrioStatus = useMemo<{ tone: 'ok' | 'aviso' | 'neutro'; rotulo: string }>(() => {
    if (preenchidos === 0) return { tone: 'neutro', rotulo: 'Sem pautas no período' };
    const semClassificacao = (objetivos?.semObjetivo.length ?? 0) + itensSemPilar.length;
    if (semClassificacao > 0) return { tone: 'aviso', rotulo: 'Classificação incompleta' };
    if (maiorDesvioObjetivo != null && Math.abs(maiorDesvioObjetivo) >= 15) {
      return { tone: 'aviso', rotulo: 'Revisar proporção' };
    }
    if (distribuicaoAssuntos.linhas.some(linha => linha.concentrado)) {
      return { tone: 'aviso', rotulo: 'Assunto concentrado' };
    }
    if (!objetivos?.temProporcao) return { tone: 'neutro', rotulo: 'Distribuição livre' };
    return { tone: 'ok', rotulo: 'Proporção em dia' };
  }, [preenchidos, objetivos, itensSemPilar.length, maiorDesvioObjetivo, distribuicaoAssuntos.linhas]);

  // Cálculo dos 3 sinais do Placar
  const placarSinais = useMemo<PlacarSinal[]>(() => {
    // 1. Equilíbrio
    const semObj = objetivos?.semObjetivo.length ?? 0;
    const equilibrioRodape =
      maiorDesvioObjetivo != null
        ? {
            chave: 'Desvio máx.',
            valor: `${maiorDesvioObjetivo > 0 ? '+' : ''}${maiorDesvioObjetivo}% vs meta`,
          }
        : semObj > 0
          ? { chave: 'Sem objetivo', valor: `${semObj}` }
          : itensSemPilar.length > 0
            ? { chave: 'Sem pilar', valor: `${itensSemPilar.length}` }
            : { chave: 'Pilares ativos', valor: `${pilaresComItens} de ${pilaresNaConta.length}` };

    const equilibrioSubtitulo =
      preenchidos === 0
        ? 'Nenhuma peça planejada no recorte'
        : semObj > 0
          ? `${semObj} ${semObj === 1 ? 'peça sem objetivo' : 'peças sem objetivo'} editorial`
          : pilaresComItens > 0
            ? `${pilaresComItens} ${pilaresComItens === 1 ? 'pilar distribuído' : 'pilares distribuídos'} no período`
            : `${preenchidos} ${preenchidos === 1 ? 'peça prevista' : 'peças previstas'}`;

    const sinalEquilibrio: PlacarSinal = {
      id: 'equilibrio',
      numero: '1',
      etiqueta: 'Equilíbrio',
      statusTexto:
        equilibrioStatus.tone === 'ok'
          ? 'Em dia'
          : equilibrioStatus.tone === 'aviso'
            ? 'Revisar'
            : 'Livre',
      tone: equilibrioStatus.tone,
      titulo: 'Pilares e objetivos',
      subtitulo: equilibrioSubtitulo,
      rodapeChave: equilibrioRodape.chave,
      rodapeValor: equilibrioRodape.valor,
      alvoId: 'saude-equilibrio',
    };

    // 2. Ritmo
    const faixaPrincipal = faixas?.gerais[0];
    const faixaTexto = formatarFaixaCurta(faixaPrincipal);
    const leituraAviso = faixaPrincipal?.leitura?.aviso ?? null;

    const ritmoTone: PlacarSinal['tone'] =
      foraDoPrazo.length > 0
        ? 'erro'
        : gravacao > 0 || leituraAviso === 'abaixo' || leituraAviso === 'acima' || faltamParaMeta > 0
          ? 'aviso'
          : preenchidos > 0
            ? 'ok'
            : 'neutro';

    const ritmoStatus =
      foraDoPrazo.length > 0
        ? `${foraDoPrazo.length} ${foraDoPrazo.length === 1 ? 'data passada' : 'datas passadas'}`
        : gravacao > 0
          ? 'Atenção na gravação'
          : leituraAviso === 'abaixo'
            ? 'Abaixo da faixa'
            : leituraAviso === 'acima'
              ? 'Acima da faixa'
              : faltamParaMeta > 0
                ? 'Abaixo da meta'
                : preenchidos > 0
                  ? 'Em dia'
                  : 'Sem pautas';

    const ritmoSubtitulo = [
      `${preenchidos} ${preenchidos === 1 ? 'peça' : 'peças'}`,
      gravacao > 0 ? `${gravacao} ${gravacao === 1 ? 'gravação pendente' : 'gravações pendentes'}` : null,
    ]
      .filter(Boolean)
      .join(' · ');

    const sinalRitmo: PlacarSinal = {
      id: 'ritmo',
      numero: '2',
      etiqueta: 'Ritmo',
      statusTexto: ritmoStatus,
      tone: ritmoTone,
      titulo: 'Faixa de produção',
      subtitulo: ritmoSubtitulo,
      rodapeChave: faixaTexto ? 'Faixa' : metaTotal != null ? 'Meta do trecho' : 'Em andamento',
      rodapeValor:
        faixaTexto ??
        (metaTotal != null ? `${preenchidos} de ${metaTotal}` : `${escrita} escrita · ${edicao} edição`),
      alvoId: 'saude-falta-algo',
    };

    // 3. Séries
    const totalSeries = linhasContinuidade.length;
    const emDiaSeries = Math.max(0, totalSeries - seriesComPendencias.length);
    const alinhamentoPct = totalSeries > 0 ? Math.round((emDiaSeries / totalSeries) * 100) : null;

    const seriesTone: PlacarSinal['tone'] = nenhumaAcompanhada
      ? 'neutro'
      : seriesAbaixo.length > 0
        ? 'erro'
        : seriesComPendencias.length > 0 || Boolean(semFrequencia)
          ? 'aviso'
          : 'ok';

    const seriesStatus = nenhumaAcompanhada
      ? 'Sem metas'
      : seriesComPendencias.length > 0
        ? `${seriesComPendencias.length} ${seriesComPendencias.length === 1 ? 'pendente' : 'pendentes'}`
        : semFrequencia
          ? 'Sem ritmo'
          : 'Em dia';

    const sinalSeries: PlacarSinal = {
      id: 'series',
      numero: '3',
      etiqueta: 'Séries',
      statusTexto: seriesStatus,
      tone: seriesTone,
      titulo: 'Grade programada',
      subtitulo: nenhumaAcompanhada
        ? 'Nenhuma série acompanhada no período'
        : `${emDiaSeries} de ${totalSeries} ${totalSeries === 1 ? 'série' : 'séries'} em dia`,
      rodapeChave: 'Alinhamento',
      rodapeValor: alinhamentoPct != null ? `${alinhamentoPct}% da grade` : '—',
      alvoId: 'conferencia-series',
    };

    return [sinalEquilibrio, sinalRitmo, sinalSeries];
  }, [
    objetivos,
    maiorDesvioObjetivo,
    itensSemPilar.length,
    pilaresComItens,
    pilaresNaConta.length,
    preenchidos,
    equilibrioStatus.tone,
    faixas,
    foraDoPrazo.length,
    gravacao,
    faltamParaMeta,
    metaTotal,
    escrita,
    edicao,
    linhasContinuidade.length,
    seriesComPendencias.length,
    nenhumaAcompanhada,
    seriesAbaixo.length,
    semFrequencia,
  ]);

  // Cartões da Pergunta 2 ("Falta algo?") — 1 única ação por cartão
  const alertaCards = useMemo<AlertaCardItem[]>(() => {
    const cards: AlertaCardItem[] = [];

    // 1. Publicações com data passada
    for (const item of foraDoPrazo) {
      const content = contents.find(c => c.id === item.contentId);
      const tituloItem = content?.title || (item.postItId ? 'Post-it sem roteiro' : 'Conteúdo');
      const dataFmt = item.data ? format(parseISO(item.data), 'dd/MM') : 'Sem data';
      const temConteudo = Boolean(item.contentId && content);

      cards.push({
        id: `fora-prazo:${item.id}`,
        categoria: 'Data passada',
        metaDireita: dataFmt,
        titulo: tituloItem,
        descricao: `Etapa atual: ${item.etapa ?? 'planejamento'}. Ainda sem publicação registrada ou nova data.`,
        tone: 'erro',
        destaqueAcao: true,
        acaoRotulo: onResolverData ? 'Resolver data' : 'Abrir conteúdo',
        acaoIcone: 'calendario',
        onAcao: () => {
          if (onResolverData) {
            onResolverData(item);
          } else if (temConteudo) {
            navigate(
              buildContentDetailRoute(item.contentId, item.etapa === 'roteiro' ? 'roteiro' : 'publicacao'),
              withDetailBack(retornoPlanejamento),
            );
          }
        },
      });
    }

    // 2. Gravação pendente
    if (roteiroIds.length > 0) {
      const primeiro = roteirosParaGravar[0];
      const primeiroConteudo = primeiro ? contents.find(c => c.id === primeiro.contentId) : null;
      const tituloGravacao =
        roteiroIds.length === 1 && primeiroConteudo?.title
          ? `Roteiro "${primeiroConteudo.title}" ainda sem gravação`
          : `${roteiroIds.length} ${roteiroIds.length === 1 ? 'roteiro pronto aguardando gravação' : 'roteiros prontos aguardando gravação'}`;

      const nomesPreview = roteirosParaGravar
        .slice(0, 2)
        .map(item => contents.find(c => c.id === item.contentId)?.title)
        .filter(Boolean)
        .join(' · ');

      cards.push({
        id: 'gravacao-pendente',
        categoria: 'Esteira',
        metaDireita: 'Gravação',
        titulo: tituloGravacao,
        descricao: nomesPreview
          ? `${nomesPreview}. ${escrita} em escrita · ${edicao} em edição.`
          : `Prepare uma sessão com os roteiros deste período pré-selecionados.`,
        tone: 'aviso',
        acaoRotulo: 'Preparar sessão',
        acaoIcone: 'gravacao',
        onAcao: () => onOpenGravacao(roteiroIds),
      });
    }

    // 3. Volume abaixo da meta
    if (faltamParaMeta > 0 && metaTotal != null) {
      cards.push({
        id: 'volume-meta',
        categoria: 'Volume total',
        metaDireita: 'Meta do período',
        titulo: `${preenchidos} de ${metaTotal} espaços preenchidos`,
        descricao: `Faltam ${faltamParaMeta} ${faltamParaMeta === 1 ? 'peça' : 'peças'} para fechar o volume previsto no período.`,
        tone: 'neutro',
        acaoRotulo: 'Adicionar reserva',
        acaoIcone: 'reserva',
        onAcao: onAddReserva,
      });
    }

    // 4. Previstos para hoje em aberto
    if (pendentesHoje.length > 0) {
      const primeiro = pendentesHoje[0];
      const primeiroConteudo = contents.find(c => c.id === primeiro.contentId);
      const abrirUnico = pendentesHoje.length === 1 && Boolean(primeiro.contentId && primeiroConteudo);

      cards.push({
        id: 'pendentes-hoje',
        categoria: 'Hoje',
        metaDireita: `${pendentesHoje.length} em aberto`,
        titulo:
          pendentesHoje.length === 1
            ? primeiroConteudo?.title || 'Post-it previsto para hoje'
            : `${pendentesHoje.length} conteúdos previstos para hoje`,
        descricao:
          pendentesHoje.length === 1
            ? `Etapa: ${primeiro.etapa ?? 'planejamento'}.`
            : `Revise os itens marcados para hoje na sua grade.`,
        tone: 'aviso',
        acaoRotulo: abrirUnico ? 'Abrir conteúdo' : 'Ver itens de hoje',
        acaoIcone: 'calendario',
        onAcao: () => {
          if (abrirUnico) {
            navigate(
              buildContentDetailRoute(primeiro.contentId, primeiro.etapa === 'roteiro' ? 'roteiro' : 'publicacao'),
              withDetailBack(retornoPlanejamento),
            );
          } else {
            setLista({ titulo: 'Previstos para hoje', itens: deHoje });
          }
        },
      });
    }

    // 5. Avisos de orientação relevantes (produção, concentração e ausências de série)
    const avisosParaCards = avisos.filter(
      aviso =>
        blocoDoAviso(aviso) !== 'continuidade' ||
        aviso.tipo === 'ausencia-12-dias' ||
        aviso.tipo === 'ausencia-mes',
    );

    for (const aviso of avisosParaCards) {
      const detalhe = detalheDoAviso(aviso);
      const metaVisual = categoriaDoAviso(aviso);
      const vaiParaEditorial =
        aviso.tipo === 'faixa-config' ||
        aviso.tipo === 'capacidade-semana' ||
        (!onLocalizarAviso && aviso.postItIds.length === 0 && aviso.contentIds.length === 0);

      cards.push({
        id: `aviso:${aviso.id}`,
        categoria: metaVisual.rotulo,
        metaDireita: detalhe.intervalo ?? undefined,
        titulo: aviso.texto,
        descricao: capitalizar(detalhe.acao) + '.',
        tone: metaVisual.tone,
        acaoRotulo: vaiParaEditorial ? 'Ajustar no Editorial' : 'Localizar na grade',
        acaoIcone: vaiParaEditorial ? 'editorial' : metaVisual.icone,
        onAcao: () => {
          if (vaiParaEditorial) {
            navigate('/editorial');
          } else if (onLocalizarAviso) {
            onLocalizarAviso(aviso);
          }
        },
      });
    }

    return cards;
  }, [
    foraDoPrazo,
    contents,
    onResolverData,
    navigate,
    retornoPlanejamento,
    roteiroIds,
    roteirosParaGravar,
    escrita,
    edicao,
    onOpenGravacao,
    faltamParaMeta,
    metaTotal,
    preenchidos,
    onAddReserva,
    pendentesHoje,
    deHoje,
    avisos,
    onLocalizarAviso,
  ]);

  const avisosConcentracao = useMemo(
    () => avisos.filter(aviso => blocoDoAviso(aviso) === 'concentracao'),
    [avisos],
  );

  const rolarParaSecao = (alvoId: string) => {
    document.getElementById(alvoId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const resumoProducao = `${escrita} em escrita · ${gravacao} para gravar · ${edicao} em edição`;

  return (
    <div className={cn('flex h-full min-h-0 flex-col bg-[var(--bg-elevated)]', className)}>
      {/* Cabeçalho fixo do Drawer */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          {onFechar ? (
            <AppButton
              variant="ghost"
              size="xs"
              iconOnly
              onClick={onFechar}
              aria-label="Fechar painel"
              className="shrink-0"
            >
              <X className="h-4 w-4" aria-hidden />
            </AppButton>
          ) : null}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Text variant="itemTitle" as="h2" className="truncate text-[var(--text-primary)] leading-tight">
                Saúde do Planejamento
              </Text>
              {filtroRotulo ? <Badge variant="neutral">Filtro: {filtroRotulo}</Badge> : null}
            </div>

            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <Text variant="meta" as="span" className="text-[var(--text-secondary)]">
                {rotuloPeriodo}
              </Text>

              {onPeriodoAnterior && onProximoPeriodo ? (
                <div className="inline-flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={onPeriodoAnterior}
                    aria-label="Período anterior"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={onProximoPeriodo}
                    aria-label="Próximo período"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
                  >
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <AppButton
          variant="secondary"
          size="xs"
          leftIcon={<SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />}
          onClick={() => navigate('/editorial')}
          className="shrink-0"
        >
          Metas
        </AppButton>
      </header>

      {avisoPeriodo ? (
        <div className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-2 sm:px-6">
          <Text variant="meta" as="p" className="text-[var(--text-secondary)]">
            {avisoPeriodo}
          </Text>
        </div>
      ) : null}

      {/* Corpo rolável: Placar + 3 Perguntas */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto bg-[var(--bg-primary)] px-4 py-4 sm:px-6 sm:py-6"
      >
        <div className="stack-lg">
          <SaudePlacar
            sinais={placarSinais}
            escopoRotulo={escopoRotulo}
            onSelecionarSecao={rolarParaSecao}
          />

          <div className="h-px bg-[var(--border-color)]" aria-hidden />

          <SaudeEquilibrioSection
            pilaresNaConta={pilaresNaConta}
            previstosPorPilar={previstosPorPilar}
            totalPrevistosPilares={totalPrevistosPilares}
            itensPorPilar={itensPorPilar}
            itensSemPilar={itensSemPilar}
            textoSemPauta={textoSemPauta}
            objetivos={objetivos}
            distribuicaoAssuntos={distribuicaoAssuntos}
            publicacoes={publicacoes}
            faixasContas={faixas?.contas ?? []}
            avisosConcentracao={avisosConcentracao}
            equilibrioStatus={equilibrioStatus}
            onAbrirLista={setLista}
            onAbrirEditorialDirecao={() => navigate('/editorial?aba=direcao')}
            onLocalizarAviso={onLocalizarAviso}
          />

          <SaudeFaltaAlgoSection
            cards={alertaCards}
            resumoProducao={resumoProducao}
            textoExcesso={textoExcesso}
          />

          <SaudeSeriesSection
            linhasContinuidade={linhasContinuidade}
            escopos={escopos}
            continuidade={continuidade}
            nenhumaAcompanhada={nenhumaAcompanhada}
            semFrequencia={semFrequencia}
            hojeIso={hojeIso}
            recorte={counts.periodo}
            seriesAbertas={seriesAbertas}
            onToggleSerie={guardarAberturaSerie}
            onPlanejarIntervalo={onPlanejarIntervalo}
            onReorganizarEpisodios={onReorganizarEpisodios}
            onEditarMeta={alvo => navigate(`/editorial?editar=${encodeURIComponent(alvo)}`)}
            onIrParaSeries={() => navigate('/series')}
          />
        </div>
      </div>

      {lista ? <ItensDaSaudeDialog lista={lista} onClose={() => setLista(null)} /> : null}
    </div>
  );
}
