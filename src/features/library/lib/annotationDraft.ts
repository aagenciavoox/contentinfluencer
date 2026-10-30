import type { Anotacao } from '../../../lib/database.ts';
import { generateUUID } from '../../../utils/uuid.ts';

export const ANNOTATION_TYPES: Anotacao['tipo'][] = ['Anotação', 'Trecho', 'Reação', 'Análise', 'Ideia de conteúdo', 'Pergunta'];

export type AnnotationDraft = Pick<Anotacao, 'id' | 'texto' | 'tipo' | 'createdAt'> & { capituloRef: string };
type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function browserStorage(): DraftStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function draftKey(userId: string, itemId: string) {
  return `annotation-draft:v1:${userId}:${itemId}`;
}

export function createAnnotationDraft(): AnnotationDraft {
  return { id: generateUUID(), texto: '', tipo: 'Anotação', capituloRef: '', createdAt: new Date().toISOString() };
}

export function readAnnotationDraft(userId: string | null, itemId: string, storage = browserStorage()): AnnotationDraft | null {
  if (!userId || !storage) return null;
  try {
    const raw = storage.getItem(draftKey(userId, itemId));
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (!draft || typeof draft.id !== 'string' || !draft.id
      || typeof draft.texto !== 'string' || typeof draft.capituloRef !== 'string'
      || !ANNOTATION_TYPES.includes(draft.tipo) || typeof draft.createdAt !== 'string'
      || Number.isNaN(Date.parse(draft.createdAt))) return null;
    return draft;
  } catch {
    return null;
  }
}

export function writeAnnotationDraft(userId: string | null, itemId: string, draft: AnnotationDraft, storage = browserStorage()): boolean {
  if (!userId || !storage) return false;
  try {
    storage.setItem(draftKey(userId, itemId), JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

/** Só descarta a cópia local depois da confirmação, sem apagar outro rascunho de uma segunda aba. */
export async function persistAnnotationDraft({ userId, itemId, draft, save, storage = browserStorage() }: {
  userId: string | null;
  itemId: string;
  draft: AnnotationDraft;
  save: (annotation: Anotacao) => Promise<void>;
  storage?: DraftStorage | null;
}): Promise<void> {
  if (!userId) throw new Error('Entre novamente na sua conta para salvar. Seu texto foi mantido.');
  writeAnnotationDraft(userId, itemId, draft, storage);
  await save({
    ...draft,
    userId,
    itemId,
    texto: draft.texto.trim(),
    capituloRef: draft.capituloRef.trim() || null,
    contentPotential: false,
    destilada: false,
    deletedAt: null,
  });
  try {
    const current = readAnnotationDraft(userId, itemId, storage);
    if (current && current.id === draft.id && current.texto === draft.texto
      && current.tipo === draft.tipo && current.capituloRef === draft.capituloRef) {
      storage?.removeItem(draftKey(userId, itemId));
    }
  } catch {
    // A gravação já foi confirmada. Reabrir uma cópia antiga mantém o mesmo id para não duplicar.
  }
}
