import assert from 'node:assert/strict';
import {CONTENT_STATUS} from './contentPipeline.ts';
import {createContentDraft} from './createContentDraft.ts';
import {
  designProntoPatch,
  nomeDaEtapaNaTela,
  pendenciasDoRoteiro,
  tipoDaPeca,
} from './esteiraDisplay.ts';

const contas = [
  {id: 'ig', nome: 'Instagram', rede: 'instagram' as const, ativo: true},
  {id: 'tt', nome: 'TikTok', rede: 'tiktok' as const, ativo: true},
];

{
  const video = createContentDraft({
    id: 'v',
    status: CONTENT_STATUS.PRODUCAO,
    writingMode: 'texto',
    plataformas: [{
      id: 'p1', contentId: 'v', platformId: 'ig', legenda: '', hashtags: '',
      publishDate: null, status: 'prevista',
    }],
  });
  assert.equal(tipoDaPeca(video, contas), 'video');
  assert.equal(nomeDaEtapaNaTela(video, contas), 'Pronto para gravar');
  assert.deepEqual(pendenciasDoRoteiro(video, contas), ['gravar', 'legenda']);
}

{
  const carrossel = createContentDraft({
    id: 'c',
    status: CONTENT_STATUS.PRODUCAO,
    writingMode: 'carrossel',
    plataformas: [{
      id: 'p1', contentId: 'c', platformId: 'ig', legenda: 'já tem', hashtags: '',
      publishDate: null, status: 'prevista',
    }],
  });
  assert.equal(tipoDaPeca(carrossel, contas), 'carrossel');
  assert.equal(nomeDaEtapaNaTela(carrossel, contas), 'Montar o design');
  assert.deepEqual(pendenciasDoRoteiro(carrossel, contas), ['montar-design']);

  const pronto = {...carrossel, ...designProntoPatch('2026-11-04T12:00:00.000Z')};
  assert.equal(nomeDaEtapaNaTela(pronto, contas), 'Design pronto');
  assert.deepEqual(pendenciasDoRoteiro(pronto, contas), []);
}

{
  const edicao = createContentDraft({
    id: 'e',
    status: CONTENT_STATUS.EDICAO,
    recordedAt: '2026-11-01T12:00:00.000Z',
    edicaoConcluidaEm: null,
    legendaBase: 'texto',
    plataformas: [{
      id: 'p1', contentId: 'e', platformId: 'ig', legenda: '', hashtags: '',
      publishDate: '2026-11-10T12:00:00.000Z', status: 'prevista',
    }],
  });
  assert.equal(nomeDaEtapaNaTela(edicao, contas), 'Pronto para editar');
  assert.deepEqual(pendenciasDoRoteiro(edicao, contas), ['marcar-pronto']);

  const editado = {...edicao, edicaoConcluidaEm: '2026-11-03T12:00:00.000Z'};
  assert.equal(nomeDaEtapaNaTela(editado, contas), 'Editado');
  assert.deepEqual(pendenciasDoRoteiro(editado, contas), []);
}

{
  const gravadoSemEdicao = createContentDraft({
    id: 'g',
    status: CONTENT_STATUS.PRODUCAO,
    recordedAt: '2026-11-01T12:00:00.000Z',
    legendaBase: 'ok',
  });
  assert.deepEqual(pendenciasDoRoteiro(gravadoSemEdicao, contas), ['sinalizar-edicao']);
}

console.log('esteiraDisplay tests passed');
