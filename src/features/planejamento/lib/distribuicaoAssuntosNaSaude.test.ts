import assert from 'node:assert/strict';
import { distribuicaoAssuntosNaSaude } from './distribuicaoAssuntosNaSaude.ts';
import type { GradeEntry } from '../../editorial/lib/gradeEntries.ts';
import type { Content, Tema } from '../../../lib/database.ts';

function criarEntry(id: string, contentId: string): GradeEntry {
  return {
    id,
    contentId,
    tipo: 'original',
    data: '2026-11-05',
    hora: null,
    contaNaGrade: true,
    pilarId: null,
    serieId: null,
    funcao: null,
    realizada: false,
    realizadaEm: null,
  };
}

function testDistribuicaoVazia() {
  const res = distribuicaoAssuntosNaSaude({
    itens: [],
    contents: [],
    temas: [{ id: 't1', nome: 'IA' }],
  });
  assert.equal(res.totalPautas, 0);
  assert.equal(res.linhas.length, 0);
  assert.equal(res.semAssunto.length, 0);
}

function testDistribuicaoComMultiplosTemasEConcentracao() {
  const temas: Pick<Tema, 'id' | 'nome'>[] = [
    { id: 't1', nome: 'IA' },
    { id: 't2', nome: 'Carreira' },
    { id: 't3', nome: 'Finanças' },
  ];

  const contents: Partial<Content>[] = [
    { id: 'c1', temaIds: ['t1', 't2'] },
    { id: 'c2', temaIds: ['t1'] },
    { id: 'c3', temaIds: ['t1'] },
    { id: 'c4', temaIds: [] }, // Sem tema
  ];

  const itens: GradeEntry[] = [
    criarEntry('e1', 'c1'),
    criarEntry('e2', 'c2'),
    criarEntry('e3', 'c3'),
    criarEntry('e4', 'c4'),
  ];

  const res = distribuicaoAssuntosNaSaude({
    itens,
    contents: contents as Content[],
    temas,
    limiteFracao: 1 / 3, // 33%
    minPautas: 3,
  });

  assert.equal(res.totalPautas, 4);
  assert.equal(res.comAssunto, 3);
  assert.equal(res.semAssunto.length, 1);
  assert.equal(res.semAssuntoPct, 25);

  // t1: 3 pautas (75%) -> acima de 33% e >= 3 pautas -> concentrado
  const linhaIA = res.linhas.find(l => l.id === 't1');
  assert.ok(linhaIA);
  assert.equal(linhaIA.pautas, 3);
  assert.equal(linhaIA.pct, 75);
  assert.equal(linhaIA.concentrado, true);
  assert.equal(linhaIA.itens.length, 3);

  // t2: 1 pauta (25%) -> não concentrado
  const linhaCarreira = res.linhas.find(l => l.id === 't2');
  assert.ok(linhaCarreira);
  assert.equal(linhaCarreira.pautas, 1);
  assert.equal(linhaCarreira.pct, 25);
  assert.equal(linhaCarreira.concentrado, false);

  // t3: 0 pautas -> não aparece nas linhas
  assert.equal(res.linhas.some(l => l.id === 't3'), false);
}

testDistribuicaoVazia();
testDistribuicaoComMultiplosTemasEConcentracao();
