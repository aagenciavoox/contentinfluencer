/** Idioma dos campos de escrita. O `<html lang>` sozinho não basta: no Windows o Chrome e o Edge
 * escolhem o dicionário pelo `lang` do próprio elemento e, sem ele, riscam o português. */
export const EDITING_LANG = 'pt-BR';

type EditingHost = {
  tagName: string;
  lang?: string;
  spellcheck?: boolean;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
};

function isWritingField(el: EditingHost) {
  const tag = el.tagName.toUpperCase();
  if (tag === 'TEXTAREA') return true;
  if (el.getAttribute('contenteditable')?.toLowerCase() === 'true') return true;
  if (tag !== 'INPUT') return false;
  const type = (el.getAttribute('type') || 'text').toLowerCase();
  return type === 'text' || type === 'search';
}

/** Marca o campo como português e reinicia o corretor para ele reler o dicionário. */
export function applyEditingLang(el: EditingHost) {
  if (!isWritingField(el)) return false;
  const already = el.getAttribute('lang') === EDITING_LANG;
  if (!already) {
    el.setAttribute('lang', EDITING_LANG);
    if (el.lang !== undefined) el.lang = EDITING_LANG;
    // Trocar o idioma com o corretor já ligado não atualiza o dicionário até reiniciá-lo.
    if (el.spellcheck) {
      el.spellcheck = false;
      el.spellcheck = true;
    }
  }
  return true;
}

function visit(node: Node) {
  if (!(node instanceof Element)) return;
  applyEditingLang(node);
  node.querySelectorAll('textarea, input, [contenteditable="true"]').forEach(el => {
    applyEditingLang(el);
  });
}

const GUARD = 'data-criaki-pt';

/** Aplica pt-BR aos campos que já existem e aos que o app criar depois. */
export function watchPortugueseEditing(root: ParentNode = document.body) {
  const doc = root instanceof Document ? root : root.ownerDocument;
  // O recarregamento do Vite chama de novo; a marca evita um observador duplicado.
  if (doc?.documentElement.hasAttribute(GUARD)) return () => {};
  doc?.documentElement.setAttribute(GUARD, '');
  visit(root);
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes') {
        if (record.target instanceof Element) applyEditingLang(record.target);
        continue;
      }
      record.addedNodes.forEach(visit);
    }
  });
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['contenteditable'],
  });
  return () => {
    observer.disconnect();
    doc?.documentElement.removeAttribute(GUARD);
  };
}
