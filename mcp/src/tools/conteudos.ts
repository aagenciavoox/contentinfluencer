import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {FORMATO_DESCRICAO, JANELAS, horaEscolhida} from '../campos.ts';
import {descreverColunasOmitidas, livrosDoConteudo, unirLivros} from '../editorial.ts';
import {anexarTemas, gravarTemasDoConteudo, idsComTema} from '../temas.ts';
import {
  CONTENT_LIST_COLUMNS,
  CONTENT_STATUSES,
  FUNCOES,
  contaNaGradePadrao,
  contentSummary,
  funcaoEfetiva,
  funcaoHerdavel,
  htmlToText,
  json,
  loadLookups,
  newId,
  normalizeStatus,
  nowIso,
  readCompat,
  resolvePilar,
  resolveSerie,
  textToHtml,
  tool,
  writeCompat,
  type Lookups,
  type Row,
} from '../lib.ts';
import type {Session} from '../supabase.ts';

const statusSchema = z.enum(CONTENT_STATUSES);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use AAAA-MM-DD');
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM');
const janelaSchema = z.enum(JANELAS);
const energiaSchema = z.enum(['baixa', 'média', 'alta']);
const idsSchema = z.array(z.string().min(1)).min(1).max(50);
const livrosSchema = z.array(z.string().min(1)).max(20);
const funcaoSchema = z.enum([...FUNCOES, 'da_serie', 'nenhuma']).describe(
  'Função editorial (antigo funil): atrair e converter = topo; aprofundar e comunidade = meio; acao = fundo; reter fica fora do funil. ' +
  '"da_serie" herda a função padrão da série; "nenhuma" marca sem função.',
);

function sanitizeSearch(value: string): string {
  return value.replace(/[,()*%\\]/g, ' ').trim();
}

function funcaoColumns(choice: z.infer<typeof funcaoSchema> | null): {funcao: string | null; funcao_origem: string | null} {
  if (choice === null) return {funcao: null, funcao_origem: null};
  if (choice === 'da_serie') return {funcao: null, funcao_origem: 'herdada'};
  if (choice === 'nenhuma') return {funcao: null, funcao_origem: 'nenhuma'};
  return {funcao: choice, funcao_origem: 'escolhida'};
}

function comGravadoSem<T extends Row>(payload: T, omitidas: string[]): T {
  if (omitidas.length === 0) return payload;
  return {...payload, gravado_sem: descreverColunasOmitidas(omitidas, 'contents')};
}

async function fetchContents(session: Session, ids: string[]): Promise<Row[]> {
  const {data} = await readCompat(
    'conteúdos',
    '*, content_plataformas(*)',
    columns => session.client.from('contents').select(columns).eq('user_id', session.userId).in('id', ids),
  );
  const rows = (data ?? []) as Row[];
  const missing = ids.filter(id => !rows.some(row => row.id === id));
  if (missing.length > 0) throw new Error(`Conteúdo não encontrado: ${missing.join(', ')}`);
  return rows;
}

function contentDetail(row: Row, lookups: Lookups, roteiroFormato: 'texto' | 'html') {
  return {
    ...contentSummary(row, lookups),
    roteiro: roteiroFormato === 'html' ? row.script ?? '' : htmlToText(row.script),
    notas: htmlToText(row.notes),
    notas_de_escrita: htmlToText(row.writing_notes),
    referencias: row.referencias ?? null,
    link: row.link ?? null,
    energia: row.energia_necessaria ?? null,
    legenda_base: row.legenda_base ?? null,
    plataformas: (row.content_plataformas ?? []).map((p: Row) => ({
      id: p.id,
      plataforma: lookups.platformName(p.platform_id),
      data: p.publish_date ?? null,
      hora: p.publish_time ?? null,
      tipo: p.publication_kind ?? 'post',
      status: p.status ?? null,
      conta_na_grade: p.conta_na_grade === false ? false : true,
      legenda: p.legenda ?? '',
      hashtags: p.hashtags ?? '',
      legenda_propria: Boolean(p.legenda_propria),
      link_do_post: p.post_url ?? null,
      post_codigo: p.post_codigo ?? null,
      realizada_em: p.realizada_api_em ?? p.realizada_manual_em ?? null,
    })),
    criado_em: row.created_at,
  };
}

