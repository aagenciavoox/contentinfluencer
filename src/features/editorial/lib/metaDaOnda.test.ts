import assert from 'node:assert/strict';
import { frequenciaParaGravar, linhasDaOnda, ondaDasLinhas } from './metaDaOnda.ts';
import type { MetaDaSerieNoEscopo } from './continuidadeEscopo.ts';
import { ancoraDaQuinzena, comAncoraNaSerie, comAncoraNaTemporada } from './ancoraQuinzena.ts';
import { expectativaNoIntervalo } from './frequenciaSerie.ts';
import { intervalosDaFrequencia, situacaoDaFrequencia } from './apuracaoSerie.ts';

const vazia = frequenciaParaGravar({ vezes: null, unidade: 'semana', aPartirDe: '2026-11-01', tipo: 'serie' });
assert.ok(!('erro' in vazia));
if (!('erro' in vazia)) {
  assert.equal(vazia.vezes, null);
  assert.equal(vazia.recomendada, null);
}

const quadro = frequenciaParaGravar({ vezes: null, unidade: 'semana', aPartirDe: null, tipo: 'quadro' });
assert.ok(!('erro' in quadro) && quadro.recomendada === 'Sob demanda');

// Sem início, a meta a cada 14 dias grava: a âncora é a segunda da semana da ativação.
const quinzena = frequenciaParaGravar({ vezes: 1, unidade: 'quinzena', aPartirDe: null, tipo: 'temporada' });
assert.ok(!('erro' in quinzena));

const trimestre = frequenciaParaGravar({ vezes: 1, unidade: 'trimestre', aPartirDe: null, tipo: 'serie' });
assert.ok(!('erro' in trimestre) && trimestre.recomendada === 'Trimestral');

const acima = frequenciaParaGravar({ vezes: 99, unidade: 'semana', aPartirDe: null, tipo: 'serie' });
assert.ok('erro' in acima && acima.campo === 'quantidade');
assert.match(acima && 'erro' in acima ? acima.erro : '', /60/);

const zero = frequenciaParaGravar({ vezes: 0, unidade: 'semana', aPartirDe: null, tipo: 'serie' });
assert.ok('erro' in zero && zero.campo === 'quantidade');

const ok = frequenciaParaGravar({ vezes: 2, unidade: 'quinzena', aPartirDe: '2026-11-04', tipo: 'serie' });
assert.ok(!('erro' in ok));
if (!('erro' in ok)) {
  assert.equal(ok.vezes, 2);
  assert.equal(ok.unidade, 'quinzena');
  assert.equal(ok.aPartirDe, '2026-11-04');
  assert.equal(ok.recomendada, '2 por quinzena');
}

// --- Janela e regras da wave: gravadas no acompanhamento e lidas de volta.
{
  const { acompanhamento } = linhasDaOnda({
    id: 't1', userId: 'u', serieId: 's', acompanhar: true,
    acompanhamentoInicio: '2026-11-01', acompanhamentoTermino: '', distanciaMaxDias: 6.7, evitarDiasSeguidos: true,
  });
  assert.equal(acompanhamento?.inicio, '2026-11-01');
  assert.equal(acompanhamento?.termino, null);
  assert.equal(acompanhamento?.distancia_max_dias, 6);
  assert.equal(acompanhamento?.evitar_dias_seguidos, true);
  const lida = ondaDasLinhas('t1', [acompanhamento!], []);
  assert.equal(lida.inicio, '2026-11-01');
  assert.equal(lida.termino, null);
  assert.equal(lida.distanciaMaxDias, 6);
  assert.equal(lida.evitarDiasSeguidos, true);
}


