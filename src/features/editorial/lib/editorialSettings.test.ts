import assert from 'node:assert/strict';
import {
  DEFAULT_EDITORIAL_SETTINGS,
  EDITORIAL_SETTINGS_PREFERENCE_KEY,
  getEditorialSettings,
} from './editorialSettings.ts';

function testDefaults() {
  assert.deepEqual(getEditorialSettings({}), DEFAULT_EDITORIAL_SETTINGS);
  assert.deepEqual(getEditorialSettings(null), DEFAULT_EDITORIAL_SETTINGS);
  assert.equal(DEFAULT_EDITORIAL_SETTINGS.quickSeriesCreate, true);
  assert.equal(DEFAULT_EDITORIAL_SETTINGS.openInfoNotices, true);
  assert.equal(DEFAULT_EDITORIAL_SETTINGS.redeReferenciaId, null);
  assert.deepEqual(DEFAULT_EDITORIAL_SETTINGS.destinosPadrao, []);
  assert.equal(DEFAULT_EDITORIAL_SETTINGS.estoqueDesejado, null);
}

function testReadsSavedValues() {
  const settings = getEditorialSettings({
    [EDITORIAL_SETTINGS_PREFERENCE_KEY]: {
      quickSeriesCreate: false,
      openInfoNotices: false,
      redeReferenciaId: 'plat-instagram',
      destinosPadrao: ['plat-instagram', 'plat-tiktok', 'plat-instagram'],
    },
  });

  assert.equal(settings.quickSeriesCreate, false);
  assert.equal(settings.openInfoNotices, false);
  assert.equal(settings.redeReferenciaId, 'plat-instagram');
  assert.deepEqual(settings.destinosPadrao, ['plat-instagram', 'plat-tiktok']);
}

function testRejectsInvalidValues() {
  const settings = getEditorialSettings({
    [EDITORIAL_SETTINGS_PREFERENCE_KEY]: {
      quickSeriesCreate: 'no',
      redeReferenciaId: 12,
      destinosPadrao: ['ok', '', 4, null],
    },
  });

  assert.equal(settings.quickSeriesCreate, true);
  assert.equal(settings.openInfoNotices, true);
  assert.equal(settings.redeReferenciaId, null);
  assert.deepEqual(settings.destinosPadrao, ['ok']);
}


function testDistribuicaoFuncoes() {
  assert.equal(DEFAULT_EDITORIAL_SETTINGS.distribuicaoFuncoes, null);

  const settings = getEditorialSettings({
    [EDITORIAL_SETTINGS_PREFERENCE_KEY]: {
      distribuicaoFuncoes: {
        atrair: 20,
        converter: 20,
        aprofundar: 20,
        comunidade: 20,
        acao: 10,
        reter: 10,
      },
    },
  });
  assert.deepEqual(settings.distribuicaoFuncoes, {
    atrair: 20,
    converter: 20,
    aprofundar: 20,
    comunidade: 20,
    acao: 10,
    reter: 10,
  });

  const partial = getEditorialSettings({
    [EDITORIAL_SETTINGS_PREFERENCE_KEY]: {
      distribuicaoFuncoes: { atrair: 50, converter: 50 },
    },
  });
  assert.equal(partial.distribuicaoFuncoes, null);
}

function testEstoqueDesejado() {
  assert.equal(getEditorialSettings({}).estoqueDesejado, null);

  const saved = getEditorialSettings({
    [EDITORIAL_SETTINGS_PREFERENCE_KEY]: { estoqueDesejado: 4 },
  });
  assert.equal(saved.estoqueDesejado, 4);

  for (const invalid of ['4', 4.5, -1, null, true]) {
    const settings = getEditorialSettings({
      [EDITORIAL_SETTINGS_PREFERENCE_KEY]: { estoqueDesejado: invalid },
    });
    assert.equal(settings.estoqueDesejado, null);
  }
}

testDefaults();
testReadsSavedValues();
testRejectsInvalidValues();
testDistribuicaoFuncoes();
testEstoqueDesejado();

console.log('editorialSettings tests passed');