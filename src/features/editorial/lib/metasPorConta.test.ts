import assert from 'node:assert/strict';
import { consolidarMetas, linhaDaContaEm, metaDaConta, metasDasContas, type MetaDaContaVigencia } from './metasPorConta.ts';

const DEZEMBRO = { inicio: '2026-12-01', fim: '2026-12-31' };
const HOJE = '2026-11-03';

function linha(platformId: string, vigenteDesde: string, limiteSemanal: number | null, extra: Partial<MetaDaContaVigencia> = {}): MetaDaContaVigencia {
  return { platformId, vigenteDesde, limiteSemanal, proporcaoFuncoes: null, parcelasFormato: null, ...extra };
}

// --- Antes da primeira linha a conta não tinha meta (não vale a primeira para trás).
{
  const linhas = [linha('ig', '2026-11-01', 7)];
  assert.equal(linhaDaContaEm(linhas, '2026-10-25'), null);
  assert.equal(linhaDaContaEm(linhas, '2026-11-01')?.limiteSemanal, 7);
}

// --- Ritmo da conta × dias, como a meta geral; número do período vale acima.
{
  const linhas = [linha('ig', '2026-11-01', 7)];
  const pelaConta = metaDaConta({ platformId: 'ig', linhas, periodo: DEZEMBRO, proporcaoGeral: null, hoje: HOJE });
  assert.equal(pelaConta.valor, 31);
  assert.equal(pelaConta.origem, 'ritmo');
  const ajustada = metaDaConta({
    platformId: 'ig', linhas, periodo: DEZEMBRO, proporcaoGeral: null, hoje: HOJE,
    decisao: { metasPorConta: { ig: { publicacao: 20 } } },
  });
  assert.equal(ajustada.valor, 20);
  assert.equal(ajustada.calculada, 31);
  assert.equal(ajustada.origem, 'absoluta');
}

// --- Conta sem meta: não é zero, e a soma das contas fica incompleta.
{
  const consolidada = metasDasContas({
    platformIds: ['ig', 'tt', 'yt'],
    linhas: [linha('ig', '2026-11-01', 7), linha('tt', '2026-11-01', 7)],
    periodo: DEZEMBRO,
    proporcaoGeral: null,
    hoje: HOJE,
  });
  assert.equal(consolidada.total, 62);
  assert.equal(consolidada.incompleta, true);
  assert.deepEqual(consolidada.contasSemMeta, ['yt']);
  assert.equal(consolidada.contas.find(conta => conta.platformId === 'yt')!.valor, null);
}

// --- Meta que só começa no futuro: hoje a conta ainda não tem meta.
{
  const futura = metaDaConta({ platformId: 'ig', linhas: [linha('ig', '2026-11-15', 5)], periodo: DEZEMBRO, proporcaoGeral: null, hoje: HOJE });
  assert.equal(futura.semMeta, true);
}

// --- Período encerrado: cada semana com a linha que valia nela; semana sem meta deixa o período sem meta.
{
  const outubro = { inicio: '2026-10-04', fim: '2026-10-17' };
  const duasLinhas = [linha('ig', '2026-10-04', 7), linha('ig', '2026-10-11', 14)];
  assert.equal(metaDaConta({ platformId: 'ig', linhas: duasLinhas, periodo: outubro, proporcaoGeral: null, hoje: HOJE }).valor, 21);
  const comecouNoMeio = [linha('ig', '2026-10-11', 7)];
  assert.equal(metaDaConta({ platformId: 'ig', linhas: comecouNoMeio, periodo: outubro, proporcaoGeral: null, hoje: HOJE }).valor, null);
}

// --- Proporção: a da conta, senão a geral. Consolidada ponderada pelas metas, não média simples.
{
  const consolidada = metasDasContas({
    platformIds: ['a', 'b'],
    linhas: [
      linha('a', '2026-11-01', 7, { proporcaoFuncoes: { atrair: 50, converter: 50 } }),
      linha('b', '2026-11-01', null),
    ],
    periodo: DEZEMBRO,
    proporcaoGeral: { atrair: 20, converter: 80 },
    hoje: HOJE,
    decisao: { metasPorConta: { a: { publicacao: 10 }, b: { publicacao: 30 } } },
  });
  const a = consolidada.contas.find(conta => conta.platformId === 'a')!;
  const b = consolidada.contas.find(conta => conta.platformId === 'b')!;
  assert.equal(a.proporcaoHerdada, false);
  assert.equal(b.proporcaoHerdada, true);
  assert.deepEqual(a.porObjetivo, { atrair: 5, converter: 5 });
  assert.deepEqual(b.porObjetivo, { atrair: 6, converter: 24 });
  assert.equal(consolidada.total, 40);
  assert.deepEqual(consolidada.porObjetivo, { atrair: 11, converter: 29 });
  // 11 de 40 = 27,5% → 28 pelo maior resto; a média simples daria 35%.
  assert.deepEqual(consolidada.proporcaoConsolidada, { atrair: 28, converter: 72 });
  assert.equal(consolidada.incompleta, false);
}

// --- Formato é parcela da conta; a sobra do limite fica sem formato definido.
{
  const linhas = [linha('yt', '2026-11-01', 5, { parcelasFormato: { short: 3, 'video-longo': 1 } })];
  const meta = metaDaConta({ platformId: 'yt', linhas, periodo: DEZEMBRO, proporcaoGeral: null, hoje: HOJE });
  assert.equal(meta.valor, 22);
  const soma = meta.parcelas.reduce((total, parcela) => total + parcela.noPeriodo, 0) + meta.semFormatoDefinido;
  assert.equal(soma, 22, 'as parcelas repartem a meta da conta, não somam por cima');
  assert.equal(meta.conflitoDeFormato, false);
  const demais = metaDaConta({
    platformId: 'yt', linhas: [linha('yt', '2026-11-01', 3, { parcelasFormato: { short: 3, 'video-longo': 2 } })],
    periodo: DEZEMBRO, proporcaoGeral: null, hoje: HOJE,
  });
  assert.equal(demais.conflitoDeFormato, true);
}

// --- Nenhuma conta com meta: total nulo, não zero.
assert.equal(consolidarMetas([]).total, null);

console.log('metasPorConta: ok');
