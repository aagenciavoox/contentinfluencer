import type { ContentPlataforma, FormatoEscolhidoNaPublicacao, WritingMode } from '../../../lib/database.ts';
import { contasAtivas, redeDaConta, ROTULO_REDE_DO_FILTRO, type ContaRef, type RedeDoFiltro } from '../../contas/lib/contas.ts';
import { compararExibicaoRede, normalizarRedesPostIt, REDES_DO_POSTIT } from '../../planejamento/lib/redesPostIt.ts';
import { criarPublicacaoAgendada, destinosPadraoAtivos, publicacoesIniciais } from './destinations.ts';

/** "Instagram · TikTok · YouTube Shorts". */
export function rotuloDoFoco(redes: readonly RedeDoFiltro[]): string {
  return normalizarRedesPostIt(redes).sort(compararExibicaoRede).map(rede => ROTULO_REDE_DO_FILTRO[rede]).join(' · ');
}

/** Temporada manda. Sem redes nela, vale o foco do quadro. */
export function focoEfetivo(
  daTemporada: readonly string[] | null | undefined,
  doQuadro: readonly string[] | null | undefined,
): RedeDoFiltro[] {
  const temporada = normalizarRedesPostIt(daTemporada ?? []);
  if (temporada.length > 0) return temporada;
  return normalizarRedesPostIt(doQuadro ?? []);
}

function formatoDaContaNoFoco(
  rede: ReturnType<typeof redeDaConta>,
  foco: readonly RedeDoFiltro[],
): FormatoEscolhidoNaPublicacao | null {
  if (rede === 'youtube') {
    if (foco.includes('youtube-shorts')) return 'short';
    if (foco.includes('youtube')) return 'video-longo';
    return null;
  }
  if (rede === 'instagram') {
    if (foco.includes('instagram-carrossel')) return 'carrossel';
    if (foco.includes('instagram-video') || foco.includes('instagram')) return 'reels';
    return null;
  }
  if (rede === 'tiktok') {
    if (foco.includes('tiktok-carrossel')) return 'carrossel';
    if (foco.includes('tiktok-video') || foco.includes('tiktok')) return 'reels';
    return null;
  }
  return null;
}

function contaNoFoco(rede: ReturnType<typeof redeDaConta>, redes: readonly RedeDoFiltro[]): boolean {
  if (!rede) return false;
  if (redes.includes(rede)) return true;
  if (rede === 'youtube' && redes.includes('youtube-shorts')) return true;
  if (rede === 'instagram' && (redes.includes('instagram-video') || redes.includes('instagram-carrossel'))) return true;
  if (rede === 'tiktok' && (redes.includes('tiktok-video') || redes.includes('tiktok-carrossel'))) return true;
  return false;
}

/**
 * Uma publicação prevista por conta ativa que cabe no foco.
 * YouTube longo e Shorts são a mesma conta, com formatos diferentes. Se os dois vierem juntos, fica Shorts.
 */
export function criarPublicacoesDasRedes(
  contentId: string,
  redes: readonly RedeDoFiltro[],
  contas: readonly ContaRef[],
): ContentPlataforma[] {
  const foco = normalizarRedesPostIt(redes);
  if (foco.length === 0) return [];
  return contasAtivas(contas)
    .filter(conta => contaNoFoco(redeDaConta(conta), foco))
    .map(conta => {
      const rede = redeDaConta(conta);
      const pub = criarPublicacaoAgendada(contentId, conta.id);
      const formato = formatoDaContaNoFoco(rede, foco);
      return formato ? { ...pub, formatoPublicacao: formato } : pub;
    });
}

/**
 * Episódio novo numa temporada: com foco de redes, nasce só nelas.
 * Sem foco, usa os destinos padrão de conteúdo novo.
 */
export function publicacoesDoEpisodioNaTemporada(input: {
  contentId: string;
  focoRedes: readonly string[] | null | undefined;
  contas: readonly ContaRef[];
  destinosPadrao: readonly string[];
}): ContentPlataforma[] {
  const foco = normalizarRedesPostIt(input.focoRedes ?? []);
  if (foco.length > 0) return criarPublicacoesDasRedes(input.contentId, foco, input.contas);
  const destinos = destinosPadraoAtivos(
    input.destinosPadrao,
    input.contas.filter(conta => conta.ativo).map(conta => ({
      id: conta.id,
      nome: conta.nome,
      rede: conta.rede,
      handle: conta.handle,
      ativo: conta.ativo,
    })),
  );
  return publicacoesIniciais({ destinos, contentId: input.contentId });
}

