import type {Content, FuncaoEditorial} from '../../../lib/database.ts';
import {generateUUID} from '../../../utils/uuid.ts';
import {CONTENT_STATUS, normalizeContentStatus} from '../../contents/lib/contentPipeline.ts';
import {createContentDraft} from '../../contents/lib/createContentDraft.ts';
import {placeContentOnDay} from '../../editorial-calendar/lib/scheduleContent.ts';
import {aplicarEscolhasHerdadas} from '../../editorial/lib/escolhasSerie.ts';
import {contaNaGradePadrao} from '../../editorial/lib/funcoes.ts';

/** Nota de planejamento. Existe antes da ideia e não é um Content. */
export interface PlanejamentoPostIt {
  id: string;
  userId: string;
  texto: string;
  /** yyyy-MM-dd. Null fica na pilha ao lado do mês. */
  date: string | null;
  /** Ideia ou roteiro puxado. Puxar não altera o conteúdo. */
  contentId: string | null;
  /** Série, pilar e função anotados antes de virar roteiro. */
  serieId?: string | null;
  pilarId?: string | null;
  objetivo?: FuncaoEditorial | null;
  createdAt: string;
  updatedAt: string;
}

export type PostItTarget = 'ideia' | 'roteiro';

export type PostItTransformResult =
  | {
      ok: true;
      mode: 'create' | 'update';
      content: Content;
      /** O mesmo post-it, agora ligado ao roteiro. Não se apaga na transformação. */
      postIt: PlanejamentoPostIt;
      openScript: boolean;
    }
  | {
      ok: false;
      reason: 'conteudo-ausente' | 'nao-vira-ideia';
    };

function nowIso(now?: string): string {
  return now ?? new Date().toISOString();
}

function dayKey(date: string | null | undefined): string | null {
  if (!date) return null;
  return date.slice(0, 10);
}

