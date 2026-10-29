import assert from 'node:assert/strict';
import { patchSerieAoVincularPilar, serieLigadaAoPilar } from './vincularSerieAoPilar.ts';

function testLigaPeloPrincipalEPeloVinculoAntigo() {
  assert.equal(serieLigadaAoPilar({ id: 's', pilarPrincipalId: 'p1', pilarIds: ['p1'] }, 'p1'), true);
  assert.equal(serieLigadaAoPilar({ id: 's', pilarPrincipalId: null, pilarIds: ['p1'] }, 'p1'), true);
  assert.equal(serieLigadaAoPilar({ id: 's', pilarPrincipalId: 'p2', pilarIds: ['p1'] }, 'p1'), false);
}

function testVincularGravaPrincipalEAlinhaVinculoAntigo() {
  assert.deepEqual(
    patchSerieAoVincularPilar({ id: 's', pilarPrincipalId: null, pilarIds: [] }, 'ciencia', true),
    { pilarPrincipalId: 'ciencia', pilarIds: ['ciencia'] },
  );
  assert.deepEqual(
    patchSerieAoVincularPilar({ id: 's', pilarPrincipalId: 'humor', pilarIds: ['humor'] }, 'ciencia', true),
    { pilarPrincipalId: 'ciencia', pilarIds: ['ciencia'] },
  );
  // Só o vínculo antigo: ganha o principal.
  assert.deepEqual(
    patchSerieAoVincularPilar({ id: 's', pilarPrincipalId: null, pilarIds: ['ciencia'] }, 'ciencia', true),
    { pilarPrincipalId: 'ciencia', pilarIds: ['ciencia'] },
  );
  assert.equal(
    patchSerieAoVincularPilar({ id: 's', pilarPrincipalId: 'ciencia', pilarIds: ['ciencia'] }, 'ciencia', true),
    null,
  );
}

function testDesvincularLimpaPrincipalOuSoOVinculoAntigo() {
  assert.deepEqual(
    patchSerieAoVincularPilar({ id: 's', pilarPrincipalId: 'ciencia', pilarIds: ['ciencia'] }, 'ciencia', false),
    { pilarPrincipalId: null, pilarIds: [] },
  );
  assert.deepEqual(
    patchSerieAoVincularPilar({ id: 's', pilarPrincipalId: 'humor', pilarIds: ['humor', 'ciencia'] }, 'ciencia', false),
    { pilarPrincipalId: 'humor', pilarIds: ['humor'] },
  );
  assert.equal(
    patchSerieAoVincularPilar({ id: 's', pilarPrincipalId: 'humor', pilarIds: ['humor'] }, 'ciencia', false),
    null,
  );
}

testLigaPeloPrincipalEPeloVinculoAntigo();
testVincularGravaPrincipalEAlinhaVinculoAntigo();
testDesvincularLimpaPrincipalOuSoOVinculoAntigo();
console.log('vincularSerieAoPilar tests passed');
