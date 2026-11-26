import assert from 'node:assert/strict';
import {CONTENT_STATUS, DISPLAY_STATUS} from './contentPipeline.ts';
import {createContentDraft} from './createContentDraft.ts';
import {
  designProntoPatch,
  estaEditado,
  nomeDaEtapaNaTela,
  pendenciasDoRoteiro,
  rotuloDaEtapaNaTela,
  STATUS_EDITADO,
  statusNaTela,
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

// Editado: cor própria e ✓ no selo, sem mudar o status do banco.
{
  const edicao = createContentDraft({
    id: 'ed',
    status: CONTENT_STATUS.EDICAO,
    recordedAt: '2026-11-01T12:00:00.000Z',
    edicaoConcluidaEm: null,
    plataformas: [{
      id: 'p1', contentId: 'ed', platformId: 'ig', legenda: '', hashtags: '',
      publishDate: null, status: 'prevista',
    }],
  });
  assert.equal(estaEditado(edicao, contas), false);
  assert.deepEqual(statusNaTela(edicao, contas), {status: CONTENT_STATUS.EDICAO, rotulo: CONTENT_STATUS.EDICAO, editado: false});
  assert.equal(rotuloDaEtapaNaTela(edicao, contas), 'Pronto para editar');

  const editado = {...edicao, edicaoConcluidaEm: '2026-11-03T12:00:00.000Z'};
  assert.equal(estaEditado(editado, contas), true);
  assert.deepEqual(statusNaTela(editado, contas), {status: STATUS_EDITADO, rotulo: '✓ Editado', editado: true});
  assert.equal(rotuloDaEtapaNaTela(editado, contas), '✓ Editado');
  // Base do banco só vale enquanto não está editado.
  assert.equal(statusNaTela(editado, contas, editado.status).rotulo, '✓ Editado');
  assert.equal(statusNaTela(edicao, contas, edicao.status).rotulo, CONTENT_STATUS.EDICAO);

  // Programado e Postado continuam na frente.
  const programado = {
    ...editado,
    plataformas: editado.plataformas.map(item => ({...item, status: 'programada' as const})),
  };
  assert.equal(estaEditado(programado, contas), false);
  assert.equal(statusNaTela(programado, contas).status, DISPLAY_STATUS.PROGRAMADO);

  const postado = {...editado, postedAt: '2026-11-05T12:00:00.000Z'};
  assert.equal(estaEditado(postado, contas), false);
  assert.equal(statusNaTela(postado, contas).status, CONTENT_STATUS.POSTADO);
}

{
  const carrossel = createContentDraft({
    id: 'cd',
    status: CONTENT_STATUS.PRODUCAO,
    writingMode: 'carrossel',
    plataformas: [{
      id: 'p1', contentId: 'cd', platformId: 'ig', legenda: 'ok', hashtags: '',
      publishDate: null, status: 'prevista',
    }],
  });
  assert.equal(estaEditado(carrossel, contas), false);
  assert.equal(statusNaTela(carrossel, contas).rotulo, CONTENT_STATUS.PRODUCAO);

  const pronto = {...carrossel, ...designProntoPatch('2026-11-04T12:00:00.000Z')};
  assert.equal(estaEditado(pronto, contas), true);
  assert.deepEqual(statusNaTela(pronto, contas), {status: STATUS_EDITADO, rotulo: '✓ Design pronto', editado: true});

  // Vídeo em Produção com data de conclusão não vira Editado.
  const video = {...pronto, writingMode: 'texto' as const, plataformas: []};
  assert.equal(estaEditado(video, contas), false);
}
