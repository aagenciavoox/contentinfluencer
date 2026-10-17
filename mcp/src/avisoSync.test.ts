import assert from 'node:assert/strict';
import {avisarGravacoes, fetchQueAnotaGravacoes, SYNC_EVENT, syncChannelName, writtenTable} from './avisoSync.ts';

const base = 'https://projeto.supabase.co/rest/v1/';

// O app ouve neste canal (src/context/realtimeSync.ts).
assert.equal(syncChannelName('abc'), 'content-os-sync:abc');

assert.equal(writtenTable(`${base}contents?id=eq.1`, 'PATCH'), 'contents');
assert.equal(writtenTable(`${base}agenda_items`, 'POST'), 'agenda_items');
assert.equal(writtenTable(`${base}content_temas?content_id=eq.1`, 'DELETE'), 'content_temas');
assert.equal(writtenTable(`${base}contents?select=*`, 'GET'), null);
assert.equal(writtenTable(`${base}rpc/get_content_status_counts`, 'POST'), null);
assert.equal(writtenTable('https://projeto.supabase.co/auth/v1/token?grant_type=password', 'POST'), null);

// Só gravações que deram certo entram no aviso; um aviso por chamada de ferramenta.
const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: Parameters<typeof fetch>[0]) => {
  const url = String(input);
  return new Response('{}', {status: url.includes('falha') ? 400 : 201});
}) as typeof fetch;

const enviados: Array<{canal: string; evento: string; payload: unknown}> = [];
const removidos: string[] = [];
const cliente = {
  channel: (canal: string) => ({
    httpSend: async (evento: string, payload: unknown) => {
      enviados.push({canal, evento, payload});
      return {success: true};
    },
    canal,
  }),
  removeChannel: async (channel: {canal: string}) => {
    removidos.push(channel.canal);
    return 'ok';
  },
} as unknown as Parameters<typeof avisarGravacoes>[0];

try {
  await fetchQueAnotaGravacoes(`${base}contents`, {method: 'POST'});
  await fetchQueAnotaGravacoes(`${base}contents?id=eq.1`, {method: 'PATCH'});
  await fetchQueAnotaGravacoes(`${base}content_temas`, {method: 'POST'});
  await fetchQueAnotaGravacoes(`${base}falha_ideas`, {method: 'POST'});
  await fetchQueAnotaGravacoes(`${base}series?select=*`, {method: 'GET'});

  await avisarGravacoes(cliente, 'u1');
  assert.deepEqual(enviados, [
    {canal: 'content-os-sync:u1', evento: SYNC_EVENT, payload: {tables: ['contents', 'content_temas']}},
  ]);
  assert.deepEqual(removidos, ['content-os-sync:u1']);

  // Nada novo gravado: nenhum aviso extra.
  await avisarGravacoes(cliente, 'u1');
  assert.equal(enviados.length, 1);

  // Aviso que falha não derruba a ferramenta.
  const originalError = console.error;
  console.error = () => undefined;
  try {
    await fetchQueAnotaGravacoes(`${base}ideas`, {method: 'POST'});
    const quebrado = {
      channel: () => ({httpSend: async () => Promise.reject(new Error('sem rede'))}),
      removeChannel: async () => 'ok',
    } as unknown as Parameters<typeof avisarGravacoes>[0];
    await avisarGravacoes(quebrado, 'u1');
  } finally {
    console.error = originalError;
  }
} finally {
  globalThis.fetch = realFetch;
}

console.log('ok - mcp avisa o app das tabelas gravadas, uma vez por ferramenta');
