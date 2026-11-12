import assert from 'node:assert/strict';
import type { ContentPlataforma } from '../../../lib/database.ts';
import { mudarDataPrincipal, mudarHoraPrincipal } from './dataPrincipal.ts';

function conta(platformId: string, extra: Partial<ContentPlataforma> = {}): ContentPlataforma {
  return {
    id: `p-${platformId}`,
    contentId: 'r1',
    platformId,
    legenda: '',
    hashtags: '',
    publishDate: '2026-11-12T12:00:00.000Z',
    publishTime: null,
    status: 'prevista',
    ...extra,
  };
}

const rascunho = {
  id: 'r1',
  status: 'Edição',
  publishDate: '2026-11-12T12:00:00.000Z',
  publishDateEnabled: true,
  publishTime: '18:00',
  plataformas: [
    conta('ig'),
    conta('tt', { status: 'programada' }),
    conta('yt', { status: 'publicada', publishDate: '2026-11-10T12:00:00.000Z' }),
  ],
};

// Data nova: previstas e programadas acompanham; publicada fica; o status não muda.
{
  const m = mudarDataPrincipal(rascunho, '2026-11-14');
  assert.ok(m);
  const porId = Object.fromEntries(m.plataformas.map(item => [item.platformId, item]));
  assert.equal(porId.ig.publishDate, '2026-11-14T12:00:00.000Z');
  assert.equal(porId.tt.publishDate, '2026-11-14T12:00:00.000Z');
  assert.equal(porId.tt.status, 'programada');
  assert.equal(porId.yt.publishDate, '2026-11-10T12:00:00.000Z');
  assert.equal(porId.ig.publishTime, '18:00');
}

// Mesmo dia: nada muda.
assert.equal(mudarDataPrincipal({ ...rascunho, plataformas: [conta('ig', { publishTime: '18:00' })] }, '2026-11-12'), null);

// Sem dia: sai do Calendário e programada volta para prevista.
{
  const m = mudarDataPrincipal(rascunho, null);
  assert.ok(m);
  const tt = m.plataformas.find(item => item.platformId === 'tt');
  assert.equal(tt?.publishDate, null);
  assert.equal(tt?.status, 'prevista');
}

// Hora: sem data fica só no roteiro; com data vai para as contas ainda previstas.
assert.deepEqual(mudarHoraPrincipal({ ...rascunho, publishDate: null }, '21:00'), { publishTime: '21:00' });
{
  const m = mudarHoraPrincipal(rascunho, '21:00');
  assert.equal(m.publishTime, '21:00');
  const porId = Object.fromEntries((m.plataformas ?? []).map(item => [item.platformId, item]));
  assert.equal(porId.ig.publishTime, '21:00');
  assert.equal(porId.tt.publishTime, '21:00');
  assert.equal(porId.yt.publishTime, null);
}
assert.deepEqual(mudarHoraPrincipal(rascunho, null), { publishTime: null });

console.log('dataPrincipal: ok');