/** De onde vieram os destinos do episódio novo. */
export type OrigemDosDestinos = 'temporada' | 'quadro' | 'serie' | 'padrao';

export const ROTULO_ORIGEM_DOS_DESTINOS: Record<OrigemDosDestinos, string> = {
  temporada: 'Destinos da temporada',
  quadro: 'Destinos do quadro',
  serie: 'Destinos da série',
  padrao: 'Destinos padrão do Editorial',
};

type DestinoDaSerie = { platformId: string; formato?: FormatoEscolhidoNaPublicacao | null };

export type SerieDosDestinos = {
  id: string;
  parentId?: string | null;
  tipoAgrupamento?: 'familia' | 'serie' | 'quadro' | null;
  focoRedes?: readonly string[] | null;
  plataformas?: readonly DestinoDaSerie[] | null;
};

function formatoPadraoDaRede(rede: ReturnType<typeof redeDaConta>): FormatoEscolhidoNaPublicacao | null {
  if (rede === 'youtube') return 'short';
  if (rede === 'instagram' || rede === 'tiktok') return 'reels';
  return null;
}

/** Destinos gravados (conta + formato) viram publicações previstas, sem data. Conta inativa fica de fora. */
export function publicacoesDosDestinosDaSerie(
  contentId: string,
  destinos: readonly DestinoDaSerie[],
  contas: readonly ContaRef[],
): ContentPlataforma[] {
  const ativas = contasAtivas(contas);
  const vistas = new Set<string>();
  const lista: ContentPlataforma[] = [];
  for (const destino of destinos) {
    const conta = ativas.find(item => item.id === destino.platformId);
    if (!conta || vistas.has(conta.id)) continue;
    vistas.add(conta.id);
    const pub = criarPublicacaoAgendada(contentId, conta.id);
    const formato = destino.formato ?? formatoPadraoDaRede(redeDaConta(conta));
    lista.push(formato ? { ...pub, formatoPublicacao: formato } : pub);
  }
  return lista;
}

function ehQuadro(serie: SerieDosDestinos): boolean {
  if (serie.tipoAgrupamento) return serie.tipoAgrupamento === 'quadro';
  return Boolean(serie.parentId);
}

/**
 * Destinos do episódio novo: a primeira configuração na ordem temporada → quadro → série.
 * Quadro usa o foco de redes; sem ele, as contas próprias. Série usa as contas de destino dela.
 * Sem nada, os destinos padrão do Editorial. Nenhuma data é criada: só a seleção, que continua editável.
 */
export function destinosDoNovoEpisodio(input: {
  contentId: string;
  temporada?: { focoRedes?: readonly string[] | null } | null;
  serieId: string | null | undefined;
  series: readonly SerieDosDestinos[];
  contas: readonly ContaRef[];
  destinosPadrao: readonly string[];
}): { publicacoes: ContentPlataforma[]; origem: OrigemDosDestinos } {
  const daTemporada = normalizarRedesPostIt(input.temporada?.focoRedes ?? []);
  if (daTemporada.length > 0) {
    const publicacoes = criarPublicacoesDasRedes(input.contentId, daTemporada, input.contas);
    if (publicacoes.length > 0) return { publicacoes, origem: 'temporada' };
  }
  const porId = new Map(input.series.map(serie => [serie.id, serie]));
  const vistos = new Set<string>();
  let atual = input.serieId ? porId.get(input.serieId) : undefined;
  while (atual && !vistos.has(atual.id)) {
    vistos.add(atual.id);
    if (atual.tipoAgrupamento === 'familia') break;
    if (ehQuadro(atual)) {
      const foco = normalizarRedesPostIt(atual.focoRedes ?? []);
      const publicacoes = foco.length > 0
        ? criarPublicacoesDasRedes(input.contentId, foco, input.contas)
        : publicacoesDosDestinosDaSerie(input.contentId, atual.plataformas ?? [], input.contas);
      if (publicacoes.length > 0) return { publicacoes, origem: 'quadro' };
    } else {
      const publicacoes = publicacoesDosDestinosDaSerie(input.contentId, atual.plataformas ?? [], input.contas);
      if (publicacoes.length > 0) return { publicacoes, origem: 'serie' };
      break;
    }
    atual = atual.parentId ? porId.get(atual.parentId) : undefined;
  }
  return {
    publicacoes: publicacoesDoEpisodioNaTemporada({
      contentId: input.contentId,
      focoRedes: [],
      contas: input.contas,
      destinosPadrao: input.destinosPadrao,
    }),
    origem: 'padrao',
  };
}

