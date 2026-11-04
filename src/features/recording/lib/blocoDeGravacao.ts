import type { Content, RecordingBlock, RecordingBlockContent } from '../../../lib/database.ts';
import { isCarouselContent } from '../../contents/lib/carouselSlides.ts';
import { isContentBodyLoaded } from '../../contents/lib/contentBody.ts';
import { CONTENT_STATUS, canAdvanceToRecording, normalizeContentStatus } from '../../contents/lib/contentPipeline.ts';
import { isActiveCreation } from '../../contents/lib/contentWorkflow.ts';
import { applyStatusChange } from '../../contents/lib/creationContent.ts';
import { normalizeRecordingTags } from './recordingWorkflow.ts';

/**
 * Montagem de bloco de gravação, a mesma na Gravação, no roteiro e no Planejamento.
 * Só monta objetos: quem chama grava (ADD_RECORDING_BLOCK + UPDATE_BLOCK_CONTENTS).
 */

export type MotivoForaDoBloco = 'arquivado' | 'carrossel' | 'ja-em-bloco' | 'etapa' | 'sem-texto';

export const ROTULO_FORA_DO_BLOCO: Record<MotivoForaDoBloco, string> = {
  arquivado: 'Arquivado',
  carrossel: 'Carrossel não é gravado',
  'ja-em-bloco': 'Já está num bloco',
  etapa: 'Só Roteiro ou Produção entram no bloco',
  'sem-texto': 'Roteiro ainda sem texto',
};

export function blocoDoConteudo(contentId: string, blocks: readonly RecordingBlock[]): RecordingBlock | null {
  return blocks.find(block => block.contents.some(item => item.contentId === contentId)) ?? null;
}

/**
 * Por que o conteúdo não entra num bloco; null quando entra.
 * Roteiro entra se tiver texto. Com o corpo ainda não carregado, dá o benefício da dúvida:
 * quem grava carrega o corpo antes e confere de novo.
 */
export function motivoForaDoBloco(content: Content, blocks: readonly RecordingBlock[]): MotivoForaDoBloco | null {
  if (!isActiveCreation(content)) return 'arquivado';
  if (isCarouselContent(content)) return 'carrossel';
  if (blocoDoConteudo(content.id, blocks)) return 'ja-em-bloco';
  const status = normalizeContentStatus(content.status);
  if (status === CONTENT_STATUS.PRODUCAO) return null;
  if (status !== CONTENT_STATUS.ROTEIRO) return 'etapa';
  if (isContentBodyLoaded(content) && !canAdvanceToRecording(content)) return 'sem-texto';
  return null;
}

export function entraNoBloco(content: Content, blocks: readonly RecordingBlock[]): boolean {
  return motivoForaDoBloco(content, blocks) === null;
}

/** Roteiro com texto sobe para Produção ao entrar no bloco ("pronto para gravar"). O resto fica igual. */
export function prontoParaGravar(content: Content, now = new Date().toISOString()): Content {
  if (normalizeContentStatus(content.status) !== CONTENT_STATUS.ROTEIRO) return content;
  if (!canAdvanceToRecording(content)) return content;
  return applyStatusChange(content, CONTENT_STATUS.PRODUCAO, now);
}

/** Linhas do bloco na ordem dada. Gravado só quando o conteúdo já tem data de gravação. */
export function linhasDoBloco(blockId: string, contents: readonly Pick<Content, 'id' | 'recordedAt'>[]): RecordingBlockContent[] {
  return contents.map((content, index) => ({
    blockId,
    contentId: content.id,
    ordem: index,
    gravado: Boolean(content.recordedAt),
  }));
}

/**
 * Bloco novo com os conteúdos na ordem dada. Tags: as escolhidas; sem escolha, as dos conteúdos.
 */
export function montarBlocoDeGravacao(input: {
  id: string;
  userId: string;
  nome: string;
  tags?: readonly string[];
  contents: readonly Content[];
  now?: string;
}): { block: RecordingBlock; blockContents: RecordingBlockContent[] } {
  const manuais = (input.tags ?? []).map(tag => tag.trim()).filter(Boolean);
  const recordingTags = normalizeRecordingTags(
    manuais.length > 0 ? manuais : input.contents.flatMap(content => content.tags || []),
  );
  const block: RecordingBlock = {
    id: input.id,
    userId: input.userId,
    name: input.nome.trim(),
    lookLabel: null,
    cenarioLabel: null,
    metadata: {
      recordingTags,
      sourceContentIds: input.contents.map(content => content.id),
    },
    createdAt: input.now ?? new Date().toISOString(),
    contents: [],
  };
  return { block, blockContents: linhasDoBloco(block.id, input.contents) };
}

/** Texto livre de tags ("look casa, cenário mesa") vira lista. */
export function tagsDoTexto(texto: string): string[] {
  return texto.split(/[,\n]/).map(tag => tag.trim()).filter(Boolean);
}
