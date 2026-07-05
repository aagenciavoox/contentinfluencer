import {isAfter, isBefore, startOfDay} from 'date-fns';
import type {Content, RecordingBlock} from '../../../lib/database';
import {htmlToReadableText} from '../../../lib/utils.ts';

export const CONTENT_STATUS = {
  IDEIA: 'Ideia',
  ROTEIRO: 'Roteiro',
  PRODUCAO: 'Produção',
  POSTADO: 'Postado',
} as const;

/** Display-only label for future publishDate; never persisted. */
export const DISPLAY_STATUS = {
  PROGRAMADO: 'Programado',
} as const;

export const PRODUCTION_TAGS = {
  GRAVAR: 'gravar',
  EDITAR: 'editar',
} as const;

const LEGACY_STATUS_TO_CANONICAL: Record<string, string> = {
  'Pronto para Gravar': CONTENT_STATUS.PRODUCAO,
  Gravado: CONTENT_STATUS.PRODUCAO,
  'A Editar': CONTENT_STATUS.PRODUCAO,
  Editado: CONTENT_STATUS.PRODUCAO,
  Programado: CONTENT_STATUS.PRODUCAO,
};

export function normalizeContentStatus(status: string): string {
  return LEGACY_STATUS_TO_CANONICAL[status] ?? status;
}

export const STATUS_ORDER = [
  CONTENT_STATUS.IDEIA,
  CONTENT_STATUS.ROTEIRO,
  CONTENT_STATUS.PRODUCAO,
  CONTENT_STATUS.POSTADO,
] as const;

export const ContentStage = {
  IDEIA: 'IDEIA',
  ROTEIRO: 'ROTEIRO',
  PRODUCAO: 'PRODUCAO',
  EM_BLOCO: 'EM_BLOCO',
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
  const canonical = normalizeContentStatus(current);
  const order = STATUS_ORDER as readonly string[];
  const idx = order.indexOf(canonical);
  if (idx === -1) return [...order];

  const allowed = new Set<string>([canonical]);
  if (idx > 0) allowed.add(order[idx - 1]);
  if (idx < order.length - 1) allowed.add(order[idx + 1]);

  if (canonical === CONTENT_STATUS.POSTADO) {
    allowed.add(CONTENT_STATUS.PRODUCAO);
  }

  return order.filter(status => allowed.has(status));
}

export const CONTENT_PIPELINE_TABS: ContentDetailTab[] = ['roteiro', 'gravacao', 'publicacao'];

export function isScheduledForDisplay(content: Pick<Content, 'publishDate' | 'status'>): boolean {
  return getDisplayStatus(content) === DISPLAY_STATUS.PROGRAMADO;
}

export function shouldShowPublishingSection(
  stage: ContentStage,
  content: Pick<Content, 'publishDate' | 'recordedAt' | 'status'>,
): boolean {
  if (stage === ContentStage.POSTADO) return true;
  if (isScheduledForDisplay(content)) return true;
  if (content.recordedAt) return true;
  return false;
}

export function getPipelineTabIndex(
  stage: ContentStage,
  content?: Pick<Content, 'publishDate' | 'status'>,
): number {
  if (content && (isScheduledForDisplay(content) || normalizeContentStatus(content.status) === CONTENT_STATUS.POSTADO)) {
    return 2;
  }
  switch (stage) {
    case ContentStage.IDEIA:
    case ContentStage.ROTEIRO:
      return 0;
    case ContentStage.PRODUCAO:
    case ContentStage.EM_BLOCO:
      return 1;
    case ContentStage.POSTADO:
      return 2;
    default:
      return 0;
  }
}

export function isTabLocked(_tab: ContentDetailTab, _content: Content, _options: StageOptions = {}): boolean {
  return false;
}

