import assert from 'node:assert/strict';
import {
  DEFAULT_EDITORIAL_SETTINGS,
  EDITORIAL_SETTINGS_PREFERENCE_KEY,
  EDITORIAL_SETTINGS_VERSION,
  atualizarPreferencias,
  getEditorialSettings,
  upsertDecisaoPeriodo,
} from './editorialSettings.ts';

function testDefaults() {
  assert.deepEqual(getEditorialSettings({}), DEFAULT_EDITORIAL_SETTINGS);
  assert.deepEqual(getEditorialSettings(null), DEFAULT_EDITORIAL_SETTINGS);
  assert.equal(DEFAULT_EDITORIAL_SETTINGS.versao, EDITORIAL_SETTINGS_VERSION);
  assert.equal(DEFAULT_EDITORIAL_SETTINGS.quickSeriesCreate, true);
  assert.equal(DEFAULT_EDITORIAL_SETTINGS.openInfoNotices, true);
  assert.equal(DEFAULT_EDITORIAL_SETTINGS.redeReferenciaId, null);
  assert.deepEqual(DEFAULT_EDITORIAL_SETTINGS.destinosPadrao, []);
  assert.equal(DEFAULT_EDITORIAL_SETTINGS.estoqueDesejado, null);
  assert.equal(DEFAULT_EDITORIAL_SETTINGS.distribuicaoFuncoes, null);
  assert.equal(DEFAULT_EDITORIAL_SETTINGS.preferencias.limiteSemanal, null);
  assert.deepEqual(DEFAULT_EDITORIAL_SETTINGS.periodos, []);
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

  assert.equal(settings.versao, 2);
  assert.equal(settings.quickSeriesCreate, false);
  assert.equal(settings.openInfoNotices, false);
  assert.equal(settings.redeReferenciaId, 'plat-instagram');
  assert.equal(settings.preferencias.redeReferenciaId, 'plat-instagram');
  assert.deepEqual(settings.destinosPadrao, ['plat-instagram', 'plat-tiktok']);
  assert.equal(settings.preferencias.limiteSemanal, null);
  assert.deepEqual(settings.periodos, []);
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

function testPercentuaisAntigosNaoEntramNasMetas() {
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
      redeReferenciaId: 'plat-instagram',
      estoqueDesejado: 4,
      periodos: [{
        inicio: '2026-10-01',
        fim: '2026-10-31',
        prioridade: 'não devia entrar',
        metas: { atrair: 20 },
        ajustesSemana: [],
      }],
    },
  });

  assert.equal(settings.versao, 2);
  assert.equal(settings.distribuicaoFuncoes, null);
  assert.deepEqual(settings.periodos, []);
  assert.equal(settings.preferencias.limiteSemanal, null);
  assert.equal(settings.preferencias.redeReferenciaId, 'plat-instagram');
  assert.equal(settings.redeReferenciaId, 'plat-instagram');
  assert.equal(settings.preferencias.reservaProntos, 4);
  assert.equal(settings.estoqueDesejado, 4);
}

function testLimiteSemanalAusenteContinuaNull() {
  const semCampo = getEditorialSettings({
    [EDITORIAL_SETTINGS_PREFERENCE_KEY]: {
      versao: 2,
      preferencias: {
        redeReferenciaId: 'plat-instagram',
        publicoLinguagem: 'direto',
      },
    },
  });
  assert.equal(semCampo.preferencias.limiteSemanal, null);
  assert.equal(semCampo.preferencias.reservaForaSeriesSemanal, null);
  assert.equal(semCampo.preferencias.publicoLinguagem, 'direto');

  const explicito = getEditorialSettings({
    [EDITORIAL_SETTINGS_PREFERENCE_KEY]: {
      versao: 2,
      preferencias: { limiteSemanal: null },
    },
  });
  assert.equal(explicito.preferencias.limiteSemanal, null);

  const zero = getEditorialSettings({
    [EDITORIAL_SETTINGS_PREFERENCE_KEY]: {
      versao: 2,
      preferencias: { limiteSemanal: 0 },
    },
  });
  assert.equal(zero.preferencias.limiteSemanal, 0);
}

function testVersao2EspelhaPreferencias() {
  const settings = getEditorialSettings({
    [EDITORIAL_SETTINGS_PREFERENCE_KEY]: {
      versao: 2,
      redeReferenciaId: 'antiga',
      estoqueDesejado: 9,
      preferencias: {
        limiteSemanal: 7,
        reservaForaSeriesSemanal: 3,
        redeReferenciaId: 'nova',
        reservaProntos: 2,
        publicoLinguagem: 'leve',
        disponibilidade: 'noites',
        hashtagsForaSeries: '#livro',
      },
      limitesHashtags: { 'plat-instagram': 8 },
      quickSeriesCreate: false,
    },
  });

  assert.equal(settings.versao, 2);
  assert.equal(settings.redeReferenciaId, 'nova');
  assert.equal(settings.estoqueDesejado, 2);
  assert.equal(settings.preferencias.limiteSemanal, 7);
  assert.equal(settings.preferencias.reservaForaSeriesSemanal, 3);
  assert.equal(settings.preferencias.publicoLinguagem, 'leve');
  assert.equal(settings.preferencias.disponibilidade, 'noites');
  assert.equal(settings.preferencias.hashtagsForaSeries, '#livro');
  assert.equal(settings.limitesHashtags['plat-instagram'], 8);
  assert.equal(settings.quickSeriesCreate, false);
  assert.equal(settings.distribuicaoFuncoes, null);
}

