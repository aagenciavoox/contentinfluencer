import assert from 'node:assert/strict';
import type { GradeEntry } from './gradeEntries.ts';
import { countGrade, type PilarContagem } from './gradeCounts.ts';

const PERCENTUAIS = {
  atrair: 35,
  converter: 30,
  aprofundar: 20,
  comunidade: 15,
  acao: 0,
  reter: 0,
};

function entrada(partial: Partial<GradeEntry> & Pick<GradeEntry, 'id'>): GradeEntry {
  return {
    contentId: partial.id,
    tipo: 'original',
    data: '2026-04-27',
    hora: null,
    contaNaGrade: true,
    pilarId: 'pilar-a',
    serieId: null,
    funcao: 'atrair',
    realizada: false,
    realizadaEm: null,
    ...partial,
  };
}

const pilaresGrandes: PilarContagem[] = [
  { id: 'pilar-a', nome: 'Literatura', ativo: true, frequenciaSemanal: 8 },
  { id: 'pilar-b', nome: 'Bastidores', ativo: true, frequenciaSemanal: 6 },
];

function testSoContaNaGradeESeparaRealizado() {
  const resultado = countGrade({
    pilares: pilaresGrandes,
    settings: { distribuicaoFuncoes: PERCENTUAIS },
    periodo: { inicio: '2026-04-27', fim: '2026-05-03' },
    entries: [
      entrada({ id: 'a1', data: '2026-04-27', realizada: true }),
      entrada({ id: 'a2', data: '2026-04-28', funcao: 'converter' }),
      entrada({ id: 'fora', data: '2026-04-28', contaNaGrade: false, pilarId: 'pilar-b' }),
      entrada({ id: 'outra-semana', data: '2026-05-04', pilarId: 'pilar-b', funcao: 'comunidade' }),
      entrada({
        id: 'repost',
        tipo: 'repost',
        data: '2026-04-30',
        pilarId: 'pilar-b',
        funcao: 'aprofundar',
        realizada: true,
      }),
    ],
  });

  assert.equal(resultado.gradePequena, false);
  assert.equal(resultado.semanas, 1);
  assert.equal(resultado.periodo.fim, '2026-05-03');
  assert.deepEqual(
    resultado.pilares.map(linha => [linha.id, linha.planejado, linha.realizado, linha.meta]),
    [
      ['pilar-a', 2, 1, 8],
      ['pilar-b', 1, 1, 6],
    ],
  );
  assert.equal(resultado.funcoes.find(linha => linha.id === 'atrair')?.planejado, 1);
  assert.equal(resultado.funcoes.find(linha => linha.id === 'atrair')?.realizado, 1);
  assert.equal(resultado.funcoes.find(linha => linha.id === 'atrair')?.meta, 5);
  assert.equal(resultado.funcoes.find(linha => linha.id === 'converter')?.meta, 4);
  assert.equal(resultado.funcoes.find(linha => linha.id === 'aprofundar')?.meta, 3);
  assert.equal(resultado.funcoes.find(linha => linha.id === 'comunidade')?.meta, 2);
  assert.equal(resultado.funcoes.find(linha => linha.id === 'acao'), undefined);
  assert.equal(resultado.notaSoma, 'Seus pilares somam 3 de 14.');
}

function testGradePequenaUsaQuatroSemanas() {
  const resultado = countGrade({
    pilares: [{ id: 'pilar-a', nome: 'Literatura', ativo: true, frequenciaSemanal: 3 }],
    settings: { distribuicaoFuncoes: PERCENTUAIS },
    periodo: { inicio: '2026-04-27', fim: '2026-05-03' },
    entries: [
      entrada({ id: 'dentro', data: '2026-05-24' }),
      entrada({ id: 'fora', data: '2026-05-25' }),
    ],
  });

  assert.equal(resultado.gradePequena, true);
  assert.equal(resultado.semanas, 4);
  assert.equal(resultado.periodo.inicio, '2026-04-27');
  assert.equal(resultado.periodo.fim, '2026-05-24');
  assert.equal(resultado.totalMeta, 12);
  assert.equal(resultado.pilares[0]?.planejado, 1);
  assert.equal(resultado.pilares[0]?.meta, 12);
  assert.deepEqual(
    resultado.funcoes.map(linha => [linha.id, linha.meta]),
    [
      ['atrair', 4],
      ['converter', 4],
      ['aprofundar', 2],
      ['comunidade', 2],
    ],
  );
  assert.equal(resultado.notaSoma, null);
}

function testSemDistribuicaoNaoInventaMetaDeFuncao() {
  const resultado = countGrade({
    pilares: [{ id: 'pilar-a', nome: 'Literatura', ativo: true, frequenciaSemanal: 8 }],
    settings: { distribuicaoFuncoes: null },
    periodo: { inicio: '2026-04-27', fim: '2026-05-03' },
    entries: [entrada({ id: 'a1' })],
  });
  assert.equal(resultado.funcoes.find(linha => linha.id === 'atrair')?.meta, 0);
  assert.equal(resultado.funcoes.find(linha => linha.id === 'atrair')?.planejado, 1);
  assert.equal(resultado.notaSoma, null);
}

function testPilarInativoESemFrequenciaFicamDeFora() {
  const resultado = countGrade({
    pilares: [
      { id: 'ativo', nome: 'Ativo', ativo: true, frequenciaSemanal: 8 },
      { id: 'inativo', nome: 'Inativo', ativo: false, frequenciaSemanal: 4 },
      { id: 'sem', nome: 'Sem', ativo: true, frequenciaSemanal: null },
    ],
    settings: { distribuicaoFuncoes: null },
    periodo: { inicio: '2026-04-27', fim: '2026-05-03' },
    entries: [
      entrada({ id: 'inativo', pilarId: 'inativo', funcao: null }),
      entrada({ id: 'sem', pilarId: 'sem', funcao: null }),
    ],
  });
  assert.deepEqual(resultado.pilares.map(linha => linha.id), ['ativo']);
  assert.equal(resultado.pilares[0]?.planejado, 0);
}

testSoContaNaGradeESeparaRealizado();
testGradePequenaUsaQuatroSemanas();
testSemDistribuicaoNaoInventaMetaDeFuncao();
testPilarInativoESemFrequenciaFicamDeFora();

console.log('gradeCounts tests passed');
