import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {
  contaNaGradePadrao,
  descreverColunasOmitidas,
  gravarFuncao,
  patchPrimeiraPublicacao,
  resolveFuncao,
  livrosDoConteudo,
  unirLivros,
  type FuncaoEditorial,
  type FuncaoOrigem,
} from '../editorial.ts';
import {
  CONTENT_LIST_COLUMNS,
  CONTENT_STATUSES,
  contentSummary,
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

const FUNCOES = ['atrair', 'converter', 'aprofundar', 'comunidade', 'acao', 'reter'] as const;
const FUNCAO_ORIGENS = ['herdada', 'escolhida', 'nenhuma', 'aplicada', 'migrada'] as const;

const statusSchema = z.enum(CONTENT_STATUSES);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use AAAA-MM-DD');
const energiaSchema = z.enum(['baixa', 'média', 'alta']);
const idsSchema = z.array(z.string().min(1)).min(1).max(50);
const funcaoSchema = z.enum(FUNCOES).nullable();
const origemSchema = z.enum(FUNCAO_ORIGENS).nullable();
const livrosSchema = z.array(z.string().min(1)).max(20);

function sanitizeSearch(value: string): string {
  return value.replace(/[,()*%\\]/g, ' ').trim();
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
        'Cada item traz função, origem, função efetiva, se conta na grade e os livro_ids. ' +
        'Ideias são conteúdos com status "Ideia". O texto do roteiro fica em ver_conteudo.',
      inputSchema: {
        status: z.array(statusSchema).optional().describe('Filtra por status. Vazio = todos.'),
        onde: z.enum(['ativos', 'arquivados', 'lixeira']).default('ativos'),
        pilar: z.string().optional().describe('Nome ou id do pilar'),
        serie: z.string().optional().describe('Nome ou id da série'),
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
      const rows = (result.data ?? []) as Row[];
      return json({
        total: result.count ?? rows.length,
        pagina: args.pagina,
        ...(result.omitidas.length ? {colunas_ausentes_no_banco: result.omitidas} : {}),
        itens: rows.map(row => contentSummary(row, lookups)),
      });
    }),
  );

  server.registerTool(
    'ver_conteudo',
    {
      title: 'Ver conteúdo',
      description: 'Abre um conteúdo completo: roteiro, notas, referências e publicações por plataforma.',
      inputSchema: {
        id: z.string().min(1),
        roteiro_formato: z.enum(['texto', 'html']).default('texto'),
      },
      annotations: {readOnlyHint: true},
    },
    tool(async (args, session) => {
      const [row] = await fetchContents(session, [args.id]);
      return json(contentDetail(row, await loadLookups(session), args.roteiro_formato));
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
    funcao: funcaoSchema.optional().describe('Função editorial. Sem este campo, herda a função da série quando ela tiver uma.'),
    funcao_origem: origemSchema.optional().describe('herdada lê a série; escolhida grava a função deste roteiro; nenhuma deixa sem função'),
    conta_na_grade: z.boolean().optional().describe('false tira o roteiro da grade. Padrão: fora para Stories, Live e função reter'),
    legenda_base: z.string().nullable().optional().describe('Legenda compartilhada, até cada rede adaptar a própria'),
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
      funcao?: FuncaoEditorial | null;
      funcao_origem?: FuncaoOrigem | null;
      conta_na_grade?: boolean;
      legenda_base?: string | null;
      data_gravacao?: string;
    },
  ) {
    const lookups = await loadLookups(session);
    const serieId = resolveSerie(lookups, input.serie) ?? null;
    const serie = serieId ? lookups.series.find(s => s.id === serieId) : null;
    let pilarId = resolvePilar(lookups, input.pilar) ?? null;
    if (!pilarId && serie?.serie_pilares?.length === 1) pilarId = serie.serie_pilares[0].pilar_id;
    const formato = input.formato ?? serie?.formato_visual_padrao ?? null;
    const funcao = gravarFuncao({
      funcao: input.funcao,
      funcao_origem: input.funcao_origem,
      serie,
    });
    const livros = unirLivros(input.livro_ids, input.biblioteca_item_id);
    const now = nowIso();
    const id = newId();

    const omitidas = await writeCompat('criar conteúdo', {
      id,
      user_id: session.userId,
      title: input.titulo.trim(),
      status: input.status,
      series_id: serieId,
      pilar_id: pilarId,
      biblioteca_item_id: livros[0] ?? null,
      livro_ids: livros,
      formato_visual: formato,
      energia_necessaria: input.energia ?? serie?.energia_padrao ?? null,
      script: input.roteiro ? textToHtml(input.roteiro) : null,
      script_notes: [],
      notes: input.notas?.trim() || null,
      referencias: input.referencias ?? null,
      tags: input.tags ?? [],
      recording_date: input.data_gravacao ?? null,
      recording_date_enabled: Boolean(input.data_gravacao),
      publish_date_enabled: false,
      funcao: funcao.funcao,
      funcao_origem: funcao.funcao_origem,
      conta_na_grade: input.conta_na_grade ?? contaNaGradePadrao(formato, funcao.efetiva),
      legenda_base: input.legenda_base ?? null,
      created_at: now,
      updated_at: now,
    }, row => session.client.from('contents').insert(row));

    const [row] = await fetchContents(session, [id]);
    return comGravadoSem(contentSummary(row, lookups), omitidas);
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
        'Cria um conteúdo já como roteiro (ou outro status). Se a série tiver formato, energia ou função padrão, eles são aplicados. ' +
        'A origem herdada deixa a função vazia e lê a série até a primeira publicação. ' +
        'O roteiro pode ser texto simples: parágrafos separados por linha em branco. ' +
        'livro_ids aceita vários itens da biblioteca; o primeiro também fica como origem antiga.',
      inputSchema: {
        ...createShape,
        status: statusSchema.default('Roteiro'),
        roteiro: z.string().optional(),
        formato: z.string().optional().describe('Formato visual, ex.: Reels, Carrossel, Stories'),
        energia: energiaSchema.optional(),
        referencias: z.string().optional(),
        data_gravacao: dateSchema.optional(),
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
        'Para limpar pilar, série, data ou livros, envie string vazia, lista vazia ou null. ' +
        'Função e origem: herdada lê a série; escolhida grava a função deste roteiro. ' +
        'Depois da primeira publicação a classificação fica congelada e a série deixa de alterá-la. ' +
        'Para mudar status use mudar_status.',
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
        formato: z.string().nullable().optional(),
        energia: energiaSchema.nullable().optional(),
        tags: z.array(z.string()).optional(),
        link: z.string().nullable().optional(),
        data_gravacao: dateSchema.nullable().optional(),
        gravado: z.boolean().optional().describe('true marca como gravado agora; false desfaz'),
        biblioteca_item_id: z.string().nullable().optional(),
        livro_ids: livrosSchema.optional().describe('Substitui a lista de livros. O primeiro vira a origem antiga, se ela não for enviada junto'),
        funcao: funcaoSchema.optional(),
        funcao_origem: origemSchema.optional(),
        conta_na_grade: z.boolean().optional(),
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
      if (args.energia !== undefined) patch.energia_necessaria = args.energia;
      if (args.tags !== undefined) patch.tags = args.tags;
      if (args.link !== undefined) patch.link = args.link || null;
      if (args.data_gravacao !== undefined) {
        patch.recording_date = args.data_gravacao;
        patch.recording_date_enabled = Boolean(args.data_gravacao);
      }
      if (args.gravado !== undefined) patch.recorded_at = args.gravado ? current.recorded_at ?? nowIso() : null;
      if (args.funcao !== undefined || args.funcao_origem !== undefined) {
        const serieId = patch.series_id !== undefined ? patch.series_id : current.series_id;
        const serie = serieId ? lookups.series.find(item => item.id === serieId) : null;
        const origem = args.funcao_origem !== undefined
          ? args.funcao_origem
          : args.funcao
            ? 'escolhida'
            : 'nenhuma';
        const funcao = gravarFuncao({
          funcao: args.funcao === undefined ? current.funcao ?? null : args.funcao,
          funcao_origem: origem,
          serie,
        });
        patch.funcao = funcao.funcao;
        patch.funcao_origem = funcao.funcao_origem;
      }
      if (args.formato !== undefined && args.conta_na_grade === undefined) {
        const serieId = patch.series_id !== undefined ? patch.series_id : current.series_id;
        const serie = serieId ? lookups.series.find(item => item.id === serieId) : null;
        const efetiva = resolveFuncao({
          funcao: patch.funcao !== undefined ? patch.funcao : current.funcao,
          funcao_origem: patch.funcao_origem !== undefined ? patch.funcao_origem : current.funcao_origem,
          classificacao_congelada_em: current.classificacao_congelada_em,
        }, serie).funcao;
        patch.conta_na_grade = contaNaGradePadrao(args.formato, efetiva);
      }
      if (args.conta_na_grade !== undefined) patch.conta_na_grade = args.conta_na_grade;
      if (args.legenda_base !== undefined) patch.legenda_base = args.legenda_base || null;
      if (args.livro_ids !== undefined || args.biblioteca_item_id !== undefined) {
        const livros = unirLivros(
          args.livro_ids ?? (Array.isArray(current.livro_ids) ? current.livro_ids : livrosDoConteudo(current)),
          args.biblioteca_item_id,
        );
        patch.livro_ids = livros;
        patch.biblioteca_item_id = args.biblioteca_item_id === undefined ? livros[0] ?? null : args.biblioteca_item_id || null;
      }

      if (Object.keys(patch).length === 0) throw new Error('Nenhum campo para atualizar.');
      const omitidas = await updateContent(session, args.id, patch);
      const [row] = await fetchContents(session, [args.id]);
      return json(comGravadoSem(contentDetail(row, lookups, 'texto'), omitidas));
    }),
  );

  server.registerTool(
    'mudar_status',
    {
      title: 'Mudar status',
      description:
        'Move conteúdos no fluxo Ideia → Roteiro → Produção → Postado. ' +
        'Ideia para Roteiro aproveita as notas da ideia como rascunho do roteiro. ' +
        'Produção exige título e roteiro escritos. Postado registra a data de postagem e, na primeira vez, congela a função.',
      inputSchema: {
        ids: idsSchema,
        status: statusSchema,
      },
    },
    tool(async (args, session) => {
      const lookups = await loadLookups(session);
      const rows = await fetchContents(session, args.ids);
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
        if (args.status === 'Postado') {
          const serie = row.series_id ? lookups.series.find(item => item.id === row.series_id) : null;
          Object.assign(patch, patchPrimeiraPublicacao(row, serie, now, [row.posted_at ?? now], null));
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
