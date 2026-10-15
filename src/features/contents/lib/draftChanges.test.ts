import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { draftDiffers, draftFieldChanged, normalizeEditorText } from './draftChanges.ts';

describe('normalizeEditorText', () => {
  it('treats empty editor documents as empty', () => {
    assert.equal(normalizeEditorText(null), '');
    assert.equal(normalizeEditorText('<p></p>'), '');
    assert.equal(normalizeEditorText('<p><br></p>'), '');
    assert.equal(normalizeEditorText(' <p><br/></p> '), '');
  });

  it('drops the empty paragraphs the editor appends at the end', () => {
    assert.equal(normalizeEditorText('<ul><li><p>a</p></li></ul><p></p>'), '<ul><li><p>a</p></li></ul>');
    assert.equal(normalizeEditorText('<h2>Gancho</h2><p></p><p><br></p>'), '<h2>Gancho</h2>');
  });

  it('keeps empty paragraphs between text', () => {
    assert.equal(normalizeEditorText('<p>a</p><p></p><p>b</p>'), '<p>a</p><p></p><p>b</p>');
  });
});

describe('draftFieldChanged', () => {
  it('ignores a trailing empty paragraph in the script', () => {
    assert.equal(draftFieldChanged('script', '<blockquote><p>a</p></blockquote>', '<blockquote><p>a</p></blockquote><p></p>'), false);
  });

  it('sees typed text in the script', () => {
    assert.equal(draftFieldChanged('script', '<p>a</p>', '<p>ab</p>'), true);
  });

  it('compares lists by value', () => {
    assert.equal(draftFieldChanged('livroIds', ['a', 'b'], ['a', 'b']), false);
    assert.equal(draftFieldChanged('livroIds', ['a'], ['a', 'b']), true);
  });

  it('treats missing writing notes as empty', () => {
    assert.equal(draftFieldChanged('writingNotes', undefined, ''), false);
  });
});

describe('draftDiffers', () => {
  const saved = {
    title: 'Resistência a quem?',
    script: '<ol><li><p>um</p></li></ol>',
    livroIds: ['livro-1'],
    scriptOrigem: 'autor',
  };

  it('opening without editing is not a change', () => {
    assert.equal(draftDiffers({...saved, livroIds: ['livro-1'], script: `${saved.script}<p></p>`}, saved), false);
  });

  it('editing and undoing is not a change', () => {
    const edited = {...saved, title: 'Resistência a quem'};
    assert.equal(draftDiffers(edited, saved), true);
    assert.equal(draftDiffers({...edited, title: saved.title}, saved), false);
  });

  it('a different script origin is a change', () => {
    assert.equal(draftDiffers({...saved, scriptOrigem: 'modelo'}, saved), true);
  });
});
