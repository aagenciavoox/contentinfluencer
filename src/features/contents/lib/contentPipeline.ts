import {isAfter, isBefore, startOfDay} from 'date-fns';
import type {Content, RecordingBlock} from '../../../lib/database';
import {contentReadableBody, isCarouselContent} from './carouselSlides.ts';

export const CONTENT_STATUS = {
  IDEIA: 'Ideia',
  ROTEIRO: 'Roteiro',
  PRODUCAO: 'Produção',
  EDICAO: 'Edição',
  /** A chave ficou com o nome antigo; o valor gravado passou a ser "Publicado". */
  POSTADO: 'Publicado',
} as const;

/** Display-only label for future publishDate; never persisted. */
export const DISPLAY_STATUS = {
  PROGRAMADO: 'Programado',
} as const;

/** Detalhe de Edição: a edição foi concluída ou dispensada. Não é etapa nem coluna. */
export const EDICAO_PRONTA_LABEL = 'Pronto para publicar';

export const PRODUCTION_TAGS = {
  GRAVAR: 'gravar',
  EDITAR: 'editar',
} as const;

const LEGACY_STATUS_TO_CANONICAL: Record<string, string> = {
  'Pronto para Gravar': CONTENT_STATUS.PRODUCAO,
  Gravado: CONTENT_STATUS.EDICAO,
  'A Editar': CONTENT_STATUS.EDICAO,
  Editado: CONTENT_STATUS.EDICAO,
  Programado: CONTENT_STATUS.EDICAO,
  Postado: CONTENT_STATUS.POSTADO,
};

export function normalizeContentStatus(status: string): string {
  return LEGACY_STATUS_TO_CANONICAL[status] ?? status;
}

export const STATUS_ORDER = [
  CONTENT_STATUS.IDEIA,
  CONTENT_STATUS.ROTEIRO,
  CONTENT_STATUS.PRODUCAO,
  CONTENT_STATUS.EDICAO,
  CONTENT_STATUS.POSTADO,
] as const;

/** Posição da etapa no fluxo. Status desconhecido fica antes de todas (-1). */
export function statusRank(status: string): number {
  return (STATUS_ORDER as readonly string[]).indexOf(normalizeContentStatus(status));
}

export const ContentStage = {
  IDEIA: 'IDEIA',
  ROTEIRO: 'ROTEIRO',
  PRODUCAO: 'PRODUCAO',
  /** @deprecated Bloco virou selo; getContentStage não devolve mais isto. */
  EM_BLOCO: 'EM_BLOCO',
  EDICAO: 'EDICAO',
  POSTADO: 'POSTADO',
} as const;

export type ContentStage = typeof ContentStage[keyof typeof ContentStage];

export type ContentDetailTab = 'roteiro' | 'gravacao' | 'publicacao';

export type ContentPrimaryActionId =
  | 'promote_to_script'
  | 'advance_to_recording'
  | 'add_to_block'
  | 'go_to_execution'
  | 'mark_recorded'
  | 'send_to_edit'
  | 'finish_edit'
  | 'skip_edit'
  | 'reopen_edit'
  | 'send_to_posting'
  | 'save_schedule'
  | 'none';

