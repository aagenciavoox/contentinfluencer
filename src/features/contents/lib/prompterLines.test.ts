import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildPrompterLines, EMPTY_SCRIPT_LINE, splitSentenceIntoLines } from './prompterLines.ts';

const wordCount = (line: string) => line.split(/\s+/).filter(Boolean).length;

describe('prompter lines', () => {
  it('keeps short sentences whole', () => {
    assert.deepEqual(splitSentenceIntoLines('Virar vampiro parecia muito melhor quando eu era nova.', 11), [
      'Virar vampiro parecia muito melhor quando eu era nova.',
    ]);
  });

  it('never leaves a 1 to 3 word orphan at the end of a long sentence', () => {
    for (let total = 12; total <= 40; total++) {
      const sentence = Array.from({ length: total }, (_, index) => `palavra${index}`).join(' ');
      const lines = splitSentenceIntoLines(sentence, 11);
      assert.equal(lines.join(' '), sentence);
      lines.forEach(line => assert.ok(wordCount(line) >= 4, `${total} palavras: "${line}"`));
    }
  });

  it('keeps every line within the limit even with many short words in a row', () => {
    const sentence =
      'Virar vampiro parecia muito melhor quando eu era mais nova, porque eu ainda não tinha percebido que eu ia ter que me preocupar com coisas muito mais chatas do que alho e estaca.';
    const lines = splitSentenceIntoLines(sentence, 11);
    assert.equal(lines.join(' '), sentence);
    lines.forEach(line => assert.ok(wordCount(line) <= 11 && wordCount(line) >= 3, `"${line}"`));
  });

  it('breaks at commas before splitting by size', () => {
    const lines = splitSentenceIntoLines(
      'Quando eu terminei o livro inteiro numa noite só, eu fiquei olhando para o teto até amanhecer.',
      11
    );
    assert.deepEqual(lines, [
      'Quando eu terminei o livro inteiro numa noite só,',
      'eu fiquei olhando para o teto até amanhecer.',
    ]);
  });

  it('does not end a line on a word that belongs to the next one', () => {
    const lines = splitSentenceIntoLines(
      'Ela sempre quis ser uma personagem rica de romance de época com cara de old money e herança.',
      11
    );
    lines.slice(0, -1).forEach(line => {
      const last = line.split(' ').at(-1) ?? '';
      assert.ok(!['de', 'com', 'a', 'o', 'e', 'que', 'old', 'uma'].includes(last), `linha terminou em "${last}": ${line}`);
    });
    assert.ok(lines.some(line => line.includes('old money')));
  });

  it('prefers breaking before a clause starter', () => {
    assert.deepEqual(splitSentenceIntoLines('Como eu explico para o meu chefe que a reunião das nove da manhã é literalmente fatal?', 11), [
      'Como eu explico para o meu chefe',
      'que a reunião das nove da manhã é literalmente fatal?',
    ]);
  });

  it('separates paragraphs with a single blank line, ends on text and falls back on empty scripts', () => {
    assert.deepEqual(buildPrompterLines('Primeira frase.\n\n\nSegunda frase.\n\n', 11), ['Primeira frase.', '', 'Segunda frase.']);
    assert.deepEqual(buildPrompterLines('   ', 11), [EMPTY_SCRIPT_LINE]);
  });
});
