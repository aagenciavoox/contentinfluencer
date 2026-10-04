import {randomBytes, timingSafeEqual} from 'node:crypto';
import {appendFileSync} from 'node:fs';
import {createServer as createHttpServer, type IncomingMessage, type ServerResponse} from 'node:http';
import {resolve} from 'node:path';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {createServer} from './server.ts';
import {getSession, loadEnvFiles, mcpRoot} from './supabase.ts';

loadEnvFiles();

const port = Number(process.env.CONTENT_OS_MCP_PORT || 3333);
let token = process.env.CONTENT_OS_MCP_TOKEN?.trim();
if (!token) {
  token = randomBytes(24).toString('base64url');
  appendFileSync(resolve(mcpRoot, '.env'), `\n# Chave do modo HTTP (Grok e outros clientes remotos)\nCONTENT_OS_MCP_TOKEN=${token}\n`);
  console.error('Chave nova gerada e salva em mcp/.env (CONTENT_OS_MCP_TOKEN).');
}
const expected = Buffer.from(token);

/** A chave pode vir no caminho (/mcp/<chave>) para clientes que só aceitam URL, ou no header Authorization. */
function authorized(req: IncomingMessage, path: string): boolean {
  const fromPath = path.startsWith('/mcp/') ? path.slice('/mcp/'.length) : '';
  const fromHeader = req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '';
  return [fromPath, fromHeader].some(candidate => {
    const value = Buffer.from(candidate);
    return value.length === expected.length && timingSafeEqual(value, expected);
  });
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 4 * 1024 * 1024) throw new Error('Corpo da requisição grande demais');
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : undefined;
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {'content-type': 'application/json'}).end(JSON.stringify(body));
}

const httpServer = createHttpServer(async (req, res) => {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname.replace(/\/+$/, '');

  if (path === '' || path === '/health') {
    sendJson(res, 200, {ok: true, servidor: 'content-os'});
    return;
  }
  if (path !== '/mcp' && !path.startsWith('/mcp/')) {
    sendJson(res, 404, {erro: 'não encontrado'});
    return;
  }
  if (!authorized(req, path)) {
    sendJson(res, 401, {erro: 'chave inválida'});
    return;
  }
  if (req.method !== 'POST') {
    res.writeHead(405, {allow: 'POST'}).end();
    return;
  }

  try {
    const body = await readJson(req);
    // Sem sessão: cada requisição ganha um servidor novo; o login no Supabase é reaproveitado.
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({sessionIdGenerator: undefined, enableJsonResponse: true});
    res.on('close', () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      sendJson(res, 500, {jsonrpc: '2.0', error: {code: -32603, message: 'erro interno'}, id: null});
    }
  }
});

httpServer.listen(port, () => {
  console.error(`content-os MCP (HTTP) em http://localhost:${port}/mcp/<chave>`);
  getSession()
    .then(session => console.error(`Login ok: ${session.email}`))
    .catch(error => console.error(`Aviso: ${error.message}`));
});