export interface ContentPrimaryAction {
  id: ContentPrimaryActionId;
  label: string;
  targetTab: ContentDetailTab;
  disabled?: boolean;
  reason?: string;
  /** Ação ao lado da principal, como "Dispensar edição". */
  secondary?: {id: ContentPrimaryActionId; label: string};
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

/** Dá para pular ou voltar etapas: todas ficam disponíveis, em qualquer tela. */
export function getAllowedStatuses(_current: string): string[] {
  return [...STATUS_ORDER];
}

export type OpcaoDeEtapa = {
  status: string;
  atual: boolean;
  /** Falso quando a transição não é permitida a partir da etapa atual. */
  disponivel: boolean;
  /** Por que não dá para escolher agora. Vazio quando disponível. */
  motivo: string | null;
};

/** Todas as etapas, na ordem do processo, com a atual marcada. */
export function getStatusOptions(current: string): OpcaoDeEtapa[] {
  const canonical = normalizeContentStatus(current);
  const allowed = new Set(getAllowedStatuses(current));
  return STATUS_ORDER.map(status => ({
    status,
    atual: status === canonical,
    disponivel: allowed.has(status),
    motivo: null,
  }));
}

type EdicaoFields = Pick<Content, 'status' | 'edicaoConcluidaEm' | 'edicaoDispensada'>;

/**
 * Mudanças da Edição. Enviar e reabrir deixam o material em edição;
 * concluir e dispensar deixam em Edição · Pronto para publicar.
 */
export function edicaoPatch(
  acao: 'enviar' | 'concluir' | 'dispensar' | 'reabrir',
  now = new Date().toISOString(),
): EdicaoFields {
  if (acao === 'concluir') {
    return {status: CONTENT_STATUS.EDICAO, edicaoConcluidaEm: now, edicaoDispensada: false};
  }
  if (acao === 'dispensar') {
    return {status: CONTENT_STATUS.EDICAO, edicaoConcluidaEm: now, edicaoDispensada: true};
  }
  return {status: CONTENT_STATUS.EDICAO, edicaoConcluidaEm: null, edicaoDispensada: false};
}

/** Gravado leva o vídeo para Edição. Quem já está em Edição ou Publicado não volta. */
export function recordedPatch(
  content: Pick<Content, 'status' | 'recordedAt'>,
  now = new Date().toISOString(),
): Partial<Content> {
  const advances = statusRank(content.status) < statusRank(CONTENT_STATUS.EDICAO);
  return {
    recordedAt: content.recordedAt ?? now,
    ...(advances ? edicaoPatch('enviar', now) : {}),
  };
}

export function isReadyToPublish(
  content: Pick<Content, 'status' | 'edicaoConcluidaEm'>,
): boolean {
  return normalizeContentStatus(content.status) === CONTENT_STATUS.EDICAO && Boolean(content.edicaoConcluidaEm);
}

/** Detalhe que acompanha a etapa, como "Pronto para publicar". */
export function getStatusDetail(
  content: Pick<Content, 'status' | 'edicaoConcluidaEm'>,
): string | null {
  return isReadyToPublish(content) ? EDICAO_PRONTA_LABEL : null;
}

export const CONTENT_PIPELINE_TABS: ContentDetailTab[] = ['roteiro', 'gravacao', 'publicacao'];

export function isScheduledForDisplay(content: Pick<Content, 'publishDate' | 'status'>): boolean {
  return getDisplayStatus(content) === DISPLAY_STATUS.PROGRAMADO;
}

export function shouldShowPublishingSection(
  stage: ContentStage,
  content: Pick<Content, 'publishDate' | 'recordedAt' | 'status'>,
): boolean {
  // Aba Publicação abre desde Roteiro para preparar legenda, capa, contas e datas.
  if (stage === ContentStage.IDEIA) return false;
  if (stage === ContentStage.POSTADO || stage === ContentStage.EDICAO || stage === ContentStage.ROTEIRO) {
    return true;
  }
  if (stage === ContentStage.PRODUCAO || stage === ContentStage.EM_BLOCO) return true;
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
    case ContentStage.EDICAO:
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
  // Carrossel não passa pela gravação: da escrita vai direto para a publicação.
  if (isCarouselContent(content)) {
    if (stage === ContentStage.IDEIA) return ['roteiro'];
    return shouldShowPublishingSection(stage, content)
      ? ['roteiro', 'publicacao']
      : ['roteiro'];
  }
  if (shouldShowPublishingSection(stage, content)) {
    return stage === ContentStage.ROTEIRO
      ? ['roteiro', 'publicacao']
      : ['roteiro', 'gravacao', 'publicacao'];
  }
  if (stage === ContentStage.PRODUCAO) {
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

export function getContentStage(content: Content, _options: StageOptions = {}): ContentStage {
  const status = normalizeContentStatus(content.status);

  if (status === CONTENT_STATUS.POSTADO || content.postedAt) return ContentStage.POSTADO;
  if (status === CONTENT_STATUS.IDEIA) return ContentStage.IDEIA;
  if (status === CONTENT_STATUS.ROTEIRO) return ContentStage.ROTEIRO;
  if (status === CONTENT_STATUS.PRODUCAO) return ContentStage.PRODUCAO;
  if (status === CONTENT_STATUS.EDICAO) return ContentStage.EDICAO;
  return ContentStage.ROTEIRO;
}

/** Selo do bloco de gravação: "No bloco de 12/11". Null se não está em nenhum. */
export function seloDoBloco(
  contentId: string,
  blocks: RecordingBlock[],
): string | null {
  const block = blocks.find(candidate => candidate.contents.some(item => item.contentId === contentId));
  if (!block) return null;
  const nome = block.name?.trim();
  return nome ? `No bloco de ${nome}` : 'No bloco de gravação';
}

export function canAdvanceToRecording(
  content: Pick<Content, 'title' | 'script'> & Partial<Pick<Content, 'writingMode' | 'carouselSlides'>>,
) {
  return content.title.trim().length > 0 && contentReadableBody(content).length > 0;
}

export function canSchedulePosting(content: Pick<Content, 'publishDate' | 'plataformas'>) {
  return Boolean(content.publishDate || content.plataformas.length > 0);
}

export function getDisplayStatus(
  content: Pick<Content, 'publishDate' | 'status' | 'postedAt' | 'edicaoConcluidaEm'> & Partial<Pick<Content, 'plataformas'>>,
): string {
  const status = normalizeContentStatus(content.status);

  if (status === CONTENT_STATUS.POSTADO || content.postedAt) {
    return CONTENT_STATUS.POSTADO;
  }

  // Programado deixa de vir da data futura: só conta programada + material pronto.
  const temProgramada = (content.plataformas ?? []).some(item => item.status === 'programada');
  if (temProgramada && isReadyToPublish(content)) {
    return DISPLAY_STATUS.PROGRAMADO;
  }

  return status;
}

/** Etapa como aparece no selo, com o detalhe quando houver: "Edição · Pronto para publicar". */
export function getDisplayStatusLabel(
  content: Pick<Content, 'publishDate' | 'status' | 'postedAt' | 'edicaoConcluidaEm'>,
): string {
  const display = getDisplayStatus(content);
  const detail = display === CONTENT_STATUS.EDICAO ? getStatusDetail(content) : null;
  return detail ? `${display} · ${detail}` : display;
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
        message: 'Data prevista guardada. Vira Programado quando a conta for agendada e o material estiver pronto.',
      },
    ] satisfies PostingAlert[];
  }

