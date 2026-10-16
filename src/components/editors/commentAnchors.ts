import { Mark, mergeAttributes, type Editor } from '@tiptap/react';
import type { Node as PMNode } from '@tiptap/pm/model';
import { planCommentAnchors, type ScriptComment } from './commentModel';

/**
 * Âncora de comentário dentro do documento: <span data-comment-id="…">.
 * Não se estende ao digitar na borda e permite comentários sobrepostos.
 */
export const CommentAnchor = Mark.create({
  name: 'comment',
  inclusive: false,
  excludes: '',
  spanning: true,
  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-comment-id'),
        renderHTML: (attributes: { commentId?: string | null }) =>
          attributes.commentId ? { 'data-comment-id': attributes.commentId } : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-comment-id]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'comment-anchor' }), 0];
  },
});

/** Meta das transacoes da migracao automatica (nao marcam o rascunho como alterado). */
export const COMMENT_MIGRATION_META = 'commentMigration';

export type CommentRange = { from: number; to: number };

/** Intervalo de cada comentário no documento (do primeiro ao último pedaço marcado). */
export function collectCommentRanges(doc: PMNode): Map<string, CommentRange> {
  const ranges = new Map<string, CommentRange>();
  doc.descendants((node, pos) => {
    if (!node.isText) return true;
    for (const mark of node.marks) {
      if (mark.type.name !== 'comment') continue;
      const id = mark.attrs.commentId as string | null;
      if (!id) continue;
      const from = pos;
      const to = pos + node.nodeSize;
      const current = ranges.get(id);
      ranges.set(id, current ? { from: Math.min(current.from, from), to: Math.max(current.to, to) } : { from, to });
    }
    return false;
  });
  return ranges;
}

export function addCommentAnchor(editor: Editor, id: string, from: number, to: number, addToHistory = true) {
  const type = editor.schema.marks.comment;
  if (!type || from >= to) return;
  const tr = editor.state.tr.addMark(from, to, type.create({ commentId: id }));
  if (!addToHistory) tr.setMeta('addToHistory', false);
  editor.view.dispatch(tr);
}

export function removeCommentAnchor(editor: Editor, id: string) {
  const type = editor.schema.marks.comment;
  if (!type) return;
  const range = collectCommentRanges(editor.state.doc).get(id);
  if (!range) return;
  editor.view.dispatch(editor.state.tr.removeMark(range.from, range.to, type.create({ commentId: id })));
}

/**
 * Migração única: comentários antigos (só {from,to}) ganham a marca se o trecho ainda bate.
 * Fica fora do histórico de desfazer. Devolve os ids que continuam sem âncora.
 */
export function migrateLegacyComments(editor: Editor, comments: ScriptComment[]): string[] {
  const { doc } = editor.state;
  const ranges = collectCommentRanges(doc);
  const plan = planCommentAnchors(comments, new Set(ranges.keys()), (from, to) => {
    if (to > doc.content.size) return null;
    try {
      return doc.textBetween(from, to, ' ');
    } catch {
      return null;
    }
  });
  const type = editor.schema.marks.comment;
  if (type && plan.toAnchor.length > 0) {
    const tr = editor.state.tr;
    for (const anchor of plan.toAnchor) tr.addMark(anchor.from, anchor.to, type.create({ commentId: anchor.id }));
    tr.setMeta('addToHistory', false);
    // Nao conta como edicao: as marcas vao para o banco junto com a proxima edicao de verdade.
    tr.setMeta(COMMENT_MIGRATION_META, true);
    editor.view.dispatch(tr);
  }
  return plan.unanchored;
}
