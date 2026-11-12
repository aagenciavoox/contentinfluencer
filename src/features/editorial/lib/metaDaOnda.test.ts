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
  // Família (gravada como série com as vagas das séries ativas): 1 vaga por série ativa.
  assert.ok(!('erro' in frequenciaParaGravar({ vezes: 2, unidade: 'semana', aPartirDe: null, tipo: 'serie', unidadesDaRegra: 2 })));
  const familiaAcima = frequenciaParaGravar({ vezes: 3, unidade: 'semana', aPartirDe: null, tipo: 'serie', unidadesDaRegra: 2 });
  assert.match('erro' in familiaAcima ? familiaAcima.erro : '', /Com 2 séries ativas, o máximo é 2 por semana/);
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
console.log('metaDaOnda (regra de ouro): ok');
