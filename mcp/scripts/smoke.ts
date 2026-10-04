import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [resolve(root, 'src/index.ts')],
  cwd: root,
  stderr: 'inherit',
});
const client = new Client({name: 'content-os-smoke', version: '0.0.0'});
await client.connect(transport);

const {tools} = await client.listTools();
console.log(`${tools.length} ferramentas: ${tools.map(t => t.name).join(', ')}\n`);

const readOnly: Array<[string, Record<string, unknown>]> = [
  ['resumo_do_momento', {}],
  ['ver_estrutura_editorial', {secoes: ['pilares', 'series', 'plataformas']}],
  ['listar_conteudos', {limite: 3}],
  ['ver_agenda', {}],
  ['buscar_biblioteca', {limite: 3}],
];

let failed = false;
for (const [name, args] of readOnly) {
  const result = await client.callTool({name, arguments: args});
  const text = (result.content as Array<{type: string; text?: string}>)[0]?.text ?? '';
  failed ||= Boolean(result.isError);
  console.log(`--- ${name} ${result.isError ? 'ERRO' : 'ok'}\n${text.slice(0, 600)}${text.length > 600 ? '\n…' : ''}\n`);
}

await client.close();
process.exit(failed ? 1 : 0);
