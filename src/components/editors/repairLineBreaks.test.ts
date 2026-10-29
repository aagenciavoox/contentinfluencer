import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {needsLegacyLineBreakRepair, repairLegacyLineBreaks} from './repairLineBreaks.ts';

describe('repairLineBreaks', () => {
  it('detecta quebras literais e ignora HTML já estruturado', () => {
    assert.equal(needsLegacyLineBreakRepair('<p>a</p><p>b</p>'), false);
    assert.equal(needsLegacyLineBreakRepair('<p>a<br>b</p>'), false);
    assert.equal(needsLegacyLineBreakRepair('<p>linha 1\nlinha 2</p>'), true);
    assert.equal(needsLegacyLineBreakRepair('<p>a&#10;b</p>'), true);
    assert.equal(needsLegacyLineBreakRepair('bloco\\ncom escape'), true);
    assert.equal(needsLegacyLineBreakRepair('<p>\n  <strong>ok</strong>\n</p>'), false);
  });

  it('repara newlines dentro de parágrafo sem inventar a partir de espaços', () => {
    assert.equal(
      repairLegacyLineBreaks('<p>linha 1\nlinha 2\n\nnovo parágrafo</p>'),
      '<p>linha 1<br>linha 2</p><p>novo parágrafo</p>',
    );
    assert.equal(
      repairLegacyLineBreaks('<p>só um bloco contínuo sem quebras</p>'),
      '<p>só um bloco contínuo sem quebras</p>',
    );
    assert.equal(
      repairLegacyLineBreaks('a\\nb\\n\\nc'),
      '<p>a<br>b</p><p>c</p>',
    );
  });
});
