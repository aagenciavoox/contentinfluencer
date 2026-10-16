import { Extension, type Editor } from '@tiptap/react';
import { Plugin, PluginKey, TextSelection, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { findMatchesInBlocks, stepMatch, type FindMatch, type TextBlock } from './findMatches';

export type FindState = {
  query: string;
  caseSensitive: boolean;
  matches: FindMatch[];
  current: number;
};

export const findReplaceKey = new PluginKey<FindState>('findReplace');

const EMPTY: FindState = { query: '', caseSensitive: false, matches: [], current: -1 };

function collectBlocks(state: EditorState): TextBlock[] {
  const blocks: TextBlock[] = [];
  state.doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    blocks.push({ pos: pos + 1, text: node.textBetween(0, node.content.size, undefined, '\n') });
    return false;
  });
  return blocks;
}

function compute(state: EditorState, query: string, caseSensitive: boolean, previous = -1): FindState {
  const matches = findMatchesInBlocks(collectBlocks(state), query, caseSensitive);
  const current = matches.length === 0 ? -1 : Math.min(Math.max(previous, 0), matches.length - 1);
  return { query, caseSensitive, matches, current };
}

type Meta = { query?: string; caseSensitive?: boolean; current?: number };

export const FindReplace = Extension.create({
  name: 'findReplace',
  addProseMirrorPlugins() {
    return [
      new Plugin<FindState>({
        key: findReplaceKey,
        state: {
          init: () => EMPTY,
          apply(tr, value, _old, newState) {
            const meta = tr.getMeta(findReplaceKey) as Meta | undefined;
            if (meta) {
              const query = meta.query ?? value.query;
              const caseSensitive = meta.caseSensitive ?? value.caseSensitive;
              if (meta.query !== undefined || meta.caseSensitive !== undefined) {
                return compute(newState, query, caseSensitive, meta.current ?? 0);
              }
              return { ...value, current: meta.current ?? value.current };
            }
            if (tr.docChanged && value.query) return compute(newState, value.query, value.caseSensitive, value.current);
            return value;
          },
        },
        props: {
          decorations(state) {
            const value = findReplaceKey.getState(state);
            if (!value || value.matches.length === 0) return DecorationSet.empty;
            return DecorationSet.create(
              state.doc,
              value.matches.map((match, index) =>
                Decoration.inline(match.from, match.to, {
                  class: index === value.current ? 'find-match find-match-current' : 'find-match',
                }),
              ),
            );
          },
        },
      }),
    ];
  },
});

export function getFindState(editor: Editor): FindState {
  return findReplaceKey.getState(editor.state) ?? EMPTY;
}

function revealCurrent(editor: Editor) {
  const value = getFindState(editor);
  const match = value.matches[value.current];
  if (!match) return;
  const tr = editor.state.tr.setSelection(TextSelection.create(editor.state.doc, match.from, match.to)).scrollIntoView();
  editor.view.dispatch(tr);
}

export function setFindQuery(editor: Editor, query: string, caseSensitive: boolean) {
  editor.view.dispatch(editor.state.tr.setMeta(findReplaceKey, { query, caseSensitive, current: 0 } satisfies Meta));
  revealCurrent(editor);
}

export function stepFind(editor: Editor, direction: 1 | -1) {
  const value = getFindState(editor);
  const next = stepMatch(value.current, value.matches.length, direction);
  editor.view.dispatch(editor.state.tr.setMeta(findReplaceKey, { current: next } satisfies Meta));
  revealCurrent(editor);
}

export function replaceCurrent(editor: Editor, replacement: string) {
  const value = getFindState(editor);
  const match = value.matches[value.current];
  if (!match) return;
  const tr = editor.state.tr;
  if (replacement) tr.insertText(replacement, match.from, match.to);
  else tr.delete(match.from, match.to);
  editor.view.dispatch(tr);
  revealCurrent(editor);
}

export function replaceAll(editor: Editor, replacement: string): number {
  const value = getFindState(editor);
  if (value.matches.length === 0) return 0;
  const tr = editor.state.tr;
  for (const match of [...value.matches].reverse()) {
    if (replacement) tr.insertText(replacement, match.from, match.to);
    else tr.delete(match.from, match.to);
  }
  editor.view.dispatch(tr);
  return value.matches.length;
}

export function clearFind(editor: Editor) {
  editor.view.dispatch(editor.state.tr.setMeta(findReplaceKey, { query: '', current: -1 } satisfies Meta));
}