function testReservaNaoPassaDoLimite() {
  const settings = getEditorialSettings({
    [EDITORIAL_SETTINGS_PREFERENCE_KEY]: {
      versao: 2,
      preferencias: { limiteSemanal: 7, reservaForaSeriesSemanal: 10 },
    },
  });
  assert.equal(settings.preferencias.limiteSemanal, 7);
  assert.equal(settings.preferencias.reservaForaSeriesSemanal, 7);

  const atual = atualizarPreferencias(getEditorialSettings({}), {
    limiteSemanal: 14,
    reservaForaSeriesSemanal: 4,
  });
  assert.equal(atual.preferencias.reservaForaSeriesSemanal, 4);

  const estoura = atualizarPreferencias(atual, { reservaForaSeriesSemanal: 20 });
  assert.equal(estoura.preferencias.limiteSemanal, 14);
  assert.equal(estoura.preferencias.reservaForaSeriesSemanal, 14);

  const semLimite = atualizarPreferencias(atual, { limiteSemanal: null });
  assert.equal(semLimite.preferencias.limiteSemanal, null);
  assert.equal(semLimite.preferencias.reservaForaSeriesSemanal, 4);
}

function testAtualizarPreferenciasEspelhaOTopo() {
  const settings = atualizarPreferencias(getEditorialSettings({}), {
    redeReferenciaId: 'plat-ig',
    reservaProntos: 6,
    disponibilidade: 'manhãs',
  });
  assert.equal(settings.versao, 2);
  assert.equal(settings.redeReferenciaId, 'plat-ig');
  assert.equal(settings.preferencias.redeReferenciaId, 'plat-ig');
  assert.equal(settings.estoqueDesejado, 6);
  assert.equal(settings.preferencias.reservaProntos, 6);
  assert.equal(settings.preferencias.disponibilidade, 'manhãs');
  assert.equal(settings.distribuicaoFuncoes, null);
}

function testDoisPeriodosMantemPrioridades() {
  const outubro = upsertDecisaoPeriodo(getEditorialSettings({}), {
    inicio: '2026-10-01',
    fim: '2026-10-31',
    prioridade: 'lançamento',
    metas: { atrair: 8 },
    ajustesSemana: [],
  });
  const ambos = upsertDecisaoPeriodo(outubro, {
    inicio: '2026-11-01',
    fim: '2026-11-30',
    prioridade: 'comunidade',
    metas: { comunidade: 4 },
    ajustesSemana: [],
  });

  assert.equal(ambos.periodos.length, 2);
  assert.equal(ambos.periodos[0].prioridade, 'lançamento');
  assert.deepEqual(ambos.periodos[0].metas, { atrair: 8 });
  assert.equal(ambos.periodos[1].prioridade, 'comunidade');
  assert.deepEqual(ambos.periodos[1].metas, { comunidade: 4 });

  const outubroDeNovo = upsertDecisaoPeriodo(ambos, {
    inicio: '2026-10-01',
    fim: '2026-10-31',
    prioridade: 'alcance',
    metas: { converter: 3 },
    ajustesSemana: [{ inicio: '2026-10-04', fim: '2026-10-10', limite: 9 }],
  });
  assert.equal(outubroDeNovo.periodos.length, 2);
  assert.equal(outubroDeNovo.periodos[0].prioridade, 'alcance');
  assert.deepEqual(outubroDeNovo.periodos[0].metas, { converter: 3 });
  assert.equal(outubroDeNovo.periodos[1].prioridade, 'comunidade');
  assert.deepEqual(outubroDeNovo.periodos[1].metas, { comunidade: 4 });

  const lido = getEditorialSettings({
    [EDITORIAL_SETTINGS_PREFERENCE_KEY]: outubroDeNovo,
  });
  assert.equal(lido.versao, 2);
  assert.equal(lido.periodos[0].prioridade, 'alcance');
  assert.equal(lido.periodos[1].prioridade, 'comunidade');
  assert.deepEqual(lido.periodos[1].metas, { comunidade: 4 });
}

function testEstoqueDesejado() {
  assert.equal(getEditorialSettings({}).estoqueDesejado, null);

  const saved = getEditorialSettings({
    [EDITORIAL_SETTINGS_PREFERENCE_KEY]: { estoqueDesejado: 4 },
  });
  assert.equal(saved.estoqueDesejado, 4);
  assert.equal(saved.preferencias.reservaProntos, 4);

  for (const invalid of ['4', 4.5, -1, null, true]) {
    const settings = getEditorialSettings({
      [EDITORIAL_SETTINGS_PREFERENCE_KEY]: { estoqueDesejado: invalid },
    });
    assert.equal(settings.estoqueDesejado, null);
    assert.equal(settings.preferencias.reservaProntos, null);
  }
}

testDefaults();
testReadsSavedValues();
testRejectsInvalidValues();
testPercentuaisAntigosNaoEntramNasMetas();
testLimiteSemanalAusenteContinuaNull();
testVersao2EspelhaPreferencias();
testReservaNaoPassaDoLimite();
testAtualizarPreferenciasEspelhaOTopo();
testDoisPeriodosMantemPrioridades();
testEstoqueDesejado();

console.log('editorialSettings tests passed');
