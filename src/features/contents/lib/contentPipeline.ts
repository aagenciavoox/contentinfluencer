import {isAfter, isBefore, startOfDay} from 'date-fns';
import type {Content, RecordingBlock} from '../../../lib/database';
import {htmlToReadableText} from '../../../lib/utils.ts';

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

export const STATUS_ORDER = [
  CONTENT_STATUS.IDEIA,
  CONTENT_STATUS.ROTEIRO,
  CONTENT_STATUS.PRONTO_PARA_GRAVAR,
  CONTENT_STATUS.GRAVADO,
  CONTENT_STATUS.A_EDITAR,
  CONTENT_STATUS.EDITADO,
  CONTENT_STATUS.PROGRAMADO,
  CONTENT_STATUS.POSTADO,
] as const;

export const ContentStage = {
  IDEIA: 'IDEIA',
  ROTEIRO: 'ROTEIRO',
  PRONTO_PARA_GRAVAR: 'PRONTO_PARA_GRAVAR',
  EM_BLOCO: 'EM_BLOCO',
  GRAVADO: 'GRAVADO',
  PRODUCAO: 'PRODUCAO',
  PROGRAMADO: 'PROGRAMADO',
  POSTADO: 'POSTADO',
} as const;

export type ContentStage = typeof ContentStage[keyof typeof ContentStage];

export type ContentDetailTab = 'roteiro' | 'gravacao' | 'publicacao';

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

export type StageOptions = {
  block?: RecordingBlock | null;
};

export function normalizeContentDetailTab(tab: string | null): ContentDetailTab {
  if (tab === 'gravacao') return 'gravacao';
  if (tab === 'publicacao' || tab === 'fluxo' || tab === 'publicar' || tab === 'producao' || tab === 'postagem') return 'publicacao';
  return 'roteiro';
}

export function getInitialTabForContext(tab: string | null): ContentDetailTab {
  return normalizeContentDetailTab(tab);
}

export function getAllowedStatuses(current: string): string[] {
  const order = STATUS_ORDER as readonly string[];
  const idx = order.indexOf(current);
  if (idx === -1) return [...order];

  const allowed = new Set<string>([current]);
  if (idx > 0) allowed.add(order[idx - 1]);
  if (idx < order.length - 1) allowed.add(order[idx + 1]);
  if (idx >= 3) allowed.add(CONTENT_STATUS.POSTADO);

  if (current === CONTENT_STATUS.POSTADO) {
    allowed.add(CONTENT_STATUS.PROGRAMADO);
    allowed.add(CONTENT_STATUS.EDITADO);
  }

  return order.filter(status => allowed.has(status));
}

export const CONTENT_PIPELINE_TABS: ContentDetailTab[] = ['roteiro', 'gravacao', 'publicacao'];

const POSTING_UNLOCKED_STAGES = new Set<ContentStage>([
  ContentStage.GRAVADO,
  ContentStage.PRODUCAO,
  ContentStage.PROGRAMADO,
  ContentStage.POSTADO,
]);

export function shouldShowPublishingSection(stage: ContentStage): boolean {
  return POSTING_UNLOCKED_STAGES.has(stage);
}

export function getPipelineTabIndex(stage: ContentStage): number {
  switch (stage) {
    case ContentStage.IDEIA:
    case ContentStage.ROTEIRO:
      return 0;
    case ContentStage.PRONTO_PARA_GRAVAR:
    case ContentStage.EM_BLOCO:
      return 1;
    case ContentStage.GRAVADO:
    case ContentStage.PRODUCAO:
    case ContentStage.PROGRAMADO:
    case ContentStage.POSTADO:
      return 2;
    default:
      return 0;
  }
}

export function isTabLocked(tab: ContentDetailTab, content: Content, options: StageOptions = {}): boolean {
  if (tab !== 'publicacao') return false;
  return !POSTING_UNLOCKED_STAGES.has(getContentStage(content, options));
}

export function getVisibleTabsForContent(content: Content, options: StageOptions = {}): ContentDetailTab[] {
  const tabs: ContentDetailTab[] = ['roteiro', 'gravacao'];
  const stage = getContentStage(content, options);
  if (POSTING_UNLOCKED_STAGES.has(stage)) {
    tabs.push('publicacao');
  }
  return tabs;
}

export function isContentInBlock(contentId: string, block?: RecordingBlock | null) {
  if (!block) return false;
  return block.contents.some(item => item.contentId === contentId);
}

export function getContentBlockSummary(
  contentId: string,
  blocks: RecordingBlock[],
  contents: Content[] = []
) {
  const block = blocks.find(candidate => candidate.contents.some(item => item.contentId === contentId)) ?? null;
  if (!block) return null;

  const orderedContents = [...block.contents].sort((left, right) => left.ordem - right.ordem);
  const index = orderedContents.findIndex(item => item.contentId === contentId);
  const completedCount = orderedContents.filter(item => {
    if (item.gravado) return true;
    const content = contents.find(candidate => candidate.id === item.contentId);
    return Boolean(content && content.status !== CONTENT_STATUS.PRONTO_PARA_GRAVAR);
  }).length;

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
        message: 'Data futura guardada. Voce pode marcar como Programado quando quiser acompanhar essa publicacao.',
      },
    ] satisfies PostingAlert[];
  }

  if (isBefore(publishDay, today) && content.status !== CONTENT_STATUS.POSTADO) {
    return [
      {
        id: 'overdue',
        tone: 'warning',
        message: 'Essa data ja ficou para tras. O conteudo continua aqui para retomar, reagendar ou marcar como Postado.',
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
        label: 'Deixar disponivel para gravacao',
        targetTab: 'gravacao',
        disabled: !canAdvanceToRecording(content),
        reason: !canAdvanceToRecording(content) ? 'Guarde um titulo e um roteiro para liberar essa opcao.' : undefined,
      };
    case ContentStage.PRONTO_PARA_GRAVAR:
      return {
        id: 'add_to_block',
        label: 'Guardar em um bloco',
        targetTab: 'gravacao',
      };
    case ContentStage.EM_BLOCO:
      return {
        id: 'go_to_execution',
        label: 'Abrir bloco de gravacao',
        targetTab: 'gravacao',
      };
    case ContentStage.GRAVADO:
    case ContentStage.PRODUCAO:
      return {
        id: 'send_to_posting',
        label: 'Preparar publicacao com calma',
        targetTab: 'publicacao',
      };
    case ContentStage.PROGRAMADO:
      return {
        id: 'save_schedule',
        label: 'Guardar agendamento',
        targetTab: 'publicacao',
        disabled: !canSchedulePosting(content),
      };
    case ContentStage.POSTADO:
      return {
        id: 'none',
        label: 'Ver aprendizados',
        targetTab: 'publicacao',
      };
    default:
  
      return {
        id: 'none',
        label: 'Ver detalhes',
        targetTab: 'roteiro',
      };
  }
}
