import type { Editor } from '@tiptap/core';
import { Fragment, type Node as ProseMirrorNode } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import { groupSections, moveSection, nextSectionTitle } from '../../features/contents/lib/youtubeScript';

/** Seções do roteiro no editor: cada Título 1 ou 2 no primeiro nível abre uma. */
export type ScriptSection = { title: string; pos: number };
export type ScriptStructure = { sections: ScriptSection[]; active: number };

export const EMPTY_STRUCTURE: ScriptStructure = { sections: [], active: -1 };

export function isSectionHeading(node: ProseMirrorNode): boolean {
  return node.type.name === 'heading' && (node.attrs.level === 1 || node.attrs.level === 2);
}

/** Lista as seções e qual tem o cursor. */
export function readStructure(editor: Editor | null): ScriptStructure {
  if (!editor || editor.isDestroyed) return EMPTY_STRUCTURE;
  const sections: ScriptSection[] = [];
  editor.state.doc.forEach((node, offset) => {
    if (isSectionHeading(node)) sections.push({ title: node.textContent.trim(), pos: offset });
  });
  const cursor = editor.state.selection.from;
  let active = -1;
  sections.forEach((section, index) => {
    if (section.pos < cursor) active = index;
  });
  return { sections, active };
}

export function sameStructure(a: ScriptStructure, b: ScriptStructure | null): boolean {
  if (!b || a.active !== b.active || a.sections.length !== b.sections.length) return false;
  return a.sections.every((section, index) =>
    section.title === b.sections[index].title && section.pos === b.sections[index].pos,
  );
}

/** Leva o cursor para o fim do título da seção e rola até ela. */
export function jumpToSection(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  editor.chain().focus(undefined, { scrollIntoView: false }).setTextSelection(pos + node.nodeSize - 1).run();
  const dom = editor.view.nodeDOM(pos);
  if (dom instanceof HTMLElement) dom.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

/**
 * Move a seção inteira (título e texto até a próxima seção). Um passo só no desfazer;
 * comentários vão junto porque os blocos são os mesmos.
 */
export function moveSectionInEditor(editor: Editor, from: number, to: number): boolean {
  const nodes: ProseMirrorNode[] = [];
  editor.state.doc.forEach(node => nodes.push(node));
  const groups = groupSections(nodes, isSectionHeading);
  const moved = groups.sections[from]?.[0];
  if (!moved || from === to || to < 0 || to >= groups.sections.length) return false;
  const reordered = moveSection(groups, from, to);
  const { tr } = editor.state;
  tr.replaceWith(0, tr.doc.content.size, Fragment.fromArray(reordered));
  let pos = 0;
  for (const node of reordered) {
    if (node === moved) break;
    pos += node.nodeSize;
  }
  tr.setSelection(TextSelection.create(tr.doc, pos + moved.nodeSize - 1));
  editor.view.dispatch(tr);
  const dom = editor.view.nodeDOM(pos);
  if (dom instanceof HTMLElement) dom.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  return true;
}

function sectionContent(title: string) {
  return [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: title }] },
    { type: 'paragraph' },
  ];
}

/** Seção nova no fim, com o nome selecionado para já digitar por cima. */
export function addSectionAtEnd(editor: Editor) {
  const title = nextSectionTitle(readStructure(editor).sections.map(section => section.title));
  const size = editor.state.doc.content.size;
  const start = editor.isEmpty ? 0 : size;
  editor.chain()
    .focus()
    .insertContentAt(editor.isEmpty ? { from: 0, to: size } : size, sectionContent(title))
    .setTextSelection({ from: start + 1, to: start + 1 + title.length })
    .scrollIntoView()
    .run();
}

/** Seção nova logo depois do bloco onde está o cursor (menu Inserir). */
export function insertSectionAfterCursor(editor: Editor) {
  const title = nextSectionTitle(readStructure(editor).sections.map(section => section.title));
  const { $from } = editor.state.selection;
  if (editor.isEmpty) {
    addSectionAtEnd(editor);
    return;
  }
  const after = $from.depth > 0 ? $from.after(1) : editor.state.selection.to;
  editor.chain()
    .focus()
    .insertContentAt(after, sectionContent(title))
    .setTextSelection({ from: after + 1, to: after + 1 + title.length })
    .scrollIntoView()
    .run();
}

/** Modelo ou template no fim do roteiro; roteiro vazio é substituído. */
export function appendHtml(editor: Editor, html: string) {
  const size = editor.state.doc.content.size;
  editor.chain().focus().insertContentAt(editor.isEmpty ? { from: 0, to: size } : size, html).scrollIntoView().run();
}
