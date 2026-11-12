import assert from 'node:assert/strict';
import {
  DEFAULT_EDITORIAL_SETTINGS,
  EDITORIAL_SETTINGS_PREFERENCE_KEY,
  EDITORIAL_SETTINGS_VERSION,
  atualizarAviso,
  atualizarPerfilEditorial,
  atualizarPreferencias,
  getEditorialSettings,
  lerPerfilEditorial,
  lerMetodoCalculo,
  upsertDecisaoPeriodo,
} from './editorialSettings.ts';
import { avisoLigado, lerAvisosLigados, linhasSemRegrasDesligadas, semAvisosDesligados, TIPOS_AVISO_CONFIGURAVEIS } from './avisosEditoriais.ts';
import { ABA_EDITORIAL_PADRAO, abaEditorialDaUrl, ancoraDaAbaAntiga, EDITORIAL_ABAS, ehAbaAntiga, paramsDaAba, ROTULO_DA_ABA } from './abasEditorial.ts';

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
  });
  assert.equal(settings.versao, 2);
  assert.equal(settings.redeReferenciaId, 'plat-ig');
  assert.equal(settings.preferencias.redeReferenciaId, 'plat-ig');
  assert.equal(settings.estoqueDesejado, 6);
  assert.equal(settings.preferencias.reservaProntos, 6);
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

// Método de cálculo: o que existe hoje conta conteúdos; o método novo não reescreve o antigo.
{
  assert.equal(lerMetodoCalculo(undefined), 'conteudos-v1');
  assert.equal(lerMetodoCalculo('qualquer'), 'conteudos-v1');
  assert.equal(lerMetodoCalculo('publicacoes-v2'), 'publicacoes-v2');
  const comNovo = upsertDecisaoPeriodo(DEFAULT_EDITORIAL_SETTINGS, {
    inicio: '2027-01-01', fim: '2027-01-31', prioridade: '', metas: {}, ajustesSemana: [], metodoCalculo: 'publicacoes-v2',
  });
  const comAntigo = upsertDecisaoPeriodo(comNovo, { inicio: '2026-12-01', fim: '2026-12-31', prioridade: '', metas: {}, ajustesSemana: [] });
  assert.equal(comAntigo.periodos.find(p => p.inicio === '2027-01-01')?.metodoCalculo, 'publicacoes-v2');
  assert.equal(comAntigo.periodos.find(p => p.inicio === '2026-12-01')?.metodoCalculo, 'conteudos-v1');
}

// Perfil editorial: o texto antigo vira o Público; editar o Público também grava o campo antigo.
{
  assert.deepEqual(lerPerfilEditorial(null, 'Leitoras de fantasia, tom leve'), {
    publico: 'Leitoras de fantasia, tom leve', motivacaoPublico: '', linguagens: '', assuntos: '',
  });
  assert.equal(lerPerfilEditorial({ publico: 'Novo', assuntos: 'Livros' }, 'antigo').publico, 'Novo');
  const legado = atualizarPreferencias(DEFAULT_EDITORIAL_SETTINGS, { publicoLinguagem: 'Quem lê fantasia' });
  assert.equal(legado.perfil?.publico, 'Quem lê fantasia');
  const editado = atualizarPerfilEditorial(legado, { motivacaoPublico: 'Achar a próxima leitura' });
  assert.equal(editado.perfil?.publico, 'Quem lê fantasia');
  assert.equal(editado.perfil?.motivacaoPublico, 'Achar a próxima leitura');
  const novoPublico = atualizarPerfilEditorial(editado, { publico: 'Jovens leitores' });
  assert.equal(novoPublico.perfil?.publico, 'Jovens leitores');
  assert.equal(novoPublico.preferencias.publicoLinguagem, 'Jovens leitores');
  // Mudar outra preferência não apaga o perfil.
  assert.equal(atualizarPreferencias(novoPublico, { hashtagsForaSeries: '#x' }).perfil?.motivacaoPublico, 'Achar a próxima leitura');
}

