import assert from 'node:assert/strict';
import { opcoesSerieDoPostIt, type SerieDoPostIt } from './opcoesSerieDoPostIt.ts';

function no(id: string, extra: Partial<SerieDoPostIt> = {}): SerieDoPostIt {
  return { id, name: id, parentId: null, tipoAgrupamento: 'serie', ativa: true, ...extra };
}

const series = [
  no('FamB', { tipoAgrupamento: 'familia' }),
  no('FamA', { tipoAgrupamento: 'familia' }),
  no('Zebra', { tipoAgrupamento: 'serie', parentId: 'FamB' }),
  no('Beta', { tipoAgrupamento: 'serie', parentId: 'FamA' }),
  no('Alfa', { tipoAgrupamento: 'serie', parentId: 'FamA' }),
  no('Q2', { tipoAgrupamento: 'quadro', parentId: 'Alfa' }),
  no('Q1', { tipoAgrupamento: 'quadro', parentId: 'Alfa' }),
  no('Solo', { tipoAgrupamento: 'serie' }),
  no('Solto', { tipoAgrupamento: 'quadro' }),
  no('Inativa', { tipoAgrupamento: 'serie', ativa: false }),
  no('TempNaoEntra', { tipoAgrupamento: 'serie', ativa: false }),
];

const ids = (atualId?: string | null) => opcoesSerieDoPostIt(series, atualId).map(item => item.value);

assert.deepEqual(
  ids(),
  [
    'familia:FamA', 'Alfa', 'Q1', 'Q2', 'Beta',
    'familia:FamB', 'Zebra',
    'Solo',
    'Solto',
  ],
  'famílias em ordem, séries embaixo, quadros recuados, avulsos no fim; inativas ficam de fora',
);

const opcoes = opcoesSerieDoPostIt(series);
const porValor = new Map(opcoes.map(item => [item.value, item]));
assert.equal(porValor.get('familia:FamA')?.disabled, true);
assert.equal(porValor.get('familia:FamA')?.label, 'Família · FamA');
assert.equal(porValor.get('Alfa')?.label, 'Série · Alfa');
assert.equal(porValor.get('Alfa')?.disabled, undefined);
assert.equal(porValor.get('Q1')?.label, 'Quadro · Q1');
assert.equal(porValor.get('Q1')?.indent, true);
assert.equal(porValor.get('Solto')?.label, 'Quadro · Solto');
assert.equal(porValor.get('Solto')?.indent, undefined, 'quadro sem série não leva recuo');
assert.equal(opcoes.some(item => item.value === 'Inativa' || item.value === 'TempNaoEntra'), false);
assert.equal(opcoes.some(item => item.value === 'FamA'), false, 'família não é selecionável');

assert.deepEqual(
  ids('Inativa'),
  [
    'familia:FamA', 'Alfa', 'Q1', 'Q2', 'Beta',
    'familia:FamB', 'Zebra',
    'Inativa', 'Solo',
    'Solto',
  ],
  'id já gravado e inativo permanece no lugar da série',
);
assert.equal(opcoesSerieDoPostIt(series, 'Inativa').find(item => item.value === 'Inativa')?.label, 'Série · Inativa');

const comFamiliaGravada = opcoesSerieDoPostIt(series, 'FamA');
assert.ok(comFamiliaGravada.some(item => item.value === 'FamA'), 'família já gravada no post-it não some');
assert.equal(comFamiliaGravada.find(item => item.value === 'FamA')?.label, 'Família · FamA');

console.log('opcoesSerieDoPostIt.test.ts ok');
