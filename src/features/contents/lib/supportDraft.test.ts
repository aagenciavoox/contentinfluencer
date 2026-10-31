import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { writingNotesToHtml } from './supportDraft.ts';

describe('writingNotesToHtml', () => {
  it('keeps an empty draft empty', () => {
    assert.equal(writingNotesToHtml(null), '');
    assert.equal(writingNotesToHtml(undefined), '');
    assert.equal(writingNotesToHtml('  \n '), '');
  });

  it('opens the old plain-text notes line by line, blank lines included', () => {
    assert.equal(
      writingNotesToHtml('Gancho forte\nCortar a intro\n\nFechar com CTA'),
      '<p>Gancho forte</p><p>Cortar a intro</p><p></p><p>Fechar com CTA</p>',
    );
    assert.equal(writingNotesToHtml('a\r\nb\n'), '<p>a</p><p>b</p>');
  });

  it('escapes characters that would read as markup', () => {
    assert.equal(writingNotesToHtml('a < b & c'), '<p>a &lt; b &amp; c</p>');
    assert.equal(writingNotesToHtml('<3 livros'), '<p>&lt;3 livros</p>');
  });

  it('leaves editor html untouched', () => {
    const html = '<ul><li><p>Cosmere</p></li></ul><p><strong>Marvel</strong></p>';
    assert.equal(writingNotesToHtml(html), html);
  });
});
