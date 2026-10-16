import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findSentenceRange } from './sentenceSelection.ts';

function pick(text: string, needle: string) {
  const { start, end } = findSentenceRange(text, text.indexOf(needle));
  return text.slice(start, end);
}

describe('seleção de frase (triplo clique)', () => {
  const text = 'Primeira frase aqui. Segunda pergunta? Terceira exclamação! Quarta sem fim';

  it('pega a frase do meio sem o espaço seguinte', () => {
    assert.equal(pick(text, 'pergunta'), 'Segunda pergunta?');
  });

  it('pega a primeira e a última frase', () => {
    assert.equal(pick(text, 'Primeira'), 'Primeira frase aqui.');
    assert.equal(pick(text, 'sem fim'), 'Quarta sem fim');
  });

  it('para em reticências e quebra de linha', () => {
    assert.equal(pick('Então… veio o gancho. Fim', 'veio'), 'veio o gancho.');
    assert.equal(pick('Linha um\nLinha dois. Outra', 'dois'), 'Linha dois.');
    assert.equal(pick('Linha um\nLinha dois', 'um'), 'Linha um');
  });

  it('não corta em ponto sem espaço (números, siglas coladas, ?!)', () => {
    assert.equal(pick('Custa 2.5 reais hoje. Depois', 'reais'), 'Custa 2.5 reais hoje.');
    assert.equal(pick('Sério?! Sim. ', 'Sério'), 'Sério?!');
  });

  it('inclui aspas de fechamento', () => {
    assert.equal(pick('Ele disse "vai." Depois saiu.', 'disse'), 'Ele disse "vai."');
    assert.equal(pick('Ele disse "vai." Depois saiu.', 'Depois'), 'Depois saiu.');
  });

  it('texto vazio e clique no fim', () => {
    assert.deepEqual(findSentenceRange('', 0), { start: 0, end: 0 });
    assert.deepEqual(findSentenceRange('Oi. Tchau.', 99), { start: 4, end: 10 });
  });
});
