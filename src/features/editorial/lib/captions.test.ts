import assert from 'node:assert/strict';
import type { ContentPlataforma } from '../../../lib/database.ts';
import {
  adaptarLegenda,
  definirLegendaCompartilhada,
  legendaEfetiva,
  migrarLegendas,
} from './captions.ts';

const instagram = { id: 'ig', nome: 'Instagram' };
const tiktok = { id: 'tt', nome: 'TikTok' };

function publicacao(
  partial: Partial<ContentPlataforma> & Pick<ContentPlataforma, 'id' | 'platformId' | 'legenda'>,
): ContentPlataforma {
  return {
    contentId: 'c1',
    hashtags: '',
    publishDate: null,
    publicationKind: 'post',
    status: 'agendada',
    legendaPropria: false,
    ...partial,
  };
}

function testBaseAteAdaptar() {
  const compartilhada = publicacao({ id: 'ig', platformId: 'ig', legenda: 'antiga' });
  assert.equal(legendaEfetiva(null, compartilhada), 'antiga');
  assert.equal(legendaEfetiva('base nova', compartilhada), 'base nova');

  const adaptada = adaptarLegenda('base nova', [compartilhada], instagram)[0];
  assert.equal(adaptada?.legendaPropria, true);
  assert.equal(adaptada?.legenda, 'base nova');
  assert.equal(legendaEfetiva('outra base', adaptada as ContentPlataforma), 'base nova');
}

function testPrimeiraEdicaoPreservaTextoDiferente() {
  const resultado = definirLegendaCompartilhada({
    legendaBaseAtual: null,
    novoTexto: 'legenda do instagram',
    plataformaEditada: instagram,
    publicacoes: [
      publicacao({ id: 'ig', platformId: 'Instagram', legenda: 'legenda do insta' }),
      publicacao({ id: 'tt', platformId: 'tt', legenda: 'só no tiktok' }),
    ],
  });

  assert.equal(resultado.legendaBase, 'legenda do instagram');
  const tiktokPub = resultado.publicacoes.find(item => item.id === 'tt');
  const instagramPub = resultado.publicacoes.find(item => item.id === 'ig');
  assert.equal(tiktokPub?.legendaPropria, true);
  assert.equal(tiktokPub?.legenda, 'só no tiktok');
  assert.equal(instagramPub?.legendaPropria, false);
  assert.equal(instagramPub?.legenda, 'legenda do instagram');
  assert.equal(legendaEfetiva(resultado.legendaBase, tiktokPub as ContentPlataforma), 'só no tiktok');
  assert.equal(legendaEfetiva(resultado.legendaBase, instagramPub as ContentPlataforma), 'legenda do instagram');
}

function testEditarBaseNaoMexeNaPropria() {
  const resultado = definirLegendaCompartilhada({
    legendaBaseAtual: 'base',
    novoTexto: 'base editada',
    plataformaEditada: instagram,
    publicacoes: [
      publicacao({ id: 'ig', platformId: 'ig', legenda: 'base' }),
      publicacao({ id: 'tt', platformId: 'tt', legenda: 'exclusiva', legendaPropria: true }),
    ],
  });
  assert.equal(resultado.legendaBase, 'base editada');
  assert.equal(resultado.publicacoes.find(item => item.id === 'ig')?.legenda, 'base editada');
  assert.equal(resultado.publicacoes.find(item => item.id === 'tt')?.legenda, 'exclusiva');
}

function testMigracaoUsaRedeDeReferencia() {
  const resultado = migrarLegendas({
    legendaBase: null,
    redeReferencia: instagram,
    publicacoes: [
      publicacao({ id: 'ig', platformId: 'ig', legenda: 'texto da grade' }),
      publicacao({ id: 'tt', platformId: tiktok.id, legenda: 'outro texto' }),
      publicacao({ id: 'yt', platformId: 'yt', legenda: 'texto da grade' }),
    ],
  });
  assert.equal(resultado.legendaBase, 'texto da grade');
  assert.equal(resultado.publicacoes.find(item => item.id === 'tt')?.legendaPropria, true);
  assert.equal(resultado.publicacoes.find(item => item.id === 'yt')?.legendaPropria, false);
  assert.equal(resultado.publicacoes.find(item => item.id === 'ig')?.legendaPropria, false);
}

testBaseAteAdaptar();
testPrimeiraEdicaoPreservaTextoDiferente();
testEditarBaseNaoMexeNaPropria();
testMigracaoUsaRedeDeReferencia();
console.log('captions tests passed');