import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {check, json, newId, nowIso, tool, type Row} from '../lib.ts';
import type {Session} from '../supabase.ts';

const TIPOS = ['livro', 'filme', 'série', 'anime', 'manga', 'outro'] as const;
type Tipo = typeof TIPOS[number];

const STATUS_POR_TIPO: Record<Tipo, string[]> = {
  livro: ['Quero ler', 'Lendo', 'Lido', 'Abandonado'],
  manga: ['Quero ler', 'Lendo', 'Lido', 'Abandonado'],
  filme: ['Quero ver', 'Assistido', 'Abandonado'],
  'série': ['Quero ver', 'Assistindo', 'Assistido', 'Abandonado'],
  anime: ['Quero ver', 'Assistindo', 'Assistido', 'Abandonado'],
  outro: ['Quero consumir', 'Consumindo', 'Concluído', 'Abandonado'],
};

const TIPOS_ANOTACAO = ['Trecho', 'Reação', 'Análise', 'Ideia de conteúdo', 'Pergunta'] as const;
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use AAAA-MM-DD');

function assertStatus(tipo: Tipo, status: string) {
  if (!STATUS_POR_TIPO[tipo].includes(status)) {
    throw new Error(`Status "${status}" não vale para ${tipo}. Opções: ${STATUS_POR_TIPO[tipo].join(', ')}`);
  }
}

function itemSummary(row: Row) {
  return {
    id: row.id,
    tipo: row.tipo,
    titulo: row.titulo,
    autor: row.autor_diretor || null,
    status: row.status,
    avaliacao: row.avaliacao ?? null,
    potencial_conteudo: row.potencial_conteudo ?? null,
    paginas: row.total_paginas ? `${row.paginas_lidas ?? 0}/${row.total_paginas}` : null,
    generos: (row.item_generos ?? []).map((g: Row) => g.biblioteca_generos?.nome).filter(Boolean),
    inicio: row.data_inicio?.slice(0, 10) ?? null,
    fim: row.data_fim?.slice(0, 10) ?? null,
    atualizado_em: row.updated_at,
  };
}

async function fetchItem(session: Session, id: string): Promise<Row> {
  const row = check('item da biblioteca', await session.client
    .from('biblioteca_items')
    .select('*, item_generos(genero_id, biblioteca_generos(nome)), anotacoes(*)')
    .eq('user_id', session.userId)
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle());
  if (!row) throw new Error(`Item da biblioteca não encontrado: ${id}`);
  return row;
}

async function replaceGeneros(session: Session, itemId: string, nomes: string[]) {
  const {client, userId} = session;
  check('limpar gêneros', await client.from('item_generos').delete().eq('item_id', itemId));
  const unique = [...new Set(nomes.map(nome => nome.trim()).filter(Boolean))];
  if (unique.length === 0) return;

  const existing = check('gêneros', await client.from('biblioteca_generos').select('id, nome').eq('user_id', userId).in('nome', unique)) ?? [];
  const idByName = new Map(existing.map((g: Row) => [g.nome, g.id]));
  const missing = unique.filter(nome => !idByName.has(nome));
  if (missing.length > 0) {
    const inserted = check('criar gêneros', await client.from('biblioteca_generos')
      .insert(missing.map(nome => ({id: newId(), user_id: userId, nome, tipo: null})))
      .select('id, nome')) ?? [];
    inserted.forEach((g: Row) => idByName.set(g.nome, g.id));
  }
  check('ligar gêneros', await client.from('item_generos').insert(
    unique.map(nome => idByName.get(nome)).filter(Boolean).map(generoId => ({item_id: itemId, genero_id: generoId})),
  ));
}

