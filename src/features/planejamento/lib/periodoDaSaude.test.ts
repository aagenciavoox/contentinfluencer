import assert from 'node:assert/strict';
import { avisoDoCalendario, distribuicaoPorPilar, comMetaDoPeriodo, relacaoComCalendario, rotuloDoPeriodo } from './periodoDaSaude.ts';

const HOJE = new Date(2026, 10, 2, 12);
const periodo = { inicio: '2026-10-16', fim: '2026-12-30' };

assert.equal(rotuloDoPeriodo(periodo, HOJE), 'Período: 16/10 – 30/12');
assert.equal(rotuloDoPeriodo({ inicio: '2026-12-01', fim: '2027-02-28' }, HOJE), 'Período: 01/12/2026 – 28/02/2027');

assert.equal(relacaoComCalendario(periodo, { inicio: '2026-11-01', fim: '2026-11-30' }), 'dentro');
assert.equal(relacaoComCalendario(periodo, { inicio: '2026-10-01', fim: '2026-10-31' }), 'parcial');
assert.equal(relacaoComCalendario(periodo, { inicio: '2027-01-01', fim: '2027-01-31' }), 'fora');
assert.equal(avisoDoCalendario(periodo, { inicio: '2026-11-01', fim: '2026-11-30' }), null);
assert.match(avisoDoCalendario(periodo, { inicio: '2027-01-01', fim: '2027-01-31' }) ?? '', /fora deste período/);

const counts = { limite: 108, totalMeta: 108, previsto: 3 };
const periodos = [{ inicio: '2026-10-16', fim: '2026-12-30', metasPublicacao: 60 }] as never;
assert.deepEqual(comMetaDoPeriodo(counts, periodos, periodo), { limite: 60, totalMeta: 60, previsto: 3 });
assert.equal(comMetaDoPeriodo(counts, periodos, { inicio: '2026-11-01', fim: '2026-11-30' }), counts);
assert.equal(comMetaDoPeriodo(counts, [], periodo), counts);

// Distribuição: 6 itens com pilar entre 24 do período (caso real de 03/10–30/12).
const dist = distribuicaoPorPilar(
  ['classe', 'ciencia', 'humor', 'psico', 'eventos', 'indicacao'],
  [{ id: 'classe', planejado: 1 }, { id: 'psico', planejado: 1 }, { id: 'indicacao', planejado: 4 }],
  24,
);
assert.deepEqual(dist.linhas.map(l => [l.id, l.pautas, l.atualPct]), [
  ['classe', 1, 17], ['ciencia', 0, 0], ['humor', 0, 0], ['psico', 1, 17], ['eventos', 0, 0], ['indicacao', 4, 66],
]);
assert.equal(dist.linhas.reduce((s, l) => s + l.atualPct, 0), 100);
assert.equal(dist.semPilar, 18);
assert.equal(dist.comPilar, 6);
const nada = distribuicaoPorPilar(['a'], [], 5);
assert.deepEqual([nada.linhas[0].atualPct, nada.semPilar], [0, 5]);
assert.equal(distribuicaoPorPilar(['a', 'b', 'c'], [{ id: 'a', planejado: 1 }, { id: 'b', planejado: 1 }, { id: 'c', planejado: 1 }], 3).linhas.reduce((s, l) => s + l.atualPct, 0), 100);

console.log('periodoDaSaude: ok');