// --- Âncora da meta a cada 14 dias sem início (Base 2).
{
  // Ativada numa quarta (11/11/2026): a âncora é a segunda daquela semana (09/11).
  const quinzenal = { vezes: 1, unidade: 'quinzena', aPartirDe: null };
  assert.equal(ancoraDaQuinzena(quinzenal, null, '2026-11-11'), '2026-11-09');
  // Com data de início, os ciclos seguem a data: nenhuma âncora nova.
  assert.equal(ancoraDaQuinzena({ ...quinzenal, aPartirDe: '2026-11-04' }, null, '2026-11-11'), null);
  // Outras unidades ou sem quantidade: nada.
  assert.equal(ancoraDaQuinzena({ ...quinzenal, unidade: 'semana' }, null, '2026-11-11'), null);
  assert.equal(ancoraDaQuinzena({ ...quinzenal, vezes: null }, null, '2026-11-11'), null);
  // Âncora já gravada não muda, mesmo semanas depois.
  assert.equal(ancoraDaQuinzena(quinzenal, '2026-11-09', '2026-12-02'), '2026-11-09');

  // Série: liga a meta, desliga o acompanhamento, religa semanas depois — a âncora fica.
  const base = {
    frequenciaVezes: 1, frequenciaUnidade: 'quinzena', frequenciaAPartirDe: null,
    frequenciaAncora: null as string | null, metasPorEscopo: undefined as MetaDaSerieNoEscopo[] | undefined,
  };
  const ativada = comAncoraNaSerie(base, null, '2026-11-11');
  assert.equal(ativada.frequenciaAncora, '2026-11-09');
  const religada = comAncoraNaSerie({ ...base, acompanharContinuidade: true }, ativada, '2026-12-02');
  assert.equal(religada.frequenciaAncora, '2026-11-09');
  // Meta por conta herda a âncora gravada da mesma conta.
  const comConta = comAncoraNaSerie({
    ...base,
    metasPorEscopo: [{ serieId: 's', platformId: 'ig', formato: null, vezes: 2, unidade: 'quinzena', aPartirDe: null }] as MetaDaSerieNoEscopo[],
  }, null, '2026-11-11');
  assert.equal(comConta.metasPorEscopo?.[0].ancora, '2026-11-09');
  const contaDepois = comAncoraNaSerie({
    ...base,
    metasPorEscopo: [{ serieId: 's', platformId: 'ig', formato: null, vezes: 3, unidade: 'quinzena', aPartirDe: null }] as MetaDaSerieNoEscopo[],
  }, comConta, '2026-12-16');
  assert.equal(contaDepois.metasPorEscopo?.[0].ancora, '2026-11-09');

  const onda = comAncoraNaTemporada({ frequenciaVezes: 1, frequenciaUnidade: 'quinzena', frequenciaAPartirDe: null, frequenciaAncora: null }, null, '2026-11-15');
  assert.equal(onda.frequenciaAncora, '2026-11-09');
  assert.equal(comAncoraNaTemporada({ ...onda, frequenciaAncora: null }, onda, '2026-12-01').frequenciaAncora, '2026-11-09');

  // A âncora define os ciclos, seja qual for o período olhado na tela.
  const freq = { vezes: 1, unidade: 'quinzena' as const, aPartirDe: null, ancora: '2026-11-09' };
  assert.deepEqual(
    intervalosDaFrequencia(freq, { inicio: '2026-11-23', fim: '2026-11-29' }).map(item => [item.inicio, item.fim]),
    [['2026-11-23', '2026-12-06']],
  );
  assert.deepEqual(
    intervalosDaFrequencia(freq, { inicio: '2026-11-01', fim: '2026-11-30' }).map(item => [item.inicio, item.fim]),
    // Como a meta semanal sem início, a âncora só alinha os ciclos: não corta os anteriores.
    [['2026-10-26', '2026-11-08'], ['2026-11-09', '2026-11-22'], ['2026-11-23', '2026-12-06']],
  );
  assert.notEqual(situacaoDaFrequencia({ frequenciaRecomendada: null, frequenciaVezes: 1, frequenciaUnidade: 'quinzena', frequenciaAPartirDe: null, frequenciaAncora: '2026-11-09' }).tipo, 'sem-ancora');
  assert.equal(situacaoDaFrequencia({ frequenciaRecomendada: null, frequenciaVezes: 1, frequenciaUnidade: 'quinzena', frequenciaAPartirDe: null, frequenciaAncora: null }).tipo, 'sem-ancora');
  assert.ok((expectativaNoIntervalo(freq, '2026-11-09', '2026-11-22') ?? 0) > 0);
}

console.log('metaDaOnda: ok');

