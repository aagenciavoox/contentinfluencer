import assert from 'node:assert/strict';
import {
  buildLegacyCreationTarget,
  resolveLegacyCreationTab,
} from './legacyCreationRoute.ts';

assert.equal(
  resolveLegacyCreationTab('ideas', '/ideias', new URLSearchParams()),
  'ideias',
);
assert.equal(
  resolveLegacyCreationTab(
    'contents',
    '/conteudos',
    new URLSearchParams('status=Pronto+para+Gravar'),
  ),
  'producao',
);
assert.equal(
  buildLegacyCreationTarget('contents', '/conteudos/publicados', '?view=historico&q=teste'),
  '/criacao?q=teste&tab=publicados',
);
assert.equal(
  buildLegacyCreationTarget('ideas', '/ideias', '?compose=1&itemId=book-1'),
  '/criacao?compose=idea&itemId=book-1&tipo=ideia',
);
assert.equal(
  buildLegacyCreationTarget('contents', '/conteudos', '?compose=1'),
  '/criacao?compose=script&tipo=roteiro',
);
assert.equal(
  buildLegacyCreationTarget('ideas', '/ideias', ''),
  '/criacao?tipo=ideia',
);
assert.equal(
  buildLegacyCreationTarget('contents', '/conteudos', ''),
  '/criacao?tipo=roteiro',
);

console.log('legacyCreationRoute.test.ts passed');
