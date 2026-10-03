import assert from 'node:assert/strict';
import {
  PILAR_DEFAULT_COR,
  PILAR_PRESET_CORES,
  entityColorLabel,
  normalizeEntityColor,
} from './pilarConstants.ts';

function testPaletteIsMuchLargerAndUnique() {
  assert.equal(PILAR_PRESET_CORES.length, 88);
  assert.equal(new Set(PILAR_PRESET_CORES).size, PILAR_PRESET_CORES.length);
  assert.ok(PILAR_PRESET_CORES.includes(PILAR_DEFAULT_COR));
  assert.ok(PILAR_PRESET_CORES.includes('#6366F1'));
}

function testKeepsLegacyColorNames() {
  assert.equal(entityColorLabel('#F5C543'), 'Amarelo');
  assert.equal(entityColorLabel('#f5c543'), 'Amarelo');
  assert.equal(entityColorLabel('#4A90D9'), 'Azul');
  assert.equal(entityColorLabel('#37352F'), 'Preto');
}

function testLabelsCustomColors() {
  assert.equal(normalizeEntityColor('#aabbcc'), '#AABBCC');
  assert.equal(entityColorLabel('#AABBCC'), 'Personalizada · #AABBCC');
}

testPaletteIsMuchLargerAndUnique();
testKeepsLegacyColorNames();
testLabelsCustomColors();
console.log('ok - entity color palette');
