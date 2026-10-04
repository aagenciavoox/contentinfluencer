// Teste ao vivo da função editorial: cria série e roteiro de teste, mexe na distribuição
// e desfaz tudo no fim (série/roteiro vão para a lixeira e são apagados; a distribuição volta ao valor anterior).
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {getSession} from '../src/supabase.ts';

type Json = any;
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const client = new Client({name: 'content-os-smoke-funcao', version: '0.0.0'});
await client.connect(new StdioClientTransport({command: process.execPath, args: [resolve(root, 'src/index.ts')], cwd: root, stderr: 'inherit'}));

async function call(name: string, args: Record<string, unknown>): Promise<Json> {
  const result = await client.callTool({name, arguments: args});
  const text = (result.content as Array<{text?: string}>)[0]?.text ?? '';
  if (result.isError) throw new Error(`${name}: ${text}`);
  return JSON.parse(text);
}

let failed = false;
function expect(label: string, ok: boolean, detail: unknown = '') {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${label} ${ok ? '' : JSON.stringify(detail)}`);
  if (!ok) failed = true;
}

const session = await getSession();
const prefs = await session.client.from('user_preferences').select('value').eq('user_id', session.userId).eq('key', 'editorial_settings').maybeSingle();
const originalPrefs: string | null = prefs.data?.value ?? null;
const nome = `__teste funcao ${Date.now()}`;
let serieId: string | undefined;
let contentId: string | undefined;

try {
  const serie = await call('criar_serie', {nome, funcao_padrao: 'atrair'});
  serieId = serie.id;
  expect('série grava funcao_padrao', serie.funcao_padrao === 'atrair' && serie.etapa_funil === 'topo' && !serie.campos_ignorados, serie);

  const content = await call('criar_conteudo', {titulo: nome, serie: serieId, roteiro: 'teste'});
  contentId = content.id;
  expect('roteiro herda da série', content.funcao === 'atrair' && content.funcao_origem === 'herdada', content);

  await call('atualizar_serie', {serie: serieId, funcao_padrao: 'aprofundar'});
  const herdando = await call('ver_conteudo', {id: contentId});
  expect('mudar a série reclassifica quem herda', herdando.funcao === 'aprofundar' && herdando.etapa_funil === 'meio', herdando);

  const escolhida = await call('atualizar_conteudo', {id: contentId, funcao: 'reter'});
  expect('roteiro escolhe função própria', escolhida.funcao === 'reter' && escolhida.funcao_origem === 'escolhida' && escolhida.etapa_funil === 'fora', escolhida);
  expect('reter sai da grade', escolhida.conta_na_grade === false, escolhida);

  const volta = await call('atualizar_conteudo', {id: contentId, funcao: 'da_serie'});
  expect('volta a herdar', volta.funcao === 'aprofundar' && volta.funcao_origem === 'herdada' && volta.conta_na_grade === true, volta);

  await call('mudar_status', {ids: [contentId], status: 'Postado'});
  await call('atualizar_serie', {serie: serieId, funcao_padrao: 'acao'});
  const postado = await call('ver_conteudo', {id: contentId});
  expect('postado fica congelado', postado.funcao === 'aprofundar' && postado.classificacao_congelada === true, postado);

  const dist = await call('definir_distribuicao_funcoes', {atrair: 30, converter: 10, aprofundar: 25, comunidade: 15, acao: 10, reter: 10});
  expect('distribuição salva', dist.por_etapa?.topo === 40 && dist.por_etapa?.meio === 40 && dist.por_etapa?.fundo === 10 && dist.por_etapa?.fora === 10, dist);

  const errada = await client.callTool({name: 'definir_distribuicao_funcoes', arguments: {atrair: 50}});
  expect('soma diferente de 100 é recusada', Boolean(errada.isError));

  const estrutura = await call('ver_estrutura_editorial', {secoes: ['funcoes']});
  expect('estrutura mostra funções', estrutura.funcoes?.opcoes?.length === 6 && estrutura.funcoes?.distribuicao?.atrair === 30, estrutura);

  const resumo = await call('resumo_do_momento', {});
  expect('resumo conta por função', typeof resumo.postados_por_funcao_28_dias?.aprofundar === 'number', resumo.postados_por_funcao_28_dias);
} finally {
  const {client: db, userId} = session;
  if (originalPrefs === null) await db.from('user_preferences').delete().eq('user_id', userId).eq('key', 'editorial_settings');
  else await db.from('user_preferences').upsert({user_id: userId, key: 'editorial_settings', value: originalPrefs}, {onConflict: 'user_id,key'});
  if (contentId) await db.from('contents').delete().eq('id', contentId).eq('user_id', userId);
  if (serieId) await db.from('series').delete().eq('id', serieId).eq('user_id', userId);
  console.log('limpeza feita');
  await client.close();
}
process.exit(failed ? 1 : 0);
