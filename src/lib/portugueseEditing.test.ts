import assert from 'node:assert/strict';
import test from 'node:test';
import { applyEditingLang, EDITING_LANG } from './portugueseEditing.ts';

function host(tagName: string, attrs: Record<string, string> = {}) {
  const values = new Map(Object.entries(attrs));
  const writes: string[] = [];
  let spellcheck = true;
  const spellWrites: boolean[] = [];
  return {
    tagName,
    lang: values.get('lang') ?? '',
    writes,
    spellWrites,
    get spellcheck() { return spellcheck; },
    set spellcheck(value: boolean) {
      spellcheck = value;
      spellWrites.push(value);
    },
    getAttribute: (name: string) => values.get(name) ?? null,
    setAttribute: (name: string, value: string) => {
      values.set(name, value);
      writes.push(`${name}=${value}`);
    },
  };
}

test('marca textarea e editor rico como português e reinicia o corretor', () => {
  const textarea = host('textarea');
  assert.equal(applyEditingLang(textarea), true);
  assert.equal(textarea.lang, EDITING_LANG);
  assert.deepEqual(textarea.writes, ['lang=pt-BR']);
  assert.deepEqual(textarea.spellWrites, [false, true]);

  const editor = host('div', { contenteditable: 'true' });
  assert.equal(applyEditingLang(editor), true);
  assert.equal(editor.getAttribute('lang'), EDITING_LANG);
});

test('não remarcar um campo que já está em português', () => {
  const textarea = host('textarea', { lang: EDITING_LANG });
  textarea.lang = EDITING_LANG;
  assert.equal(applyEditingLang(textarea), true);
  assert.deepEqual(textarea.writes, []);
  assert.equal(textarea.spellcheck, true);
});

test('ignora campo numérico e elemento que não é de escrita', () => {
  assert.equal(applyEditingLang(host('input', { type: 'number' })), false);
  assert.equal(applyEditingLang(host('button')), false);
  assert.equal(applyEditingLang(host('div')), false);
});
