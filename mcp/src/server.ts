import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerAgenda} from './tools/agenda.ts';
import {registerBiblioteca} from './tools/biblioteca.ts';
import {registerConteudos} from './tools/conteudos.ts';
import {registerEstrutura} from './tools/estrutura.ts';

export function createServer(): McpServer {
  const server = new McpServer(
    {name: 'content-os', version: '0.1.0'},
    {
      instructions:
        'Ferramentas do Content OS, o planejador de conteúdo da criadora. ' +
        'O fluxo de um conteúdo é Ideia → Roteiro → Produção → Postado. ' +
        'Antes de escrever roteiros, leia ver_estrutura_editorial para seguir o DNA da voz, os pilares e a estrutura da série. ' +
        'Pilares, séries e plataformas aceitam nome ou id. Datas no formato AAAA-MM-DD, fuso de São Paulo.',
    },
  );

  registerEstrutura(server);
  registerConteudos(server);
  registerAgenda(server);
  registerBiblioteca(server);
  return server;
}
