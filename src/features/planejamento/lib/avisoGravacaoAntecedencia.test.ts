import assert from 'node:assert/strict';
import { createContentDraft } from '../../contents/lib/createContentDraft.ts';
import { avisoDeGravacaoAntecedencia } from './avisosPendencia.ts';
import { cienteDaSemana } from '../../editorial/lib/faixasEditoriais.ts';

const sexta = new Date(2026, 10, 20, 12);

function video(id: string, publishDate: string, extra: Parameters<typeof createContentDraft>[0] = {}) {
  return createContentDraft({ id, title: id, publishDate, formatoVisual: 'Reels', ...extra });
}

const aviso = avisoDeGravacaoAntecedencia({
  hoje: sexta,
  antecedenciaPostagemDias: 3,
  limiteSemanal: 4,
  contents: [
    video('a', '2026-11-20'),
    video('b', '2026-11-21'),
    video('c', '2026-11-23'),
    video('a', '2026-11-23'),
    video('fora', '2026-11-24'),
    video('carrossel', '2026-11-21', { formatoVisual: null, writingMode: 'carrossel' }),
    video('imagem', '2026-11-22', { formatoVisual: 'Post estático' }),
    video('stories', '2026-11-22', { plataformas: [{ platformId: 'ig', formatoPublicacao: 'stories' }] as never }),
    video('ja', '2026-10-02', { recordedAt: '2026-11-18T15:00:00.000Z' }),
    video('ja2', '2026-10-03', { recordedAt: '2026-11-17T15:00:00.000Z' }),
    video('semana-passada', '2026-10-04', { recordedAt: '2026-11-10T15:00:00.000Z' }),
  ],
});

assert.ok(aviso);
assert.equal(aviso?.aGravar, 3);
assert.equal(aviso?.aMais, 1);
assert.deepEqual(aviso?.contentIds, ['a', 'b', 'c']);
assert.equal(aviso?.fim, '2026-11-23');
assert.equal(
  aviso?.texto,
  'Você vai precisar gravar 3 vídeos até segunda, e isso é 1 a mais do que cabe na sua meta desta semana.',
);

assert.equal(avisoDeGravacaoAntecedencia({
  hoje: sexta,
  antecedenciaPostagemDias: null,
  limiteSemanal: 4,
  contents: [video('a', '2026-11-20')],
}), null);

assert.equal(avisoDeGravacaoAntecedencia({
  hoje: sexta,
  antecedenciaPostagemDias: 3,
  limiteSemanal: null,
  contents: [video('a', '2026-11-20')],
}), null);

assert.equal(avisoDeGravacaoAntecedencia({
  hoje: sexta,
  antecedenciaPostagemDias: 3,
  limiteSemanal: 4,
  contents: [video('a', '2026-11-20'), video('b', '2026-11-21')],
}), null, '2 a gravar e 4 de meta ainda cabem na semana');

const comMetaDeGravacao = avisoDeGravacaoAntecedencia({
  hoje: sexta,
  antecedenciaPostagemDias: 3,
  limiteSemanal: 4,
  gravacaoMetaSemanal: 2,
  contents: [
    video('a', '2026-11-20'),
    video('b', '2026-11-21'),
    video('c', '2026-11-23'),
    video('ja', '2026-10-02', { recordedAt: '2026-11-18T15:00:00.000Z' }),
    video('ja2', '2026-10-03', { recordedAt: '2026-11-17T15:00:00.000Z' }),
  ],
});
assert.equal(comMetaDeGravacao?.aMais, 3, 'com meta de gravação 2, os 3 a gravar passam 3');

assert.equal(avisoDeGravacaoAntecedencia({
  hoje: sexta,
  antecedenciaPostagemDias: 3,
  limiteSemanal: 4,
  gravacaoMetaSemanal: null,
  contents: [
    video('a', '2026-11-20'),
    video('b', '2026-11-21'),
    video('c', '2026-11-23'),
    video('ja', '2026-10-02', { recordedAt: '2026-11-18T15:00:00.000Z' }),
    video('ja2', '2026-10-03', { recordedAt: '2026-11-17T15:00:00.000Z' }),
  ],
})?.aMais, 1, 'meta de gravação vazia volta ao teto de postagem');

const emTresContas = avisoDeGravacaoAntecedencia({
  hoje: sexta,
  antecedenciaPostagemDias: 3,
  limiteSemanal: 0,
  contents: [video('um', '2026-11-21', {
    plataformas: [
      { platformId: 'a', formatoPublicacao: 'reels' },
      { platformId: 'b', formatoPublicacao: 'reels' },
      { platformId: 'c', formatoPublicacao: 'reels' },
    ] as never,
  })],
});
assert.equal(emTresContas?.aGravar, 1, 'um roteiro em três contas conta uma vez');

assert.equal(cienteDaSemana('2026-11-20', 'precisa-gravar').semanaInicio, '2026-11-16');

console.log('aviso gravacao antecedencia: ok');
