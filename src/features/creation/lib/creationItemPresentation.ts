import type { Content } from '../../../lib/database.ts';
import { dia } from '../../../lib/dates.ts';
import { htmlToReadableText } from '../../../lib/utils.ts';
import type { ContaRef } from '../../contas/lib/contas.ts';
import {
  CONTENT_STATUS,
  DISPLAY_STATUS,
  getDisplayStatus,
  normalizeContentStatus,
  PRODUCTION_TAGS,
} from '../../contents/lib/contentPipeline.ts';
import { transitionCreationStatus, type CreationTab } from '../../contents/lib/creationContent.ts';
import { estaEditado, tipoDaPeca } from '../../contents/lib/esteiraDisplay.ts';
import { getVisualFormatLabel } from '../../../constants.ts';
import { contentReadableBody } from '../../contents/lib/carouselSlides.ts';

export const CREATION_KANBAN_TABS = [
  'Ideias',
  'Roteiros',
  'Produção',
  'Edição',
  'Publicados',
] as const;

export type CreationKanbanTab = (typeof CREATION_KANBAN_TABS)[number];

export const CREATION_VIEW_STORAGE_KEY = 'creation.viewMode';

const TAB_TO_STATUS: Record<CreationKanbanTab, string> = {
  Ideias: CONTENT_STATUS.IDEIA,
  Roteiros: CONTENT_STATUS.ROTEIRO,
  Produção: CONTENT_STATUS.PRODUCAO,
  Edição: CONTENT_STATUS.EDICAO,
  Publicados: CONTENT_STATUS.POSTADO,
};

export function isIdeaContent(content: Pick<Content, 'status'>) {
  return normalizeContentStatus(content.status) === CONTENT_STATUS.IDEIA;
}

export type CreationCardStageKind =
  | 'idea'
  | 'script'
  | 'production'
  | 'editing'
  | 'scheduled'
  | 'posted'
  | 'archived'
  | 'trash';

export interface CreationCardCompletionBadge {
  kind: 'edited' | 'design';
  label: string;
}

export interface CreationCardPresentation {
  stageKind: CreationCardStageKind;
  stageLabel: string;
  completionBadge: CreationCardCompletionBadge | null;
  isTrash: boolean;
  isIdea: boolean;
}

/**
 * Resolve o estado visual canônico do card da Tela Criação (Ideia, Roteiro,
 * Edição concluída, Carrossel/Design pronto, Lixeira e demais etapas).
 */
export function getCreationCardPresentation(
  content: Content,
  contas: readonly ContaRef[] = [],
): CreationCardPresentation {
  if (content.deletedAt) {
    return {
      stageKind: 'trash',
      stageLabel: 'Na lixeira',
      completionBadge: null,
      isTrash: true,
      isIdea: false,
    };
  }

  const isIdea = isIdeaContent(content);
  const edited = !content.archivedAt && estaEditado(content, contas);
  const tipo = tipoDaPeca(content, contas);
  const completionBadge: CreationCardCompletionBadge | null = edited
    ? tipo === 'carrossel'
      ? { kind: 'design', label: '✓ Design pronto' }
      : { kind: 'edited', label: '✓ Editado' }
    : null;

  if (content.archivedAt) {
    return {
      stageKind: 'archived',
      stageLabel: 'Arquivado',
      completionBadge: null,
      isTrash: false,
      isIdea,
    };
  }

  const display = getDisplayStatus({ ...content, publishDate: content.publishDate ?? null });
  if (display === CONTENT_STATUS.POSTADO || Boolean(content.postedAt)) {
    return {
      stageKind: 'posted',
      stageLabel: 'Publicado',
      completionBadge: null,
      isTrash: false,
      isIdea: false,
    };
  }
  if (display === DISPLAY_STATUS.PROGRAMADO) {
    return {
      stageKind: 'scheduled',
      stageLabel: 'Programado',
      completionBadge: null,
      isTrash: false,
      isIdea: false,
    };
  }

  const status = normalizeContentStatus(content.status);
  if (status === CONTENT_STATUS.IDEIA) {
    return {
      stageKind: 'idea',
      stageLabel: 'Ideia',
      completionBadge: null,
      isTrash: false,
      isIdea: true,
    };
  }
  if (status === CONTENT_STATUS.PRODUCAO) {
    return {
      stageKind: 'production',
      stageLabel: tipo === 'carrossel' ? 'Design' : 'Produção',
      completionBadge,
      isTrash: false,
      isIdea: false,
    };
  }
  if (status === CONTENT_STATUS.EDICAO) {
    return {
      stageKind: 'editing',
      stageLabel: 'Edição',
      completionBadge,
      isTrash: false,
      isIdea: false,
    };
  }

  return {
    stageKind: 'script',
    stageLabel: 'Roteiro',
    completionBadge,
    isTrash: false,
    isIdea: false,
  };
}

