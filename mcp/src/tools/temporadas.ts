import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {
  invalidateLookups,
  json,
  loadLookups,
  newId,
  nowIso,
  readCompat,
  resolveSerie,
  tool,
  writeCompat,
  type Lookups,
  type Row,
} from '../lib.ts';
import {
  MIGRACAO_MOVER_EPISODIOS,
  MIGRACAO_ORDEM_EPISODIO,
  acharTemporadaPorNome,
  destinosDeQuadro,
  episodioDaLinha,
  episodiosDaSerie,
  escopoDe,
  itemDoRpc,
  novaOrdem,
  ordemFinalNoFim,
  planoMover,
  resolverTemporada,
  serieDaLinha,
  temporadaDaLinha,
  temporadaNoEscopo,
  temporadasComuns,
  temporadasDoEscopo,
  tipoDaSerie,
  type EpisodioMcp,
  type SerieNoMcp,
  type Temporada,
} from '../serieEstrutura.ts';
import {idsDaSubarvore} from '../../../src/features/editorial/lib/serieArvore.ts';
import {frequenciaParaGravar, linhasDaOnda, ondaDasLinhas, ritmoProprioDaOnda, VALORES_UNIDADE, type UnidadeDaMeta} from '../../../src/features/editorial/lib/metaDaOnda.ts';
import {normalizarRedesPostIt} from '../../../src/features/planejamento/lib/redesPostIt.ts';
import type {Session} from '../supabase.ts';

const FOCO_REDES = 'instagram, instagram-video, instagram-carrossel, tiktok, tiktok-video, tiktok-carrossel, youtube (vídeo longo), youtube-shorts, blog, outra';

/** null limpa. Valor desconhecido explica o que vale. */
function lerFoco(value: readonly string[] | null): string[] {
  if (value === null) return [];
  const foco = normalizarRedesPostIt(value);
  const pedidos = [...new Set(value.map(item => item.trim().toLowerCase()).filter(Boolean))];
  const conhecidos = new Set<string>(foco);
  const estranhos = pedidos.filter(item => !conhecidos.has(item));
  if (estranhos.length > 0) throw new Error(`Rede desconhecida em foco_redes: ${estranhos.join(', ')}. Vale ${FOCO_REDES}.`);
  return foco;
}

const idsSchema = z.array(z.string().min(1)).min(1).max(200);

function tabelaAusente(error: {message?: string; code?: string} | null, nome: string): boolean {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? '';
  return (message.includes('does not exist') || message.includes('schema cache') || message.includes('could not find'))
    && message.includes(nome);
}

/** Temporadas da conta. `ausente` quando o banco ainda não tem a tabela. */
export async function carregarTemporadas(session: Session): Promise<{itens: Temporada[]; ausente: boolean}> {
  try {
    const {data} = await readCompat('temporadas', 'id, user_id, serie_id, nome, descricao, foco_redes, created_at', columns =>
      session.client.from('temporadas').select(columns).eq('user_id', session.userId));
    const linhas = (data ?? []) as unknown as Row[];
    // A wave (meta e acompanhamento) fica nas tabelas da série, como no app (database.ts comOndas).
    const [acompanhamentos, metas] = linhas.length === 0 ? [null, null] : await Promise.all([
      session.client.from('serie_acompanhamento').select('temporada_id, escopo, ativo, ritmo_proprio').eq('user_id', session.userId).eq('escopo', 'temporada'),
      session.client.from('serie_meta').select('temporada_id, vezes, unidade, a_partir_de').eq('user_id', session.userId).not('temporada_id', 'is', null),
    ]);
    const acomp = !acompanhamentos || acompanhamentos.error ? [] : (acompanhamentos.data ?? []) as Row[];
    const meta = !metas || metas.error ? [] : (metas.data ?? []) as Row[];
    const itens = linhas.map(row => {
      const onda = ondaDasLinhas(String(row.id), acomp, meta);
      return temporadaDaLinha({
        ...row,
        acompanhar: onda.acompanhar,
        ritmo_proprio: onda.ritmoProprio,
        frequencia_vezes: onda.frequenciaVezes,
        frequencia_unidade: onda.frequenciaUnidade,
        frequencia_a_partir_de: onda.frequenciaAPartirDe,
      });
    });
    return {itens, ausente: false};
  } catch (error) {
    if (tabelaAusente({message: (error as Error).message}, 'temporadas')) return {itens: [], ausente: true};
    throw error;
  }
}