// Avisos: todos começam ligados; desligar um não mexe nos outros.
{
  assert.ok(TIPOS_AVISO_CONFIGURAVEIS.every(tipo => avisoLigado(DEFAULT_EDITORIAL_SETTINGS.avisos, tipo)));
  assert.ok(TIPOS_AVISO_CONFIGURAVEIS.every(tipo => avisoLigado(atualizarPreferencias(DEFAULT_EDITORIAL_SETTINGS, {}).avisos, tipo)));
  for (const tipo of ['obra-repetida', 'tema-concentrado', 'capacidade-semana', 'ausencia-12-dias', 'ausencia-mes', 'serie-acima',
    'vespera-sem-pronto', 'gravacoes-no-dia', 'serie-abaixo', 'serie-reservada', 'distancia', 'dias-seguidos'] as const) {
    assert.ok(TIPOS_AVISO_CONFIGURAVEIS.includes(tipo), tipo);
  }
  const semObra = atualizarAviso(DEFAULT_EDITORIAL_SETTINGS, 'obra-repetida', false);
  assert.equal(avisoLigado(semObra.avisos, 'obra-repetida'), false);
  assert.equal(avisoLigado(semObra.avisos, 'tema-concentrado'), true);
  assert.equal(avisoLigado(atualizarAviso(semObra, 'obra-repetida', true).avisos, 'obra-repetida'), true);
  // Desligado continua desligado depois de mudar outra preferência.
  assert.equal(avisoLigado(atualizarPreferencias(semObra, { hashtagsForaSeries: '#y' }).avisos, 'obra-repetida'), false);
  assert.deepEqual(lerAvisosLigados({ 'obra-repetida': false, inventado: false, 'serie-acima': 'nao' }), { 'obra-repetida': false });
  const lista = [{ tipo: 'obra-repetida' }, { tipo: 'serie-abaixo' }];
  assert.deepEqual(semAvisosDesligados(lista, { 'obra-repetida': false }), [{ tipo: 'serie-abaixo' }]);
  assert.deepEqual(semAvisosDesligados(lista, {}), lista);
  // Continuidade: dias sem episódio e dias seguidos somem da linha quando desligados.
  const linha = { abaixo: [], reservadas: [], concentrada: false, precisaAtencao: true, distancias: [{ dias: 9 }], diasSeguidos: [{ dia: 'x' }] };
  const [semDistancia] = linhasSemRegrasDesligadas([linha], { distancia: false });
  assert.deepEqual([semDistancia.distancias.length, semDistancia.diasSeguidos.length, semDistancia.precisaAtencao], [0, 1, true]);
  const [semNada] = linhasSemRegrasDesligadas([linha], { distancia: false, 'dias-seguidos': false });
  assert.equal(semNada.precisaAtencao, false);
  assert.deepEqual(linhasSemRegrasDesligadas([linha], {}), [linha]);
}

// Abas do Editorial: ordem nova, Plano do período como padrão e ids antigos redirecionados.
{
  assert.deepEqual(EDITORIAL_ABAS.map(aba => ROTULO_DA_ABA[aba]), [
    'Plano do período', 'Direção editorial', 'Rotina de criação', 'Contas e formatos',
  ]);
  assert.equal(ABA_EDITORIAL_PADRAO, 'plano');
  assert.equal(abaEditorialDaUrl(null), 'plano');
  assert.equal(abaEditorialDaUrl('qualquer'), 'plano');
  assert.equal(abaEditorialDaUrl('pilares'), 'direcao');
  assert.equal(abaEditorialDaUrl('ajustes'), 'ajustes');
  assert.equal(abaEditorialDaUrl('contas'), 'contas');
  // Abas que viraram blocos: abrem a aba nova e levam ao bloco.
  assert.equal(abaEditorialDaUrl('continuidade'), 'plano');
  assert.equal(ancoraDaAbaAntiga('continuidade'), 'continuidade');
  assert.equal(abaEditorialDaUrl('avisos'), 'ajustes');
  assert.equal(ancoraDaAbaAntiga('avisos'), 'avisos');
  assert.equal(abaEditorialDaUrl('operacional'), 'direcao');
  assert.equal(ancoraDaAbaAntiga('operacional'), 'hashtags');
  assert.equal(abaEditorialDaUrl('capacidade'), 'ajustes');
  assert.equal(ancoraDaAbaAntiga('capacidade'), null);
  assert.equal(ancoraDaAbaAntiga('ajustes'), null);
  assert.equal(ehAbaAntiga('continuidade'), true);
  assert.equal(ehAbaAntiga('pilares'), true);
  assert.equal(ehAbaAntiga('ajustes'), false);
  assert.equal(ehAbaAntiga(null), false);
  assert.equal(ehAbaAntiga('qualquer'), false);
  assert.equal(paramsDaAba(new URLSearchParams('aba=continuidade&editar=s%3A1'), abaEditorialDaUrl('continuidade')).toString(), 'editar=s%3A1');
  assert.equal(paramsDaAba(new URLSearchParams('aba=avisos&x=1'), 'plano').toString(), 'x=1');
  assert.equal(paramsDaAba(new URLSearchParams(''), 'ajustes').toString(), 'aba=ajustes');
}

