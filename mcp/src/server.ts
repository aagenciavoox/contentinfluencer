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
        'Antes de escrever roteiros, leia ver_estrutura_editorial para seguir o DNA da voz, os pilares, as séries e as opções de formato, janela e energia. ' +
        'A função editorial é atrair, converter, aprofundar, comunidade, acao ou reter. ' +
        'Origem herdada lê a função da série até a primeira publicação, que congela a classificação. ' +
        'Stories, Live e a função reter ficam fora da grade, salvo conta_na_grade explícito. ' +
        'Um roteiro pode citar vários itens da biblioteca em livro_ids e vários temas leves (ex.: Halloween), que não são série nem pilar. ' +
        'Janela manha, tarde ou noite define 09:00, 14:00 ou 20:00; a hora explícita ganha. A gravação tem data e hora. ' +
        'Post-its de planejamento vêm antes da ideia e não mudam o status do roteiro. ' +
        'A ficha da biblioteca (editora, indicação, tags) fica em ver_item_biblioteca e em ficha ao criar ou atualizar. ' +
        'Eventos guardam aviso_dias, de 0 a 120. ' +
        'Pilares, séries, temas e plataformas aceitam nome ou id. Datas no formato AAAA-MM-DD, horas HH:MM, fuso de São Paulo.',
    },
  );

  registerEstrutura(server);
  registerEditorial(server);
  registerConteudos(server);
  registerAgenda(server);
  registerBiblioteca(server);
  return server;
}