export function seriesNo(lookups: Lookups): SerieNoMcp[] {
  return lookups.series.map(serieDaLinha);
}

/** Série que guarda as temporadas: a própria série, ou a série do quadro (como a página de roteiros do app). */
function serieDasTemporadas(serieId: string, series: readonly SerieNoMcp[]): SerieNoMcp {
  const serie = series.find(item => item.id === serieId);
  if (!serie) throw new Error(`Série não encontrada: ${serieId}`);
  const tipo = tipoDaSerie(serie.id, series);
  if (tipo === 'serie') return serie;
  if (tipo === 'quadro') {
    const escopo = escopoDe(serie.id, series);
    const pai = escopo ?? series.find(item => item.id === serie.parentId);
    if (pai) return pai;
  }
  throw new Error('Temporadas ficam numa série (os quadros usam as da série). Família não tem temporadas.');
}

/** Raiz da ordem dos episódios: a série; num quadro, a série acima dele (raizDaOrdem no app). */
function raizDaOrdem(serieId: string, series: readonly SerieNoMcp[]): SerieNoMcp {
  const serie = series.find(item => item.id === serieId);
  if (!serie) throw new Error(`Série não encontrada: ${serieId}`);
  const tipo = tipoDaSerie(serie.id, series);
  if (tipo === 'familia') throw new Error('Escolha uma série (a ordem e os quadros são por série, não por família).');
  if (tipo === 'serie') return serie;
  let cursor = serie.parentId ? series.find(item => item.id === serie.parentId) : undefined;
  const vistos = new Set<string>();
  while (cursor && !vistos.has(cursor.id)) {
    vistos.add(cursor.id);
    if (tipoDaSerie(cursor.id, series) !== 'quadro') return cursor;
    cursor = cursor.parentId ? series.find(item => item.id === cursor!.parentId) : undefined;
  }
  return serie;
}

const EPISODIO_COLUMNS = 'id, title, series_id, temporada_id, ordem_episodio, pilar_id, pilar_origem, funcao, funcao_origem, classificacao_congelada_em, created_at, archived_at, deleted_at';

/** Episódios não apagados da subárvore. `ordemDisponivel` falso quando falta a coluna ordem_episodio. */
async function carregarEpisodios(session: Session, serieIds: string[]): Promise<{episodios: EpisodioMcp[]; ordemDisponivel: boolean; temporadaDisponivel: boolean}> {
  const result = await readCompat('episódios', EPISODIO_COLUMNS, columns =>
    session.client.from('contents').select(columns).eq('user_id', session.userId).is('deleted_at', null).in('series_id', serieIds));
  const omitidas = result.omitidas.map(item => item.split('.').pop());
  return {
    episodios: ((result.data ?? []) as unknown as Row[]).map(episodioDaLinha),
    ordemDisponivel: !omitidas.includes('ordem_episodio'),
    temporadaDisponivel: !omitidas.includes('temporada_id'),
  };
}

async function chamarMoverEpisodios(session: Session, itens: EpisodioMcp[], ordem: string[] | null) {
  const {error} = await session.client.rpc('mover_episodios', {p_itens: itens.map(itemDoRpc), p_ordem: ordem});
  if (!error) return;
  if (['PGRST202', '42883'].includes((error as {code?: string}).code ?? '')) {
    throw new Error(`O banco ainda não tem a operação mover_episodios. Aplique a migração ${MIGRACAO_MOVER_EPISODIOS}. Nada foi alterado.`);
  }
  throw new Error(`mover episódios: ${error.message}. Nada foi alterado (a operação é tudo ou nada).`);
}