export type SugestaoDoFoco = {
  writingMode: WritingMode;
  /** Rótulo curto do formato do episódio; null = não sugere (mantém o da série). */
  formatoVisual: string | null;
};

/** Conhecidas, sem repetir, na ordem em que vieram (não reordena pela lista fixa). */
function redesDoFocoNaOrdem(focoRedes: readonly string[] | null | undefined): RedeDoFiltro[] {
  if (!Array.isArray(focoRedes) || focoRedes.length === 0) return [];
  const conhecidas = new Set<string>(REDES_DO_POSTIT);
  const vistas = new Set<string>();
  const out: RedeDoFiltro[] = [];
  for (const bruto of focoRedes) {
    if (typeof bruto !== 'string') continue;
    const rede = bruto.trim().toLowerCase();
    if (!conhecidas.has(rede) || vistas.has(rede)) continue;
    vistas.add(rede);
    out.push(rede as RedeDoFiltro);
  }
  return out;
}

function sugestaoDaRede(rede: RedeDoFiltro): SugestaoDoFoco | null {
  if (rede === 'instagram-carrossel' || rede === 'tiktok-carrossel') {
    return { writingMode: 'carrossel', formatoVisual: 'Carrossel' };
  }
  if (rede === 'youtube') {
    return { writingMode: 'youtube', formatoVisual: 'YouTube' };
  }
  if (rede === 'youtube-shorts') {
    return { writingMode: 'texto', formatoVisual: 'Shorts' };
  }
  if (
    rede === 'instagram-video'
    || rede === 'tiktok-video'
    || rede === 'instagram'
    || rede === 'tiktok'
  ) {
    return { writingMode: 'texto', formatoVisual: 'Reels' };
  }
  return null;
}

/** Fila fixa: só entra quando o foco não traz ordem utilizavel. */
const FILA_FIXA_SUGESTAO: readonly RedeDoFiltro[] = [
  'instagram-carrossel',
  'tiktok-carrossel',
  'youtube',
  'youtube-shorts',
  'instagram-video',
  'tiktok-video',
  'instagram',
  'tiktok',
];

/**
 * Formato e modo de escrita sugeridos pelo foco de redes na criação do episódio.
 * Com mais de uma rede, manda a ordem do próprio foco da wave.
 * A fila fixa (carrossel > YouTube longo > Shorts > Reels) só vale quando essa ordem não existe.
 * Meta automática da conta fica para depois.
 */
function sugestaoPelaFilaFixa(redes: readonly RedeDoFiltro[]): SugestaoDoFoco | null {
  const presentes = new Set(redes);
  for (const rede of FILA_FIXA_SUGESTAO) {
    if (!presentes.has(rede)) continue;
    const sugestao = sugestaoDaRede(rede);
    if (sugestao) return sugestao;
  }
  return null;
}

export function sugestaoDoFoco(focoRedes: readonly string[] | null | undefined): SugestaoDoFoco | null {
  // Sem array ordenado: só há um conjunto (ou nada). Aí vale a fila fixa.
  if (!Array.isArray(focoRedes)) {
    return sugestaoPelaFilaFixa(normalizarRedesPostIt(focoRedes ?? []));
  }

  const ordenadas = redesDoFocoNaOrdem(focoRedes);
  if (ordenadas.length === 0) return null;

  // Ordem do próprio foco da wave: a primeira rede que sugere formato/modo vence.
  for (const rede of ordenadas) {
    const sugestao = sugestaoDaRede(rede);
    if (sugestao) return sugestao;
  }

  // Redes no foco sem mapeamento (ex.: só blog/outra).
  return sugestaoPelaFilaFixa(ordenadas);
}

/** Frase curta para o diálogo de novo conteúdo. */
export function textoDaSugestaoDoFoco(sugestao: SugestaoDoFoco): string {
  const modo =
    sugestao.writingMode === 'carrossel' ? 'modo carrossel'
    : sugestao.writingMode === 'youtube' ? 'modo YouTube'
    : 'modo texto';
  if (sugestao.formatoVisual) {
    return 'Neste foco, o episódio nasce como ' + sugestao.formatoVisual + ' (' + modo + ').';
  }
  return 'Neste foco, o episódio nasce em ' + modo + '.';
}
