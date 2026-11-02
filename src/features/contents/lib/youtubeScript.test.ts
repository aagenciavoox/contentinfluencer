import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  countSpokenWords,
  formatSpokenRange,
  groupSections,
  moveSection,
  nextSectionTitle,
  sectionModelHtml,
  stripOnScreenNotes,
} from './youtubeScript.ts';
import { normalizeWritingMode, writingModeChange } from './carouselSlides.ts';

describe('modo YouTube', () => {
  it('não conta o "Na tela" como fala', () => {
    const html = '<h2>Abertura</h2><p>Calma, gente.</p><div data-na-tela="" class="script-on-screen">Mostrar as capas dos livros</div><p>Vamos lá.</p>';
    assert.equal(stripOnScreenNotes(html), '<h2>Abertura</h2><p>Calma, gente.</p><p>Vamos lá.</p>');
    assert.equal(countSpokenWords(html), 5);
    assert.equal(countSpokenWords(null), 0);
  });

  it('mostra a fala como faixa de minutos', () => {
    assert.equal(formatSpokenRange(0), '0 min');
    assert.equal(formatSpokenRange(40), 'menos de 1 min');
    assert.equal(formatSpokenRange(120), '1 min');
    assert.equal(formatSpokenRange(1840), '13–15 min');
  });

  it('agrupa o roteiro em seções a partir dos títulos', () => {
    const blocks = ['p:intro', 'h:Abertura', 'p:a', 'h:Meio', 'p:b', 'p:c', 'h:Fim'];
    const groups = groupSections(blocks, block => block.startsWith('h:'));
    assert.deepEqual(groups.intro, ['p:intro']);
    assert.deepEqual(groups.sections, [['h:Abertura', 'p:a'], ['h:Meio', 'p:b', 'p:c'], ['h:Fim']]);
  });

  it('move a seção com o texto dela e deixa a introdução no topo', () => {
    const groups = groupSections(['p:intro', 'h:A', 'p:a', 'h:B', 'p:b', 'h:C'], block => block.startsWith('h:'));
    assert.deepEqual(moveSection(groups, 2, 0), ['p:intro', 'h:C', 'h:A', 'p:a', 'h:B', 'p:b']);
    assert.deepEqual(moveSection(groups, 0, 2), ['p:intro', 'h:B', 'p:b', 'h:C', 'h:A', 'p:a']);
    // Posição fora da lista não mexe em nada.
    assert.deepEqual(moveSection(groups, 0, 9), ['p:intro', 'h:A', 'p:a', 'h:B', 'p:b', 'h:C']);
  });

  it('dá nome livre à seção nova e monta o modelo', () => {
    assert.equal(nextSectionTitle(['Abertura']), 'Nova seção');
    assert.equal(nextSectionTitle(['Nova seção', 'nova seção 2']), 'Nova seção 3');
    assert.equal(sectionModelHtml(['Abertura', 'Fim & CTA']), '<h2>Abertura</h2><p></p><h2>Fim &amp; CTA</h2><p></p>');
  });

  it('troca de modo sem apagar o texto', () => {
    assert.equal(normalizeWritingMode('youtube'), 'youtube');
    assert.deepEqual(writingModeChange('youtube', { script: '<p>Oi</p>' }), { writingMode: 'youtube' });
    assert.deepEqual(writingModeChange('texto', { script: '<p>Oi</p>' }), { writingMode: 'texto' });
    const carrossel = writingModeChange('carrossel', { script: '<p>Oi</p>' });
    assert.equal(carrossel.writingMode, 'carrossel');
    assert.equal(carrossel.carouselSlides?.[0]?.html, '<p>Oi</p>');
  });
});
