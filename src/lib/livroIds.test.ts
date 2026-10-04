import assert from 'node:assert/strict';
import { aplicarLivros, livroIdsEfetivos, normalizeLivroIds, removerLivroId } from './livroIds.ts';

assert.deepEqual(normalizeLivroIds([' a ', 'a', '', 'b', 1, null]), ['a', 'b']);
assert.deepEqual(livroIdsEfetivos({ bibliotecaItemId: 'livro-1' }), ['livro-1']);
assert.deepEqual(livroIdsEfetivos({ livroIds: [], bibliotecaItemId: 'livro-1' }), ['livro-1']);
assert.deepEqual(
  livroIdsEfetivos({ livroIds: ['livro-2', 'livro-2', 'livro-3'], bibliotecaItemId: 'livro-1' }),
  ['livro-2', 'livro-3'],
);
assert.deepEqual(
  aplicarLivros({ livroIds: ['livro-2', 'livro-3'], bibliotecaItemId: 'livro-3' }),
  { livroIds: ['livro-2', 'livro-3'], bibliotecaItemId: 'livro-3' },
);
assert.deepEqual(
  aplicarLivros({ bibliotecaItemId: 'livro-1' }),
  { livroIds: ['livro-1'], bibliotecaItemId: 'livro-1' },
);

const semLista = removerLivroId({ bibliotecaItemId: 'livro-1', livroIds: undefined }, 'livro-1');
assert.deepEqual(semLista.livroIds, []);
assert.equal(semLista.bibliotecaItemId, null);

const restante = removerLivroId(
  { bibliotecaItemId: 'livro-1', livroIds: ['livro-1', 'livro-2'] },
  'livro-1',
);
assert.deepEqual(restante.livroIds, ['livro-2']);
assert.equal(restante.bibliotecaItemId, 'livro-2');

const intacto = removerLivroId(
  { bibliotecaItemId: 'livro-9', livroIds: ['livro-9'] },
  'livro-1',
);
assert.equal(intacto.bibliotecaItemId, 'livro-9');
assert.deepEqual(intacto.livroIds, ['livro-9']);

console.log('livroIds.test.ts passed');