function temporadaView(temporada: Temporada, episodios: number | null) {
  return {
    id: temporada.id,
    nome: temporada.nome,
    descricao: temporada.descricao ?? null,
    foco_redes: temporada.focoRedes ?? [],
    serie_id: temporada.serieId,
    acompanhar: temporada.acompanhar === true,
    ritmo_proprio: ritmoProprioDaOnda(temporada),
    frequencia_vezes: temporada.frequenciaVezes ?? null,
    frequencia_unidade: temporada.frequenciaUnidade ?? null,
    frequencia_a_partir_de: temporada.frequenciaAPartirDe ?? null,
    ...(episodios === null ? {} : {episodios}),
  };
}

async function contarPorTemporada(session: Session, ids: string[]): Promise<Map<string, number>> {
  const contagem = new Map<string, number>();
  if (ids.length === 0) return contagem;
  const {data, error} = await session.client.from('contents').select('temporada_id')
    .eq('user_id', session.userId).is('deleted_at', null).in('temporada_id', ids);
  if (error) return contagem;
  for (const row of (data ?? []) as Row[]) contagem.set(row.temporada_id, (contagem.get(row.temporada_id) ?? 0) + 1);
  return contagem;
}

function semTabela(): never {
  throw new Error('O banco ainda não tem a tabela de temporadas (migration pendente).');
}

const MIGRACAO_ONDA = '20261104200000_temporada_acompanhamento';

const camposDaOnda = {
  acompanhar: z.boolean().optional().describe('Liga o acompanhamento isolado desta temporada na Saúde.'),
  ritmo_proprio: z.boolean().optional().describe('Com meta, a wave anda no próprio ritmo e os episódios dela saem da conta da série (padrão: ligado). false mantém os episódios contando também na série.'),
  frequencia_vezes: z.number().int().min(1).max(60).nullable().optional().describe('Quantidade da meta. null tira a meta'),
  frequencia_unidade: z.enum(VALORES_UNIDADE).nullable().optional().describe('Período da meta. quinzena = ciclo de 14 dias e exige frequencia_a_partir_de. bimestre, trimestre e semestre são blocos fechados a partir de janeiro'),
  frequencia_a_partir_de: z.string().nullable().optional().describe('Data de início da meta, yyyy-MM-dd'),
};

function metaDaOnda(args: {
  acompanhar?: boolean;
  ritmo_proprio?: boolean;
  frequencia_vezes?: number | null;
  frequencia_unidade?: UnidadeDaMeta | null;
  frequencia_a_partir_de?: string | null;
}, atual?: Temporada): {acompanhar: boolean; ritmo_proprio: boolean; frequencia_vezes: number | null; frequencia_unidade: string | null; frequencia_a_partir_de: string | null} {
  const vezes = args.frequencia_vezes === undefined ? atual?.frequenciaVezes ?? null : args.frequencia_vezes;
  const unidade = args.frequencia_unidade === undefined ? atual?.frequenciaUnidade ?? null : args.frequencia_unidade;
  const inicio = args.frequencia_a_partir_de === undefined ? atual?.frequenciaAPartirDe ?? null : args.frequencia_a_partir_de;
  const gravada = frequenciaParaGravar({vezes, unidade, aPartirDe: inicio, tipo: 'temporada'});
  if ('erro' in gravada) throw new Error(gravada.erro);
  return {
    acompanhar: args.acompanhar === undefined ? atual?.acompanhar === true : args.acompanhar,
    ritmo_proprio: args.ritmo_proprio === undefined ? atual?.ritmoProprio !== false : args.ritmo_proprio,
    frequencia_vezes: gravada.vezes,
    frequencia_unidade: gravada.unidade,
    frequencia_a_partir_de: gravada.aPartirDe,
  };
}