  if (isBefore(publishDay, today) && normalizeContentStatus(content.status) !== CONTENT_STATUS.POSTADO) {
    return [
      {
        id: 'overdue',
        tone: 'warning',
        message: 'Essa data já ficou para trás. Reagende, registre a publicação ou retire a previsão.',
      },
    ] satisfies PostingAlert[];
  }

  return [] as PostingAlert[];
}

/**
 * O que muda ao sair de Publicado. Usado no confirmação "Desfazer publicação".
 * Não apaga publicações por conta aqui — Fase 3 escolhe a conta afetada.
 */
export function effectsOfLeavingPublished(
  content: Pick<Content, 'postedAt' | 'publishDate'>,
): string[] {
  const effects: string[] = [];
  if (content.postedAt) {
    effects.push('A data de publicação registrada neste conteúdo será apagada.');
  }
  if (content.publishDate) {
    effects.push('A data prevista continua guardada; o conteúdo deixa de aparecer como Publicado.');
  }
  if (effects.length === 0) {
    effects.push('O conteúdo deixa a etapa Publicado.');
  }
  return effects;
}

export type StatusChangePlan =
  | { type: 'apply'; status: string }
  | { type: 'publish_form' }
  | { type: 'unpublish_confirm'; status: string; effects: string[] };

/**
 * Destino validado na regra única: Publicado abre o formulário;
 * sair de Publicado pede confirmação; demais etapas aplicam direto.
 */
export function planStatusChange(
  content: Pick<Content, 'status' | 'postedAt' | 'publishDate'>,
  nextStatus: string,
): StatusChangePlan {
  const from = normalizeContentStatus(content.status);
  const to = normalizeContentStatus(nextStatus);
  if (from === to) return { type: 'apply', status: to };
  if (to === CONTENT_STATUS.POSTADO) return { type: 'publish_form' };
  if (from === CONTENT_STATUS.POSTADO || Boolean(content.postedAt)) {
    return {
      type: 'unpublish_confirm',
      status: to,
      effects: effectsOfLeavingPublished(content),
    };
  }
  return { type: 'apply', status: to };
}