// --- Regra de Ouro: no máximo 1 episódio por semana da mesma série (janelas maiores, o equivalente).
{
  const duasPorSemana = frequenciaParaGravar({ vezes: 2, unidade: 'semana', aPartirDe: null, tipo: 'serie' });
  assert.ok('erro' in duasPorSemana && duasPorSemana.campo === 'quantidade');
  assert.match('erro' in duasPorSemana ? duasPorSemana.erro : '', /Regra de Ouro/);
  assert.ok(!('erro' in frequenciaParaGravar({ vezes: 1, unidade: 'semana', aPartirDe: null, tipo: 'serie' })));
  assert.ok(!('erro' in frequenciaParaGravar({ vezes: 4, unidade: 'mes', aPartirDe: null, tipo: 'serie' })));
  const cincoNoMes = frequenciaParaGravar({ vezes: 5, unidade: 'mes', aPartirDe: null, tipo: 'serie' });
  assert.match('erro' in cincoNoMes ? cincoNoMes.erro : '', /até 4 por mês/);
  // Wave segue a mesma regra da série.
  assert.ok('erro' in frequenciaParaGravar({ vezes: 2, unidade: 'semana', aPartirDe: null, tipo: 'temporada' }));
  // Limite por série escolhido na Rotina de criação (aqui 2 por semana): 2 cabe, 3 passa.
  assert.ok(!('erro' in frequenciaParaGravar({ vezes: 2, unidade: 'semana', aPartirDe: null, tipo: 'serie', unidadesDaRegra: 2 })));
  const acimaDoLimite = frequenciaParaGravar({ vezes: 3, unidade: 'semana', aPartirDe: null, tipo: 'serie', unidadesDaRegra: 2 });
  assert.match('erro' in acimaDoLimite ? acimaDoLimite.erro : '', /no máximo 2 episódios por semana da mesma série/);
  // Wave (temporada) segue o mesmo limite por série: é o que o MCP passa em criar/atualizar_temporada.
  assert.ok(!('erro' in frequenciaParaGravar({ vezes: 2, unidade: 'semana', aPartirDe: null, tipo: 'temporada', unidadesDaRegra: 2 })));
  assert.ok('erro' in frequenciaParaGravar({ vezes: 3, unidade: 'semana', aPartirDe: null, tipo: 'temporada', unidadesDaRegra: 2 }));
  // Quadro é sob demanda: não grava quantidade.
  assert.ok('erro' in frequenciaParaGravar({ vezes: 1, unidade: 'semana', aPartirDe: null, tipo: 'quadro' }));
}

// --- Regra de Ouro na conta: ritmo gravado acima do teto vale o teto (histórico incluído).
{
  const { vezesNaRegraDeOuro, tetoDaRegraDeOuro } = await import('./regraDeOuro.ts');
  assert.equal(tetoDaRegraDeOuro('semana'), 1);
  assert.equal(tetoDaRegraDeOuro('quinzena'), 2);
  assert.equal(tetoDaRegraDeOuro('mes'), 4);
  assert.equal(tetoDaRegraDeOuro('semana', 3), 3);
  assert.equal(tetoDaRegraDeOuro('sob-demanda'), null);
  assert.equal(vezesNaRegraDeOuro(4, 'semana'), 1);
  assert.equal(vezesNaRegraDeOuro(3, 'mes'), 3);
  const capada = situacaoDaFrequencia({ frequenciaRecomendada: null, frequenciaVezes: 4, frequenciaUnidade: 'semana', frequenciaAPartirDe: null });
  assert.equal(capada.tipo === 'definida' ? capada.freq.vezes : null, 1);
  const semRegra = situacaoDaFrequencia({ frequenciaRecomendada: null, frequenciaVezes: 4, frequenciaUnidade: 'semana', frequenciaAPartirDe: null }, null);
  assert.equal(semRegra.tipo === 'definida' ? semRegra.freq.vezes : null, 4);
}

