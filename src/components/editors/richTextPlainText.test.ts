import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { htmlToReadableText } from '../../lib/utils.ts';
import { buildPrompterLines } from '../../features/contents/lib/prompterLines.ts';

// HTML como o editor grava: destaque, cor do texto e ancora de comentario.
const html =
  '<p>Comece com <mark data-color="#FFF3A3" style="background-color: #FFF3A3; color: #111111">um gancho</mark> ' +
  '<span style="color: #D2453B">forte</span>. <span data-comment-id="abc" class="comment-anchor">Depois explique.</span></p>';

describe('texto puro para DOCX e teleprompter', () => {
  it('descarta destaque, cor e marcas de comentario sem quebrar a frase', () => {
    assert.equal(htmlToReadableText(html), 'Comece com um gancho forte. Depois explique.');
  });

  it('teleprompter recebe so o texto', () => {
    const lines = buildPrompterLines(htmlToReadableText(html), 12).filter(Boolean);
    assert.ok(lines.every(line => !/[<>]|data-|#[0-9A-F]{6}/i.test(line)));
    assert.equal(lines.join(' '), 'Comece com um gancho forte. Depois explique.');
  });
});