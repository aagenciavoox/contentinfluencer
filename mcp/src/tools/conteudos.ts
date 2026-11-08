import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {FORMATO_DESCRICAO, JANELAS, horaEscolhida, primeiroFormato} from '../campos.ts';
import {modoEscrita, rascunhoDasNotas, roteiroDoConteudo, scriptEditado, temRoteiroEscrito} from '../carrossel.ts';
import {notasAoVoltarParaIdeia} from '../ideia.ts';
import {descreverColunasOmitidas, livrosDoConteudo, unirLivros} from '../editorial.ts';
import {anexarTemas, gravarTemasDoConteudo, idsComTema, temasDosConteudos} from '../temas.ts';
import {juntarTemas, separarTags} from '../tagsTemas.ts';
import {
  CONTENT_LIST_COLUMNS,
  CONTENT_STATUSES,
  FUNCOES,
  contaNaGradePadrao,
  contentSummary,
  funcaoEfetiva,
  funcaoHerdavel,
  funcaoHerdavelNaCadeia,
  htmlToText,
  json,
  loadLookups,
  newId,
  normalizeStatus,
  nowIso,
  readCompat,
  statusRank,
  pilarIdDeItemDaBiblioteca,
  resolvePilar,
  resolveSerie,
  textToHtml,
  tool,
  writeCompat,
  type Lookups,
  type Row,
} from '../lib.ts';
import type {Session} from '../supabase.ts';
import {erroDaTemporadaDoConteudo, escopoDe, resolverTemporada, temporadaNoEscopo, type Temporada} from '../serieEstrutura.ts';
import {carregarTemporadas, seriesNo} from './temporadas.ts';

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

// writing_mode mostra quais roteiros são carrossel. Sem a coluna no banco, readCompat tira e segue.
const LIST_COLUMNS = `writing_mode, temporada_id, ordem_episodio, ${CONTENT_LIST_COLUMNS}`;
const temporadaSchema = z.string().nullable().optional().describe(
  'Id ou nome da temporada da série do conteúdo (num quadro, as da série dele). null ou vazio tira da temporada',
);
const ordemEpisodioSchema = z.number().int().min(1).nullable().optional().describe(
  'Posição do episódio na ordem manual da série (1, 2, 3...). Para reordenar vários de uma vez, prefira mover_episodios',
);

/** Temporada e posição do episódio, para listas e detalhe. */
function episodioView(row: Row, temporadas: readonly Temporada[]) {
  const temporadaId = typeof row.temporada_id === 'string' && row.temporada_id ? row.temporada_id : null;
  return {
    temporada_id: temporadaId,
    temporada: temporadaId ? temporadas.find(item => item.id === temporadaId)?.nome ?? null : null,
    ordem_episodio: typeof row.ordem_episodio === 'number' ? row.ordem_episodio : null,
  };
}

/**
 * Temporada pedida para um conteúdo: id ou nome no escopo da série (regra temporadaNoEscopo do app).
 * undefined = não mexe; null = sem temporada.
 */
async function temporadaPedida(
  session: Session,
  lookups: Lookups,
  ref: string | null | undefined,
  serieId: string | null,
): Promise<string | null | undefined> {
  if (ref === undefined) return undefined;
  if (ref === null || ref === '') return null;
  const temporadas = await carregarTemporadas(session);
  if (temporadas.ausente) throw new Error('O banco ainda não tem a tabela de temporadas (migration pendente).');
  const series = seriesNo(lookups);
  const escopo = serieId ? escopoDe(serieId, series) : null;
  const achada = resolverTemporada(ref, escopo?.id ?? null, temporadas.itens);
  if (!achada) {
    throw new Error(serieId ? `Temporada não encontrada nesta série: ${ref}` : 'Temporada só existe dentro de uma série: informe a série do conteúdo.');
  }
  const erro = erroDaTemporadaDoConteudo(achada.id, serieId, series, temporadas.itens);
  if (erro) throw new Error(erro);
  return achada.id;
}

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

