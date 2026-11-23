import assert from 'node:assert/strict';
import { loaderForPath, routeLoaders } from './routePrefetch.ts';

assert.equal(loaderForPath('/biblioteca/anotacoes'), routeLoaders.libraryAnnotations);
assert.equal(loaderForPath('/biblioteca/analise'), routeLoaders.libraryAnalysis);
assert.equal(loaderForPath('/biblioteca'), routeLoaders.library);
assert.equal(loaderForPath('/biblioteca/livro-1'), routeLoaders.bookDetail);
assert.equal(loaderForPath('/clubes/abc'), routeLoaders.clube);
assert.equal(loaderForPath('/clubes/abc?aba=pecas'), routeLoaders.clube);

console.log('routePrefetch.test.ts: ok');