/** Rótulo de tempo real na lixeira, baseado em `deletedAt`. */
export function getCreationTrashAgeLabel(
  deletedAt: string | null | undefined,
  now: Date = new Date(),
): string | null {
  if (!deletedAt) return null;
  const date = new Date(deletedAt);
  if (Number.isNaN(date.getTime())) return null;
  const diff = localDayDiff(date, now);
  if (diff <= 0) return 'Movido hoje';
  if (diff === 1) return 'Movido ontem';
  if (diff < 30) return `Há ${diff} dias`;
  return formatCreationCardDate(date, now);
}

export function getCreationTitle(content: Content) {
  return content.title.trim() || 'Sem título';
}

export function getCreationFormatLabel(content: Content) {
  const value = content.formatoVisual?.trim();
  return value ? getVisualFormatLabel(value) : null;
}

const TECHNICAL_TIME_MARK =
  /\[\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:--|[-–—])\s*\d{1,2}:\d{2}(?::\d{2})?)?\]/g;
const TECHNICAL_TAGS = new Set<string>([
  PRODUCTION_TAGS.GRAVAR,
  PRODUCTION_TAGS.EDITAR,
]);

function decodeCommonEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&gt;/gi, '>')
    .replace(/&lt;/gi, '<')
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&amp;/gi, '&');
}