export function registerBiblioteca(server: McpServer) {
  server.registerTool(
    'buscar_biblioteca',
    {
      title: 'Buscar na biblioteca',
      description: 'Procura livros, filmes, séries, animes e mangás da biblioteca por título, autor, tipo, status ou gênero.',
      inputSchema: {
        busca: z.string().optional().describe('Título ou autor'),
        tipo: z.enum(TIPOS).optional(),
        status: z.string().optional().describe('Ex.: Lendo, Lido, Quero ler, Assistindo'),
        genero: z.string().optional(),
        ordem: z.enum(['recentes', 'titulo', 'autor']).default('recentes'),
        limite: z.number().int().min(1).max(100).default(30),
        pagina: z.number().int().min(1).default(1),
      },
      annotations: {readOnlyHint: true},
    },
    tool(async (args, session) => {
      let query = session.client
        .from('biblioteca_items')
        .select(
          args.genero
            ? '*, item_generos!inner(genero_id, biblioteca_generos!inner(nome))'
            : '*, item_generos(genero_id, biblioteca_generos(nome))',
          {count: 'exact'},
        )
        .eq('user_id', session.userId)
        .is('deleted_at', null);
      if (args.tipo) query = query.eq('tipo', args.tipo);
      if (args.status) query = query.eq('status', args.status);
      if (args.genero) query = query.ilike('item_generos.biblioteca_generos.nome', args.genero);
      const busca = args.busca?.replace(/[,()*%\\]/g, ' ').trim();
      if (busca) query = query.or(`titulo.ilike.%${busca}%,autor_diretor.ilike.%${busca}%`);
      const order = {recentes: ['updated_at', false], titulo: ['titulo', true], autor: ['autor_diretor', true]} as const;
      const [column, ascending] = order[args.ordem];
      const from = (args.pagina - 1) * args.limite;
      const result = await query.order(column, {ascending}).range(from, from + args.limite - 1);
      const rows = check('buscar biblioteca', result) ?? [];
      return json({total: result.count ?? rows.length, pagina: args.pagina, itens: rows.map(row => itemSummary(row as Row))});
    }),
  );

  server.registerTool(
    'ver_item_biblioteca',
    {
      title: 'Ver item da biblioteca',
      description: 'Abre um item da biblioteca com notas gerais, anotações (trechos, reações, análises) e os conteúdos ligados a ele.',
      inputSchema: {id: z.string().min(1)},
      annotations: {readOnlyHint: true},
    },
    tool(async (args, session) => {
      const row = await fetchItem(session, args.id);
      const conteudos = check('conteúdos ligados', await session.client
        .from('contents')
        .select('id, title, status, publish_date')
        .eq('user_id', session.userId)
        .eq('biblioteca_item_id', args.id)
        .is('deleted_at', null)) ?? [];
      return json({
        ...itemSummary(row),
        notas_gerais: row.notas_gerais ?? null,
        metadados: row.metadata ?? {},
        anotacoes: (row.anotacoes ?? [])
          .filter((a: Row) => !a.deleted_at)
          .sort((a: Row, b: Row) => String(a.created_at).localeCompare(String(b.created_at)))
          .map((a: Row) => ({
            id: a.id,
            tipo: a.tipo,
            texto: a.texto,
            capitulo: a.capitulo_ref ?? null,
            potencial_conteudo: Boolean(a.content_potential),
            destilada: Boolean(a.destilada),
            criada_em: a.created_at,
          })),
        conteudos: conteudos.map((c: Row) => ({id: c.id, titulo: c.title, status: c.status, data_publicacao: c.publish_date})),
      });
    }),
  );

  server.registerTool(
    'adicionar_item_biblioteca',
    {
      title: 'Adicionar à biblioteca',
      description:
        'Cadastra um livro, filme, série, anime, mangá ou outro item. Status por tipo: ' +
        Object.entries(STATUS_POR_TIPO).map(([tipo, list]) => `${tipo}: ${list.join('/')}`).join('; '),
      inputSchema: {
        tipo: z.enum(TIPOS),
        titulo: z.string().min(1),
        autor: z.string().optional().describe('Autor(a) ou diretor(a)'),
        status: z.string().optional().describe('Padrão: Quero ler / Quero ver / Quero consumir'),
        total_paginas: z.number().int().positive().optional(),
        generos: z.array(z.string()).optional(),
        notas_gerais: z.string().optional(),
        potencial_conteudo: z.number().int().min(1).max(3).optional(),
      },
    },
    tool(async (args, session) => {
      const status = args.status ?? STATUS_POR_TIPO[args.tipo][0];
      assertStatus(args.tipo, status);
      const id = newId();
      check('adicionar item', await session.client.from('biblioteca_items').insert({
        id,
        user_id: session.userId,
        tipo: args.tipo,
        titulo: args.titulo.trim(),
        autor_diretor: args.autor?.trim() ?? '',
        status,
        total_paginas: args.total_paginas ?? null,
        notas_gerais: args.notas_gerais ?? null,
        potencial_conteudo: args.potencial_conteudo ?? null,
        data_inicio: ['Lendo', 'Assistindo', 'Consumindo'].includes(status) ? nowIso() : null,
      }));
      if (args.generos?.length) await replaceGeneros(session, id, args.generos);
      return json(itemSummary(await fetchItem(session, id)));
    }),
  );

  server.registerTool(
    'atualizar_item_biblioteca',
    {
      title: 'Atualizar item da biblioteca',
      description: 'Atualiza progresso, status, avaliação, notas ou gêneros de um item. Só os campos enviados mudam.',
      inputSchema: {
        id: z.string().min(1),
        titulo: z.string().min(1).optional(),
        autor: z.string().optional(),
        status: z.string().optional(),
        paginas_lidas: z.number().int().min(0).optional(),
        total_paginas: z.number().int().positive().optional(),
        avaliacao: z.number().int().min(0).max(5).nullable().optional(),
        potencial_conteudo: z.number().int().min(1).max(3).nullable().optional(),
        notas_gerais: z.string().nullable().optional(),
        data_inicio: dateSchema.nullable().optional(),
        data_fim: dateSchema.nullable().optional(),
        generos: z.array(z.string()).optional().describe('Substitui a lista inteira'),
      },
    },
    tool(async (args, session) => {
      const current = await fetchItem(session, args.id);
      const patch: Row = {};
      if (args.titulo !== undefined) patch.titulo = args.titulo.trim();
      if (args.autor !== undefined) patch.autor_diretor = args.autor.trim();
      if (args.status !== undefined) {
        assertStatus(current.tipo, args.status);
        patch.status = args.status;
        const started = ['Lendo', 'Assistindo', 'Consumindo'].includes(args.status);
        const finished = ['Lido', 'Assistido', 'Concluído'].includes(args.status);
        if (started && !current.data_inicio && args.data_inicio === undefined) patch.data_inicio = nowIso();
        if (finished && !current.data_fim && args.data_fim === undefined) patch.data_fim = nowIso();
      }
      if (args.paginas_lidas !== undefined) patch.paginas_lidas = args.paginas_lidas;
      if (args.total_paginas !== undefined) patch.total_paginas = args.total_paginas;
      if (args.avaliacao !== undefined) patch.avaliacao = args.avaliacao;
      if (args.potencial_conteudo !== undefined) patch.potencial_conteudo = args.potencial_conteudo;
      if (args.notas_gerais !== undefined) patch.notas_gerais = args.notas_gerais;
      if (args.data_inicio !== undefined) patch.data_inicio = args.data_inicio;
      if (args.data_fim !== undefined) patch.data_fim = args.data_fim;

      if (Object.keys(patch).length > 0) {
        check('atualizar item', await session.client.from('biblioteca_items')
          .update({...patch, updated_at: nowIso()})
          .eq('id', args.id)
          .eq('user_id', session.userId));
      }
      if (args.generos !== undefined) await replaceGeneros(session, args.id, args.generos);
      return json(itemSummary(await fetchItem(session, args.id)));
    }),
  );

  server.registerTool(
    'adicionar_anotacao',
    {
      title: 'Adicionar anotação',
      description: 'Registra um trecho, reação, análise, pergunta ou ideia de conteúdo num item da biblioteca.',
      inputSchema: {
        item_id: z.string().min(1),
        tipo: z.enum(TIPOS_ANOTACAO),
        texto: z.string().min(1),
        capitulo: z.string().optional().describe('Capítulo, página ou episódio'),
        potencial_conteudo: z.boolean().default(false),
      },
    },
    tool(async (args, session) => {
      await fetchItem(session, args.item_id);
      const row = check('adicionar anotação', await session.client.from('anotacoes').insert({
        id: newId(),
        user_id: session.userId,
        item_id: args.item_id,
        tipo: args.tipo,
        texto: args.texto.trim(),
        capitulo_ref: args.capitulo ?? null,
        content_potential: args.potencial_conteudo || args.tipo === 'Ideia de conteúdo',
        destilada: false,
      }).select().single());
      return json({id: row.id, tipo: row.tipo, texto: row.texto, capitulo: row.capitulo_ref});
    }),
  );
}