async function updateContent(session: Session, id: string, patch: Row): Promise<string[]> {
  return writeCompat('atualizar conteúdo', {...patch, updated_at: nowIso()}, row =>
    session.client.from('contents').update(row).eq('id', id).eq('user_id', session.userId),
  );
}

export function registerConteudos(server: McpServer) {
  server.registerTool(
    'listar_conteudos',
    {
      title: 'Listar conteúdos',
      description:
        'Lista ideias, roteiros, conteúdos em produção e publicados do Content OS. ' +
        'Cada item traz função, origem, se conta na grade, a legenda compartilhada, os livro_ids, os temas, a janela e o horário de gravação. ' +
        'Ideias são conteúdos com status "Ideia". Retorna resumo sem o texto do roteiro; use ver_conteudo para o texto completo.',
      inputSchema: {
        status: z.array(statusSchema).optional().describe('Filtra por status. Vazio = todos.'),
        onde: z.enum(['ativos', 'arquivados', 'lixeira']).default('ativos'),
        pilar: z.string().optional().describe('Nome ou id do pilar'),
        serie: z.string().optional().describe('Nome ou id da série'),
        tema: z.string().optional().describe('Nome ou id do tema, ex.: Halloween'),
        busca: z.string().optional().describe('Procura no título e nas notas'),
        publicacao_de: dateSchema.optional().describe('Data de publicação a partir de'),
        publicacao_ate: dateSchema.optional().describe('Data de publicação até'),
        ordem: z.enum(['recentes', 'antigos', 'titulo', 'publicacao']).default('recentes'),
        limite: z.number().int().min(1).max(100).default(30),
        pagina: z.number().int().min(1).default(1),
      },
      annotations: {readOnlyHint: true},
    },
    tool(async (args, session) => {
      const lookups = await loadLookups(session);
      let somenteIds: string[] | null = null;
      if (args.tema) {
        const doTema = await idsComTema(session, args.tema);
        if (doTema.ausente) throw new Error('O banco ainda não tem a tabela de temas. Rode supabase/migrations/20261004233000_temas_roteiro.sql.');
        if (doTema.ids.length === 0) {
          return json({total: 0, pagina: args.pagina, itens: []});
        }
        somenteIds = doTema.ids;
      }
      const order = {
        recentes: ['updated_at', false],
        antigos: ['updated_at', true],
        titulo: ['title', true],
        publicacao: ['publish_date', true],
      } as const;
      const [column, ascending] = order[args.ordem];
      const from = (args.pagina - 1) * args.limite;
      const result = await readCompat('listar conteúdos', CONTENT_LIST_COLUMNS, columns => {
        let query = session.client
          .from('contents')
          .select(columns, {count: 'exact'})
          .eq('user_id', session.userId);

        if (args.onde === 'lixeira') {
          query = query.not('deleted_at', 'is', null);
        } else {
          query = query.is('deleted_at', null);
          query = args.onde === 'arquivados' ? query.not('archived_at', 'is', null) : query.is('archived_at', null);
        }
        if (args.status?.length) query = query.in('status', args.status);
        if (somenteIds) query = query.in('id', somenteIds);
        const pilarId = resolvePilar(lookups, args.pilar);
        if (pilarId) query = query.eq('pilar_id', pilarId);
        const serieId = resolveSerie(lookups, args.serie);
        if (serieId) query = query.eq('series_id', serieId);
        const busca = args.busca ? sanitizeSearch(args.busca) : '';
        if (busca) query = query.or(`title.ilike.%${busca}%,notes.ilike.%${busca}%`);
        if (args.publicacao_de) query = query.gte('publish_date', args.publicacao_de);
        if (args.publicacao_ate) query = query.lte('publish_date', args.publicacao_ate);
        return query.order(column, {ascending, nullsFirst: false}).range(from, from + args.limite - 1);
      });
      const loaded = (result.data ?? []) as Row[];
      const comTema = await anexarTemas(session, loaded);
      return json({
        total: result.count ?? loaded.length,
        pagina: args.pagina,
        ...(result.omitidas.length || comTema.ausente
          ? {colunas_ausentes_no_banco: [...result.omitidas, ...(comTema.ausente ? ['temas'] : [])]}
          : {}),
        itens: comTema.rows.map(row => contentSummary(row, lookups)),
      });
    }),
  );

  server.registerTool(
    'ver_conteudo',
    {
      title: 'Ver conteúdo',
      description: 'Abre um conteúdo completo: roteiro, notas, referências, temas, janela, horário de gravação e publicações por plataforma.',
      inputSchema: {
        id: z.string().min(1),
        roteiro_formato: z.enum(['texto', 'html']).default('texto'),
      },
      annotations: {readOnlyHint: true},
    },
    tool(async (args, session) => {
      const [loaded] = await fetchContents(session, [args.id]);
      const comTema = await anexarTemas(session, [loaded]);
      const detail = contentDetail(comTema.rows[0], await loadLookups(session), args.roteiro_formato);
      return json(comTema.ausente ? {...detail, colunas_ausentes_no_banco: ['temas']} : detail);
    }),
  );

  const createShape = {
    titulo: z.string().min(1),
    notas: z.string().optional().describe('Observações livres. Numa ideia, é o corpo da ideia.'),
    pilar: z.string().optional().describe('Nome ou id do pilar'),
    serie: z.string().optional().describe('Nome ou id da série'),
    biblioteca_item_id: z.string().optional().describe('Livro de origem. Também entra em livro_ids.'),
    livro_ids: livrosSchema.optional().describe('Vários livros ou itens da biblioteca neste roteiro'),
    tags: z.array(z.string()).optional(),
    temas: z.array(z.string().min(1)).max(20).optional().describe(
      'Nomes ou ids. Nome novo cria o tema. Um tema é um rótulo leve, como Halloween, e não é série, pilar nem função.',
    ),
    funcao: funcaoSchema.optional().describe('Se não vier: herda da série quando ela tem função padrão'),
    conta_na_grade: z.boolean().optional().describe('false tira o roteiro da grade. Padrão: fora para Stories, Live e função reter'),
    legenda_base: z.string().nullable().optional().describe('Legenda compartilhada, até cada rede adaptar a própria'),
    link: z.string().nullable().optional(),
    notas_de_escrita: z.string().optional(),
    data_publicacao: dateSchema.nullable().optional(),
    hora_publicacao: timeSchema.nullable().optional().describe('Hora exata. Ganha da janela se as duas vierem'),
    janela: janelaSchema.nullable().optional().describe('manha = 09:00, tarde = 14:00, noite = 20:00'),
    data_gravacao: dateSchema.nullable().optional(),
    hora_gravacao: timeSchema.nullable().optional(),
  };

  async function createContent(
    session: Session,
    input: {
      titulo: string;
      status: string;
      notas?: string;
      roteiro?: string;
      pilar?: string;
      serie?: string;
      formato?: string;
      energia?: string;
      tags?: string[];
      referencias?: string;
      biblioteca_item_id?: string;
      livro_ids?: string[];
      funcao?: z.infer<typeof funcaoSchema>;
      conta_na_grade?: boolean;
      legenda_base?: string | null;
      temas?: string[];
      link?: string | null;
      notas_de_escrita?: string;
      data_publicacao?: string | null;
      hora_publicacao?: string | null;
      janela?: z.infer<typeof janelaSchema> | null;
      data_gravacao?: string | null;
      hora_gravacao?: string | null;
    },
  ) {
    const lookups = await loadLookups(session);
    const serieId = resolveSerie(lookups, input.serie) ?? null;
    const serie = serieId ? lookups.series.find(s => s.id === serieId) : null;
    let pilarId = resolvePilar(lookups, input.pilar) ?? null;
    if (!pilarId && serie?.serie_pilares?.length) pilarId = serie.serie_pilares[0].pilar_id;
    const formato = input.formato ?? serie?.formato_visual_padrao ?? null;
    const herdada = funcaoHerdavel(serie);
    const escolha = input.funcao ?? (herdada ? 'da_serie' : null);
    const funcao = funcaoColumns(escolha);
    const funcaoInicial = escolha === 'da_serie' ? herdada : escolha === 'nenhuma' ? null : escolha;
    const livros = unirLivros(input.livro_ids, input.biblioteca_item_id);
    const horaPublicacao = horaEscolhida(input.hora_publicacao, input.janela);
    const now = nowIso();
    const id = newId();

    const omitidas = await writeCompat('criar conteúdo', {
      id,
      user_id: session.userId,
      title: input.titulo.trim(),
      status: input.status,
      series_id: serieId,
      slot_type: serie?.slot_padrao ?? null,
      pilar_id: pilarId,
      biblioteca_item_id: livros[0] ?? null,
      livro_ids: livros,
      formato_visual: formato,
      energia_necessaria: input.energia ?? serie?.energia_padrao ?? null,
      script: input.roteiro ? textToHtml(input.roteiro) : null,
      script_notes: [],
      notes: input.notas?.trim() || null,
      writing_notes: input.notas_de_escrita?.trim() || null,
      referencias: input.referencias ?? null,
      link: input.link || null,
      tags: input.tags ?? [],
      recording_date: input.data_gravacao ?? null,
      recording_time: input.hora_gravacao ?? null,
      recording_date_enabled: Boolean(input.data_gravacao),
      publish_date: input.data_publicacao ?? null,
      publish_time: horaPublicacao ?? null,
      publish_date_enabled: Boolean(input.data_publicacao),
      ...funcao,
      conta_na_grade: input.conta_na_grade ?? contaNaGradePadrao(formato, funcaoInicial),
      legenda_base: input.legenda_base ?? null,
      created_at: now,
      updated_at: now,
    }, row => session.client.from('contents').insert(row));

    if (input.temas) {
      const gravados = await gravarTemasDoConteudo(session, id, input.temas);
      if (gravados.ausente) omitidas.push('temas');
    }

    const [row] = await fetchContents(session, [id]);
    const comTema = await anexarTemas(session, [row]);
    return comGravadoSem(contentSummary(comTema.rows[0], lookups), omitidas);
  }

  server.registerTool(
    'criar_ideia',
    {
      title: 'Criar ideia',
      description: 'Guarda uma ideia nova na aba Ideias do Content OS.',
      inputSchema: createShape,
    },
    tool(async (args, session) => json(await createContent(session, {...args, status: 'Ideia'}))),
  );

  server.registerTool(
    'criar_conteudo',
    {
      title: 'Criar roteiro',
      description:
        'Cria um conteúdo já como roteiro (ou outro status). Se a série tiver formato ou energia padrão, eles são aplicados. ' +
        'O roteiro pode ser texto simples: parágrafos separados por linha em branco. ' +
        'livro_ids aceita vários itens da biblioteca; o primeiro também fica como origem antiga.',
      inputSchema: {
        ...createShape,
        status: statusSchema.default('Roteiro'),
        roteiro: z.string().optional(),
        formato: z.string().optional().describe(FORMATO_DESCRICAO),
        energia: energiaSchema.optional(),
        referencias: z.string().optional(),
      },
    },
    tool(async (args, session) => json(await createContent(session, args))),
  );

  server.registerTool(
    'atualizar_conteudo',
    {
      title: 'Atualizar conteúdo',
      description:
        'Altera campos de um conteúdo existente. Só os campos enviados mudam. ' +
        'Para limpar pilar, série, data, hora, janela ou livros, envie string vazia, lista vazia ou null. Para mudar status use mudar_status. ' +
        'temas substitui a lista; nome novo cria o tema. janela define manha (09:00), tarde (14:00) ou noite (20:00), a menos que hora_publicacao venha junto. ' +
        'funcao é o antigo funil; null volta para "sem definição". Mudar formato ou função recalcula conta_na_grade, a menos que ele venha junto.',
      inputSchema: {
        id: z.string().min(1),
        titulo: z.string().min(1).optional(),
        roteiro: z.string().optional().describe('Texto do roteiro'),
        modo_roteiro: z.enum(['substituir', 'acrescentar']).default('substituir'),
        notas: z.string().optional(),
        notas_de_escrita: z.string().optional(),
        referencias: z.string().optional(),
        pilar: z.string().nullable().optional(),
        serie: z.string().nullable().optional(),
        formato: z.string().nullable().optional().describe(FORMATO_DESCRICAO),
        energia: energiaSchema.nullable().optional(),
        funcao: funcaoSchema.nullable().optional(),
        conta_na_grade: z.boolean().optional().describe('Se a peça conta na grade de frequência'),
        tags: z.array(z.string()).optional(),
        temas: z.array(z.string().min(1)).max(20).optional().describe('Substitui os temas. Lista vazia tira todos. Nome novo cria o tema'),
        link: z.string().nullable().optional(),
        data_publicacao: dateSchema.nullable().optional(),
        hora_publicacao: timeSchema.nullable().optional(),
        janela: janelaSchema.nullable().optional().describe('manha, tarde ou noite. null limpa a hora se hora_publicacao não vier'),
        data_gravacao: dateSchema.nullable().optional(),
        hora_gravacao: timeSchema.nullable().optional(),
        gravado: z.boolean().optional().describe('true marca como gravado agora; false desfaz'),
        biblioteca_item_id: z.string().nullable().optional(),
        livro_ids: livrosSchema.optional().describe('Substitui a lista de livros. O primeiro vira a origem antiga, se ela não for enviada junto'),
        legenda_base: z.string().nullable().optional(),
      },
    },
    tool(async (args, session) => {
      const lookups = await loadLookups(session);
      const [current] = await fetchContents(session, [args.id]);
      const patch: Row = {};

      if (args.titulo !== undefined) patch.title = args.titulo.trim();
      if (args.roteiro !== undefined) {
        const incoming = textToHtml(args.roteiro);
        patch.script = args.modo_roteiro === 'acrescentar' && current.script ? `${current.script}${incoming}` : incoming;
      }
      if (args.notas !== undefined) patch.notes = args.notas.trim() || null;
      if (args.notas_de_escrita !== undefined) patch.writing_notes = args.notas_de_escrita.trim() || null;
      if (args.referencias !== undefined) patch.referencias = args.referencias || null;
      if (args.pilar !== undefined) patch.pilar_id = resolvePilar(lookups, args.pilar ?? '');
      if (args.serie !== undefined) patch.series_id = resolveSerie(lookups, args.serie ?? '');
      if (args.formato !== undefined) patch.formato_visual = args.formato || null;
      if (args.funcao !== undefined) Object.assign(patch, funcaoColumns(args.funcao));
      if (args.conta_na_grade !== undefined) {
        patch.conta_na_grade = args.conta_na_grade;
      } else if (args.formato !== undefined || args.funcao !== undefined) {
        const next = {...current, ...patch};
        patch.conta_na_grade = contaNaGradePadrao(next.formato_visual, funcaoEfetiva(next, lookups).funcao);
      }
      if (args.energia !== undefined) patch.energia_necessaria = args.energia;
      if (args.tags !== undefined) patch.tags = args.tags;
      if (args.link !== undefined) patch.link = args.link || null;
      if (args.data_gravacao !== undefined) {
        patch.recording_date = args.data_gravacao;
        patch.recording_date_enabled = Boolean(args.data_gravacao);
        if (!args.data_gravacao && args.hora_gravacao === undefined) patch.recording_time = null;
      }
      if (args.hora_gravacao !== undefined) patch.recording_time = args.hora_gravacao;
      const horaPublicacao = horaEscolhida(args.hora_publicacao, args.janela);
      if (args.data_publicacao !== undefined) {
        patch.publish_date = args.data_publicacao;
        patch.publish_date_enabled = Boolean(args.data_publicacao);
        if (!args.data_publicacao && horaPublicacao === undefined) patch.publish_time = null;
      }
      if (horaPublicacao !== undefined) patch.publish_time = horaPublicacao;
      if (args.gravado !== undefined) patch.recorded_at = args.gravado ? current.recorded_at ?? nowIso() : null;
      if (args.legenda_base !== undefined) patch.legenda_base = args.legenda_base || null;
      if (args.livro_ids !== undefined || args.biblioteca_item_id !== undefined) {
        const livros = unirLivros(
          args.livro_ids ?? (Array.isArray(current.livro_ids) ? current.livro_ids : livrosDoConteudo(current)),
          args.biblioteca_item_id,
        );
        patch.livro_ids = livros;
        patch.biblioteca_item_id = args.biblioteca_item_id === undefined ? livros[0] ?? null : args.biblioteca_item_id || null;
      }

      let temasAusente = false;
      if (args.temas !== undefined) {
        const gravados = await gravarTemasDoConteudo(session, args.id, args.temas);
        temasAusente = gravados.ausente;
      }

      if (Object.keys(patch).length === 0 && args.temas === undefined) throw new Error('Nenhum campo para atualizar.');
      const omitidas = Object.keys(patch).length > 0 ? await updateContent(session, args.id, patch) : [];
      if (temasAusente) omitidas.push('temas');
      const [row] = await fetchContents(session, [args.id]);
      const comTema = await anexarTemas(session, [row]);
      return json(comGravadoSem(contentDetail(comTema.rows[0], lookups, 'texto'), omitidas));
    }),
  );

  server.registerTool(
    'mudar_status',
    {
      title: 'Mudar status',
      description:
        'Move conteúdos no fluxo Ideia → Roteiro → Produção → Postado. ' +
        'Ideia para Roteiro aproveita as notas da ideia como rascunho do roteiro. ' +
        'Produção exige título e roteiro escritos. Postado registra a data de postagem e fixa a função editorial da peça.',
      inputSchema: {
        ids: idsSchema,
        status: statusSchema,
      },
    },
    tool(async (args, session) => {
      const rows = await fetchContents(session, args.ids);
      const lookups = await loadLookups(session);
      const now = nowIso();
      const blocked = rows.filter(
        row => args.status === 'Produção' && (!row.title?.trim() || !htmlToText(row.script)),
      );
      if (blocked.length > 0) {
        throw new Error(
          `Sem título ou roteiro escrito, não dá para ir para Produção: ${blocked.map(row => `${row.title || '(sem título)'} [${row.id}]`).join('; ')}`,
        );
      }

      const changed = [];
      for (const row of rows) {
        const from = normalizeStatus(row.status);
        const patch: Row = {status: args.status, archived_at: null};
        if (args.status === 'Roteiro' && !htmlToText(row.script) && htmlToText(row.notes)) {
          patch.script = textToHtml(row.notes);
        }
        if (args.status === 'Postado' && !row.posted_at) patch.posted_at = now;
        // Ao postar, a função fica fixa: mudar a série depois não reclassifica o que já saiu.
        if (args.status === 'Postado' && !row.classificacao_congelada_em) {
          if (row.funcao_origem === 'herdada') {
            patch.funcao = funcaoHerdavel(lookups.series.find(s => s.id === row.series_id));
          }
          patch.classificacao_congelada_em = now;
        }
        if (args.status !== 'Postado' && row.posted_at) patch.posted_at = null;
        await updateContent(session, row.id, patch);
        changed.push({id: row.id, titulo: row.title, de: from, para: args.status});
      }
      return json({alterados: changed});
    }),
  );

  server.registerTool(
    'arquivar_conteudos',
    {
      title: 'Arquivar conteúdos',
      description: 'Arquiva conteúdos (somem das listas, mas podem voltar). Use desfazer=true para tirar do arquivo.',
      inputSchema: {ids: idsSchema, desfazer: z.boolean().default(false)},
    },
    tool(async (args, session) => {
      const rows = await fetchContents(session, args.ids);
      const now = nowIso();
      for (const row of rows) {
        await updateContent(session, row.id, {archived_at: args.desfazer ? null : row.archived_at ?? now});
      }
      return json({arquivados: !args.desfazer, ids: args.ids});
    }),
  );

  server.registerTool(
    'enviar_para_lixeira',
    {
      title: 'Enviar para a lixeira',
      description: 'Move conteúdos para a lixeira do app. Nada é apagado de vez; restaurar=true traz de volta.',
      inputSchema: {ids: idsSchema, restaurar: z.boolean().default(false)},
      annotations: {destructiveHint: true},
    },
    tool(async (args, session) => {
      await fetchContents(session, args.ids);
      for (const id of args.ids) {
        await updateContent(session, id, {deleted_at: args.restaurar ? null : nowIso()});
      }
      return json({na_lixeira: !args.restaurar, ids: args.ids});
    }),
  );
}
