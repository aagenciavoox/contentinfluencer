import {isAfter, isBefore, startOfDay} from 'date-fns';
import type {Content, RecordingBlock} from '../../../lib/database';
import {htmlToReadableText} from '../../../lib/utils';

export const CONTENT_STATUS = {
  IDEIA: 'Ideia',
  ROTEIRO: 'Roteiro',
  PRONTO_PARA_GRAVAR: 'Pronto para Gravar',
  GRAVADO: 'Gravado',
  A_EDITAR: 'A Editar',
  EDITADO: 'Editado',
  PROGRAMADO: 'Programado',
  POSTADO: 'Postado',
} as const;

export enum ContentStage {
  IDEIA = 'IDEIA',
  ROTEIRO = 'ROTEIRO',
  PRONTO_PARA_GRAVAR = 'PRONTO_PARA_GRAVAR',
  EM_BLOCO = 'EM_BLOCO',
  GRAVADO = 'GRAVADO',
  PRODUCAO = 'PRODUCAO',
  PROGRAMADO = 'PROGRAMADO',
  POSTADO = 'POSTADO',
}

export type ContentDetailTab = 'roteiro' | 'gravacao' | 'producao' | 'postagem' | 'historico';

export type ContentPrimaryActionId =
  | 'advance_to_recording'
  | 'add_to_block'
  | 'go_to_execution'
  | 'mark_recorded'
  | 'send_to_posting'
  | 'save_schedule'
  | 'none';

export interface ContentPrimaryAction {
  id: ContentPrimaryActionId;
  label: string;
  targetTab: ContentDetailTab;
  disabled?: boolean;
  reason?: string;
}

export interface PostingAlert {
  id: 'scheduled' | 'overdue';
  tone: 'info' | 'warning';
  message: string;
}

type StageOptions = {
  block?: RecordingBlock | null;
};

export function isContentInBlock(contentId: string, block?: RecordingBlock | null) {
  if (!block) return false;
  return block.contents.some(item => item.contentId === contentId);
}

export function getContentBlockSummary(contentId: string, blocks: RecordingBlock[]) {
  const block = blocks.find(candidate => candidate.contents.some(item => item.contentId === contentId)) ?? null;
  if (!block) return null;

  const orderedContents = [...block.contents].sort((left, right) => left.ordem - right.ordem);
  const index = orderedContents.findIndex(item => item.contentId === contentId);
  const completedCount = orderedContents.filter(item => item.gravado).length;

  return {
    block,
    order: index >= 0 ? index + 1 : null,
    total: orderedContents.length,
    completedCount,
    progressPercentage:
      orderedContents.length === 0 ? 0 : Math.round((completedCount / orderedContents.length) * 100),
  };
}

export function getContentStage(content: Content, options: StageOptions = {}) {
  if (content.status === CONTENT_STATUS.IDEIA) return ContentStage.IDEIA;
  if (content.status === CONTENT_STATUS.ROTEIRO) return ContentStage.ROTEIRO;
  if (content.status === CONTENT_STATUS.PRONTO_PARA_GRAVAR) {
    return isContentInBlock(content.id, options.block) ? ContentStage.EM_BLOCO : ContentStage.PRONTO_PARA_GRAVAR;
  }
  if (content.status === CONTENT_STATUS.GRAVADO) return ContentStage.GRAVADO;
  if (content.status === CONTENT_STATUS.A_EDITAR || content.status === CONTENT_STATUS.EDITADO) {
    return ContentStage.PRODUCAO;
  }
  if (content.status === CONTENT_STATUS.PROGRAMADO) return ContentStage.PROGRAMADO;
  if (content.status === CONTENT_STATUS.POSTADO) return ContentStage.POSTADO;
  return ContentStage.ROTEIRO;
}

export function canAdvanceToRecording(content: Pick<Content, 'title' | 'script'>) {
  return content.title.trim().length > 0 && htmlToReadableText(content.script).trim().length > 0;
}

export function canSchedulePosting(content: Pick<Content, 'publishDate' | 'plataformas'>) {
  return Boolean(content.publishDate || content.plataformas.length > 0);
}

export function getPostingAlerts(content: Pick<Content, 'publishDate' | 'status'>) {
  if (!content.publishDate) return [] as PostingAlert[];

  const publishDay = startOfDay(new Date(content.publishDate));
  const today = startOfDay(new Date());

  if (
    isAfter(publishDay, today) &&
    content.status !== CONTENT_STATUS.PROGRAMADO &&
    content.status !== CONTENT_STATUS.POSTADO
  ) {
    return [
      {
        id: 'scheduled',
        tone: 'info',
        message: 'Data futura definida. Este conteudo deve seguir como Programado.',
      },
    ] satisfies PostingAlert[];
  }

  if (isBefore(publishDay, today) && content.status !== CONTENT_STATUS.POSTADO) {
    return [
      {
        id: 'overdue',
        tone: 'warning',
        message: 'A data de postagem ja passou e o conteudo ainda nao foi marcado como Postado.',
      },
    ] satisfies PostingAlert[];
  }

  return [] as PostingAlert[];
}

export function getPostingAutomationStatus(
  content: Pick<Content, 'publishDate' | 'status'>
): Content['status'] {
  if (!content.publishDate) return content.status;

  const publishDay = startOfDay(new Date(content.publishDate));
  const today = startOfDay(new Date());

  if (isAfter(publishDay, today) && content.status !== CONTENT_STATUS.POSTADO) {
    return CONTENT_STATUS.PROGRAMADO;
  }

  return content.status;
}

export function getPrimaryAction(content: Content, options: StageOptions = {}): ContentPrimaryAction {
  const stage = getContentStage(content, options);

  switch (stage) {
    case ContentStage.IDEIA:
    case ContentStage.ROTEIRO:
      return {
        id: 'advance_to_recording',
        label: 'Salvar e enviar para gravacao',
        targetTab: 'roteiro',
        disabled: !canAdvanceToRecording(content),
        reason: !canAdvanceToRecording(content) ? 'Preencha titulo e roteiro antes de avancar.' : undefined,
      };
    case ContentStage.PRONTO_PARA_GRAVAR:
      return {
        id: 'add_to_block',
        label: 'Adicionar ao bloco',
        targetTab: 'gravacao',
      };
    case ContentStage.EM_BLOCO:
      return {
        id: 'go_to_execution',
        label: 'Ir para execucao',
        targetTab: 'gravacao',
      };
    case ContentStage.GRAVADO:
    case ContentStage.PRODUCAO:
      return {
        id: 'send_to_posting',
        label: 'Enviar para postagem',
        targetTab: 'postagem',
      };
    case ContentStage.PROGRAMADO:
      return {
        id: 'save_schedule',
        label: 'Salvar agendamento',
        targetTab: 'postagem',
        disabled: !canSchedulePosting(content),
      };
    case ContentStage.POSTADO:
      return {
        id: 'none',
        label: 'Ver historico',
        targetTab: 'historico',
      };
    default:
      return {
        id: 'none',
        label: 'Ver detalhes',
        targetTab: 'roteiro',
      };
  }
}

export function getInitialTabForContext(tab: string | null): ContentDetailTab {
  if (tab === 'gravacao' || tab === 'producao' || tab === 'postagem' || tab === 'historico') {
    return tab;
  }
  return 'roteiro';
}
