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

/** Chave de cor e nome do filtro para o roteiro editado (ou design pronto). Não é status do banco. */
export const STATUS_EDITADO = 'Editado';

/**
 * Edição concluída (ou design do carrossel pronto), antes de programar ou postar.
 * Vem do status Edição (ou Produção, no carrossel) com edicaoConcluidaEm; o banco não muda.
 */
export function estaEditado(
  content: ConteudoDaEsteira,
  contas: readonly ContaRef[] = [],
): boolean {
  if (!content.edicaoConcluidaEm) return false;
  const display = getDisplayStatus(conteudoParaEtapa(content));
  if (display === CONTENT_STATUS.POSTADO || display === DISPLAY_STATUS.PROGRAMADO) return false;
  const status = normalizeContentStatus(content.status);
  if (status === CONTENT_STATUS.EDICAO) return true;
  return status === CONTENT_STATUS.PRODUCAO && tipoDaPeca(content, contas) === 'carrossel';
}

/** Nome da etapa com ✓ quando já está editado: "✓ Editado" ou "✓ Design pronto". */
export function rotuloDaEtapaNaTela(
  content: ConteudoDaEsteira,
  contas: readonly ContaRef[] = [],
): string {
  const nome = nomeDaEtapaNaTela(content, contas);
  return estaEditado(content, contas) ? `✓ ${nome}` : nome;
}

export type StatusNaTela = {
  /** Escolhe a cor do selo (Badge, chip, calendário). */
  status: string;
  /** Texto do selo. */
  rotulo: string;
  editado: boolean;
};

/**
 * Selo de status do card. Editado ganha a cor própria e "✓ Editado" (carrossel: "✓ Design pronto").
 * Fora isso, mostra `base` (por padrão o status de exibição, com Postado e Programado na frente).
 */
export function statusNaTela(
  content: ConteudoDaEsteira,
  contas: readonly ContaRef[] = [],
  base?: string,
): StatusNaTela {
  if (estaEditado(content, contas)) {
    return {status: STATUS_EDITADO, rotulo: `✓ ${nomeDaEtapaNaTela(content, contas)}`, editado: true};
  }
  const status = base ?? getDisplayStatus(conteudoParaEtapa(content));
  return {status, rotulo: status, editado: false};
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
