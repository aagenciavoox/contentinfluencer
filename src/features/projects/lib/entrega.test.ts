import assert from 'node:assert/strict';
import {entregaDoProjeto, projetoConcluido} from './entrega.ts';

const HOJE = '2026-10-14';
const aberto = {status: 'pendente', dataFim: null, etapas: []};

assert.equal(projetoConcluido('Concluido'), true);
assert.equal(projetoConcluido('concluída'), true);
assert.equal(projetoConcluido('pendente'), false);

// Evento que já passou num projeto aberto fica lembrado.
assert.deepEqual(
  entregaDoProjeto(aberto, [{date: '2026-06-26', title: 'Recomendação Reis e ladrões'}], HOJE),
  {tipo: 'passou', data: '2026-06-26', titulo: 'Recomendação Reis e ladrões'},
);

// O marco futuro mais perto ganha de eventos passados e de datas mais longe.
assert.deepEqual(
  entregaDoProjeto(
    {
      status: 'em_andamento',
      dataFim: '2026-12-01',
      etapas: [
        {id: 'e1', projetoId: 'p', nome: 'Roteiro aprovado', ordem: 0, status: 'pendente', dataPrazo: '2026-10-20', createdAt: ''},
        {id: 'e2', projetoId: 'p', nome: 'Já feita', ordem: 1, status: 'concluída', dataPrazo: '2026-10-15', createdAt: ''},
      ],
    },
    [{date: '2026-09-01', title: 'Briefing'}],
    HOJE,
  ),
  {tipo: 'proxima', data: '2026-10-20', titulo: 'Roteiro aprovado'},
);

// Concluído ou sem datas: nada a mostrar.
assert.equal(entregaDoProjeto({...aberto, status: 'Concluido'}, [{date: '2026-06-26', title: 'x'}], HOJE), null);
assert.equal(entregaDoProjeto(aberto, [], HOJE), null);

console.log('entrega.test.ts passed');
