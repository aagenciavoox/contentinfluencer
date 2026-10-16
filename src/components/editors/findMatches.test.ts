import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findAllInText, findMatchesInBlocks, stepMatch } from './findMatches.ts';

describe('buscar e substituir', () => {
  it('acha sem diferenciar maiúsculas, com acento', () => {
    assert.deepEqual(findAllInText('Ação, ação e AÇÃO', 'ação'), [0, 6, 13]);
    assert.deepEqual(findAllInText('Ação, ação', 'ação', true), [6]);
  });

  it('não sobrepõe e ignora busca vazia', () => {
    assert.deepEqual(findAllInText('aaaa', 'aa'), [0, 2]);
    assert.deepEqual(findAllInText('abc', ''), []);
  });

  it('converte para posições do documento por bloco', () => {
    const blocks = [{ pos: 1, text: 'gancho aqui' }, { pos: 14, text: 'outro gancho' }];
    assert.deepEqual(findMatchesInBlocks(blocks, 'gancho'), [
      { from: 1, to: 7 },
      { from: 20, to: 26 },
    ]);
  });

  it('próximo/anterior dá a volta', () => {
    assert.equal(stepMatch(2, 3, 1), 0);
    assert.equal(stepMatch(0, 3, -1), 2);
    assert.equal(stepMatch(-1, 3, -1), 2);
    assert.equal(stepMatch(0, 0, 1), -1);
  });
});
