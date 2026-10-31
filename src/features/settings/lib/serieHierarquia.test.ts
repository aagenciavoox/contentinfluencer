import assert from 'node:assert/strict';
import {
  erroDoVinculo,
  opcoesDePai,
  paiObrigatorio,
  podeTerTemporadas,
  rotaParaCriarFilho,
} from './serieHierarquia.ts';

const series = [
  { id: 'desc', name: 'Descomplicando', parentId: null, tipoAgrupamento: 'familia' as const },
  { id: 'outra', name: 'Outra família', parentId: null, tipoAgrupamento: 'familia' as const },
  { id: 'branbran', name: 'Descomplicando Branbran', parentId: 'desc', tipoAgrupamento: 'serie' as const },
  { id: 'solta', name: 'Livros por classe de RPG', parentId: null, tipoAgrupamento: 'serie' as const },
  { id: 'comece', name: 'Por onde começo?', parentId: 'branbran', tipoAgrupamento: 'quadro' as const },
];

// Cada tipo só aceita o nível logo acima.
assert.deepEqual(opcoesDePai('familia', 'nova', series), []);
assert.deepEqual(opcoesDePai('serie', 'nova', series).map(item => item.id), ['desc', 'outra']);
assert.deepEqual(opcoesDePai('quadro', 'novo', series).map(item => item.id), ['branbran', 'solta']);

// Série pode ficar sem família; quadro precisa de série.
assert.equal(erroDoVinculo('serie', null, 'nova', series), null);
assert.equal(erroDoVinculo('serie', 'desc', 'nova', series), null);
assert.equal(erroDoVinculo('quadro', 'branbran', 'novo', series), null);
assert.equal(erroDoVinculo('quadro', null, 'novo', series), 'Escolha a série deste quadro.');
assert.equal(erroDoVinculo('quadro', 'desc', 'novo', series), 'Um quadro só pode ficar dentro de uma série.');
assert.equal(erroDoVinculo('quadro', 'comece', 'novo', series), 'Um quadro só pode ficar dentro de uma série.');
assert.equal(erroDoVinculo('serie', 'branbran', 'nova', series), 'Uma série só pode fazer parte de uma família.');
assert.equal(erroDoVinculo('familia', 'outra', 'desc', series), 'Uma família não fica dentro de outro agrupamento.');
assert.equal(erroDoVinculo('familia', null, 'desc', series), null);

assert.equal(paiObrigatorio('quadro'), true);
assert.equal(paiObrigatorio('serie'), false);
assert.equal(podeTerTemporadas('serie'), true);
assert.equal(podeTerTemporadas('quadro'), false);
assert.equal(podeTerTemporadas('familia'), false);

assert.equal(rotaParaCriarFilho('desc', 'familia'), '/series/novo?familia=desc');
assert.equal(rotaParaCriarFilho('branbran', 'serie'), '/series/branbran/quadros/novo');
assert.equal(rotaParaCriarFilho('comece', 'quadro'), null);

console.log('serieHierarquia.test.ts: ok');
