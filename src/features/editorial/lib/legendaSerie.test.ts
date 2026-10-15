import assert from 'node:assert/strict';
import type { ContentPlataforma } from '../../../lib/database.ts';
import { legendaEfetiva } from './captions.ts';
import { roteirosQueSeguemASerie } from './legendaSerie.ts';

function pub(partial: Partial<ContentPlataforma> & Pick<ContentPlataforma, 'id' | 'platformId'>): ContentPlataforma {
  return {
    contentId: 'c',
    legenda: '',
    hashtags: '',
    publishDate: null,
    publicationKind: 'post',
    status: 'agendada',
    legendaPropria: false,
    ...partial,
  };
}

const anterior = {
  legendaBase: 'Leia comigo: base antiga',
  plataformas: [{ platformId: 'tt', legenda: 'versão antiga do TikTok' }],
};
const nova = {
  legendaBase: 'Leia comigo: base nova',
  plataformas: [{ platformId: 'tt', legenda: 'versão nova do TikTok' }],
};

function roteiro(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    title: `Roteiro ${id}`,
    status: 'Roteiro',
    seriesId: 's1',
    legendaBase: 'Leia comigo: base antiga',
    plataformas: [
      pub({ id: `${id}-ig`, platformId: 'ig', legenda: 'Leia comigo: base antiga' }),
      pub({ id: `${id}-tt`, platformId: 'tt', legenda: 'versão antiga do TikTok', legendaPropria: true }),
    ],
    ...extra,
  };
}

function testAlteracaoDaSerieAlcancaSoQuemAindaSegue() {
  const contents = [
    roteiro('segue'),
    roteiro('base-editada', { legendaBase: 'escrita no roteiro' }),
    roteiro('postado', { status: 'Postado' }),
    roteiro('adaptado', {
      plataformas: [
        pub({ id: 'adaptado-ig', platformId: 'ig', legenda: 'Leia comigo: base antiga' }),
        pub({ id: 'adaptado-tt', platformId: 'tt', legenda: 'adaptei à mão', legendaPropria: true }),
      ],
    }),
    roteiro('publicado-no-ig', {
      plataformas: [
        pub({ id: 'pi-ig', platformId: 'ig', legenda: 'Leia comigo: base antiga', status: 'publicada' }),
        pub({ id: 'pi-tt', platformId: 'tt', legenda: 'versão antiga do TikTok', legendaPropria: true }),
      ],
    }),
    roteiro('outra-serie', { seriesId: 's2' }),
  ];

  const alteracoes = roteirosQueSeguemASerie({ serieId: 's1', anterior, nova, contents });
  const porId = new Map(alteracoes.map(item => [item.contentId, item]));
  assert.deepEqual([...porId.keys()].sort(), ['adaptado', 'publicado-no-ig', 'segue']);

  const segue = porId.get('segue');
  assert.equal(segue?.legendaBase, 'Leia comigo: base nova');
  assert.equal(legendaEfetiva(segue?.legendaBase, segue?.publicacoes[0] as ContentPlataforma), 'Leia comigo: base nova');
  assert.equal(segue?.publicacoes[1]?.legenda, 'versão nova do TikTok');

  // Adaptação manual da conta fica; a base, que ninguém editou, acompanha.
  const adaptado = porId.get('adaptado');
  assert.equal(adaptado?.publicacoes.find(item => item.id === 'adaptado-tt')?.legenda, 'adaptei à mão');
  assert.equal(adaptado?.legendaBase, 'Leia comigo: base nova');

  // Publicação já realizada guarda o texto que foi ao ar.
  const publicado = porId.get('publicado-no-ig');
  const ig = publicado?.publicacoes.find(item => item.id === 'pi-ig') as ContentPlataforma;
  assert.equal(legendaEfetiva(publicado?.legendaBase, ig), 'Leia comigo: base antiga');
  assert.equal(publicado?.publicacoes.find(item => item.id === 'pi-tt')?.legenda, 'versão nova do TikTok');
}

function testSemMudancaNaoAlcancaNinguem() {
  assert.deepEqual(roteirosQueSeguemASerie({ serieId: 's1', anterior, nova: anterior, contents: [roteiro('a')] }), []);
}

function testSerieSemBaseAnteriorSoOrientaRoteirosNovos() {
  const semBase = roteiro('legado', { legendaBase: null, plataformas: [pub({ id: 'l-ig', platformId: 'ig', legenda: 'texto antigo' })] });
  const alteracoes = roteirosQueSeguemASerie({
    serieId: 's1',
    anterior: { legendaBase: null, plataformas: [] },
    nova: { legendaBase: 'primeira base da série', plataformas: [] },
    contents: [semBase],
  });
  assert.deepEqual(alteracoes, []);
}

testAlteracaoDaSerieAlcancaSoQuemAindaSegue();
testSemMudancaNaoAlcancaNinguem();
testSerieSemBaseAnteriorSoOrientaRoteirosNovos();
console.log('legendaSerie tests passed');