type OndaDoMcp = ReturnType<typeof metaDaOnda>;

/** Grava a wave nas tabelas da série (espelho de gravarOnda em src/lib/database.ts). */
async function gravarOnda(session: Session, temporadaId: string, serieId: string, onda: OndaDoMcp): Promise<void> {
  const {acompanhamento, meta} = linhasDaOnda({
    id: temporadaId,
    userId: session.userId,
    serieId,
    acompanhar: onda.acompanhar,
    ritmoProprio: onda.ritmo_proprio,
    frequenciaVezes: onda.frequencia_vezes,
    frequenciaUnidade: onda.frequencia_unidade,
    frequenciaAPartirDe: onda.frequencia_a_partir_de,
  });
  const pediu = Boolean(acompanhamento || meta);
  const semColuna = (message = '') => /temporada_id|ritmo_proprio/.test(message) && /does not exist|schema cache|could not find/i.test(message);
  const migracao = () => new Error(`Para acompanhar a temporada à parte, aplique a migração ${MIGRACAO_ONDA}.`);
  const removidoA = await session.client.from('serie_acompanhamento').delete().eq('user_id', session.userId).eq('temporada_id', temporadaId);
  if (removidoA.error) {
    if (semColuna(removidoA.error.message)) {
      if (pediu) throw migracao();
      return;
    }
    throw new Error(`serie_acompanhamento: ${removidoA.error.message}`);
  }
  const removidoM = await session.client.from('serie_meta').delete().eq('user_id', session.userId).eq('temporada_id', temporadaId);
  if (removidoM.error) throw new Error(`serie_meta: ${removidoM.error.message}`);
  if (acompanhamento) {
    const {error} = await session.client.from('serie_acompanhamento').insert(acompanhamento);
    if (error) throw semColuna(error.message) ? migracao() : new Error(`serie_acompanhamento: ${error.message}`);
  }
  if (meta) {
    const {error} = await session.client.from('serie_meta').insert(meta);
    if (error) throw semColuna(error.message) ? migracao() : new Error(`serie_meta: ${error.message}`);
  }
}