// --- Regra de Ouro configurável: o limite por série vem da pessoa; janelas maiores na mesma proporção.
{
  const regra = await import('./regraDeOuro.ts');
  assert.equal(regra.tetoDaRegraDeOuro('semana', 2), 2);
  assert.equal(regra.tetoDaRegraDeOuro('quinzena', 2), 4);
  assert.equal(regra.tetoDaRegraDeOuro('mes', 2), 8);
  assert.equal(regra.tetoDaRegraDeOuro('trimestre', 3), 39);
  assert.equal(regra.tetoDaRegraDeOuro('semestre', 2), 52);
  assert.equal(regra.erroDaRegraDeOuro(2, 'semana', 2), null);
  assert.match(regra.erroDaRegraDeOuro(3, 'semana', 2) ?? '', /no máximo 2 episódios por semana/);
  assert.match(regra.erroDaRegraDeOuro(2, 'semana') ?? '', /no máximo 1 episódio por semana/);
  assert.match(regra.erroDaRegraDeOuro(5, 'quinzena', 2) ?? '', /até 4 a cada 14 dias/);
  assert.equal(regra.normalizarLimiteDaRegraDeOuro(0), null);
  assert.equal(regra.normalizarLimiteDaRegraDeOuro(8), null);
  assert.equal(regra.normalizarLimiteDaRegraDeOuro(1.5), null);
  assert.equal(regra.normalizarLimiteDaRegraDeOuro(7), 7);
  assert.equal(regra.limiteDaRegraNosAvisos(null), 1);
  assert.equal(regra.limiteDaRegraNosAvisos({ [regra.CHAVE_LIMITE_REGRA_DE_OURO]: 3 }), 3);
  assert.equal(regra.limiteDaRegraNosAvisos({ [regra.CHAVE_LIMITE_REGRA_DE_OURO]: 99 }), 1, 'fora da faixa volta ao padrão');
  // O limite configurado no app vale como padrão das contas; sem nada, 1.
  regra.definirLimiteDaRegraDeOuro(3);
  try {
    assert.equal(regra.tetoDaRegraDeOuro('semana'), 3);
    assert.equal(regra.vezesNaRegraDeOuro(5, 'semana'), 3);
    const capada3 = situacaoDaFrequencia({ frequenciaRecomendada: null, frequenciaVezes: 5, frequenciaUnidade: 'semana', frequenciaAPartirDe: null });
    assert.equal(capada3.tipo === 'definida' ? capada3.freq.vezes : null, 3);
    assert.ok(!('erro' in frequenciaParaGravar({ vezes: 3, unidade: 'semana', aPartirDe: null, tipo: 'serie' })));
  } finally {
    regra.definirLimiteDaRegraDeOuro(undefined);
  }
  assert.equal(regra.limiteDaRegraDeOuro(), 1);
}
// “?” ao lado do erro: reconhece a mensagem em todo formulário e explica de onde vem o limite.
{
  const regra = await import('./regraDeOuro.ts');
  const abas = await import('./abasEditorial.ts');
  const erro = frequenciaParaGravar({ vezes: 3, unidade: 'semana', aPartirDe: null, tipo: 'serie', unidadesDaRegra: 1 });
  assert.ok('erro' in erro && regra.ehErroDaRegraDeOuro(erro.erro));
  assert.ok(regra.ehErroDaRegraDeOuro(`Em Instagram: ${regra.erroDaRegraDeOuro(9, 'mes', 2)}`), 'linha da conta');
  assert.equal(regra.ehErroDaRegraDeOuro('A quantidade precisa ser pelo menos 1.'), false);
  assert.equal(regra.ehErroDaRegraDeOuro(undefined), false);
  assert.equal(
    regra.explicacaoDoLimiteDaRegraDeOuro(1),
    'Esse limite vem de “Limite por série”, em Editorial › Rotina de criação › Regra de Ouro. Hoje: 1 episódio por semana da mesma série. Janelas maiores seguem a mesma proporção: até 2 a cada 14 dias, 4 por mês, 8 por bimestre, 13 por trimestre e 26 por semestre.',
  );
  assert.match(regra.explicacaoDoLimiteDaRegraDeOuro(3), /Hoje: 3 episódios por semana.*até 6 a cada 14 dias, 12 por mês, 24 por bimestre, 39 por trimestre e 78 por semestre\./);
  // O link abre a Rotina de criação e rola até o card.
  assert.equal(abas.ROTA_DA_REGRA_DE_OURO, '/editorial?aba=ajustes#regra-de-ouro');
  assert.equal(abas.abaEditorialDaUrl('ajustes'), 'ajustes');
}
console.log('metaDaOnda (regra de ouro): ok');