export function getVisibleTabsForContent(content: Content, options: StageOptions = {}): ContentDetailTab[] {
  const stage = getContentStage(content, options);
  if (shouldShowPublishingSection(stage, content)) {
    return ['roteiro', 'gravacao', 'publicacao'];
  }
  if (stage === ContentStage.PRODUCAO || stage === ContentStage.EM_BLOCO) {
    return ['roteiro', 'gravacao'];
  }
  return ['roteiro'];
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
    return Boolean(content?.recordedAt);
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

export function getContentStage(content: Content, options: StageOptions = {}): ContentStage {
  const status = normalizeContentStatus(content.status);

  if (status === CONTENT_STATUS.IDEIA) return ContentStage.IDEIA;
  if (status === CONTENT_STATUS.ROTEIRO) return ContentStage.ROTEIRO;
  if (status === CONTENT_STATUS.PRODUCAO) {
    return isContentInBlock(content.id, options.block) ? ContentStage.EM_BLOCO : ContentStage.PRODUCAO;
  }
  if (status === CONTENT_STATUS.POSTADO) return ContentStage.POSTADO;
  return ContentStage.ROTEIRO;
}

export function canAdvanceToRecording(content: Pick<Content, 'title' | 'script'>) {
  return content.title.trim().length > 0 && htmlToReadableText(content.script).trim().length > 0;
}

export function canSchedulePosting(content: Pick<Content, 'publishDate' | 'plataformas'>) {
  return Boolean(content.publishDate || content.plataformas.length > 0);
}

export function getDisplayStatus(
  content: Pick<Content, 'publishDate' | 'status'>
): string {
  const status = normalizeContentStatus(content.status);

  if (!content.publishDate) return status;

  const publishDay = startOfDay(new Date(content.publishDate));
  const today = startOfDay(new Date());

  if (isAfter(publishDay, today) && status !== CONTENT_STATUS.POSTADO) {
    return DISPLAY_STATUS.PROGRAMADO;
  }

  return status;
}

/** @deprecated Use getDisplayStatus — never persist its return value. */
export function getPostingAutomationStatus(
  content: Pick<Content, 'publishDate' | 'status'>
): Content['status'] {
  return getDisplayStatus(content) as Content['status'];
}

export function getPostingAlerts(content: Pick<Content, 'publishDate' | 'status'>) {
  if (!content.publishDate) return [] as PostingAlert[];

  const publishDay = startOfDay(new Date(content.publishDate));
  const today = startOfDay(new Date());

  if (isAfter(publishDay, today) && normalizeContentStatus(content.status) !== CONTENT_STATUS.POSTADO) {
    return [
      {
        id: 'scheduled',
        tone: 'info',
        message: 'Data futura guardada. No calendario, este conteudo aparece como Programado.',
      },
    ] satisfies PostingAlert[];
  }

  if (isBefore(publishDay, today) && normalizeContentStatus(content.status) !== CONTENT_STATUS.POSTADO) {
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

export function applyStatusMilestones(
  content: Pick<Content, 'recordedAt' | 'postedAt' | 'status'>,
  nextStatus: string,
  options?: {markRecorded?: boolean},
): Partial<Pick<Content, 'recordedAt' | 'postedAt'>> {
  const milestones: Partial<Pick<Content, 'recordedAt' | 'postedAt'>> = {};
  const now = new Date().toISOString();
  const canonical = normalizeContentStatus(nextStatus);

  if (options?.markRecorded && !content.recordedAt) {
    milestones.recordedAt = now;
  }
  if (canonical === CONTENT_STATUS.POSTADO && !content.postedAt) {
    milestones.postedAt = now;
  }

  return milestones;
}

export function withProductionTag(tags: string[], tag: string): string[] {
  const normalized = tag.trim().toLowerCase();
  if (!normalized || tags.some(existing => existing.toLowerCase() === normalized)) {
    return tags;
  }
  return [...tags, tag];
}

export function getPrimaryAction(content: Content, options: StageOptions = {}): ContentPrimaryAction {
  const stage = getContentStage(content, options);
  const scheduled = isScheduledForDisplay(content);

  switch (stage) {
    case ContentStage.IDEIA:
    case ContentStage.ROTEIRO:
      return {
        id: 'advance_to_recording',
        label: 'Deixar disponível para gravação',
        targetTab: 'gravacao',
        disabled: !canAdvanceToRecording(content),
        reason: !canAdvanceToRecording(content) ? 'Guarde um titulo e um roteiro para liberar essa opcao.' : undefined,
      };
    case ContentStage.PRODUCAO:
      if (scheduled) {
        return {
          id: 'save_schedule',
          label: 'Guardar agendamento',
          targetTab: 'publicacao',
          disabled: !canSchedulePosting(content),
        };
      }
      if (content.recordedAt) {
        return {
          id: 'send_to_posting',
          label: 'Preparar publicacao com calma',
          targetTab: 'publicacao',
        };
      }
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
    case ContentStage.POSTADO:
      return {
        id: 'none',
        label: 'Conteudo publicado',
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
