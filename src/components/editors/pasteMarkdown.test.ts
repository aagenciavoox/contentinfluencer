import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
  clipboardHasRichHtml,
  htmlFromClipboardPlain,
  looksLikeMarkdown,
  markdownToHtml,
  plainTextToHtml,
} from './pasteMarkdown.ts';

describe('pasteMarkdown', () => {
  it('detecta HTML rico e Markdown estruturado', () => {
    assert.equal(clipboardHasRichHtml('<p>Oi <strong>lá</strong></p>'), true);
    assert.equal(clipboardHasRichHtml('<p>só texto</p>'), false);
    assert.equal(clipboardHasRichHtml('<p>a</p><p>b</p>'), true);
    assert.equal(clipboardHasRichHtml('<p>linha<br>outra</p>'), true);
    assert.equal(looksLikeMarkdown('### Título\n\n**negrito** e lista:\n- um\n- dois'), true);
    assert.equal(looksLikeMarkdown('Texto comum com **acaso** no meio.'), false);
  });

  it('preserva quebras em texto plano e converte Markdown sem deixar marcações', () => {
    assert.equal(
      plainTextToHtml('linha 1\nlinha 2\n\nnovo parágrafo'),
      '<p>linha 1<br>linha 2</p><p>novo parágrafo</p>',
    );
    const html = markdownToHtml('### Gancho\n\nFala **forte**.\n\n- item\n- outro');
    assert.match(html, /<h3>Gancho<\/h3>/);
    assert.match(html, /<strong>forte<\/strong>/);
    assert.match(html, /<ul>/);
    assert.equal(html.includes('###'), false);
    assert.equal(html.includes('**'), false);
  });

  it('escolhe o caminho certo no clipboard de texto', () => {
    assert.equal(htmlFromClipboardPlain('uma linha'), null);
    assert.match(htmlFromClipboardPlain('a\nb') ?? '', /<br>/);
    assert.match(htmlFromClipboardPlain('## Título\n\ncorpo') ?? '', /<h2>/);
  });

  it('smoke: colagem estilo Word (vários p) e texto plano com parágrafos', () => {
    // Word/Docs costumam mandar text/html com vários <p>; text/plain junta linhas.
    const wordHtml = [
      '<html xmlns:o="urn:schemas-microsoft-com:office:office"><body>',
      '<!--StartFragment-->',
      '<p class="MsoNormal">Gancho da abertura</p>',
      '<p class="MsoNormal">Segundo bloco de fala</p>',
      '<!--EndFragment-->',
      '</body></html>',
    ].join('');
    assert.equal(clipboardHasRichHtml(wordHtml), true);

    const plainParagraphs = 'Gancho da abertura\n\nSegundo bloco de fala\nterceira linha';
    const fromPlain = htmlFromClipboardPlain(plainParagraphs) ?? '';
    assert.match(fromPlain, /<p>Gancho da abertura<\/p>/);
    assert.match(fromPlain, /<p>Segundo bloco de fala<br>terceira linha<\/p>/);
  });
});