export function applyStatusMilestones(
  content: Pick<Content, 'recordedAt' | 'postedAt' | 'status'>,
  nextStatus: string,
  options?: {markRecorded?: boolean; confirmPublish?: boolean; now?: string},
): Partial<Pick<Content, 'recordedAt' | 'postedAt'>> {
  const milestones: Partial<Pick<Content, 'recordedAt' | 'postedAt'>> = {};
  const now = options?.now ?? new Date().toISOString();
  const canonical = normalizeContentStatus(nextStatus);

  // Só "Marcar como gravado/produzido" registra gravação — pular para Edição não inventa.
  if (options?.markRecorded && !content.recordedAt) {
    milestones.recordedAt = now;
  }
  // Publicado só grava postedAt pelo formulário (confirmPublish) ou markPublished.
  if (canonical === CONTENT_STATUS.POSTADO && !content.postedAt && options?.confirmPublish) {
    milestones.postedAt = now;
  }
  if (canonical !== CONTENT_STATUS.POSTADO && content.postedAt) {
    milestones.postedAt = null;
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
  const inBlock = isContentInBlock(content.id, options.block);

  switch (stage) {
    case ContentStage.IDEIA:
      return {
        id: 'promote_to_script',
        label: 'Transformar em roteiro',
        targetTab: 'roteiro',
      };
    case ContentStage.ROTEIRO:
      if (isCarouselContent(content)) {
        return {
          id: 'advance_to_recording',
          label: 'Avançar para produção',
          targetTab: 'publicacao',
          disabled: !canAdvanceToRecording(content),
          reason: !canAdvanceToRecording(content)
            ? 'Adicione um título e escreva as telas para continuar.'
            : undefined,
        };
      }
      return {
        id: 'advance_to_recording',
        label: 'Avançar para gravação',
        targetTab: 'gravacao',
        disabled: !canAdvanceToRecording(content),
        reason: !canAdvanceToRecording(content)
          ? 'Adicione um título e escreva o roteiro para continuar.'
          : undefined,
      };
    case ContentStage.PRODUCAO:
      if (isCarouselContent(content) && !content.recordedAt) {
        return {
          id: 'mark_recorded',
          label: 'Marcar como produzido',
          targetTab: 'publicacao',
        };
      }
      // Carrossel pronto, ou vídeo que voltou depois de gravado, segue para a edição.
      if (content.recordedAt || isCarouselContent(content)) {
        return {
          id: 'send_to_edit',
          label: 'Enviar para edição',
          targetTab: isCarouselContent(content) ? 'publicacao' : 'gravacao',
          secondary: {id: 'skip_edit', label: 'Dispensar edição'},
        };
      }
      if (inBlock) {
        return {
          id: 'go_to_execution',
          label: 'Abrir bloco de gravação',
          targetTab: 'gravacao',
        };
      }
      return {
        id: 'add_to_block',
        label: 'Adicionar ao bloco',
        targetTab: 'gravacao',
      };
    case ContentStage.EM_BLOCO:
      return {
        id: 'go_to_execution',
        label: 'Abrir bloco de gravação',
        targetTab: 'gravacao',
      };
    case ContentStage.EDICAO:
      if (!isReadyToPublish(content)) {
        return {
          id: 'finish_edit',
          label: 'Concluir edição',
          targetTab: 'publicacao',
          secondary: {id: 'skip_edit', label: 'Dispensar edição'},
        };
      }
      if (scheduled) {
        return {
          id: 'save_schedule',
          label: 'Salvar agendamento',
          targetTab: 'publicacao',
          disabled: !canSchedulePosting(content),
          secondary: {id: 'reopen_edit', label: 'Reabrir edição'},
        };
      }
      return {
        id: 'send_to_posting',
        label: 'Preparar publicação com calma',
        targetTab: 'publicacao',
        secondary: {id: 'reopen_edit', label: 'Reabrir edição'},
      };
    case ContentStage.POSTADO:
      return {
        id: 'none',
        label: 'Roteiro publicado',
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
