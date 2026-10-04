import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {resolve} from 'node:path';

process.loadEnvFile(resolve(import.meta.dirname, '..', '.env'));
const base = process.argv[2] ?? `http://localhost:${process.env.CONTENT_OS_MCP_PORT || 3333}`;
const token = process.env.CONTENT_OS_MCP_TOKEN;
if (!token) throw new Error('CONTENT_OS_MCP_TOKEN ausente: rode npm run http uma vez para gerar.');

const denied = await fetch(`${base}/mcp/chave-errada`, {method: 'POST', headers: {'content-type': 'application/json'}, body: '{}'});
console.log(`chave errada → ${denied.status} ${denied.status === 401 ? 'ok' : 'FALHOU'}`);

const client = new Client({name: 'content-os-smoke-http', version: '0.0.0'});
await client.connect(new StreamableHTTPClientTransport(new URL(`${base}/mcp/${token}`)));
const {tools} = await client.listTools();
console.log(`${tools.length} ferramentas via HTTP`);

const result = await client.callTool({name: 'resumo_do_momento', arguments: {}});
const text = (result.content as Array<{text?: string}>)[0]?.text ?? '';
console.log(`resumo_do_momento ${result.isError ? 'ERRO' : 'ok'}\n${text.slice(0, 300)}`);
await client.close();
process.exit(result.isError || denied.status !== 401 ? 1 : 0);
