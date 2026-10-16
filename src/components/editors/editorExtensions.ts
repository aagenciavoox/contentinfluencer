import { Extension, type Editor } from '@tiptap/react';
import Highlight from '@tiptap/extension-highlight';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { readableInkOn } from '../../lib/utils';
import { HIGHLIGHT_INK } from './editorColors';
import { findSentenceRange } from './sentenceSelection';

/** Destaque com várias cores; a tinta do texto acompanha o fundo para ficar legível no tema escuro. */
export const ReadableHighlight = Highlight.extend({
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-color') || element.style.backgroundColor || null,
        renderHTML: (attributes: { color?: string | null }) => {
          if (!attributes.color) return {};
          const ink = attributes.color.startsWith('#') ? readableInkOn(attributes.color, HIGHLIGHT_INK) : HIGHLIGHT_INK;
          return {
            'data-color': attributes.color,
            style: `background-color: ${attributes.color}; color: ${ink}`,
          };
        },
      },
    };
  },
}).configure({ multicolor: true });

function blockAt(view: EditorView, pos: number) {
  const $pos = view.state.doc.resolve(pos);
  if (!$pos.parent.isTextblock) return null;
  return { $pos, start: $pos.start(), end: $pos.end() };
}

function selectSentence(view: EditorView, pos: number) {
  const block = blockAt(view, pos);
  if (!block) return false;
  const { $pos, start } = block;
  // Cada nó folha (quebra de linha) ocupa 1 posição e vira '\n': offsets batem com o documento.
  const text = $pos.parent.textBetween(0, $pos.parent.content.size, undefined, '\n');
  const range = findSentenceRange(text, pos - start);
  if (range.start === range.end) return false;
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, start + range.start, start + range.end)));
  return true;
}

function selectParagraph(view: EditorView, pos: number) {
  const block = blockAt(view, pos);
  if (!block) return false;
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, block.start, block.end)));
  return true;
}

/**
 * Cliques de seleção:
 * duplo = palavra (nativo) · triplo = frase · quádruplo ou Alt+duplo = parágrafo.
 */
export const SelectionClicks = Extension.create({
  name: 'selectionClicks',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('selectionClicks'),
        props: {
          handleDOMEvents: {
            mousedown: (view, event) => {
              if (event.button !== 0 || event.detail < 4) return false;
              const hit = view.posAtCoords({ left: event.clientX, top: event.clientY });
              if (!hit || !selectParagraph(view, hit.pos)) return false;
              event.preventDefault();
              return true;
            },
          },
          handleDoubleClick: (view, pos, event) => {
            if (!event.altKey) return false;
            return selectParagraph(view, pos);
          },
          handleTripleClick: (view, pos) => selectSentence(view, pos),
        },
      }),
    ];
  },
});

export interface EditorShortcutsOptions {
  onComment: () => void;
  /** Sem handler, Ctrl+F/Ctrl+H continuam com o navegador. */
  onFind: ((mode: 'find' | 'replace') => void) | null;
  onLink: (() => void) | null;
}

/** Limpar formatação (Ctrl+\), comentar (Ctrl+Alt+M), link (Ctrl+K), buscar (Ctrl+F) e substituir (Ctrl+H). */
export const EditorShortcuts = Extension.create<EditorShortcutsOptions>({
  name: 'editorShortcuts',
  addOptions() {
    return { onComment: () => {}, onFind: null, onLink: null };
  },
  addKeyboardShortcuts() {
    return {
      'Mod-\\': () => clearFormatting(this.editor),
      'Mod-Alt-m': () => {
        if (this.editor.state.selection.empty) return false;
        this.options.onComment();
        return true;
      },
      'Mod-k': () => {
        if (!this.options.onLink) return false;
        this.options.onLink();
        return true;
      },
      'Mod-f': () => {
        if (!this.options.onFind) return false;
        this.options.onFind('find');
        return true;
      },
      'Mod-h': () => {
        if (!this.options.onFind) return false;
        this.options.onFind('replace');
        return true;
      },
    };
  },
});

/** Marcas que "limpar formatação" não remove (âncoras de comentário). */
export const PRESERVED_MARKS = new Set(['comment']);

/** Tira negrito, itálico, cores, destaque, link etc. da seleção, mantendo âncoras de comentário. */
export function clearFormatting(editor: Editor) {
  const { state } = editor;
  const { from, to, empty } = state.selection;
  const tr = state.tr;
  if (empty) {
    tr.setStoredMarks([]);
  } else {
    for (const markType of Object.values(state.schema.marks)) {
      if (PRESERVED_MARKS.has(markType.name)) continue;
      tr.removeMark(from, to, markType);
    }
  }
  editor.view.dispatch(tr);
  editor.view.focus();
  return true;
}
