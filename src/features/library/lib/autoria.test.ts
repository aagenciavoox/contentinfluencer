import assert from 'node:assert/strict';
import { contarAutoria, rotuloAutoria, sugestoesAutoria, temAutoria } from './autoria.ts';

// Grafias diferentes do mesmo valor caem no mesmo rótulo.
assert.equal(rotuloAutoria('generoAutor', 'mulher'), 'Mulher');
assert.equal(rotuloAutoria('generoAutor', ' Feminino '), 'Mulher');
assert.equal(rotuloAutoria('generoAutor', 'não-binário'), 'Não binárie');
assert.equal(rotuloAutoria('generoAutor', 'nao binarie'), 'Não binárie');
assert.equal(rotuloAutoria('paisAutor', 'EUA'), 'Estados Unidos');
assert.equal(rotuloAutoria('paisAutor', 'nigéria'), 'Nigéria');
assert.equal(rotuloAutoria('racaAutor', 'preto'), 'Preta');
assert.equal(rotuloAutoria('racaAutor', 'indigena'), 'Indígena');
assert.equal(rotuloAutoria('paisAutor', '   '), null);
assert.equal(rotuloAutoria('paisAutor', undefined), null);

assert.deepEqual(
  contarAutoria([
    { generoAutor: 'mulher', paisAutor: 'Brasil' },
    { generoAutor: 'Mulher', paisAutor: 'brasil' },
    { generoAutor: 'homem', paisAutor: 'Nigéria' },
    { generoAutor: '' },
    {},
    undefined,
  ], 'generoAutor'),
  [{ label: 'Mulher', count: 2 }, { label: 'Homem', count: 1 }],
);
assert.deepEqual(
  contarAutoria([{ paisAutor: 'nigéria' }, { paisAutor: 'Nigéria' }, { paisAutor: 'Brasil' }], 'paisAutor'),
  [{ label: 'Nigéria', count: 2 }, { label: 'Brasil', count: 1 }],
);

// Sugestões: as padrão primeiro, depois as usadas, sem repetir; item apagado não sugere.
assert.deepEqual(
  sugestoesAutoria([
    { ficha: { paisAutor: 'nigéria' }, deletedAt: null },
    { ficha: { paisAutor: 'BR' }, deletedAt: null },
    { ficha: { paisAutor: 'Japão' }, deletedAt: '2026-10-01T00:00:00.000Z' },
  ], 'paisAutor'),
  ['Brasil', 'Nigéria'],
);

assert.equal(temAutoria('livro'), true);
assert.equal(temAutoria('filme'), false);

console.log('autoria.test.ts passed');
