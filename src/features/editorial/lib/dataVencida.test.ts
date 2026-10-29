import assert from 'node:assert/strict';
import { dataPrevistaVencida, retirarPrevisao } from './dataVencida.ts';

function testDataVencida() {
  const hoje = new Date('2026-10-28T12:00:00.000Z');
  assert.equal(
    dataPrevistaVencida({ status: 'Roteiro', publishDate: '2026-10-20T12:00:00.000Z' }, hoje),
    true,
  );
  assert.equal(
    dataPrevistaVencida({ status: 'Roteiro', publishDate: '2026-11-01T12:00:00.000Z' }, hoje),
    false,
  );
  assert.equal(
    dataPrevistaVencida({
      status: 'Publicado',
      publishDate: '2026-10-20T12:00:00.000Z',
      postedAt: '2026-10-20T12:00:00.000Z',
    }, hoje),
    false,
  );
}

function testRetirarPrevisao() {
  const next = retirarPrevisao({
    publishDate: '2026-10-20T12:00:00.000Z',
    publishDateEnabled: true,
    plataformas: [{
      publishDate: '2026-10-20T12:00:00.000Z',
      publishDateEnabled: true,
    }],
  });
  assert.equal(next.publishDate, null);
  assert.equal(next.publishDateEnabled, false);
  assert.equal(next.plataformas[0]?.publishDate, null);
}

testDataVencida();
testRetirarPrevisao();
console.log('dataVencida tests passed');