/** Turns editor or transcript content into a concise, presentation-safe preview. */
export function sanitizeCreationPreviewText(value: string | null | undefined) {
  return decodeCommonEntities(htmlToReadableText(value))
    .replace(TECHNICAL_TIME_MARK, ' ')
    .replace(/\[\d+(?:\s*,\s*\d+)*\]/g, ' ')
    .replace(/(^|\s)>\s*/g, '$1')
    .replace(/\[(?:cena|take|bloco|pausa|corte)[^\]]*\]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getCreationNoteExcerpt(content: Content) {
  return (
    sanitizeCreationPreviewText(content.notes)
    // No carrossel, a prévia vem das telas (texto simples).
    || sanitizeCreationPreviewText(contentReadableBody(content))
    || null
  );
}

const DAY_MS = 86_400_000;

function formatCreationCardDate(date: Date, now: Date) {
  return dia(date, now);
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function localDayDiff(from: Date, to: Date) {
  return Math.round((startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime()) / DAY_MS);
}

/** Lê "2026-10-12" ou "2026-10-12T12:00:00.000Z" como o dia do calendário, no fuso local. */
function parseCalendarDay(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : startOfLocalDay(date);
}

function nextUpcomingDay(values: Array<string | null | undefined>, today: Date) {
  let next: Date | null = null;
  for (const value of values) {
    const day = parseCalendarDay(value);
    if (!day || day.getTime() < today.getTime()) continue;
    if (!next || day.getTime() < next.getTime()) next = day;
  }
  return next;
}

function formatUpcomingDay(day: Date, today: Date) {
  const diff = localDayDiff(today, day);
  if (diff === 0) return 'hoje';
  if (diff === 1) return 'amanhã';
  return formatCreationCardDate(day, today);
}

/**
 * Mesmas regras de `formatLastEdit` (contentCardMeta.ts), com `now` injetável.
 * Aquele módulo não carrega no runner de testes (imports sem extensão).
 */
function formatCreationLastEdit(iso: string, now: Date) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const diff = localDayDiff(date, now);
  if (diff <= 0) return 'hoje';
  if (diff === 1) return 'ontem';
  if (diff < 7) return `há ${diff} dias`;
  return formatCreationCardDate(date, now);
}

type CreationCardDateFields = Pick<
  Content,
  | 'publishDate'
  | 'publishDateEnabled'
  | 'recordingDate'
  | 'recordingDateEnabled'
  | 'recordedAt'
  | 'postedAt'
  | 'plataformas'
  | 'createdAt'
  | 'updatedAt'
>;

/**
 * Data mais útil para o rodapé do card: próxima publicação, senão próxima
 * gravação, senão criação e última edição.
 */
export function getCreationCardDateMeta(content: CreationCardDateFields, now: Date = new Date()) {
  const today = startOfLocalDay(now);
  const alreadyPosted = Boolean(content.postedAt);
  const publishCandidates = [
    alreadyPosted || content.publishDateEnabled === false ? null : content.publishDate,
    ...(content.plataformas ?? []).map(plataforma => {
      if (plataforma.publishDateEnabled === false) return null;
      if (alreadyPosted && plataforma.publicationKind !== 'repost') return null;
      return plataforma.publishDate;
    }),
  ];
  const nextPublish = nextUpcomingDay(publishCandidates, today);
  if (nextPublish) return `Publica ${formatUpcomingDay(nextPublish, today)}`;

  if (!content.recordedAt && content.recordingDateEnabled !== false) {
    const nextRecording = nextUpcomingDay([content.recordingDate], today);
    if (nextRecording) return `Grava ${formatUpcomingDay(nextRecording, today)}`;
  }

  const created = formatCreationLastEdit(content.createdAt, now);
  const edited = formatCreationLastEdit(content.updatedAt, now);
  // Só a data mais recente: "Criado X · Editado Y" em todo cartão vira ruído.
  if (edited && edited !== created) return `Editado ${edited}`;
  return created ? `Criado ${created}` : null;
}

export function getCreationCardFooterMeta(content: Content, now: Date = new Date()) {
  return [getCreationFormatLabel(content), getCreationCardDateMeta(content, now)]
    .filter(Boolean)
    .join(' / ');
}

/** User-facing tags. Pilar e série aparecem à parte, na identificação do card. */
export function getCreationCardTags(
  content: Pick<Content, 'tags'>,
) {
  const labels = content.tags.filter(tag => !TECHNICAL_TAGS.has(tag.trim().toLowerCase()));
  const seen = new Set<string>();

  return labels.flatMap(label => {
    const normalized = label?.trim().replace(/^#+/, '');
    if (!normalized) return [];
    const key = normalized.toLocaleLowerCase('pt-BR');
    if (seen.has(key)) return [];
    seen.add(key);
    return [normalized];
  });
}

/** Temas do conteúdo e tags de usuário, sem repetir e sem as tags técnicas de produção. */
export function etiquetasVisiveis(
  content: Pick<Content, 'tags' | 'temaIds'>,
  temas: readonly {id: string; nome: string}[] = [],
) {
  const porId = new Map(temas.map(tema => [tema.id, tema.nome.trim()]));
  const nomes = (content.temaIds ?? []).flatMap(id => {
    const nome = porId.get(id);
    return nome ? [nome] : [];
  });
  const seen = new Set(nomes.map(nome => nome.toLocaleLowerCase('pt-BR')));
  return [
    ...nomes,
    ...getCreationCardTags(content).filter(tag => !seen.has(tag.toLocaleLowerCase('pt-BR'))),
  ];
}

export function isCreationKanbanTab(tab: CreationTab): tab is CreationKanbanTab {
  return (CREATION_KANBAN_TABS as readonly string[]).includes(tab);
}

export function moveCreationToKanbanTab(
  content: Content,
  tab: CreationKanbanTab,
  now = new Date().toISOString(),
): Content {
  return transitionCreationStatus(content, TAB_TO_STATUS[tab], now);
}

export function creationTabForContent(content: Content): CreationKanbanTab | null {
  if (content.deletedAt || content.archivedAt) return null;
  const status = normalizeContentStatus(content.status);
  const posted = status === CONTENT_STATUS.POSTADO || Boolean(content.postedAt);
  if (posted) return 'Publicados';
  if (status === CONTENT_STATUS.IDEIA) return 'Ideias';
  if (status === CONTENT_STATUS.ROTEIRO) return 'Roteiros';
  if (status === CONTENT_STATUS.PRODUCAO) return 'Produção';
  if (status === CONTENT_STATUS.EDICAO) return 'Edição';
  return null;
}

export function readStoredCreationViewMode(): 'grid' | 'list' | 'kanban' | null {
  try {
    const value = localStorage.getItem(CREATION_VIEW_STORAGE_KEY);
    if (value === 'list' || value === 'kanban' || value === 'grid') return value;
  } catch {
    // ignore storage failures
  }
  return null;
}

export function storeCreationViewMode(mode: 'grid' | 'list' | 'kanban') {
  try {
    localStorage.setItem(CREATION_VIEW_STORAGE_KEY, mode);
  } catch {
    // ignore storage failures
  }
}
