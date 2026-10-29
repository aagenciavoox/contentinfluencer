/**
 * Proteção contra ciclos concorrentes.
 * O gatilho trava ids da cadeia em ordem lexicográfica antes de revalidar.
 * Duas gravações que formariam ciclo (A→B e B→A) precisam adquirir as mesmas
 * travas na mesma ordem; a segunda vê o ciclo e recusa.
 *
 * Este teste comprova o algoritmo de travamento e a detecção pós-trava.
 * A execução SQL real (ficha + MCP) vive em supabase/tests/serie_agrupamento_ciclo.sql.
 */
import assert from 'node:assert/strict';
import {
  formariaCicloOrigem,
  formariaCicloParent,
  idsParaTravarOrigem,
  idsParaTravarParent,
} from './serieArvore.ts';

type SerieRow = { id: string; parentId: string | null; userId: string };

/** Simula o gatilho: trava em ordem, aplica, recusa ciclo ou outro usuário. */
function gravarParent(
  rows: Map<string, SerieRow>,
  serieId: string,
  parentId: string | null,
  userId: string,
  locks: string[],
): { ok: true } | { ok: false; motivo: string } {
  const serie = rows.get(serieId);
  if (!serie) return { ok: false, motivo: 'inexistente' };
  if (serie.userId !== userId) return { ok: false, motivo: 'outro usuário' };
  if (parentId) {
    const pai = rows.get(parentId);
    if (!pai) return { ok: false, motivo: 'pai inexistente' };
    if (pai.userId !== userId) return { ok: false, motivo: 'série pai pertence a outro usuário' };
  }

  const cadeia = parentId
    ? idsParaTravarParent(serieId, parentId, [...rows.values()])
    : [serieId];
  // Ordem determinística: duas transações concorrentes entram na mesma fila.
  for (const id of cadeia) locks.push(id);

  const proposta = [...rows.values()].map(row => (
    row.id === serieId ? { ...row, parentId } : row
  ));
  if (formariaCicloParent(serieId, parentId, proposta)) {
    return { ok: false, motivo: 'ciclo em series.parent_id' };
  }
  rows.set(serieId, { ...serie, parentId });
  return { ok: true };
}

{
  const rows = new Map<string, SerieRow>([
    ['a', { id: 'a', parentId: null, userId: 'u1' }],
    ['b', { id: 'b', parentId: null, userId: 'u1' }],
  ]);
  const locks1: string[] = [];
  const locks2: string[] = [];

  // Sessão 1: A.parent = B. Sessão 2: B.parent = A. Mesma ordem de trava.
  assert.deepEqual(idsParaTravarParent('a', 'b', [...rows.values()]), ['a', 'b']);
  assert.deepEqual(idsParaTravarParent('b', 'a', [...rows.values()]), ['a', 'b']);

  const r1 = gravarParent(rows, 'a', 'b', 'u1', locks1);
  assert.equal(r1.ok, true);
  const r2 = gravarParent(rows, 'b', 'a', 'u1', locks2);
  assert.equal(r2.ok, false);
  if (!r2.ok) assert.equal(r2.motivo, 'ciclo em series.parent_id');
  assert.deepEqual(locks1, ['a', 'b']);
  assert.deepEqual(locks2, ['a', 'b']);
}

{
  const rows = new Map<string, SerieRow>([
    ['a', { id: 'a', parentId: null, userId: 'u1' }],
    ['b', { id: 'b', parentId: null, userId: 'u2' }],
  ]);
  const r = gravarParent(rows, 'a', 'b', 'u1', []);
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.motivo, /outro usuário/);
}

{
  const links = new Map<string, string | null>([
    ['x', null],
    ['y', null],
  ]);
  assert.deepEqual(idsParaTravarOrigem('x', 'y', links), ['x', 'y']);
  assert.deepEqual(idsParaTravarOrigem('y', 'x', links), ['x', 'y']);

  // Primeira gravação: x ← y.
  links.set('x', 'y');
  assert.equal(formariaCicloOrigem('y', 'x', links), true);
}

console.log('ok - integridadeCiclo');
