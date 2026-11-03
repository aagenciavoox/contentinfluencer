import assert from 'node:assert/strict';
import {notasAoVoltarParaIdeia} from './ideia.ts';

// Roteiro e rascunho entram no texto da ideia, cada um com seu marcador.
assert.equal(
  notasAoVoltarParaIdeia({script: '<p>Texto do roteiro</p>', writing_notes: 'Anotacao', notes: 'Texto do roteiro'}),
  '<p><strong>ROTEIRO</strong></p><p>Texto do roteiro</p><p><strong>RASCUNHO</strong></p><p>Anotacao</p>',
);
// Ideia antiga que nao esta no roteiro continua no fim.
assert.equal(
  notasAoVoltarParaIdeia({script: '<p>Novo</p>', notes: 'Outra coisa'}),
  '<p><strong>ROTEIRO</strong></p><p>Novo</p><p><strong>IDEIA ANTERIOR</strong></p><p>Outra coisa</p>',
);
// Carrossel: as telas com texto, com "Tela N".
assert.equal(
  notasAoVoltarParaIdeia({writing_mode: 'carrossel', carousel_slides: [{html: '<p>Um</p>', images: []}, {html: '', images: []}], script: '<p>escondido</p>', notes: null}),
  '<p><strong>ROTEIRO</strong></p><p>Tela 1<br>Um</p>',
);
// Sem roteiro nem rascunho: a ideia fica como esta.
assert.equal(notasAoVoltarParaIdeia({script: null, writing_notes: null, notes: 'Ideia'}), undefined);
// Voltar de novo sem mudar nada nao duplica o texto.
const row = {script: '<p>A</p>', writing_notes: '<p>B</p>', notes: null};
const primeira = notasAoVoltarParaIdeia(row);
assert.equal(notasAoVoltarParaIdeia({...row, notes: primeira}), primeira);

console.log('ideia ok');