export function createEmptyPostIt(input: {
  id?: string;
  texto?: string;
  date?: string | null;
  serieId?: string | null;
  pilarId?: string | null;
  objetivo?: FuncaoEditorial | null;
  now?: string;
} = {}): PlanejamentoPostIt {
  const now = nowIso(input.now);
  return {
    id: input.id ?? generateUUID(),
    userId: '',
    texto: input.texto ?? '',
    date: dayKey(input.date),
    contentId: null,
    serieId: input.serieId ?? null,
    pilarId: input.pilarId ?? null,
    objetivo: input.objetivo ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export function canPullContent(content: Content): boolean {
  if (content.deletedAt || content.archivedAt) return false;
  const status = normalizeContentStatus(content.status);
  return status === CONTENT_STATUS.IDEIA || status === CONTENT_STATUS.ROTEIRO;
}

/**
 * Puxa uma ideia ou um roteiro para o dia (ou para a pilha).
 * O Content devolvido é o mesmo objeto: status e data de publicação não mudam.
 */
export function pullExistingContent(input: {
  postIts: readonly PlanejamentoPostIt[];
  content: Content;
  date?: string | null;
  id?: string;
  now?: string;
}): {postIts: PlanejamentoPostIt[]; content: Content; pulled: boolean} {
  if (!canPullContent(input.content)) {
    return {postIts: [...input.postIts], content: input.content, pulled: false};
  }

  const existing = input.postIts.find(postIt => postIt.contentId === input.content.id);
  if (existing) {
    return {postIts: [...input.postIts], content: input.content, pulled: false};
  }

  const now = nowIso(input.now);
  const date = dayKey(input.date);

  return {
    postIts: [
      ...input.postIts,
      {
        ...createEmptyPostIt({id: input.id, date, now}),
        contentId: input.content.id,
      },
    ],
    content: input.content,
    pulled: true,
  };
}

export function movePostIt(
  postIt: PlanejamentoPostIt,
  date: string | null,
  now?: string,
): PlanejamentoPostIt {
  return {...postIt, date: dayKey(date), updatedAt: nowIso(now)};
}

export function updatePostItText(
  postIt: PlanejamentoPostIt,
  texto: string,
  now?: string,
): PlanejamentoPostIt {
  return {...postIt, texto, updatedAt: nowIso(now)};
}

export interface PostItEdit {
  texto: string;
  date: string | null;
}

export function postItEditDraft(postIt: PlanejamentoPostIt): PostItEdit {
  return {texto: postIt.texto, date: postIt.date};
}

/** Grava o texto e o dia do post-it. O conteúdo puxado não muda. */
export function savePostItEdit(
  postIt: PlanejamentoPostIt,
  edit: PostItEdit,
  now?: string,
): PlanejamentoPostIt {
  return movePostIt(updatePostItText(postIt, edit.texto, now), edit.date, now);
}

/** Descarta o rascunho. O post-it gravado continua o mesmo. */
export function cancelPostItEdit(postIt: PlanejamentoPostIt, _edit: PostItEdit): PlanejamentoPostIt {
  return postIt;
}

/**
 * Apaga só o post-it. Puxar é um vínculo, não posse: a ideia ou o roteiro fica.
 * Transformar também deixa o conteúdo: o post-it continua ligado por contentId.
 */
export function deletePostIt(input: {
  postIts: readonly PlanejamentoPostIt[];
  contents: readonly Content[];
  id: string;
}): {postIts: PlanejamentoPostIt[]; contents: readonly Content[]} {
  return {
    postIts: input.postIts.filter(postIt => postIt.id !== input.id),
    contents: input.contents,
  };
}

export function postItTransformOptions(
  postIt: PlanejamentoPostIt,
  content: Content | null,
): {ideia: boolean; roteiro: boolean} {
  if (postIt.contentId && !content) return {ideia: false, roteiro: false};
  if (!postIt.contentId || !content) return {ideia: true, roteiro: true};
  const status = normalizeContentStatus(content.status);
  if (status === CONTENT_STATUS.IDEIA) return {ideia: true, roteiro: true};
  if (status === CONTENT_STATUS.ROTEIRO) return {ideia: false, roteiro: true};
  return {ideia: false, roteiro: false};
}

function stampDay(content: Content, date: string | null): Content {
  if (!date) return content;
  return placeContentOnDay(content, date);
}

/** Copia série, pilar e objetivo do post-it. A origem fica herdada quando o valor veio dele. */
function conteudoDoPostIt(draft: Content, postIt: PlanejamentoPostIt): Content {
  const comSerie = postIt.serieId ? {...draft, seriesId: postIt.serieId} : draft;
  const herdado = aplicarEscolhasHerdadas(comSerie, {
    pilarId: postIt.pilarId ?? null,
    funcao: postIt.objetivo ?? null,
  });
  if (herdado.contaNaGradeOrigem === 'manual') return herdado;
  return {
    ...herdado,
    contaNaGrade: contaNaGradePadrao(herdado.formatoVisual, herdado.funcao ?? null),
    contaNaGradeOrigem: 'regra',
  };
}

function ligarPostIt(postIt: PlanejamentoPostIt, contentId: string, now: string): PlanejamentoPostIt {
  return {...postIt, contentId, updatedAt: now};
}

/**
 * Só a transformação cria ou promove conteúdo.
 * A data do post-it vira a data de publicação. Um post-it vazio que vira roteiro abre o editor.
 */
export function transformPostIt(input: {
  postIt: PlanejamentoPostIt;
  contents: readonly Content[];
  target: PostItTarget;
  now?: string;
}): PostItTransformResult {
  const linked = input.postIt.contentId
    ? input.contents.find(content => content.id === input.postIt.contentId) ?? null
    : null;

  if (input.postIt.contentId && !linked) {
    return {ok: false, reason: 'conteudo-ausente'};
  }

  if (!linked) {
    const texto = input.postIt.texto.trim();
    const status = input.target === 'ideia' ? CONTENT_STATUS.IDEIA : CONTENT_STATUS.ROTEIRO;
    const now = nowIso(input.now);
    const draft = conteudoDoPostIt(createContentDraft({
      title: texto || 'Sem título',
      status,
      notes: texto || null,
    }), input.postIt);
    const content = stampDay(draft, input.postIt.date);
    return {
      ok: true,
      mode: 'create',
      content,
      postIt: ligarPostIt(input.postIt, content.id, now),
      openScript: input.target === 'roteiro',
    };
  }

  const status = normalizeContentStatus(linked.status);
  if (input.target === 'ideia' && status !== CONTENT_STATUS.IDEIA) {
    return {ok: false, reason: 'nao-vira-ideia'};
  }

  const now = nowIso(input.now);
  let content = linked;
  if (input.target === 'roteiro' && status === CONTENT_STATUS.IDEIA) {
    content = {...content, status: CONTENT_STATUS.ROTEIRO, updatedAt: now};
  }
  content = stampDay(content, input.postIt.date);

  return {
    ok: true,
    mode: 'update',
    content,
    postIt: ligarPostIt(input.postIt, content.id, now),
    openScript: false,
  };
}

export function postItTitle(postIt: PlanejamentoPostIt, content: Content | null): string {
  const fromNote = postIt.texto.trim();
  if (fromNote) return fromNote;
  const fromContent = content?.title?.trim();
  if (fromContent) return fromContent;
  return 'Post-it vazio';
}

export function postItKind(
  postIt: PlanejamentoPostIt,
  content: Content | null,
): 'vazio' | 'ideia' | 'roteiro' {
  if (!postIt.contentId || !content) return 'vazio';
  const status = normalizeContentStatus(content.status);
  if (status === CONTENT_STATUS.ROTEIRO) return 'roteiro';
  if (status === CONTENT_STATUS.IDEIA) return 'ideia';
  return 'vazio';
}
