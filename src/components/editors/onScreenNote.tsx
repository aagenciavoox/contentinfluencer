import { useEffect, useRef, useState } from 'react';
import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import { Clapperboard, MoreHorizontal } from 'lucide-react';
import { cn } from '../../lib/utils';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    onScreenNote: {
      /** Bloco "Na tela" logo depois do bloco atual (ou no lugar de um parágrafo vazio). */
      insertOnScreenNote: () => ReturnType;
    };
  }
}

export const ON_SCREEN_NOTE = 'onScreenNote';

/**
 * "Na tela" do modo YouTube: o que aparece no vídeo (capas, trechos, legendas).
 * Fica no `script` como `<div data-na-tela>`, que não conta como fala nem vai para o teleprompter.
 * Os outros modos também mostram o bloco, para a troca de modo não perder nada.
 */
export const OnScreenNote = Node.create({
  name: ON_SCREEN_NOTE,
  group: 'block',
  content: 'inline*',
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-na-tela]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-na-tela': '', class: 'script-on-screen' }), 0];
  },

  addCommands() {
    return {
      insertOnScreenNote: () => ({ state, chain }) => {
        const { $from } = state.selection;
        const parent = $from.parent;
        if ($from.depth === 1 && parent.type.name === 'paragraph' && parent.content.size === 0) {
          return chain().setNode(this.name).scrollIntoView().run();
        }
        const after = $from.depth > 0 ? $from.after(1) : state.selection.to;
        return chain()
          .insertContentAt(after, { type: this.name })
          .setTextSelection(after + 1)
          .scrollIntoView()
          .run();
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Enter sai do bloco para um parágrafo novo; Shift+Enter quebra a linha dentro dele.
      Enter: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        if (!empty || $from.parent.type.name !== this.name) return false;
        const after = $from.after();
        return editor.chain()
          .insertContentAt(after, { type: 'paragraph' })
          .setTextSelection(after + 1)
          .scrollIntoView()
          .run();
      },
      // Backspace no começo devolve o bloco a texto normal.
      Backspace: ({ editor }) => {
        const { $from, empty } = editor.state.selection;
        if (!empty || $from.parent.type.name !== this.name || $from.parentOffset !== 0) return false;
        return editor.commands.setParagraph();
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(OnScreenNoteView);
  },
});

function OnScreenNoteView({ node, editor, getPos, deleteNode, selected }: ReactNodeViewProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const actionsRef = useRef<HTMLSpanElement>(null);
  const empty = node.content.size === 0;

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!actionsRef.current?.contains(event.target as globalThis.Node)) setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const toParagraph = () => {
    setMenuOpen(false);
    const pos = getPos();
    if (typeof pos !== 'number') return;
    editor.chain().focus().setTextSelection(pos + 1).setParagraph().run();
  };

  return (
    <NodeViewWrapper className={cn('script-on-screen-view', selected && 'is-selected')}>
      <span contentEditable={false} className="script-on-screen-label">
        <Clapperboard aria-hidden />
        Na tela
      </span>
      <div className="script-on-screen-body">
        {empty ? (
          <span contentEditable={false} className="script-on-screen-placeholder" aria-hidden>
            O que aparece no vídeo: capa, trecho, legenda…
          </span>
        ) : null}
        <NodeViewContent className="script-on-screen-text" />
      </div>
      {editor.isEditable ? (
        <span ref={actionsRef} contentEditable={false} className="script-on-screen-actions">
          <button
            type="button"
            aria-label="Opções do bloco Na tela"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onMouseDown={event => event.preventDefault()}
            onClick={() => setMenuOpen(open => !open)}
            className="script-on-screen-more"
          >
            <MoreHorizontal aria-hidden />
          </button>
          {menuOpen ? (
            <span role="menu" className="script-on-screen-menu">
              <button type="button" role="menuitem" onMouseDown={event => event.preventDefault()} onClick={toParagraph}>
                Virar texto normal
              </button>
              <button
                type="button"
                role="menuitem"
                onMouseDown={event => event.preventDefault()}
                onClick={() => {
                  setMenuOpen(false);
                  deleteNode();
                }}
                className="is-danger"
              >
                Apagar bloco
              </button>
            </span>
          ) : null}
        </span>
      ) : null}
    </NodeViewWrapper>
  );
}
