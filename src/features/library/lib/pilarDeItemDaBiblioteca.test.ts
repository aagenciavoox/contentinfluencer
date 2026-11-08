import assert from 'node:assert/strict';
import { pilarDeItemDaBiblioteca, pilarEscolhidoDaBiblioteca } from './pilarDeItemDaBiblioteca.ts';

const pilares = [
  { id: 'humor', nome: 'Humor', ativo: true },
  { id: 'off', nome: 'Indicação / Resenha', ativo: false },
  { id: 'ind', nome: 'Indicação/Resenha', ativo: true },
];

assert.equal(pilarDeItemDaBiblioteca(pilares)?.id, 'ind');
assert.deepEqual(pilarEscolhidoDaBiblioteca(pilares), { pilarId: 'ind', pilarOrigem: 'escolhida' });
assert.equal(pilarDeItemDaBiblioteca([{ id: 'off', nome: 'indicacao/resenha', ativo: false }])?.id, 'off');
assert.equal(pilarDeItemDaBiblioteca([{ id: 'h', nome: 'Humor' }]), null);
assert.equal(pilarEscolhidoDaBiblioteca([]), null);

console.log('pilarDeItemDaBiblioteca.test.ts passed');
