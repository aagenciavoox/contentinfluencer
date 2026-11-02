import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildPrompterLines,
  parsePrompterScript,
  splitSentenceIntoLines,
  stripBracketMarkers,
} from './prompterLines.ts';

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

  it('separates paragraphs with a single blank line, ends on text and leaves an empty script empty', () => {
    assert.deepEqual(buildPrompterLines('Primeira frase.\n\n\nSegunda frase.\n\n', 11), ['Primeira frase.', '', 'Segunda frase.']);
    assert.deepEqual(buildPrompterLines('   ', 11), []);
  });

  it('strips bracket markers like [Gancho] and [Fato] from text and prompter lines', () => {
    assert.equal(stripBracketMarkers('[Gancho] Frase com gancho.'), 'Frase com gancho.');
    assert.equal(stripBracketMarkers('[Fato]'), '');
    assert.deepEqual(
      buildPrompterLines('[Gancho] Primeira frase do vídeo.\n\n[Fato] Segunda frase.', 11),
      ['Primeira frase do vídeo.', '', 'Segunda frase.']
    );
  });

  describe('parsePrompterScript (YouTube mode)', () => {
    const youtubeHtml = `
      <h2>Abertura</h2>
      <p>Bem-vindo a este canal incrível.</p>
      <div data-na-tela class="script-on-screen">Mostrar o livro na câmera</div>
      <p>Hoje falaremos sobre fantasia épica.</p>
      <h2>1. O que é a Cosmere?</h2>
      <p>A Cosmere é um universo vasto criado por Brandon Sanderson.</p>
      <p>Vários mundos compartilham a mesma magia.</p>
      <h2>Encerramento</h2>
      <p>Deixe o seu like e até a próxima.</p>
    `;

    it('extracts sections, dividers, and on-screen notes properly', () => {
      const parsed = parsePrompterScript(youtubeHtml, { isYouTube: true, maxWords: 11, wpm: 120 });
      assert.equal(parsed.hasSections, true);
      assert.equal(parsed.sections.length, 3);
      assert.equal(parsed.sections[0].title, 'Abertura');
      assert.equal(parsed.sections[1].title, '1. O que é a Cosmere?');
      assert.equal(parsed.sections[2].title, 'Encerramento');

      // Check section dividers
      const dividers = parsed.items.filter(item => item.kind === 'section-divider');
      assert.equal(dividers.length, 3);
      assert.equal(dividers[0].text, 'Abertura');
      assert.equal(dividers[0].wordCount, 0);

      // Check on-screen note
      const notes = parsed.items.filter(item => item.kind === 'on-screen-note');
      assert.equal(notes.length, 1);
      assert.equal(notes[0].text, 'Mostrar o livro na câmera');
      assert.equal(notes[0].wordCount, 0);

      // Section titles and notes do NOT count as words
      const spokenItems = parsed.items.filter(item => item.kind === 'spoken');
      const spokenWordCount = spokenItems.reduce((acc, item) => acc + item.wordCount, 0);
      assert.equal(parsed.totalWords, spokenWordCount);

      // First spoken index points to spoken item, not the divider
      assert.equal(parsed.items[parsed.sections[0].firstSpokenIndex].kind, 'spoken');
      assert.equal(parsed.items[parsed.sections[1].firstSpokenIndex].kind, 'spoken');
      assert.equal(parsed.items[parsed.sections[2].firstSpokenIndex].kind, 'spoken');
    });

    it('handles script with text before first explicit heading', () => {
      const scriptWithIntro = `
        <p>Texto inicial antes do primeiro título.</p>
        <h2>Capítulo 1</h2>
        <p>Texto do primeiro capítulo.</p>
      `;
      const parsed = parsePrompterScript(scriptWithIntro, { isYouTube: true, fallbackTitle: 'Intro Geral' });
      assert.equal(parsed.sections.length, 2);
      assert.equal(parsed.sections[0].title, 'Intro Geral');
      assert.equal(parsed.sections[1].title, 'Capítulo 1');
    });

    it('handles non-YouTube scripts by keeping lines flat without dividers', () => {
      const parsed = parsePrompterScript('<p>[Gancho] Texto simples.</p><p>Mais texto.</p>', { isYouTube: false });
      assert.equal(parsed.hasSections, false);
      const dividers = parsed.items.filter(item => item.kind === 'section-divider');
      assert.equal(dividers.length, 0);
      assert.ok(parsed.items.some(item => item.text === 'Texto simples.'));
    });
  });
});
