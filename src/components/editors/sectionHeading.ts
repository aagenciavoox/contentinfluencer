import Heading from '@tiptap/extension-heading';
import { Plugin } from '@tiptap/pm/state';
import { generateUUID } from '../../utils/uuid';

/**
 * Título 1 e 2 do modo YouTube marcam um bloco.
 * O id fica em `data-bloco` para as referências continuarem no bloco certo.
 */
export const SectionHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      blocoId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-bloco'),
        renderHTML: (attributes: { blocoId?: string | null }) => (
          attributes.blocoId ? { 'data-bloco': attributes.blocoId } : {}
        ),
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      ...(this.parent?.() ?? []),
      new Plugin({
        appendTransaction: (transactions, _oldState, state) => {
          if (!transactions.some(transaction => transaction.docChanged)) return null;
          const tr = state.tr;
          let changed = false;
          state.doc.forEach((node, pos) => {
            if (node.type.name !== 'heading') return;
            const level = node.attrs.level;
            if ((level !== 1 && level !== 2) || node.attrs.blocoId) return;
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, blocoId: generateUUID() });
            changed = true;
          });
          return changed ? tr : null;
        },
      }),
    ];
  },
});
