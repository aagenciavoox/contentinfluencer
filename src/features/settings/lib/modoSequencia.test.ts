import assert from 'node:assert/strict';
import {
  compararPeloModoSequencia,
  lerModoSequencia,
  ordenarPeloModoSequencia,
  ROTULO_MODO_SEQUENCIA,
} from './modoSequencia.ts';

assert.equal(lerModoSequencia('intercalar'), 'intercalar');
assert.equal(lerModoSequencia('seguir_um'), 'seguir_um');
assert.equal(lerModoSequencia('ordem_temporada'), 'ordem_temporada');
assert.equal(lerModoSequencia('outro'), null);
assert.equal(lerModoSequencia(null), null);
assert.equal(ROTULO_MODO_SEQUENCIA.intercalar, 'Intercalar quadros');

const a = { id: 'a', seriesId: 'quadro-a', temporadaId: 't1', ordemEpisodio: 2, title: 'Segundo A' };
const b = { id: 'b', seriesId: 'quadro-b', temporadaId: 't1', ordemEpisodio: 1, title: 'Primeiro B' };
const c = { id: 'c', seriesId: 'quadro-a', temporadaId: 't1', ordemEpisodio: 1, title: 'Primeiro A' };

assert.deepEqual(
  ordenarPeloModoSequencia([a, b, c], 'ordem_temporada').map(item => item.id),
  ['c', 'b', 'a'],
);

assert.deepEqual(
  ordenarPeloModoSequencia([a, b, c], 'seguir_um', 'quadro-a').map(item => item.id),
  ['c', 'a', 'b'],
);

assert.deepEqual(
  ordenarPeloModoSequencia([a, b, c], 'intercalar', 'quadro-a').map(item => item.id),
  ['b', 'c', 'a'],
);

assert.equal(compararPeloModoSequencia(c, a, null) < 0, true);
assert.deepEqual(
  ordenarPeloModoSequencia([a, b, c], null).map(item => item.id),
  ['c', 'b', 'a'],
);
assert.equal(compararPeloModoSequencia(c, a, 'ordem_temporada') < 0, true);

console.log('ok - modoSequencia');