export function registerTemporadas(server: McpServer) {
  server.registerTool(
    'listar_temporadas',
    {
      title: 'Listar temporadas',
      description:
        'Lista as temporadas de uma série (num quadro, as da série dele), na ordem do app (por nome), com quantos episódios cada uma tem. ' +
        'Temporada não tem número próprio: a ordem é pelo nome (ex.: "Temporada 1", "Temporada 2").',
      inputSchema: {serie: z.string().min(1).describe('Nome ou id da série ou do quadro')},
      annotations: {readOnlyHint: true},
    },
    tool(async (args, session) => {
      const lookups = await loadLookups(session);
      const series = seriesNo(lookups);
      const alvo = serieDasTemporadas(resolveSerie(lookups, args.serie)!, series);
      const temporadas = await carregarTemporadas(session);
      if (temporadas.ausente) return json({serie: alvo.name, usa_temporadas: alvo.usaTemporadas, itens: [], colunas_ausentes_no_banco: ['temporadas']});
      const lista = temporadasDoEscopo(alvo.id, temporadas.itens);
      const contagem = await contarPorTemporada(session, lista.map(item => item.id));
      return json({
        serie: {id: alvo.id, nome: alvo.name},
        usa_temporadas: alvo.usaTemporadas,
        itens: lista.map(item => temporadaView(item, contagem.get(item.id) ?? 0)),
      });
    }),
  );

  server.registerTool(
    'criar_temporada',
    {
      title: 'Criar temporada',
      description:
        'Cria uma temporada numa série (num quadro, vai para a série dele; os quadros usam as temporadas da série). ' +
        'Nome repetido na mesma série não vale. Como no app, a primeira temporada liga usa_temporadas na série. ' +
        'foco_redes é opcional: vazio só agrupa episódios de qualquer quadro, sem ordem. ' +
        'Com redes, a temporada cobre esse grupo (ex.: instagram, tiktok e youtube-shorts; ou só youtube para vídeo longo).',
      inputSchema: {
        serie: z.string().min(1).describe('Nome ou id da série ou do quadro'),
        nome: z.string().min(1),
        descricao: z.string().nullable().optional(),
        foco_redes: z.array(z.string()).optional().describe(`Redes desta temporada. ${FOCO_REDES}`),
        ...camposDaOnda,
      },
    },
    tool(async (args, session) => {
      const lookups = await loadLookups(session);
      const series = seriesNo(lookups);
      const alvo = serieDasTemporadas(resolveSerie(lookups, args.serie)!, series);
      const temporadas = await carregarTemporadas(session);
      if (temporadas.ausente) semTabela();
      const nome = args.nome.trim();
      if (acharTemporadaPorNome(alvo.id, nome, temporadas.itens)) throw new Error(`Já existe a temporada "${nome}" em ${alvo.name}.`);
      const id = newId();
      const descricao = args.descricao?.trim() || null;
      const focoRedes = lerFoco(args.foco_redes ?? []);
      const onda = metaDaOnda(args);
      const gravados = await writeCompat('criar temporada', {
        id, user_id: session.userId, serie_id: alvo.id, nome, descricao, foco_redes: focoRedes,
      }, row => session.client.from('temporadas').insert(row));
      await gravarOnda(session, id, alvo.id, onda);
      const avisos: string[] = [];
      if (gravados.includes('foco_redes') && focoRedes.length > 0) avisos.push('O banco ainda não tem foco_redes: as redes da temporada não foram gravadas.');
      if (!alvo.usaTemporadas) {
        const ignorados = await writeCompat('ligar temporadas na série', {usa_temporadas: true, updated_at: nowIso()}, row =>
          session.client.from('series').update(row).eq('id', alvo.id).eq('user_id', session.userId));
        if (ignorados.includes('usa_temporadas')) avisos.push('O banco ainda não tem usa_temporadas: a série não foi marcada.');
        invalidateLookups();
      }
      return json({
        criada: temporadaView({
          id, userId: session.userId, serieId: alvo.id, nome, descricao,
          focoRedes: gravados.includes('foco_redes') ? [] : focoRedes,
          acompanhar: onda.acompanhar,
          ritmoProprio: onda.ritmo_proprio,
          frequenciaVezes: onda.frequencia_vezes,
          frequenciaUnidade: onda.frequencia_unidade,
          frequenciaAPartirDe: onda.frequencia_a_partir_de,
          createdAt: nowIso(),
        }, 0),
        serie: alvo.name,
        ...(avisos.length ? {avisos} : {}),
      });
    }),
  );

  server.registerTool(
    'atualizar_temporada',
    {
      title: 'Atualizar temporada',
      description: 'Renomeia uma temporada, muda a descrição, o foco de redes ou a meta da wave (acompanhar, quantidade, período e data de início). Nome repetido na mesma série não vale. Os episódios não mudam. foco_redes null tira o foco.',
      inputSchema: {
        temporada: z.string().min(1).describe('Id da temporada (ou o nome, junto com serie)'),
        serie: z.string().optional().describe('Nome ou id da série, para achar a temporada pelo nome'),
        nome: z.string().min(1).optional(),
        descricao: z.string().nullable().optional(),
        foco_redes: z.array(z.string()).nullable().optional().describe(`Redes desta temporada, ou null para tirar. ${FOCO_REDES}`),
        ...camposDaOnda,
      },
    },
    tool(async (args, session) => {
      const lookups = await loadLookups(session);
      const temporadas = await carregarTemporadas(session);
      if (temporadas.ausente) semTabela();
      const escopoId = args.serie ? serieDasTemporadas(resolveSerie(lookups, args.serie)!, seriesNo(lookups)).id : null;
      const atual = resolverTemporada(args.temporada, escopoId, temporadas.itens);
      if (!atual) throw new Error(`Temporada não encontrada: ${args.temporada}`);
      const mexeNaOnda = args.acompanhar !== undefined || args.ritmo_proprio !== undefined || args.frequencia_vezes !== undefined || args.frequencia_unidade !== undefined || args.frequencia_a_partir_de !== undefined;
      if (args.nome === undefined && args.descricao === undefined && args.foco_redes === undefined && !mexeNaOnda) throw new Error('Nenhum campo para atualizar.');
      const nome = args.nome?.trim() ?? atual.nome;
      const repetida = acharTemporadaPorNome(atual.serieId, nome, temporadas.itens);
      if (repetida && repetida.id !== atual.id) throw new Error(`Já existe a temporada "${nome}" nesta série.`);
      const descricao = args.descricao === undefined ? atual.descricao ?? null : args.descricao?.trim() || null;
      const focoRedes = args.foco_redes === undefined ? [...(atual.focoRedes ?? [])] : lerFoco(args.foco_redes);
      const onda = mexeNaOnda ? metaDaOnda(args, atual) : null;
      await writeCompat('atualizar temporada', {nome, descricao, foco_redes: focoRedes}, row =>
        session.client.from('temporadas').update(row).eq('id', atual.id).eq('user_id', session.userId));
      if (onda) await gravarOnda(session, atual.id, atual.serieId, onda);
      return json({atualizada: temporadaView({
        ...atual,
        nome,
        descricao,
        focoRedes,
        ...(onda ? {
          acompanhar: onda.acompanhar,
          ritmoProprio: onda.ritmo_proprio,
          frequenciaVezes: onda.frequencia_vezes,
          frequenciaUnidade: onda.frequencia_unidade,
          frequenciaAPartirDe: onda.frequencia_a_partir_de,
        } : {}),
      }, null)});
    }),
  );

  server.registerTool(
    'remover_temporada',
    {
      title: 'Remover temporada',
      description:
        'Exclui uma temporada sem apagar roteiro, como no app: primeiro os episódios dela vão para mover_para ' +
        '(outra temporada da mesma série, ou null = sem temporada) numa operação tudo ou nada; só depois a temporada é excluída. ' +
        'Roteiro, quadro, legendas, contas, datas e etapa não mudam.',
      inputSchema: {
        temporada: z.string().min(1).describe('Id da temporada (ou o nome, junto com serie)'),
        serie: z.string().optional(),
        mover_para: z.string().nullable().optional().describe('Id ou nome de outra temporada da mesma série; null ou vazio = sem temporada'),
      },
      annotations: {destructiveHint: true},
    },
    tool(async (args, session) => {
      const lookups = await loadLookups(session);
      const temporadas = await carregarTemporadas(session);
      if (temporadas.ausente) semTabela();
      const escopoId = args.serie ? serieDasTemporadas(resolveSerie(lookups, args.serie)!, seriesNo(lookups)).id : null;
      const alvo = resolverTemporada(args.temporada, escopoId, temporadas.itens);
      if (!alvo) throw new Error(`Temporada não encontrada: ${args.temporada}`);
      let destino: Temporada | null = null;
      if (args.mover_para) {
        destino = resolverTemporada(args.mover_para, alvo.serieId, temporadas.itens);
        // destinosAoExcluirTemporada: outras temporadas do mesmo escopo, ou "Sem temporada".
        if (!destino || destino.serieId !== alvo.serieId || destino.id === alvo.id) {
          throw new Error('mover_para precisa ser outra temporada da mesma série (ou null para deixar sem temporada).');
        }
      }
      const {data, error} = await session.client.from('contents').select(EPISODIO_COLUMNS)
        .eq('user_id', session.userId).is('deleted_at', null).eq('temporada_id', alvo.id);
      if (error) throw new Error(`episódios da temporada: ${error.message}`);
      const episodios = ((data ?? []) as Row[]).map(episodioDaLinha);
      // planoAoExcluirTemporada: só a temporada muda.
      const mudam = episodios.map(item => ({...item, temporadaId: destino?.id ?? null}));
      if (mudam.length > 0) await chamarMoverEpisodios(session, mudam, null);
      const removed = await session.client.from('temporadas').delete().eq('id', alvo.id).eq('user_id', session.userId).select('id');
      if (removed.error || !removed.data?.length) {
        throw new Error(mudam.length > 0
          ? 'Os episódios já foram movidos, mas não foi possível excluir a temporada. Tente excluir de novo.'
          : `Não foi possível excluir a temporada${removed.error ? `: ${removed.error.message}` : ''}.`);
      }
      return json({
        removida: {id: alvo.id, nome: alvo.nome},
        episodios_movidos: mudam.length,
        para: destino ? destino.nome : 'Sem temporada',
      });
    }),
  );

  server.registerTool(
    'mover_episodios',
    {
      title: 'Mover e reordenar episódios',
      description:
        'Move episódios de uma série entre quadros e temporadas e/ou muda a ordem, numa operação só do banco (tudo ou nada), como o app. ' +
        'quadro: id ou nome de um quadro ativo da série, ou null/"" para deixar direto na série. temporada: id ou nome de uma temporada da série; null tira da temporada. ' +
        'Ao mudar de quadro, só pilar e objetivo herdados passam a vir do destino (escolha manual e publicados ficam); a temporada continua se ainda valer, senão sai (vem avisado). ' +
        'Quem muda de quadro vai para o fim da ordem. ordem: ids na nova sequência (todos os episódios da série, ou só alguns: eles trocam de lugar entre si). ' +
        'Roteiro, legendas, contas, datas e etapa não mudam. Nada é apagado.',
      inputSchema: {
        serie: z.string().min(1).describe('Nome ou id da série (num quadro, vale a série dele)'),
        episodios: idsSchema.optional().describe('Ids dos episódios a mover de quadro ou temporada'),
        quadro: z.string().nullable().optional(),
        temporada: z.string().nullable().optional(),
        ordem: idsSchema.optional().describe('Ids na nova ordem. Reordenar não mexe em "Editados por último"'),
      },
    },
    tool(async (args, session) => {
      const lookups = await loadLookups(session);
      const series = seriesNo(lookups);
      const raiz = raizDaOrdem(resolveSerie(lookups, args.serie)!, series);
      const subarvore = [...idsDaSubarvore(raiz.id, series)];
      const carregados = await carregarEpisodios(session, subarvore);
      const escopo = episodiosDaSerie(raiz.id, series, carregados.episodios);
      const porId = new Map(escopo.map(item => [item.id, item]));
      const mexeEstrutura = args.quadro !== undefined || args.temporada !== undefined;
      if (mexeEstrutura && !args.episodios?.length) throw new Error('Informe os episódios a mover.');
      if (args.episodios?.length && !mexeEstrutura) throw new Error('Informe quadro e/ou temporada de destino (ou use só ordem para reordenar).');
      if (!mexeEstrutura && !args.ordem?.length) throw new Error('Nada para fazer: informe episodios + quadro/temporada, ou ordem.');

      const selecionados: EpisodioMcp[] = [];
      for (const id of args.episodios ?? []) {
        const item = porId.get(id);
        if (!item) throw new Error(`Episódio fora desta série, arquivado ou na lixeira: ${id}`);
        if (!selecionados.some(outro => outro.id === id)) selecionados.push(item);
      }

      let quadroId: string | undefined;
      if (args.quadro !== undefined) {
        quadroId = args.quadro === null || args.quadro === '' ? raiz.id : resolveSerie(lookups, args.quadro)!;
        if (!destinosDeQuadro(raiz.id, series).includes(quadroId)) {
          throw new Error('Destino precisa ser um quadro ativo desta série, ou null para deixar direto na série.');
        }
      }

      // A lista de temporadas também confere se a temporada atual continua valendo no quadro de destino.
      const temporadas = mexeEstrutura ? await carregarTemporadas(session) : {itens: [] as Temporada[], ausente: false};
      if (args.temporada !== undefined && !carregados.temporadaDisponivel) {
        throw new Error('O banco ainda não tem a coluna de temporada nos conteúdos (migration pendente).');
      }
      let temporada: 'manter' | 'nenhuma' | string = 'manter';
      if (args.temporada === null || args.temporada === '') temporada = 'nenhuma';
      else if (args.temporada) {
        if (temporadas.ausente) semTabela();
        const escopoTemporada = escopoDe(quadroId ?? raiz.id, series);
        const achada = resolverTemporada(args.temporada, escopoTemporada?.id ?? null, temporadas.itens);
        if (!achada) throw new Error(`Temporada não encontrada nesta série: ${args.temporada}`);
        // Só temporadas que valem para todos os episódios no destino (temporadasComuns / temporadaNoEscopo).
        const noDestino = selecionados.map(item => ({...item, seriesId: quadroId ?? item.seriesId}));
        const comuns = temporadasComuns(noDestino, series, temporadas.itens);
        if (!comuns.some(item => item.id === achada.id) || !noDestino.every(item => temporadaNoEscopo(achada.id, item.seriesId, series, temporadas.itens))) {
          throw new Error(`A temporada "${achada.nome}" não vale para todos esses episódios no destino.`);
        }
        temporada = achada.id;
      }
      const listaTemporadas = temporadas.itens;

      const plano = mexeEstrutura
        ? planoMover(selecionados, {quadroId, temporada}, series, listaTemporadas)
        : {mudam: [], jaNoDestino: [], perdemTemporada: []};
      const movidos = new Set(plano.mudam.filter(item => item.seriesId !== porId.get(item.id)?.seriesId).map(item => item.id));

      let ordem: string[] | null = null;
      if (args.ordem?.length) {
        if (!carregados.ordemDisponivel) throw new Error(`Ordem manual indisponível: aplique a migração ${MIGRACAO_ORDEM_EPISODIO}.`);
        const pedida = novaOrdem(escopo, args.ordem);
        if ('erro' in pedida) throw new Error(pedida.erro);
        ordem = pedida.ordem;
      } else if (carregados.ordemDisponivel && movidos.size > 0) {
        ordem = ordemFinalNoFim(escopo, movidos);
      }

      if (plano.mudam.length === 0 && !ordem) {
        return json({alterados: 0, ja_estavam_no_destino: plano.jaNoDestino.length, mensagem: 'Os selecionados já estavam aí.'});
      }
      await chamarMoverEpisodios(session, plano.mudam, ordem);

      const titulo = (id: string) => porId.get(id)?.title || '(sem título)';
      return json({
        alterados: plano.mudam.length,
        ja_estavam_no_destino: plano.jaNoDestino.length,
        episodios: plano.mudam.map(item => ({
          id: item.id,
          titulo: item.title,
          quadro: item.seriesId === raiz.id ? null : lookups.serieName(item.seriesId),
          temporada: item.temporadaId ? listaTemporadas.find(t => t.id === item.temporadaId)?.nome ?? item.temporadaId : null,
          pilar: lookups.pilarName(item.pilarId),
          funcao: item.funcao,
        })),
        ...(plano.perdemTemporada.length
          ? {aviso: `${plano.perdemTemporada.length} episódio(s) saíram da temporada, porque ela não vale no destino: ${plano.perdemTemporada.map(titulo).join(', ')}`}
          : {}),
        ...(ordem ? {ordem: ordem.map((id, index) => ({posicao: index + 1, id, titulo: titulo(id)}))} : {}),
      });
    }),
  );
}

