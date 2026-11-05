import assert from 'node:assert/strict';
import { herancaNaFicha } from './herancaNaFicha.ts';

const series = [
  { id: 's1', parentId: null, name: 'Diário', funcaoPadrao: 'atrair', pilarPrincipalId: 'p1', pilarIds: ['p1'], energiaPadrao: 'baixa' },
  { id: 'q1', parentId: 's1', name: 'Quadro', tipoAgrupamento: 'quadro', funcaoPadrao: null, pilarPrincipalId: null, pilarIds: [] },
] as never;
const pilares = [{ id: 'p1', nome: 'Rotina' }, { id: 'p2', nome: 'Bastidores' }];

// Sem série: nada a mostrar.
assert.deepEqual(herancaNaFicha({ seriesId: null }, series, pilares), []);

// Tudo vazio no roteiro do quadro: sobe até a série.
{
  const linhas = herancaNaFicha({ seriesId: 'q1', funcaoOrigem: 'herdada' }, series, pilares);
  assert.deepEqual(linhas.map(l => [l.rotulo, l.valor, l.origem]), [
    ['Pilar', 'Rotina', 'herdado da série Diário'],
    ['Objetivo', 'Atrair alcance', 'herdado da série Diário'],
    ['Energia', 'Baixa', 'herdado da série Diário'],
  ]);
}

// Escolhido no roteiro vale e aparece como definido aqui.
{
  const linhas = herancaNaFicha(
    { seriesId: 's1', pilarId: 'p2', funcao: 'converter', funcaoOrigem: 'escolhida', energiaNecessaria: 'alta' },
    series,
    pilares,
  );
  assert.deepEqual(linhas.map(l => [l.valor, l.herdado]), [['Bastidores', false], ['Converter em seguidor', false], ['Alta', false]]);
  assert.equal(linhas[0].origem, 'definido neste roteiro');
}

// Quadro com valor próprio: a origem é o quadro, não a série de cima.
{
  const comEnergia = [
    (series as unknown as Record<string, unknown>[])[0],
    { ...(series as unknown as Record<string, unknown>[])[1], energiaPadrao: 'alta' },
  ] as never;
  const linhas = herancaNaFicha({ seriesId: 'q1' }, comEnergia, pilares);
  assert.equal(linhas[2].origem, 'herdado da série Quadro');
  assert.equal(linhas[0].origem, 'herdado da série Diário');
}

// "Nenhum pilar" escolhido continua nenhum.
{
  const [pilar] = herancaNaFicha({ seriesId: 's1', pilarOrigem: 'nenhuma' }, series, pilares);
  assert.equal(pilar.valor, 'Não definido');
}

console.log('herancaNaFicha: ok');