function contentDetail(row: Row, lookups: Lookups, roteiroFormato: 'texto' | 'html', temporadas: readonly Temporada[] = []) {
  return {
    ...contentSummary(row, lookups),
    ...episodioView(row, temporadas),
    ...roteiroDoConteudo(row, roteiroFormato),
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
        temporada: z.string().optional().describe('Id ou nome da temporada (pelo nome, informe também a série)'),
        busca: z.string().optional().describe('Procura no título e nas notas'),
        publicacao_de: dateSchema.optional().describe('Data de publicação a partir de'),
        publicacao_ate: dateSchema.optional().describe('Data de publicação até'),
        ordem: z.enum(['recentes', 'antigos', 'titulo', 'publicacao', 'episodio']).default('recentes').describe(
          'episodio = ordem manual da série (ordem_episodio; sem posição vai para o fim)',
        ),
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
        episodio: ['ordem_episodio', true],
      } as const;
      const temporadas = await carregarTemporadas(session);
      let temporadaId: string | null = null;
      if (args.temporada) {
        if (temporadas.ausente) throw new Error('O banco ainda não tem a tabela de temporadas (migration pendente).');
        const serieRef = resolveSerie(lookups, args.serie);
        const escopo = serieRef ? escopoDe(serieRef, seriesNo(lookups)) : null;
        const achada = resolverTemporada(args.temporada, escopo?.id ?? null, temporadas.itens);
        if (!achada) throw new Error(`Temporada não encontrada: ${args.temporada}${serieRef ? '' : ' (pelo nome, informe a série)'}`);
        temporadaId = achada.id;
      }
      const [column, ascending] = order[args.ordem];
      const from = (args.pagina - 1) * args.limite;
      const result = await readCompat('listar conteúdos', LIST_COLUMNS, columns => {
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
        if (temporadaId) query = query.eq('temporada_id', temporadaId);
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
        itens: comTema.rows.map(row => ({...contentSummary(row, lookups), ...episodioView(row, temporadas.itens), modo_escrita: modoEscrita(row)})),
      });
    }),
  );

  server.registerTool(
    'ver_conteudo',
    {
      title: 'Ver conteúdo',
      description:
        'Abre um conteúdo completo: roteiro, notas, referências, temas, temporada, posição do episódio, janela, horário de gravação e publicações por plataforma. ' +
        'modo_escrita diz se o roteiro é texto corrido ou carrossel. No carrossel, telas traz cada tela na ordem (Tela 1, Tela 2…) ' +
        'com o texto (ou html, se roteiro_formato for html) e as imagens; roteiro junta o texto das telas.',
      inputSchema: {
        id: z.string().min(1),
        roteiro_formato: z.enum(['texto', 'html']).default('texto'),
      },
      annotations: {readOnlyHint: true},
    },
    tool(async (args, session) => {
      const [loaded] = await fetchContents(session, [args.id]);
      const comTema = await anexarTemas(session, [loaded]);
      const detail = contentDetail(comTema.rows[0], await loadLookups(session), args.roteiro_formato, (await carregarTemporadas(session)).itens);
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
    tags: z.array(z.string()).optional().describe('Compatibilidade: gravar e editar ficam como marca de produção; o resto vira tema. Prefira temas.'),
    temas: z.array(z.string().min(1)).max(20).optional().describe(
      'Nomes ou ids. Nome novo cria o tema. Tema é o jeito de agrupar roteiros (ex.: Halloween), com ou sem série; não é série, pilar nem função.',
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
    temporada: temporadaSchema,
    ordem_episodio: ordemEpisodioSchema,
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
      temporada?: string | null;
      ordem_episodio?: number | null;
    },
  ) {
    const lookups = await loadLookups(session);
    const serieId = resolveSerie(lookups, input.serie) ?? null;
    const serie = serieId ? lookups.series.find(s => s.id === serieId) : null;
    const livros = unirLivros(input.livro_ids, input.biblioteca_item_id);
    let pilarOrigem: 'escolhida' | null = null;
    let pilarId = resolvePilar(lookups, input.pilar) ?? null;
    if (input.pilar) {
      pilarOrigem = pilarId ? 'escolhida' : null;
    } else if (livros.length > 0) {
      const daObra = pilarIdDeItemDaBiblioteca(lookups.pilares);
      if (daObra) {
        pilarId = daObra;
        pilarOrigem = 'escolhida';
      }
    }
    if (!pilarId && serie?.serie_pilares?.length) pilarId = serie.serie_pilares[0].pilar_id;
    const formato = input.formato?.trim() || primeiroFormato(serie?.formato_visual_padrao);
    const herdada = funcaoHerdavel(serie);
    const escolha = input.funcao ?? (herdada ? 'da_serie' : null);
    const funcao = funcaoColumns(escolha);
    const funcaoInicial = escolha === 'da_serie' ? herdada : escolha === 'nenhuma' ? null : escolha;
    const horaPublicacao = horaEscolhida(input.hora_publicacao, input.janela);
    const temporadaId = await temporadaPedida(session, lookups, input.temporada, serieId);
    const now = nowIso();
    const id = newId();
    const tagsSeparadas = separarTags(input.tags);
    const temasPedidos = input.temas !== undefined || tagsSeparadas.temas.length > 0
      ? juntarTemas(input.temas, tagsSeparadas.temas)
      : undefined;

    const omitidas = await writeCompat('criar conteúdo', {
      id,
      user_id: session.userId,
      title: input.titulo.trim(),
      status: input.status,
      series_id: serieId,
      slot_type: serie?.slot_padrao ?? null,
      pilar_id: pilarId,
      ...(pilarOrigem ? {pilar_origem: pilarOrigem} : {}),
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
      tags: tagsSeparadas.producao,
      recording_date: input.data_gravacao ?? null,
      recording_time: input.hora_gravacao ?? null,
      recording_date_enabled: Boolean(input.data_gravacao),
      publish_date: input.data_publicacao ?? null,
      publish_time: horaPublicacao ?? null,
      publish_date_enabled: Boolean(input.data_publicacao),
      ...funcao,
      conta_na_grade: input.conta_na_grade ?? contaNaGradePadrao(formato, funcaoInicial),
      legenda_base: input.legenda_base ?? null,
      ...(temporadaId ? {temporada_id: temporadaId} : {}),
      ...(input.ordem_episodio != null ? {ordem_episodio: input.ordem_episodio} : {}),
      created_at: now,
      updated_at: now,
    }, row => session.client.from('contents').insert(row));

    if (temasPedidos) {
      const gravados = await gravarTemasDoConteudo(session, id, temasPedidos);
      if (gravados.ausente) omitidas.push('temas');
    }

    const [row] = await fetchContents(session, [id]);
    const comTema = await anexarTemas(session, [row]);
    const temporadasCriadas = temporadaId ? (await carregarTemporadas(session)).itens : [];
    return comGravadoSem({...contentSummary(comTema.rows[0], lookups), ...episodioView(comTema.rows[0], temporadasCriadas)}, omitidas);
  }

  server.registerTool(
    'criar_ideia',
    {
      title: 'Criar ideia',
      description: 'Guarda uma ideia nova na aba Ideias do Content OS. Ligada a um item da biblioteca, sem pilar informado, entra em Indicação/Resenha.',
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
        'livro_ids aceita vários itens da biblioteca; o primeiro também fica como origem antiga. ' +
        'Sem pilar informado, um roteiro ligado a um item da biblioteca entra em Indicação/Resenha. ' +
        'Num episódio de série com temporadas, envie temporada (id ou nome) e, se quiser, ordem_episodio.',
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
        'temas (o agrupamento do roteiro) substitui a lista; nome novo cria o tema. tags é só compatibilidade: o que não for gravar/editar vira tema. janela define manha (09:00), tarde (14:00) ou noite (20:00), a menos que hora_publicacao venha junto. ' +
        'funcao é o antigo funil; null volta para "sem definição". Mudar formato ou função recalcula conta_na_grade, a menos que ele venha junto. ' +
        'temporada (id ou nome) tem de ser da série do conteúdo (num quadro, da série dele); ordem_episodio é a posição na ordem manual. Para mover vários episódios entre quadros ou reordenar, use mover_episodios.',
      inputSchema: {
        id: z.string().min(1),
        titulo: z.string().min(1).optional(),
        roteiro: z.string().optional().describe('Texto do roteiro. Roteiro em modo Carrossel não aceita: as telas são editadas no app'),
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
        tags: z.array(z.string()).optional().describe('Compatibilidade: gravar e editar ficam como marca de produção; o resto vira tema. Os temas vindos daqui somam aos atuais. Prefira temas.'),
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
        temporada: temporadaSchema,
        ordem_episodio: ordemEpisodioSchema,
      },
    },
    tool(async (args, session) => {
      const lookups = await loadLookups(session);
      const [current] = await fetchContents(session, [args.id]);
      const avisosEpisodio: string[] = [];
      const patch: Row = {};

      // Antes de qualquer gravação (temas inclusive): no carrossel a chamada inteira é recusada.
      if (args.roteiro !== undefined) patch.script = scriptEditado(current, args.roteiro, args.modo_roteiro);
      if (args.titulo !== undefined) patch.title = args.titulo.trim();
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
      const tagsSeparadas = args.tags !== undefined ? separarTags(args.tags) : null;
      if (tagsSeparadas) patch.tags = tagsSeparadas.producao;
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
      // Gravado leva o vídeo para Edição, como no app. Quem já passou da gravação não volta.
      if (args.gravado && statusRank(current.status) < statusRank('Edição')) {
        patch.status = 'Edição';
      }
      if (args.legenda_base !== undefined) patch.legenda_base = args.legenda_base || null;
      // Temporada: precisa valer no escopo da série final (temporadaNoEscopo). Trocar de série sem
      // enviar a temporada mantém a atual só se ela continuar valendo, como o "Mover para..." do app.
      const serieFinal = (patch.series_id !== undefined ? patch.series_id : current.series_id) ?? null;
      if (args.temporada !== undefined) {
        patch.temporada_id = await temporadaPedida(session, lookups, args.temporada, serieFinal);
      } else if (patch.series_id !== undefined && current.temporada_id) {
        const temporadas = await carregarTemporadas(session);
        if (!temporadaNoEscopo(current.temporada_id, serieFinal, seriesNo(lookups), temporadas.itens) || !serieFinal) {
          patch.temporada_id = null;
          avisosEpisodio.push('O conteúdo saiu da temporada, porque ela não vale na série nova.');
        }
      }
      if (args.ordem_episodio !== undefined) patch.ordem_episodio = args.ordem_episodio;
      if (args.livro_ids !== undefined || args.biblioteca_item_id !== undefined) {
        const livros = unirLivros(
          args.livro_ids ?? (Array.isArray(current.livro_ids) ? current.livro_ids : livrosDoConteudo(current)),
          args.biblioteca_item_id,
        );
        patch.livro_ids = livros;
        patch.biblioteca_item_id = args.biblioteca_item_id === undefined ? livros[0] ?? null : args.biblioteca_item_id || null;
      }

      let temasAusente = false;
      let temasPedidos = args.temas;
      if (tagsSeparadas?.temas.length) {
        // Tags antigas somam aos temas: aos enviados, ou aos que o roteiro já tem.
        let base = args.temas;
        if (base === undefined) {
          const atuais = await temasDosConteudos(session, [args.id]);
          base = (atuais.porConteudo.get(args.id) ?? []).map(tema => tema.id);
        }
        temasPedidos = juntarTemas(base, tagsSeparadas.temas);
      }
      if (temasPedidos !== undefined) {
        const gravados = await gravarTemasDoConteudo(session, args.id, temasPedidos);
        temasAusente = gravados.ausente;
      }

      if (Object.keys(patch).length === 0 && temasPedidos === undefined) throw new Error('Nenhum campo para atualizar.');
      const omitidas = Object.keys(patch).length > 0 ? await updateContent(session, args.id, patch) : [];
      if (temasAusente) omitidas.push('temas');
      const [row] = await fetchContents(session, [args.id]);
      const comTema = await anexarTemas(session, [row]);
      const detalhe = comGravadoSem(contentDetail(comTema.rows[0], lookups, 'texto', (await carregarTemporadas(session)).itens), omitidas);
      return json(avisosEpisodio.length ? {...detalhe, avisos: avisosEpisodio} : detalhe);
    }),
  );

  server.registerTool(
    'mudar_status',
    {
      title: 'Mudar status',
      description:
        'Move conteúdos no fluxo Ideia → Roteiro → Produção → Edição → Publicado. Dá para pular ou voltar etapas. ' +
        'Ao sair de Ideia, as notas da ideia viram rascunho do roteiro. ' +
        'Ao voltar para Ideia, o roteiro e o rascunho entram no texto da ideia (o roteiro fica guardado). ' +
        'Produção e Edição exigem título e roteiro escritos (no carrossel, alguma tela com texto ou imagem). Publicado registra a data de publicação e fixa a função editorial da peça.',
      inputSchema: {
        ids: idsSchema,
        status: statusSchema,
      },
    },
    tool(async (args, session) => {
      const rows = await fetchContents(session, args.ids);
      const lookups = await loadLookups(session);
      const now = nowIso();
      const exigeRoteiro = args.status === 'Produção' || args.status === 'Edição';
      const blocked = rows.filter(
        row => exigeRoteiro && (!row.title?.trim() || !temRoteiroEscrito(row)),
      );
      if (blocked.length > 0) {
        throw new Error(
          `Sem título ou roteiro escrito (no carrossel, alguma tela com texto ou imagem), não dá para ir para ${args.status}: ` +
          blocked.map(row => `${row.title || '(sem título)'} [${row.id}]`).join('; '),
        );
      }

      const changed = [];
      for (const row of rows) {
        const from = normalizeStatus(row.status);
        const patch: Row = {status: args.status, archived_at: null};
        const rascunho = from === 'Ideia' && args.status !== 'Ideia' ? rascunhoDasNotas(row) : null;
        if (rascunho) patch.script = rascunho;
        // Ao voltar para Ideia, o roteiro e o rascunho entram no texto da ideia, como no app. O roteiro fica.
        if (args.status === 'Ideia' && from !== 'Ideia') {
          const notas = notasAoVoltarParaIdeia(row);
          if (notas !== undefined) patch.notes = notas;
        }
        // Vídeo que chega a Produção vindo da escrita fica marcado para gravar, como no app.
        if (
          args.status === 'Produção'
          && statusRank(from) < statusRank('Produção')
          && modoEscrita(row) !== 'carrossel'
        ) {
          const tags: string[] = Array.isArray(row.tags) ? row.tags : [];
          if (!tags.some(tag => tag.toLowerCase() === 'gravar')) patch.tags = [...tags, 'gravar'];
        }
        if (args.status === 'Publicado' && !row.posted_at) patch.posted_at = now;
        // Ao publicar, a função fica fixa: mudar a série depois não reclassifica o que já saiu.
        if (args.status === 'Publicado' && !row.classificacao_congelada_em) {
          if (row.funcao_origem === 'herdada') {
            patch.funcao = funcaoHerdavelNaCadeia(
              typeof row.series_id === 'string' ? row.series_id : null,
              lookups.series,
            );
          }
          patch.classificacao_congelada_em = now;
        }
        if (args.status !== 'Publicado' && row.posted_at) patch.posted_at = null;
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
