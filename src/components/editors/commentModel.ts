/**
 * Comentários do roteiro: o texto fica no JSON `script_notes` (corpo, respostas, resolvido);
 * a âncora fica no documento, como marca <span data-comment-id>, e acompanha as edições.
 */
export interface CommentReply {
  id: string;
  comment: string;
  authorName?: string;
  createdAt: string;
}

export interface ScriptComment {
  id: string;
  text: string;
  /** Posição no momento da criação. Legado: antes das marcas era a única âncora. */
  selection: { from: number; to: number };
  comment: string;
  color?: string;
  authorName?: string;
  createdAt?: string;
  replies?: CommentReply[];
  resolvedAt?: string | null;
}

export type CommentPatch = Partial<Pick<ScriptComment, 'comment' | 'color' | 'replies' | 'resolvedAt'>>;

export type AnchorPlan = {
  /** Comentários antigos cujo trecho ainda bate com o texto salvo: recebem a marca. */
  toAnchor: { id: string; from: number; to: number }[];
  /** Sem marca e sem trecho correspondente: aparecem só na lista ("sem âncora"). */
  unanchored: string[];
};

/**
 * Migração única e de melhor esforço das posições {from,to} antigas para marcas.
 * `textAt` devolve o texto do documento no intervalo, ou null se o intervalo for inválido.
 */
export function planCommentAnchors(
  comments: Pick<ScriptComment, 'id' | 'text' | 'selection'>[],
  anchoredIds: Set<string>,
  textAt: (from: number, to: number) => string | null,
): AnchorPlan {
  const plan: AnchorPlan = { toAnchor: [], unanchored: [] };
  for (const comment of comments) {
    if (!comment.id || anchoredIds.has(comment.id)) continue;
    const from = comment.selection?.from;
    const to = comment.selection?.to;
    const valid = Number.isInteger(from) && Number.isInteger(to) && from >= 0 && to > from;
    const current = valid ? textAt(from, to) : null;
    if (current !== null && comment.text && normalize(current) === normalize(comment.text)) {
      plan.toAnchor.push({ id: comment.id, from, to });
    } else {
      plan.unanchored.push(comment.id);
    }
  }
  return plan;
}

function normalize(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export type CardSlot = { id: string; top: number; height: number };

/**
 * Empilha os cartões da margem sem sobreposição, como no Docs:
 * o cartão ativo fica alinhado ao trecho; os outros se afastam para cima e para baixo.
 */
export function stackCommentCards(slots: CardSlot[], activeId: string | null, gap = 8): Map<string, number> {
  const sorted = [...slots].sort((a, b) => a.top - b.top);
  const tops = sorted.map(slot => slot.top);
  const pivot = activeId ? Math.max(0, sorted.findIndex(slot => slot.id === activeId)) : 0;

  for (let index = pivot + 1; index < sorted.length; index += 1) {
    tops[index] = Math.max(tops[index], tops[index - 1] + sorted[index - 1].height + gap);
  }
  for (let index = pivot - 1; index >= 0; index -= 1) {
    tops[index] = Math.min(tops[index], tops[index + 1] - sorted[index].height - gap);
  }
  // Nada acima do topo: se o empilhamento para cima passou de 0, empurra tudo para baixo de novo.
  if (sorted.length > 0 && tops[0] < 0) {
    tops[0] = 0;
    for (let index = 1; index < sorted.length; index += 1) {
      tops[index] = Math.max(tops[index], tops[index - 1] + sorted[index - 1].height + gap);
    }
  }
  return new Map(sorted.map((slot, index) => [slot.id, tops[index]]));
}

export function newCommentId() {
  return Math.random().toString(36).slice(2, 11);
}

/** Ordem da lista: ancorados pela posição no texto, depois os sem âncora pela data. */
export function orderComments<T extends ScriptComment>(comments: T[], positions: Map<string, number>): T[] {
  return [...comments].sort((a, b) => {
    const pa = positions.get(a.id);
    const pb = positions.get(b.id);
    if (pa !== undefined && pb !== undefined) return pa - pb;
    if (pa !== undefined) return -1;
    if (pb !== undefined) return 1;
    return (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
  });
}
