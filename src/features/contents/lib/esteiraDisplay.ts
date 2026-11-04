import type {Content, ContentPlataforma} from '../../../lib/database.ts';
import {temLegenda} from '../../editorial/lib/captions.ts';
import {formatoDaPublicacao, type FormatoPublicacao} from '../../editorial/lib/publicacoes.ts';
import {normalizePublicacaoStatus} from '../../editorial/lib/publicacaoSituacao.ts';
import {redeDaRef, type ContaRef} from '../../contas/lib/contas.ts';
import {isCarouselContent} from './carouselSlides.ts';
import {
  CONTENT_STATUS,
  DISPLAY_STATUS,
  getDisplayStatus,
  isReadyToPublish,
  normalizeContentStatus,
} from './contentPipeline.ts';

export type TipoDaPeca = 'video' | 'carrossel';

export type PendenciaRoteiro =
  | 'gravar'
  | 'sinalizar-edicao'
  | 'marcar-pronto'
  | 'montar-design'
  | 'legenda';

export const PENDENCIA_LABEL: Record<PendenciaRoteiro, string> = {
  gravar: 'ainda precisa gravar',
  'sinalizar-edicao': 'a edição ainda não foi sinalizada',
  'marcar-pronto': 'ainda não foi marcado como pronto',
  'montar-design': 'montar o design',
  legenda: 'falta a legenda',
};

const FORMATOS_VIDEO: ReadonlySet<FormatoPublicacao> = new Set(['reels', 'short', 'video-longo', 'live']);

type ConteudoDaEsteira = Pick<
  Content,
  'status' | 'edicaoConcluidaEm' | 'postedAt'
> & Partial<Pick<Content, 'writingMode' | 'formatoVisual' | 'recordedAt' | 'legendaBase' | 'publishDate' | 'plataformas'>>;

/**
 * Tipo da peça pelas publicações: vídeo se alguma conta é Reels, Shorts ou longo;
 * carrossel se todas são carrossel; sem publicação, vale o modo de escrita.
 * Mistura segue o vídeo.
 */
export function tipoDaPeca(
  content: ConteudoDaEsteira,
  contas: readonly ContaRef[] = [],
): TipoDaPeca {
  const plataformas = content.plataformas ?? [];
  if (plataformas.length === 0) {
    return isCarouselContent(content) ? 'carrossel' : 'video';
  }
  const formatos = plataformas.map(publicacao => {
    const rede = redeDaRef(publicacao.platformId, contas);
    return formatoDaPublicacao(
      {formatoVisual: content.formatoVisual ?? null, writingMode: content.writingMode},
      rede,
      publicacao,
    );
  });
  if (formatos.some(formato => FORMATOS_VIDEO.has(formato))) return 'video';
  if (formatos.length > 0 && formatos.every(formato => formato === 'carrossel')) return 'carrossel';
  return isCarouselContent(content) ? 'carrossel' : 'video';
}

/** A esteira lê a etapa com data nula quando o conteúdo ainda não tem dia. */
function conteudoParaEtapa(content: ConteudoDaEsteira) {
  return {...content, publishDate: content.publishDate ?? null};
}

/** Nome da etapa na tela. Saúde continua contando pelo status gravado. */
export function nomeDaEtapaNaTela(
  content: ConteudoDaEsteira,
  contas: readonly ContaRef[] = [],
): string {
  const display = getDisplayStatus(conteudoParaEtapa(content));
  if (display === CONTENT_STATUS.POSTADO) return 'Postado';
  if (display === DISPLAY_STATUS.PROGRAMADO) return 'Programado';

  const status = normalizeContentStatus(content.status);
  const tipo = tipoDaPeca(content, contas);

  if (status === CONTENT_STATUS.IDEIA) return 'Ideia';
  if (status === CONTENT_STATUS.ROTEIRO) return 'Roteiro';

  if (tipo === 'carrossel') {
    if (status === CONTENT_STATUS.PRODUCAO) {
      return content.edicaoConcluidaEm ? 'Design pronto' : 'Montar o design';
    }
    if (status === CONTENT_STATUS.EDICAO) {
      return content.edicaoConcluidaEm ? 'Design pronto' : 'Montar o design';
    }
  }

  if (status === CONTENT_STATUS.PRODUCAO) return 'Pronto para gravar';
  if (status === CONTENT_STATUS.EDICAO) {
    return content.edicaoConcluidaEm ? 'Editado' : 'Pronto para editar';
  }
  return status;
}

function contaCobraLegenda(publicacao: Pick<ContentPlataforma, 'status'>): boolean {
  const situacao = normalizePublicacaoStatus(publicacao.status);
  return situacao === 'prevista';
}

/**
 * O que ainda falta até a postagem, na ordem da esteira.
 * Conta programada ou publicada não entra na cobrança de legenda.
 */
export function pendenciasDoRoteiro(
  content: ConteudoDaEsteira,
  contas: readonly ContaRef[] = [],
): PendenciaRoteiro[] {
  if (content.postedAt || normalizeContentStatus(content.status) === CONTENT_STATUS.POSTADO) {
    return [];
  }
  if (isReadyToPublish(content) && getDisplayStatus(conteudoParaEtapa(content)) === DISPLAY_STATUS.PROGRAMADO) {
    return [];
  }

  const pendencias: PendenciaRoteiro[] = [];
  const status = normalizeContentStatus(content.status);
  const tipo = tipoDaPeca(content, contas);
  const pronto = isReadyToPublish(content);

  if (tipo === 'carrossel') {
    if (!pronto) pendencias.push('montar-design');
  } else {
    const gravado = Boolean(content.recordedAt) || status === CONTENT_STATUS.EDICAO || pronto;
    if (!gravado && (status === CONTENT_STATUS.IDEIA || status === CONTENT_STATUS.ROTEIRO || status === CONTENT_STATUS.PRODUCAO)) {
      pendencias.push('gravar');
    }
    if (content.recordedAt && status !== CONTENT_STATUS.EDICAO && status !== CONTENT_STATUS.POSTADO && !pronto) {
      pendencias.push('sinalizar-edicao');
    }
    if (status === CONTENT_STATUS.EDICAO && !content.edicaoConcluidaEm) {
      pendencias.push('marcar-pronto');
    }
  }

  // Legenda do Roteiro até Editado / Design pronto. Programado e Postado não cobram.
  const ateEditadoOuDesign = status === CONTENT_STATUS.ROTEIRO
    || status === CONTENT_STATUS.PRODUCAO
    || status === CONTENT_STATUS.EDICAO;
  if (ateEditadoOuDesign && getDisplayStatus(conteudoParaEtapa(content)) !== DISPLAY_STATUS.PROGRAMADO) {
    const ativas = (content.plataformas ?? []).filter(contaCobraLegenda);
    const checar = ativas.length > 0
      ? ativas
      : [{legenda: '', legendaPropria: false, status: 'prevista' as const}];
    if (checar.some(publicacao => !temLegenda(content.legendaBase, publicacao))) {
      pendencias.push('legenda');
    }
  }

  return pendencias;
}

export function rotuloDasPendencias(pendencias: readonly PendenciaRoteiro[]): string {
  return pendencias.map(item => PENDENCIA_LABEL[item]).join(', ');
}

/** Carrossel: marca o design pronto sem sair de Produção. */
export function designProntoPatch(now = new Date().toISOString()): Pick<Content, 'status' | 'edicaoConcluidaEm' | 'edicaoDispensada'> {
  return {
    status: CONTENT_STATUS.PRODUCAO,
    edicaoConcluidaEm: now,
    edicaoDispensada: false,
  };
}
