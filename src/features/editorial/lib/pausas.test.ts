import assert from 'node:assert/strict';
import { metaDoPeriodo } from './metaDoPeriodo.ts';
import {
  diasDePausa,
  pausasDoTexto,
  pausasNoIntervalo,
  problemaDaPausa,
  removerPausa,
  salvarPausa,
  trechosDosDias,
  type PausaEditorial,
} from './pausas.ts';

const DEZEMBRO = { inicio: '2026-12-01', fim: '2026-12-31' };

function pausa(id: string, inicio: string, fim: string, extra: Partial<PausaEditorial> = {}): PausaEditorial {
  return { id, inicio, fim, escopo: 'publicacao', platformId: null, serieId: null, nota: '', ...extra };
}

// --- Dias seguidos viram um trecho.
assert.deepEqual(trechosDosDias(['2026-12-31', '2026-12-24', '2026-12-25', '2026-12-26']), [
  { inicio: '2026-12-24', fim: '2026-12-26' },
  { inicio: '2026-12-31', fim: '2026-12-31' },
]);

// --- Converter a pausa escrita: os mesmos dias que já eram descontados, e a meta não muda.
{
  let n = 0;
  const convertidas = pausasDoTexto('24/12 a 26/12 e 31/12', DEZEMBRO, () => `p${++n}`);
  assert.deepEqual(convertidas?.map(item => [item.inicio, item.fim, item.escopo]), [
    ['2026-12-24', '2026-12-26', 'publicacao'],
    ['2026-12-31', '2026-12-31', 'publicacao'],
  ]);
  assert.equal(convertidas?.[0].nota, '24/12 a 26/12 e 31/12');
  const pelaEscrita = metaDoPeriodo({ periodo: DEZEMBRO, limiteSemanal: 7, decisao: { pausaEditorial: '24/12 a 26/12 e 31/12' } });
  const pelaData = metaDoPeriodo({
    periodo: DEZEMBRO,
    limiteSemanal: 7,
    diasPausados: diasDePausa(convertidas ?? [], { tipo: 'publicacao' }, DEZEMBRO),
  });
  assert.equal(pelaData.valor, pelaEscrita.valor);
  assert.equal(pelaData.diasDePausa, 4);
  // Texto com dúvida não é convertido: fica para revisão.
  assert.equal(pausasDoTexto('uns 5 dias no fim do ano', DEZEMBRO, () => 'x'), null);
  assert.equal(pausasDoTexto('', DEZEMBRO, () => 'x'), null);
}

// --- Gravar, trocar e remover; o alvo só fica no escopo que usa.
{
  const uma = salvarPausa([], pausa('a', '2026-12-24', '2026-12-26', { platformId: 'ig', nota: ' Natal ' }));
  assert.equal(uma[0].platformId, null, 'pausa de publicação não guarda conta');
  assert.equal(uma[0].nota, 'Natal');
  const trocada = salvarPausa(uma, pausa('a', '2026-12-20', '2026-12-26', { escopo: 'conta', platformId: 'ig' }));
  assert.equal(trocada.length, 1);
  assert.equal(trocada[0].platformId, 'ig');
  assert.equal(removerPausa(trocada, 'a').length, 0);
}

// --- Só as que cruzam o período, em ordem.
assert.deepEqual(
  pausasNoIntervalo([
    pausa('b', '2027-01-02', '2027-01-03'),
    pausa('a', '2026-11-28', '2026-12-02'),
    pausa('c', '2026-12-10', '2026-12-10'),
  ], DEZEMBRO).map(item => item.id),
  ['a', 'c'],
);

// --- O que falta para gravar.
assert.equal(
  problemaDaPausa({ inicio: '2026-12-26', fim: '2026-12-24', escopo: 'publicacao', platformId: null, serieId: null, nota: '' }),
  'O início precisa ser antes do fim.',
);
assert.equal(
  problemaDaPausa({ inicio: '2026-12-24', fim: '2026-12-26', escopo: 'conta', platformId: null, serieId: null, nota: '' }),
  'Escolha a conta.',
);
assert.equal(
  problemaDaPausa({ inicio: '2026-12-24', fim: '2026-12-26', escopo: 'serie', platformId: null, serieId: 's1', nota: '' }),
  null,
);

console.log('pausas: ok');
