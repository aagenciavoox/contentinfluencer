import {createHash, randomBytes} from 'node:crypto';
import {resolve} from 'node:path';

process.loadEnvFile(resolve(import.meta.dirname, '..', '.env'));
const base = process.argv[2] ?? `http://localhost:${process.env.CONTENT_OS_MCP_PORT || 3333}`;
const secret = process.env.CONTENT_OS_MCP_TOKEN!;

const step = (label: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'ok   ' : 'FALHA'} ${label} ${extra}`);
  if (!ok) process.exit(1);
};

const unauth = await fetch(`${base}/mcp`, {method: 'POST', headers: {'content-type': 'application/json'}, body: '{}'});
step('401 com WWW-Authenticate', unauth.status === 401 && Boolean(unauth.headers.get('www-authenticate')?.includes('resource_metadata')));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;
const resource: Json = await (await fetch(`${base}/.well-known/oauth-protected-resource`)).json();
const meta: Json = await (await fetch(`${base}/.well-known/oauth-authorization-server`)).json();
step('descoberta', Boolean(resource.authorization_servers?.length && meta.token_endpoint), meta.authorization_endpoint);

const reg: Json = await (await fetch(meta.registration_endpoint, {
  method: 'POST', headers: {'content-type': 'application/json'},
  body: JSON.stringify({redirect_uris: ['https://example.com/callback'], client_name: 'teste'}),
})).json();
step('registro do cliente', Boolean(reg.client_id));

const verifier = randomBytes(32).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');
const params = new URLSearchParams({
  response_type: 'code', client_id: reg.client_id, redirect_uri: 'https://example.com/callback',
  state: 'xyz', code_challenge: challenge, code_challenge_method: 'S256', scope: 'content-os',
});
const page = await fetch(`${meta.authorization_endpoint}?${params}`);
step('página de autorização', page.status === 200 && (await page.text()).includes('Conectar ao Content OS'));

const wrong = await fetch(meta.authorization_endpoint, {method: 'POST', body: new URLSearchParams({...Object.fromEntries(params), chave: 'errada'}), redirect: 'manual'});
step('chave errada recusada', wrong.status === 401);

const approve = await fetch(meta.authorization_endpoint, {method: 'POST', body: new URLSearchParams({...Object.fromEntries(params), chave: secret}), redirect: 'manual'});
const location = new URL(approve.headers.get('location') ?? 'about:blank');
step('redirect com code e state', approve.status === 302 && location.searchParams.get('state') === 'xyz');

const tokens: Json = await (await fetch(meta.token_endpoint, {
  method: 'POST',
  body: new URLSearchParams({grant_type: 'authorization_code', code: location.searchParams.get('code')!, code_verifier: verifier, redirect_uri: 'https://example.com/callback', client_id: reg.client_id}),
})).json();
step('troca do code por token', Boolean(tokens.access_token && tokens.refresh_token));

const refreshed: Json = await (await fetch(meta.token_endpoint, {
  method: 'POST', body: new URLSearchParams({grant_type: 'refresh_token', refresh_token: tokens.refresh_token}),
})).json();
step('refresh token', Boolean(refreshed.access_token));

const call = await fetch(`${base}/mcp`, {
  method: 'POST',
  headers: {'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${refreshed.access_token}`},
  body: JSON.stringify({jsonrpc: '2.0', id: 1, method: 'tools/list'}),
});
const listed: Json = await call.json();
step('MCP com token OAuth', call.status === 200 && listed.result?.tools?.length > 0, `${listed.result?.tools?.length} ferramentas`);