console.log('editorialSettings tests passed');

// --- Indicadores da rotina: só a meta é obrigatória; mínimo e máximo são referência de alerta.
{
  const ind = await import('./indicadoresProducao.ts');
  const { atualizarIndicador } = await import('./editorialSettings.ts');
  assert.deepEqual(ind.validarFaixa({ minimo: '', meta: '', maximo: '' }), { faixa: null, erros: [] }, 'tudo vazio = sem indicador');
  assert.equal(ind.validarFaixa({ minimo: '2', meta: '', maximo: '' }).erros[0].campo, 'meta');
  assert.deepEqual(ind.validarFaixa({ minimo: '', meta: '4', maximo: '' }).faixa, { minimo: null, meta: 4, maximo: null });
  assert.equal(ind.validarFaixa({ minimo: '5', meta: '4', maximo: '' }).erros[0].campo, 'minimo');
  assert.equal(ind.validarFaixa({ minimo: '', meta: '4', maximo: '3' }).erros[0].campo, 'maximo');
  const faixa = { minimo: 3, meta: 4, maximo: 6 };
  assert.equal(ind.avaliarFaixa(2, faixa).estado, 'abaixo');
  assert.equal(ind.avaliarFaixa(3, faixa).estado, 'progresso', 'no mínimo não alerta');
  assert.equal(ind.avaliarFaixa(4, faixa).estado, 'na-meta');
  assert.equal(ind.avaliarFaixa(7, faixa).aviso, 'acima');
  assert.equal(ind.avaliarFaixa(5, { minimo: null, meta: 4, maximo: null }).aviso, 'acima', 'lado vazio segue a meta');
  assert.equal(ind.avaliarFaixa(5, { minimo: null, meta: 4, maximo: null }, { abaixo: true, acima: false }).aviso, null, 'aviso desligado não aparece');
  const comFaixa = atualizarIndicador(DEFAULT_EDITORIAL_SETTINGS, 'videosPorDiaGravacao', faixa);
  assert.deepEqual(comFaixa.indicadoresProducao?.videosPorDiaGravacao, faixa);
  const semFaixa = atualizarIndicador(comFaixa, 'videosPorDiaGravacao', null);
  assert.equal(semFaixa.indicadoresProducao?.videosPorDiaGravacao, undefined);
}
// --- Limite da saturação de quadro: grava 1 ou 2 dentro do jsonb de avisos, sem mexer nos outros avisos.
{
  const { atualizarLimiteSaturacao } = await import('./editorialSettings.ts');
  const { limiteSaturacaoQuadro, CHAVE_LIMITE_SATURACAO } = await import('./avisosEditoriais.ts');
  assert.equal(limiteSaturacaoQuadro(DEFAULT_EDITORIAL_SETTINGS.avisos), 2);
  const comUm = atualizarLimiteSaturacao({ ...DEFAULT_EDITORIAL_SETTINGS, avisos: { distancia: false } }, 1);
  assert.equal(limiteSaturacaoQuadro(comUm.avisos), 1);
  assert.equal(comUm.avisos?.distancia, false, 'outro aviso desligado continua desligado');
  assert.equal(comUm.avisos?.[CHAVE_LIMITE_SATURACAO], 1);
  assert.equal(limiteSaturacaoQuadro(atualizarLimiteSaturacao(comUm, 2).avisos), 2);
  console.log('editorialSettings (limite da saturação): ok');
}
