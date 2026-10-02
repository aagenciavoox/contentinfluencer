import assert from 'node:assert/strict';
import {captionHashtagPresets, mergeHashtags, parseHashtags} from './captionHashtags.ts';

const serie = {
  name: 'Curto e viral',
  plataformas: [{serieId: 's1', platformId: 'Instagram', hashtags: 'livro leitura'}],
};

const pilar = {
  nome: 'Foco na Identidade',
  plataformas: [{pilarId: 'p1', platformId: 'Instagram', hashtags: '#leitura #eu', melhoresDias: [], janelaHorarioInicio: null, janelaHorarioFim: null}],
};

assert.deepEqual(
  captionHashtagPresets('Instagram', serie, pilar).map(item => item.sourceLabel),
  ['série', 'pilar'],
);

assert.deepEqual(
  captionHashtagPresets('Tiktok', serie, pilar),
  [],
);

assert.deepEqual(parseHashtags('livro #leitura'), ['#livro', '#leitura']);

assert.deepEqual(
  mergeHashtags(['#livro'], ['#leitura', '#livro', '#extra']),
  ['#livro', '#leitura', '#extra'],
);

console.log('ok - caption hashtag presets keep series and pillar tags');
