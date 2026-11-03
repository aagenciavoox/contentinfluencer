import assert from 'node:assert/strict';
import { compararOrdemEpisodio, moverEpisodio } from './ordemEpisodios.ts';

const a = { id: 'a' }, b = { id: 'b' }, c = { id: 'c' };

// Sem número: renumera a lista inteira ao subir o último.
assert.deepEqual(
  moverEpisodio([a, b, c], 'c', 'subir').map(m => [m.item.id, m.ordemEpisodio]),
  [['a', 1], ['c', 2], ['b', 3]],
);
// Pontas não mudam nada.
assert.deepEqual(moverEpisodio([a, b, c], 'a', 'subir'), []);
assert.deepEqual(moverEpisodio([a, b, c], 'c', 'descer'), []);
assert.deepEqual(moverEpisodio([a, b, c], 'x', 'descer'), []);
// Já numerados: só os dois trocados mudam.
const n = [{ id: 'a', ordemEpisodio: 1 }, { id: 'b', ordemEpisodio: 2 }, { id: 'c', ordemEpisodio: 3 }];
assert.deepEqual(
  moverEpisodio(n, 'a', 'descer').map(m => [m.item.id, m.ordemEpisodio]),
  [['b', 1], ['a', 2]],
);
// Com número vem antes; sem número empata.
assert.ok(compararOrdemEpisodio({ ordemEpisodio: 5 }, {}) < 0);
assert.ok(compararOrdemEpisodio({}, { ordemEpisodio: 1 }) > 0);
assert.equal(compararOrdemEpisodio({}, { ordemEpisodio: null }), 0);
assert.ok(compararOrdemEpisodio({ ordemEpisodio: 2 }, { ordemEpisodio: 1 }) > 0);

console.log('ordemEpisodios ok');
