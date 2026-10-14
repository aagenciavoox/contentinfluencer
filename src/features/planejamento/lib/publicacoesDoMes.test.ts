import assert from 'node:assert/strict';
import type {Content, ContentPlataforma} from '../../../lib/database.ts';
import {publicacoesPorDia} from './publicacoesDoMes.ts';

const INSTAGRAM = 'plat-instagram';
const platforms = [{id: INSTAGRAM, nome: 'Instagram'}];

function publicacao(partial: Partial<ContentPlataforma> & Pick<ContentPlataforma, 'id' | 'contentId'>): ContentPlataforma {
  return {
    platformId: INSTAGRAM,
    legenda: '',
    hashtags: '',
    publishDate: null,
    publicationKind: 'post',
    status: 'agendada',
    ...partial,
  };
}

function conteudo(partial: Partial<Content> & Pick<Content, 'id'>): Content {
  return {
    userId: 'u',
    title: 'Roteiro',
    status: 'Produção',
    slotType: null,
    seriesId: null,
    pilarId: null,
    lookId: null,
    cenarioId: null,
    bibliotecaItemId: null,
    formatoVisual: null,
    energiaNecessaria: null,
    funcao: null,
    funcaoOrigem: null,
    classificacaoCongeladaEm: null,
    contaNaGrade: true,
    publishDate: null,
    publishTime: null,
    recordingDate: null,
    link: null,
    script: null,
    scriptNotes: [],
    tags: [],
    notes: null,
    referencias: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    deletedAt: null,
    plataformas: [],
    ...partial,
  };
}

function testMostraPostadosEProgramadosMasNaoOQueFicouParaTras() {
  const contents = [
    conteudo({
      id: 'postado',
      title: 'Já foi',
      status: 'Postado',
      plataformas: [
        publicacao({
          id: 'ig-1',
          contentId: 'postado',
          status: 'publicada',
          realizadaManualEm: '2026-10-10T15:00:00.000Z',
        }),
      ],
    }),
    conteudo({
      id: 'programado',
      title: 'Vai sair',
      plataformas: [
        publicacao({id: 'ig-2', contentId: 'programado', publishDate: '2026-10-20', publishTime: '18:00:00'}),
      ],
    }),
    conteudo({
      id: 'para-tras',
      title: 'Ficou para trás',
      plataformas: [
        publicacao({id: 'ig-3', contentId: 'para-tras', publishDate: '2026-10-12'}),
      ],
    }),
  ];

  const dias = publicacoesPorDia({
    contents,
    platforms,
    series: [],
    redeReferenciaId: INSTAGRAM,
    hoje: '2026-10-14',
  });

  assert.deepEqual([...dias.keys()].sort(), ['2026-10-10', '2026-10-20']);
  assert.deepEqual(
    dias.get('2026-10-10')?.map(item => [item.titulo, item.estado]),
    [['Já foi', 'postado']],
  );
  assert.deepEqual(
    dias.get('2026-10-20')?.map(item => [item.titulo, item.estado, item.time]),
    [['Vai sair', 'programado', '18:00']],
  );
}

testMostraPostadosEProgramadosMasNaoOQueFicouParaTras();
console.log('publicacoesDoMes tests passed');
