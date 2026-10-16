import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { orderComments, planCommentAnchors, stackCommentCards } from './commentModel.ts';

const doc = 'Gancho forte. Corpo do roteiro aqui.';
// Posições do ProseMirror começam em 1 dentro do primeiro parágrafo.
const textAt = (from: number, to: number) => (from < 1 || to - 1 > doc.length ? null : doc.slice(from - 1, to - 1));

describe('migração de comentários para marcas', () => {
  it('ancora quando o texto no intervalo bate com o texto salvo', () => {
    const plan = planCommentAnchors([{ id: 'a', text: 'Gancho forte.', selection: { from: 1, to: 14 } }], new Set(), textAt);
    assert.deepEqual(plan, { toAnchor: [{ id: 'a', from: 1, to: 14 }], unanchored: [] });
  });

  it('não ancora se o texto mudou ou o intervalo é inválido', () => {
    const plan = planCommentAnchors(
      [
        { id: 'b', text: 'Outro trecho', selection: { from: 1, to: 13 } },
        { id: 'c', text: 'x', selection: { from: 500, to: 510 } },
        { id: 'd', text: 'x', selection: { from: 5, to: 5 } },
      ],
      new Set(),
      textAt,
    );
    assert.deepEqual(plan, { toAnchor: [], unanchored: ['b', 'c', 'd'] });
  });

  it('ignora quem já tem marca e tolera espaços diferentes', () => {
    const plan = planCommentAnchors(
      [
        { id: 'a', text: 'Gancho forte.', selection: { from: 1, to: 14 } },
        { id: 'e', text: ' Corpo  do roteiro ', selection: { from: 15, to: 32 } },
      ],
      new Set(['a']),
      textAt,
    );
    assert.deepEqual(plan.toAnchor, [{ id: 'e', from: 15, to: 32 }]);
  });
});

describe('cartões na margem', () => {
  it('não sobrepõe e alinha o ativo ao trecho', () => {
    const slots = [
      { id: 'a', top: 0, height: 80 },
      { id: 'b', top: 20, height: 80 },
      { id: 'c', top: 300, height: 80 },
    ];
    const free = stackCommentCards(slots, null);
    assert.deepEqual([free.get('a'), free.get('b'), free.get('c')], [0, 88, 300]);
    const focused = stackCommentCards(slots, 'b');
    assert.equal(focused.get('b'), 88); // a não cabe acima (iria para -68), então tudo desce
    const later = stackCommentCards([{ id: 'a', top: 200, height: 80 }, { id: 'b', top: 220, height: 80 }], 'b');
    assert.deepEqual([later.get('a'), later.get('b')], [132, 220]);
  });

  it('ordena ancorados pela posição e os sem âncora no fim', () => {
    const list = orderComments(
      [
        { id: 'x', text: '', selection: { from: 0, to: 0 }, comment: '', createdAt: '2026-01-02' },
        { id: 'y', text: '', selection: { from: 0, to: 0 }, comment: '' },
        { id: 'z', text: '', selection: { from: 0, to: 0 }, comment: '' },
      ],
      new Map([['z', 5], ['y', 40]]),
    );
    assert.deepEqual(list.map(item => item.id), ['z', 'y', 'x']);
  });
});
