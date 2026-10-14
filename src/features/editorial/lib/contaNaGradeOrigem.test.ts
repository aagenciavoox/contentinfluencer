import assert from 'node:assert/strict';
import {
  classificarOrigemContaNaGrade,
  contaNaGradeEfetiva,
} from './contaNaGradeOrigem.ts';

function testClassificaOLegadoAntesDaRegraNova() {
  assert.equal(classificarOrigemContaNaGrade(false, 'Stories', 'atrair'), 'regra');
  assert.equal(classificarOrigemContaNaGrade(false, 'Live', 'converter'), 'regra');
  assert.equal(classificarOrigemContaNaGrade(false, 'Reels', 'reter'), 'regra');
  assert.equal(classificarOrigemContaNaGrade(false, 'Reels', 'atrair'), 'manual');
  assert.equal(classificarOrigemContaNaGrade(true, 'Stories', 'atrair'), 'manual');
  assert.equal(classificarOrigemContaNaGrade(true, 'Live', 'atrair'), 'manual');
  assert.equal(classificarOrigemContaNaGrade(true, 'Reels', 'reter'), 'manual');
  assert.equal(classificarOrigemContaNaGrade(true, 'Reels', 'atrair'), 'regra');
}

function testRegraNovaContaLiveEReter() {
  assert.equal(contaNaGradeEfetiva({
    contaNaGrade: false,
    formato: 'Live',
    funcao: 'converter',
  }), true);
  assert.equal(contaNaGradeEfetiva({
    contaNaGrade: false,
    formato: 'Reels',
    funcao: 'reter',
  }), true);
  assert.equal(contaNaGradeEfetiva({
    contaNaGrade: false,
    formato: 'Stories',
    funcao: 'atrair',
  }), false);
  assert.equal(contaNaGradeEfetiva({
    contaNaGrade: false,
    formato: 'Reels',
    funcao: 'atrair',
  }), false);
  assert.equal(contaNaGradeEfetiva({
    contaNaGrade: true,
    formato: 'Stories',
    funcao: 'atrair',
  }), true);
}

function testOrigemExplicitaNaoReclassifica() {
  assert.equal(contaNaGradeEfetiva({
    contaNaGrade: false,
    contaNaGradeOrigem: 'manual',
    formato: 'Live',
    funcao: 'reter',
  }), false);
  assert.equal(contaNaGradeEfetiva({
    contaNaGrade: false,
    contaNaGradeOrigem: 'regra',
    formato: 'Live',
    funcao: 'converter',
  }), true);
  assert.equal(contaNaGradeEfetiva({
    contaNaGrade: false,
    contaNaGradeOrigem: 'regra',
    formato: 'Reels',
    funcao: 'reter',
  }), true);
  assert.equal(contaNaGradeEfetiva({
    contaNaGrade: true,
    contaNaGradeOrigem: 'regra',
    formato: 'Stories',
    funcao: 'atrair',
  }), false);
}

testClassificaOLegadoAntesDaRegraNova();
testRegraNovaContaLiveEReter();
testOrigemExplicitaNaoReclassifica();

console.log('contaNaGradeOrigem tests passed');
