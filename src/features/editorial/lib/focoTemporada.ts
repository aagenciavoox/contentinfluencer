import type { ContentPlataforma, FormatoEscolhidoNaPublicacao } from '../../../lib/database.ts';
import { contasAtivas, redeDaConta, ROTULO_REDE_DO_FILTRO, type ContaRef, type RedeDoFiltro } from '../../contas/lib/contas.ts';
import { compararExibicaoRede, normalizarRedesPostIt } from '../../planejamento/lib/redesPostIt.ts';
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
