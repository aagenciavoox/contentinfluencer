import assert from 'node:assert/strict';
import { metaDoPeriodo, resolverPausa } from './metaDoPeriodo.ts';

const DEZEMBRO = { inicio: '2026-12-01', fim: '2026-12-31' };
const Q4 = { inicio: '2026-10-01', fim: '2026-12-31' };
const HOJE = '2026-11-03';

// Ritmo × dias ÷ 7, arredondado uma vez no total.
assert.equal(metaDoPeriodo({ periodo: DEZEMBRO, limiteSemanal: 7, hoje: HOJE }).valor, 31);
assert.equal(metaDoPeriodo({ periodo: { inicio: '2026-11-01', fim: '2026-11-03' }, limiteSemanal: 5, hoje: HOJE }).valor, 2);

// Sem ritmo nem meta absoluta: meta não definida, nunca 12 nem zero.
{
  const meta = metaDoPeriodo({ periodo: DEZEMBRO, limiteSemanal: null, hoje: HOJE });
  assert.equal(meta.valor, null);
  assert.equal(meta.origem, null);
}

// Meta absoluta vale acima de tudo; a calculada continua à mostra.
{
  const meta = metaDoPeriodo({ periodo: DEZEMBRO, limiteSemanal: 7, decisao: { metasPublicacao: 20 }, hoje: HOJE });
  assert.equal(meta.valor, 20);
  assert.equal(meta.calculada, 31);
  assert.equal(meta.origem, 'absoluta');
}

// Semana ajustada entra como está: sem proporção nem desconto de pausa.
{
  const meta = metaDoPeriodo({
    periodo: DEZEMBRO,
    limiteSemanal: 7,
    ajustesSemana: [{ inicio: '2026-12-20', fim: '2026-12-26', limite: 2 }],
    decisao: { pausaEditorial: '24/12 a 26/12' },
    hoje: HOJE,
  });
  // 31 dias − 7 da semana ajustada = 24 dias pelo ritmo, + 2 do ajuste. A pausa cai na semana ajustada.
  assert.equal(meta.valor, 26);
  assert.equal(meta.semanasAjustadas, 1);
}

// Pausa com data certa desconta os dias.
{
  const meta = metaDoPeriodo({ periodo: DEZEMBRO, limiteSemanal: 7, decisao: { pausaEditorial: '24/12 a 26/12' }, hoje: HOJE });
  assert.equal(meta.valor, 28);
  assert.equal(meta.diasDePausa, 3);
  assert.equal(meta.pendenciaDePausa, null);
}

// Datas que não dá para resolver com segurança: pendência, nada descontado.
{
  const ambigua = resolverPausa('10 a 15', Q4);
  assert.deepEqual(ambigua.dias, []);
  assert.match(ambigua.pendencia ?? '', /não foi descontada/);
  assert.match(resolverPausa('5 dias de folga', Q4).pendencia ?? '', /não foi descontada/);
  assert.match(resolverPausa('Férias no fim do ano', Q4).pendencia ?? '', /não foi descontada/);
}

// "10 a 15" vale quando o período fica dentro de um mês.
assert.equal(resolverPausa('10 a 15', DEZEMBRO).dias.length, 6);

// Mês por extenso, inclusive atravessando o ano.
assert.equal(resolverPausa('20 a 31 de dezembro', Q4).dias.length, 12);
assert.deepEqual(resolverPausa('30 de dezembro a 2 de janeiro', { inicio: '2026-12-01', fim: '2027-01-31' }).dias,
  ['2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02']);

// Data fora do período: nada a descontar e nada a revisar.
{
  const fora = resolverPausa('24/12 a 26/12', { inicio: '2026-11-01', fim: '2026-11-30' });
  assert.deepEqual(fora.dias, []);
  assert.equal(fora.pendencia, null);
}

// Vazio ou "sem pausa": sem pendência.
assert.equal(resolverPausa('', DEZEMBRO).pendencia, null);
assert.equal(resolverPausa('Sem pausa', DEZEMBRO).pendencia, null);

console.log('metaDoPeriodo: ok');
