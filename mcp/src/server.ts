import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerAgenda} from './tools/agenda.ts';
import {registerBiblioteca} from './tools/biblioteca.ts';
import {registerConteudos} from './tools/conteudos.ts';
import {registerEditorial} from './tools/editorial.ts';
import {registerEstrutura} from './tools/estrutura.ts';

export function createServer(): McpServer {
  const server = new McpServer(
    {name: 'content-os', version: '0.1.0'},
    {
      instructions:
        'Ferramentas do Content OS, o planejador de conteúdo da criadora. ' +
        'O fluxo de um conteúdo é Ideia → Roteiro → Produção → Postado. ' +
        'Antes de escrever roteiros, leia ver_estrutura_editorial para seguir o DNA da voz, os pilares e a estrutura da série. ' +
        'A função editorial é atrair, converter, aprofundar, comunidade, acao ou reter. ' +
        'Origem herdada lê a função da série até a primeira publicação, que congela a classificação. ' +
        'Stories, Live e a função reter ficam fora da grade, salvo conta_na_grade explícito. ' +
        'Um roteiro pode citar vários itens da biblioteca em livro_ids. ' +
        'Eventos guardam aviso_dias, de 0 a 120. ' +
        'Pilares, séries e plataformas aceitam nome ou id. Datas no formato AAAA-MM-DD, fuso de São Paulo.',
    },
  );

  registerEstrutura(server);
  registerEditorial(server);
  registerConteudos(server);
  registerAgenda(server);
  registerBiblioteca(server);
  return server;
}
