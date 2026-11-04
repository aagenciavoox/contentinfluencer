import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {z} from 'zod';
import {
  FORMATOS_APRESENTACAO,
  FORMATO_DESCRICAO,
  listaDeFormatos,
} from '../campos.ts';
import {
  FUNCOES,
  FUNIL_DA_FUNCAO,
  check,
  columnAbsence,
  invalidateLookups,
  isFuncao,
  json,
  loadLookups,
  newId,
  nowIso,
  resolvePilar,
  resolvePlatform,
  resolveSerie,
  tool,
  writeCompat,
  type Lookups,
  type Row,
} from '../lib.ts';
import type {Session} from '../supabase.ts';
import {
  MIGRACAO_CONTAS,
  MIGRACAO_SERIE_CONTINUIDADE,
  MIGRACAO_SERIE_TIPO,
  TIPOS_AGRUPAMENTO,
  acompanhaNoGeralDaLinha,
  UNIDADES_FREQUENCIA,
  arvore,
  avisoDaContinuidade,
  colunasDaFrequencia,
  erroDoVinculo,
  frequenciaDaLinha,
  nomeDeQuadroRepetido,
  podeTerTemporadas,
  serieDaLinha,
  tipoDaSerie,
  tipoSugeridoParaFilho,
  type SerieNoMcp,
  type TipoAgrupamento,
} from '../serieEstrutura.ts';
import {normalizarRedesPostIt} from '../../../src/features/planejamento/lib/redesPostIt.ts';

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM');
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use AAAA-MM-DD');
const colorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, 'Use cor hexadecimal, ex.: #E07A5F');
const diaSchema = z.union([z.enum([...DIAS, 'sab']), z.number().int().min(0).max(6)]);
const FREQUENCIAS_SERIE = ['Semanal', 'Quinzenal', 'Mensal', 'Sob demanda'] as const;
const FUNCOES_SERIE = [...FUNCOES, 'varia'] as const;

const pilarPlataformaSchema = z.object({
  plataforma: z.string().describe('Nome ou id, ex.: Instagram'),
  hashtags: z.string().optional().describe('Preset de hashtags do pilar nessa rede'),
  melhores_dias: z.array(diaSchema).optional().describe('Ex.: ["seg","qua","sex"]. Lista vazia = todos os dias'),
  janela_inicio: timeSchema.nullable().optional(),
  janela_fim: timeSchema.nullable().optional(),
  remover: z.boolean().optional().describe('Tira a configuração dessa rede do pilar'),
});

const serieHashtagSchema = z.object({
  plataforma: z.string(),
  hashtags: z.string().optional().describe('Preset de hashtags da série nessa conta. String vazia limpa'),
  legenda: z.string().nullable().optional().describe('Versão da legenda da série para essa conta. null ou vazio limpa'),
});

function diaNumero(dia: z.infer<typeof diaSchema>): number {
  if (typeof dia === 'number') return dia;
  return dia === 'sab' ? 6 : DIAS.indexOf(dia);
}

function avisos(ignorados: string[]) {
  return ignorados.length > 0
    ? {campos_ignorados: ignorados, aviso: 'O banco ainda não tem esses campos (migration pendente); o resto foi salvo.'}
    : {};
}

async function fetchPilar(session: Session, id: string): Promise<Row> {
  const row = check('pilar', await session.client.from('pilares').select('*, pilar_plataformas(*)')
    .eq('user_id', session.userId).eq('id', id).maybeSingle());
  if (!row) throw new Error(`Pilar não encontrado: ${id}`);
  return row;
}

async function fetchSerie(session: Session, id: string): Promise<Row> {
  const completo = await session.client.from('series').select('*, serie_pilares(pilar_id), serie_plataformas(*), serie_acompanhamento(*)')
    .eq('user_id', session.userId).eq('id', id).maybeSingle();
  // Sem a tabela serie_acompanhamento (migração 20261103120000), lê como antes.
  const result = completo.error && /serie_acompanhamento|relationship/i.test(completo.error.message ?? '')
    ? await session.client.from('series').select('*, serie_pilares(pilar_id), serie_plataformas(*)')
      .eq('user_id', session.userId).eq('id', id).maybeSingle()
    : completo;
  const row = check('série', result);
  if (!row) throw new Error(`Série não encontrada: ${id}`);
  return row;
}

/** Liga ou desliga o acompanhamento geral em serie_acompanhamento. Sem a tabela, fica só a coluna antiga. */
async function sincronizarAcompanhamentoGeral(session: Session, serieId: string, ativo: boolean): Promise<void> {
  const atual = await session.client.from('serie_acompanhamento').select('id')
    .eq('user_id', session.userId).eq('serie_id', serieId).eq('escopo', 'geral').maybeSingle();
  if (atual.error) {
    if (/serie_acompanhamento|does not exist|schema cache/i.test(atual.error.message ?? '')) return;
    throw new Error(`acompanhamento: ${atual.error.message}`);
  }
  const result = atual.data
    ? await session.client.from('serie_acompanhamento').update({ativo, updated_at: nowIso()}).eq('id', (atual.data as Row).id)
    : ativo
      ? await session.client.from('serie_acompanhamento').insert({user_id: session.userId, serie_id: serieId, escopo: 'geral', ativo: true})
      : {error: null};
  if (result.error) throw new Error(`acompanhamento: ${result.error.message}`);
}

function pilarView(row: Row, lookups: Lookups) {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao || null,
    cor: row.cor,
    ativo: row.ativo,
    plataformas: (row.pilar_plataformas ?? []).map((p: Row) => ({
      plataforma: lookups.platformName(p.platform_id),
      hashtags: p.hashtags || null,
      melhores_dias: (p.melhores_dias ?? []).map((d: number) => DIAS[d]),
      janela_inicio: p.janela_inicio ?? null,
      janela_fim: p.janela_fim ?? null,
    })),
  };
}

function serieView(row: Row, lookups: Lookups) {
  return {
    id: row.id,
    nome: row.name,
    ativa: row.ativa,
    pilares: (row.serie_pilares ?? []).map((sp: Row) => lookups.pilarName(sp.pilar_id)),
    funcao_padrao: row.funcao_padrao ?? null,
    etapa_funil: isFuncao(row.funcao_padrao) ? FUNIL_DA_FUNCAO[row.funcao_padrao] ?? 'fora' : null,
    frequencia: row.frequencia_recomendada ?? null,
    formato_padrao: listaDeFormatos(row.formato_visual_padrao),
    formato_apresentacao: listaDeFormatos(row.formato_apresentacao),
    energia_padrao: row.energia_padrao ?? null,
    motivo_salvar: row.motivo_salvar ?? null,
    motivo_enviar: row.motivo_enviar ?? null,
    pilar_principal: lookups.pilarName(row.pilar_principal_id),
    bordao: row.bordao ?? null,
    estrutura_roteiro: row.estrutura_roteiro ?? null,
    modelo: row.template || null,
    notas: row.notes || null,
    cor: row.cor ?? null,
    capa_url: row.capa_url ?? null,
    hashtags: (row.serie_plataformas ?? []).map((sp: Row) => ({
      plataforma: lookups.platformName(sp.platform_id),
      hashtags: sp.hashtags,
      legenda: typeof sp.legenda === 'string' && sp.legenda.trim() ? sp.legenda : null,
    })),
    ...estruturaView(row, lookups),
    foco_redes: normalizarRedesPostIt(row.foco_redes),
  };
}

function focoDaSerie(value: unknown): string[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    throw new Error('foco_redes precisa ser uma lista de redes.');
  }
  const foco = normalizarRedesPostIt(value);
  const pedidos = [...new Set(value.map(item => item.trim().toLowerCase()).filter(Boolean))];
  const conhecidos = new Set<string>(foco);
  const estranhos = pedidos.filter(item => !conhecidos.has(item));
  if (estranhos.length > 0) throw new Error('Rede desconhecida em foco_redes: ' + estranhos.join(', ') + '.');
  return foco;
}

async function mergePilarPlataformas(
  session: Session,
  lookups: Lookups,
  pilarId: string,
  existing: Row[],
  items: z.infer<typeof pilarPlataformaSchema>[],
) {
  const {client} = session;
  for (const item of items) {
    const platformId = resolvePlatform(lookups, item.plataforma);
    const current = existing.find(row => row.platform_id === platformId);
    const merged = {
      pilar_id: pilarId,
      platform_id: platformId,
      hashtags: (item.hashtags ?? current?.hashtags ?? '').trim(),
      melhores_dias: item.melhores_dias !== undefined
        ? (item.melhores_dias.length ? [...new Set(item.melhores_dias.map(diaNumero))].sort() : null)
        : current?.melhores_dias ?? null,
      janela_inicio: item.janela_inicio !== undefined ? item.janela_inicio : current?.janela_inicio ?? null,
      janela_fim: item.janela_fim !== undefined ? item.janela_fim : current?.janela_fim ?? null,
    };
    const empty = !merged.hashtags && !merged.melhores_dias?.length && !merged.janela_inicio && !merged.janela_fim;
    if (item.remover || empty) {
      check('remover rede do pilar', await client.from('pilar_plataformas').delete().eq('pilar_id', pilarId).eq('platform_id', platformId));
    } else {
      check('salvar rede do pilar', await client.from('pilar_plataformas').upsert(merged, {onConflict: 'pilar_id,platform_id'}));
    }
  }
}

/**
 * Hashtags e legenda por conta da série (serie_plataformas), como saveSeriePlataformas no app.
 * Só as redes enviadas mudam; o campo que não vier fica como está. Sem hashtags nem legenda, a linha sai.
 */
async function mergeSerieHashtags(
  session: Session,
  lookups: Lookups,
  serieId: string,
  existing: Row[],
  items: z.infer<typeof serieHashtagSchema>[],
) {
  for (const item of items) {
    const platformId = resolvePlatform(lookups, item.plataforma);
    const current = existing.find(row => row.platform_id === platformId);
    const hashtags = (item.hashtags ?? current?.hashtags ?? '').trim();
    const legendaAtual = typeof current?.legenda === 'string' && current.legenda.trim() ? current.legenda : null;
    const legenda = item.legenda === undefined ? legendaAtual : item.legenda?.trim() ? item.legenda : null;
    if (!hashtags && !legenda) {
      check('hashtags da série', await session.client.from('serie_plataformas').delete().eq('serie_id', serieId).eq('platform_id', platformId));
      continue;
    }
    const row: Row = {serie_id: serieId, platform_id: platformId, hashtags};
    if (item.legenda !== undefined || legenda !== null) row.legenda = legenda;
    let result = await session.client.from('serie_plataformas').upsert(row, {onConflict: 'serie_id,platform_id'});
    if (result.error && columnAbsence(result.error)?.column === 'legenda') {
      // Igual ao app: a versão da legenda não some calada quando a coluna ainda não existe.
      if (legenda !== null) throw new Error(`Para guardar as versões da legenda por conta, aplique a migração ${MIGRACAO_CONTAS}.`);
      const {legenda: _legenda, ...semLegenda} = row;
      result = await session.client.from('serie_plataformas').upsert(semLegenda, {onConflict: 'serie_id,platform_id'});
    }
    check('hashtags da série', result);
  }
}

async function replaceSeriePilares(session: Session, lookups: Lookups, serieId: string, refs: string[]) {
  const ids = [...new Set(refs.map(ref => resolvePilar(lookups, ref)).filter((id): id is string => Boolean(id)))];
  check('limpar pilares da série', await session.client.from('serie_pilares').delete().eq('serie_id', serieId));
  if (ids.length > 0) {
    check('ligar pilares da série', await session.client.from('serie_pilares').insert(ids.map(pilarId => ({serie_id: serieId, pilar_id: pilarId}))));
  }
  return ids;
}

function idDoPilar(lookups: Lookups, ref: string | null | undefined): string | null {
  if (!ref) return null;
  return resolvePilar(lookups, ref) ?? null;
}

const serieFields = {
  pilares: z.array(z.string()).optional().describe('Nomes ou ids. Substitui a lista inteira'),
  funcao_padrao: z.enum(FUNCOES_SERIE).nullable().optional().describe(
    'Função editorial (antigo funil) herdada pelos roteiros da série: atrair/converter = topo, aprofundar/comunidade = meio, ' +
    'acao = fundo, reter = fora do funil, varia = cada roteiro escolhe. Antes de postar, mudar aqui reclassifica os roteiros que herdam.',
  ),
  frequencia: z.enum(FREQUENCIAS_SERIE).nullable().optional().describe('"Sob demanda" não cobra ritmo'),
  formato_padrao: z.union([z.string(), z.array(z.string())]).nullable().optional().describe(
    `Formatos de publicação da série (um ou vários; lista substitui a anterior, null ou [] limpa). ${FORMATO_DESCRICAO} ` +
    'O conteúdo criado na série herda o primeiro.',
  ),
  formato_apresentacao: z.union([z.string(), z.array(z.string())]).nullable().optional().describe(
    `Um ou vários (lista substitui a anterior). Como a série aparece na tela. Sugestões: ${FORMATOS_APRESENTACAO.join(', ')}. Texto livre também vale.`,
  ),
  energia_padrao: z.enum(['baixa', 'média', 'alta']).nullable().optional().describe('Esforço de produção'),
  motivo_salvar: z.string().nullable().optional().describe('O que faz a pessoa guardar'),
  motivo_enviar: z.string().nullable().optional().describe('O que faz a pessoa enviar'),
  pilar_principal: z.string().nullable().optional().describe(
    'Nome ou id. Se pilares não vier, a série fica ligada só a este pilar.',
  ),
  bordao: z.string().nullable().optional(),
  estrutura_roteiro: z.string().nullable().optional().describe('Passo a passo do roteiro da série (referência, não é colado no roteiro)'),
  notas: z.string().optional(),
  cor: colorSchema.nullable().optional(),
  capa_url: z.string().url().nullable().optional(),
  hashtags: z.array(serieHashtagSchema).optional().describe('Hashtags e versão da legenda por conta; só as redes enviadas mudam'),
  tipo_agrupamento: z.enum(TIPOS_AGRUPAMENTO).optional().describe(
    'familia > serie > quadro. Quadro fica dentro de uma série; série pode ficar dentro de uma família; família não tem pai. ' +
    'Sem tipo, um agrupamento novo dentro de uma série vira quadro (dentro de família, série).',
  ),
  parent_id: z.string().nullable().optional().describe(
    'Nome ou id do agrupamento pai: a série de um quadro, ou a família de uma série. null tira do pai (quadro não pode ficar sem série).',
  ),
  usa_temporadas: z.boolean().optional().describe('Só série. Os quadros dela usam as mesmas temporadas'),
  frequencia_vezes: z.number().int().min(1).max(60).nullable().optional().describe('Meta de episódios por período. null tira a meta'),
  frequencia_unidade: z.enum(UNIDADES_FREQUENCIA).nullable().optional().describe(
    'semana, quinzena (a cada 14 dias, exige frequencia_a_partir_de) ou mes; sob-demanda (ou null) tira a meta. Sem unidade e com vezes, o app usa semana',
  ),
  frequencia_a_partir_de: dateSchema.nullable().optional().describe('Início da meta (AAAA-MM-DD). Só vale com meta; obrigatório na meta a cada 14 dias, onde marca o início do primeiro ciclo'),
  acompanhar_continuidade: z.boolean().optional().describe(
    'Entra na Continuidade da Saúde. Família não entra; sem frequência definida aparece como pendência',
  ),
  legenda_base: z.string().nullable().optional().describe('Legenda base da série, herdada pelos roteiros dela. null limpa'),
  foco_redes: z.array(z.string()).nullable().optional().describe(
    'Redes do quadro. Os episódios novos nascem nelas quando a temporada não escolhe as suas. null ou [] tira o foco. ' +
    'Vale instagram, instagram-video, instagram-carrossel, tiktok, tiktok-video, tiktok-carrossel, youtube, youtube-shorts, blog, outra.',
  ),
};

function serieColumns(args: Partial<Record<keyof typeof serieFields | 'nome' | 'ativa', unknown>>): Row {
  const map: Record<string, string> = {
    nome: 'name', ativa: 'ativa', funcao_padrao: 'funcao_padrao',
    frequencia: 'frequencia_recomendada', formato_padrao: 'formato_visual_padrao',
    formato_apresentacao: 'formato_apresentacao', energia_padrao: 'energia_padrao',
    motivo_salvar: 'motivo_salvar', motivo_enviar: 'motivo_enviar',
    bordao: 'bordao', estrutura_roteiro: 'estrutura_roteiro', notas: 'notes', cor: 'cor', capa_url: 'capa_url',
  };
  const row: Row = {};
  for (const [key, column] of Object.entries(map)) {
    const value = args[key as keyof typeof args];
    if (value === undefined) continue;
    if (column === 'formato_visual_padrao' || column === 'formato_apresentacao') {
      row[column] = listaDeFormatos(value);
      continue;
    }
    row[column] = typeof value === 'string' ? value.trim() || (column === 'notes' ? '' : null) : value;
  }
  return row;
}


type SerieArgs = Partial<Record<keyof typeof serieFields | 'nome', unknown>> & {
  tipo_agrupamento?: TipoAgrupamento;
  parent_id?: string | null;
  usa_temporadas?: boolean;
  frequencia_vezes?: number | null;
  frequencia_unidade?: (typeof UNIDADES_FREQUENCIA)[number] | null;
  frequencia_a_partir_de?: string | null;
  acompanhar_continuidade?: boolean;
  legenda_base?: string | null;
};

/**
 * Tipo, pai, temporadas, frequência, continuidade e legenda da série, com as regras do app
 * (erroDoVinculo, podeTerTemporadas, buildPayload do formulário). Lança erro em texto quando não vale.
 */
function estruturaDaSerie(
  args: SerieArgs,
  id: string,
  atual: Row | null,
  lookups: Lookups,
): {patch: Row; avisos: string[]} {
  const series: SerieNoMcp[] = lookups.series.map(serieDaLinha).filter(item => item.id !== id);
  const patch: Row = {};
  const avisosEstrutura: string[] = [];
  const parentAtual = typeof atual?.parent_id === 'string' && atual.parent_id ? atual.parent_id : null;
  const parentId = args.parent_id === undefined
    ? parentAtual
    : args.parent_id === null || args.parent_id === '' ? null : resolveSerie(lookups, args.parent_id) ?? null;
  const proprio = {...serieDaLinha(atual ?? {id}), parentId};
  const comPropria = [...series, proprio];
  const tipoAtual = atual ? tipoDaSerie(id, [...series, serieDaLinha(atual)]) : null;
  // Tipo gravado vale; sem tipo gravado, mudar o pai usa a sugestão do app (dentro de série = quadro).
  const tipoGravado = atual ? serieDaLinha(atual).tipoAgrupamento : null;
  const tipo: TipoAgrupamento = args.tipo_agrupamento
    ?? tipoGravado
    ?? (args.parent_id !== undefined || !tipoAtual ? tipoSugeridoParaFilho(parentId, comPropria) : tipoAtual);
  const erro = erroDoVinculo(tipo, parentId, id, comPropria);
  if (erro) throw new Error(erro);
  if (args.parent_id !== undefined) patch.parent_id = parentId;
  // Só grava o tipo quando a estrutura muda: criar série solta continua funcionando sem a migração do tipo.
  if (args.tipo_agrupamento !== undefined || args.parent_id !== undefined) patch.tipo_agrupamento = tipo;

  const nome = typeof args.nome === 'string' ? args.nome : atual?.name;
  if (tipo === 'quadro' && parentId && typeof nome === 'string' && nomeDeQuadroRepetido(nome, parentId, series, id)) {
    throw new Error(`Já existe um quadro "${nome.trim()}" nesta série.`);
  }

  const usaAtual = atual?.usa_temporadas === true;
  if (args.usa_temporadas === true && !podeTerTemporadas(tipo)) {
    throw new Error('Só a série tem temporadas; os quadros usam as da série. Ligue usa_temporadas na série.');
  }
  if (args.usa_temporadas !== undefined) patch.usa_temporadas = args.usa_temporadas;
  else if (usaAtual && !podeTerTemporadas(tipo)) patch.usa_temporadas = false;

  const freqAtual = frequenciaDaLinha(atual ?? {});
  const pedidaFreq = {
    vezes: args.frequencia_vezes,
    unidade: args.frequencia_unidade,
    a_partir_de: args.frequencia_a_partir_de,
  };
  if (tipo === 'familia' && (pedidaFreq.vezes != null || (pedidaFreq.unidade && pedidaFreq.unidade !== 'sob-demanda'))) {
    throw new Error('Família não tem frequência; defina na série ou no quadro.');
  }
  const freq = colunasDaFrequencia(pedidaFreq, {
    vezes: freqAtual.vezes,
    unidade: freqAtual.unidade,
    aPartirDe: freqAtual.a_partir_de,
  }, tipo);
  if (freq && 'erro' in freq) throw new Error(freq.erro);
  if (freq) Object.assign(patch, freq.colunas);
  else if (!atual && tipo === 'quadro' && args.frequencia === undefined) patch.frequencia_recomendada = 'Sob demanda';
  else if (tipo === 'familia' && !atual) Object.assign(patch, {frequencia_recomendada: null});

  const acompanhar = args.acompanhar_continuidade ?? acompanhaNoGeralDaLinha(atual);
  const definida = frequenciaDaLinha({...(atual ?? {}), ...patch, ...(args.frequencia !== undefined ? {frequencia_recomendada: args.frequencia} : {})}).definida;
  const continuidade = avisoDaContinuidade(acompanhar, tipo, definida);
  if (continuidade.erro && args.acompanhar_continuidade !== undefined) throw new Error(continuidade.erro);
  if (continuidade.aviso && args.acompanhar_continuidade === true) avisosEstrutura.push(continuidade.aviso);
  if (args.acompanhar_continuidade !== undefined) patch.acompanhar_continuidade = args.acompanhar_continuidade;

  if (args.legenda_base !== undefined) {
    patch.legenda_base = typeof args.legenda_base === 'string' && args.legenda_base.trim() ? args.legenda_base : null;
  }
  if (args.foco_redes !== undefined) patch.foco_redes = focoDaSerie(args.foco_redes);
  return {patch, avisos: avisosEstrutura};
}

/** Colunas que o app não deixa sumir caladas quando a migração falta (saveSerie em database.ts). */
function exigeMigracao(row: Row, column: string | undefined): string | null {
  if (column === 'tipo_agrupamento' && row.tipo_agrupamento != null) return MIGRACAO_SERIE_TIPO;
  if (column === 'acompanhar_continuidade' && row.acompanhar_continuidade === true) return MIGRACAO_SERIE_CONTINUIDADE;
  if (column === 'legenda_base' && row.legenda_base != null) return MIGRACAO_CONTAS;
  if (column === 'parent_id' && row.parent_id != null) return MIGRACAO_SERIE_TIPO;
  if (column === 'foco_redes' && Array.isArray(row.foco_redes) && row.foco_redes.length > 0) return '20261104190000_serie_foco_redes';
  return null;
}

async function gravarSerie(
  label: string,
  payload: Row,
  run: (row: Row) => PromiseLike<{error: {message?: string} | null}>,
): Promise<string[]> {
  return writeCompat(label, payload, async row => {
    const result = await run(row);
    const migracao = result.error ? exigeMigracao(row, columnAbsence(result.error)?.column) : null;
    if (migracao) return {error: {message: `o banco ainda não tem ${columnAbsence(result.error)?.column}. Aplique a migração ${migracao}. Nada foi salvo.`}};
    return result;
  });
}

function estruturaView(row: Row, lookups: Lookups) {
  const series = lookups.series.map(serieDaLinha);
  const id = String(row.id);
  const lista = series.some(item => item.id === id) ? series : [...series, serieDaLinha(row)];
  const freq = frequenciaDaLinha(row);
  return {
    tipo: tipoDaSerie(id, lista),
    pai: row.parent_id ? {id: row.parent_id, nome: lookups.serieName(row.parent_id)} : null,
    quadros: arvore<Row>(id, lista, (filhoId, filhos) => ({id: filhoId, nome: lookups.serieName(filhoId), ...(filhos.length ? {quadros: filhos} : {})})).quadros ?? [],
    usa_temporadas: row.usa_temporadas === true,
    frequencia_detalhada: {vezes: freq.vezes, unidade: freq.unidade, a_partir_de: freq.a_partir_de, resumo: freq.resumo},
    acompanhar_continuidade: acompanhaNoGeralDaLinha(row),
    legenda_base: typeof row.legenda_base === 'string' && row.legenda_base.trim() ? row.legenda_base : null,
  };
}

const percentualSchema = z.number().int().min(0).max(100).optional();

type Proporcao = Partial<Record<(typeof FUNCOES)[number], number>>;

function lerProporcao(value: unknown): Proporcao | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const proporcao: Proporcao = {};
  for (const funcao of FUNCOES) {
    const valor = raw[funcao];
    if (typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 && valor <= 100) proporcao[funcao] = valor;
  }
  return Object.keys(proporcao).length > 0 ? proporcao : null;
}

function somaDe(proporcao: Proporcao | null): number {
  return proporcao ? Object.values(proporcao).reduce((total, valor) => total + (valor ?? 0), 0) : 0;
}

function viewDaProporcao(proporcao: Proporcao | null) {
  if (!proporcao) return {distribuicao: null, soma: 0, por_etapa: null};
  const porEtapa: Record<string, number> = {};
  for (const funcao of FUNCOES) {
    const valor = proporcao[funcao];
    if (valor == null) continue;
    const etapa = FUNIL_DA_FUNCAO[funcao] ?? 'fora';
    porEtapa[etapa] = (porEtapa[etapa] ?? 0) + valor;
  }
  return {distribuicao: proporcao, soma: somaDe(proporcao), por_etapa: porEtapa};
}

/**
 * Proporção fixa por função, em % (`editorial_conta.proporcao_funcoes`). A meta de cada período
 * é proporção × limite; `decisao_periodo.meta_*` é o ajuste daquele período e passa na frente.
 * Sem a migração 20261016220000 a coluna não existe e a leitura devolve null.
 */
export async function distribuicaoView(session: Session) {
  const {data, error} = await session.client.from('editorial_conta')
    .select('proporcao_funcoes')
    .eq('user_id', session.userId)
    .maybeSingle();
  if (error) return {distribuicao: null, soma: 0, por_etapa: null};
  return viewDaProporcao(lerProporcao((data as Row | null)?.proporcao_funcoes));
}

export function registerEditorial(server: McpServer) {
  server.registerTool(
    'definir_distribuicao_funcoes',
    {
      title: 'Definir proporção por função (funil)',
      description:
        'Grava a proporção fixa de cada função editorial, em %, para todos os períodos. ' +
        'A meta de cada período é proporção × limite do período (maior resto, a soma bate com o limite). ' +
        'Um ajuste de meta num período (decisao_periodo) passa na frente da proporção só naquele período. ' +
        'As funções enviadas substituem a proporção inteira; função ausente fica sem proporção. A soma deve ser 100. ' +
        'limpar: true apaga a proporção.',
      inputSchema: {
        atrair: percentualSchema,
        converter: percentualSchema,
        aprofundar: percentualSchema,
        comunidade: percentualSchema,
        acao: percentualSchema,
        reter: percentualSchema,
        limpar: z.boolean().optional(),
      },
    },
    tool(async (args: Record<string, unknown>, session) => {
      const nova = args.limpar === true ? null : lerProporcao(args);
      if (args.limpar !== true && !nova) {
        return json({...(await distribuicaoView(session)), aviso: 'Nenhuma função enviada. Nada foi gravado.'});
      }
      const {error} = await session.client.from('editorial_conta')
        .upsert({user_id: session.userId, proporcao_funcoes: nova, updated_at: nowIso()}, {onConflict: 'user_id'});
      if (error) {
        if (/proporcao_funcoes/.test(error.message ?? '')) {
          throw new Error('A proporção ainda não pode ser salva: aplique a migração 20261016220000_editorial_proporcao_funcoes.');
        }
        throw new Error(`proporção por função: ${error.message}`);
      }
      const soma = somaDe(nova);
      return json({
        ...viewDaProporcao(nova),
        ...(nova && soma !== 100 ? {aviso: `A soma está em ${soma}%. As metas são repartidas sobre esse total; o ideal é fechar em 100.`} : {}),
      });
    }),
  );

  server.registerTool(
    'criar_pilar',
    {
      title: 'Criar pilar',
      description:
        'Cria um pilar (tema). Pilar não tem frequência nem meta própria: as metas vêm do limite semanal e da proporção por função, e o ritmo das séries vem da frequência de cada série.',
      inputSchema: {
        nome: z.string().min(1),
        descricao: z.string().optional(),
        cor: colorSchema.optional(),
        plataformas: z.array(pilarPlataformaSchema).optional(),
      },
    },
    tool(async (args, session) => {
      const lookups = await loadLookups(session);
      if (lookups.pilares.some(p => p.nome.trim().toLowerCase() === args.nome.trim().toLowerCase())) {
        throw new Error(`Já existe um pilar chamado "${args.nome}". Use atualizar_pilar.`);
      }
      const id = newId();
      check('criar pilar', await session.client.from('pilares').insert({
        id,
        user_id: session.userId,
        nome: args.nome.trim(),
        descricao: args.descricao?.trim() ?? '',
        cor: args.cor ?? '#888888',
        ativo: true,
      }));
      if (args.plataformas?.length) await mergePilarPlataformas(session, lookups, id, [], args.plataformas);
      invalidateLookups();
      return json(pilarView(await fetchPilar(session, id), await loadLookups(session)));
    }),
  );

  server.registerTool(
    'atualizar_pilar',
    {
      title: 'Atualizar pilar',
      description:
        'Edita um pilar. Só os campos enviados mudam. ativo=false desliga o pilar (sai das regras e seletores; conteúdos ligados continuam). ' +
        'Em plataformas, só as redes enviadas mudam, e dentro de cada rede só os campos enviados.',
      inputSchema: {
        pilar: z.string().describe('Nome ou id do pilar'),
        nome: z.string().min(1).optional(),
        descricao: z.string().optional(),
        cor: colorSchema.optional(),
        ativo: z.boolean().optional(),
        plataformas: z.array(pilarPlataformaSchema).optional(),
      },
    },
    tool(async (args, session) => {
      const lookups = await loadLookups(session);
      const id = resolvePilar(lookups, args.pilar);
      if (!id) throw new Error('Informe o pilar.');
      const current = await fetchPilar(session, id);
      const patch: Row = {};
      if (args.nome !== undefined) patch.nome = args.nome.trim();
      if (args.descricao !== undefined) patch.descricao = args.descricao.trim();
      if (args.cor !== undefined) patch.cor = args.cor;
      if (args.ativo !== undefined) patch.ativo = args.ativo;

      if (Object.keys(patch).length > 0) {
        check('atualizar pilar', await session.client.from('pilares').update({...patch, updated_at: nowIso()})
          .eq('id', id).eq('user_id', session.userId));
      }
      if (args.plataformas?.length) await mergePilarPlataformas(session, lookups, id, current.pilar_plataformas ?? [], args.plataformas);
      invalidateLookups();
      return json(pilarView(await fetchPilar(session, id), await loadLookups(session)));
    }),
  );

  server.registerTool(
    'criar_serie',
    {
      title: 'Criar série',
      description:
        'Cria uma série (formato recorrente). Formato, apresentação, motivos e energia padrão descrevem a série; ' +
        'formato e energia são copiados para os roteiros criados por ela. Bordão e estrutura do roteiro ficam só como referência. ' +
        'pilar_principal é o pilar que o app mostra; sem a lista pilares, a série fica ligada só a ele. ' +
        'Para criar um quadro, envie parent_id com a série (o tipo vira quadro); para uma família, tipo_agrupamento=familia. ' +
        'Frequência detalhada: frequencia_vezes + frequencia_unidade (semana, quinzena = a cada 14 dias, mes, sob-demanda) + frequencia_a_partir_de (obrigatória na quinzena). ' +
        'usa_temporadas liga as temporadas (só série); legenda_base e hashtags[].legenda guardam a legenda da série e a versão por conta.',
      inputSchema: {nome: z.string().min(1), ...serieFields},
    },
    tool(async (args, session) => {
      const lookups = await loadLookups(session);
      const id = newId();
      const estrutura = estruturaDaSerie(args, id, null, lookups);
      // Quadro com o mesmo nome de outro agrupamento vale (o app só barra entre quadros da mesma série).
      if (estrutura.patch.tipo_agrupamento !== 'quadro'
        && lookups.series.some(s => s.name.trim().toLowerCase() === args.nome.trim().toLowerCase())) {
        throw new Error(`Já existe uma série chamada "${args.nome}". Use atualizar_serie.`);
      }
      const row = {...serieColumns(args), ...estrutura.patch};
      // Quadro sem cor própria usa a da série, como o formulário do app.
      if (row.tipo_agrupamento === 'quadro' && args.cor === undefined && row.parent_id) {
        const pai = lookups.series.find(item => item.id === row.parent_id);
        if (pai?.cor) row.cor = pai.cor;
      }
      if (args.pilar_principal !== undefined) row.pilar_principal_id = idDoPilar(lookups, args.pilar_principal);
      else if (args.pilares?.length) row.pilar_principal_id = idDoPilar(lookups, args.pilares[0]);
      const ignorados = await gravarSerie('criar série', {
        template: '',
        notes: '',
        ...row,
        id,
        user_id: session.userId,
        ativa: true,
      }, payload => session.client.from('series').insert(payload));
      if (args.acompanhar_continuidade !== undefined) await sincronizarAcompanhamentoGeral(session, id, args.acompanhar_continuidade);
      if (args.pilar_principal !== undefined && args.pilares === undefined) {
        const principal = idDoPilar(lookups, args.pilar_principal);
        await replaceSeriePilares(session, lookups, id, principal ? [principal] : []);
      } else if (args.pilares !== undefined) {
        await replaceSeriePilares(session, lookups, id, args.pilares);
      }
      if (args.hashtags?.length) await mergeSerieHashtags(session, lookups, id, [], args.hashtags);
      invalidateLookups();
      return json({
        ...serieView(await fetchSerie(session, id), await loadLookups(session)),
        ...avisos(ignorados),
        ...(estrutura.avisos.length ? {avisos_estrutura: estrutura.avisos} : {}),
      });
    }),
  );

  server.registerTool(
    'atualizar_serie',
    {
      title: 'Atualizar série',
      description:
        'Edita uma série. Só os campos enviados mudam; null limpa. ativa=false desliga a série (conteúdos ligados continuam). ' +
        'pilares substitui a lista e, se pilar_principal não vier, o primeiro vira o principal. ' +
        'pilar_principal sem pilares deixa a série ligada só a esse pilar. hashtags muda só as redes enviadas (hashtags e legenda por conta). ' +
        'parent_id muda o pai (quadro dentro de série, série dentro de família), sem ciclo. ' +
        'Frequência: frequencia_vezes/frequencia_unidade/frequencia_a_partir_de; frequencia_unidade=sob-demanda tira a meta. ' +
        'Não apaga série nem conteúdos; para mover episódios use mover_episodios.',
      inputSchema: {
        serie: z.string().describe('Nome ou id da série'),
        nome: z.string().min(1).optional(),
        ativa: z.boolean().optional(),
        ...serieFields,
      },
    },
    tool(async (args, session) => {
      const lookups = await loadLookups(session);
      const id = resolveSerie(lookups, args.serie);
      if (!id) throw new Error('Informe a série.');
      const atual = await fetchSerie(session, id);
      const estrutura = estruturaDaSerie(args, id, atual, lookups);
      const patch = {...serieColumns(args), ...estrutura.patch};
      if (args.pilar_principal !== undefined) patch.pilar_principal_id = idDoPilar(lookups, args.pilar_principal);
      else if (args.pilares !== undefined) patch.pilar_principal_id = idDoPilar(lookups, args.pilares[0]);
      let ignorados: string[] = [];
      if (Object.keys(patch).length > 0) {
        ignorados = await gravarSerie('atualizar série', {...patch, updated_at: nowIso()}, row =>
          session.client.from('series').update(row).eq('id', id).eq('user_id', session.userId));
      }
      if (args.acompanhar_continuidade !== undefined) await sincronizarAcompanhamentoGeral(session, id, args.acompanhar_continuidade);
      if (args.pilar_principal !== undefined && args.pilares === undefined) {
        const principal = idDoPilar(lookups, args.pilar_principal);
        await replaceSeriePilares(session, lookups, id, principal ? [principal] : []);
      } else if (args.pilares !== undefined) {
        await replaceSeriePilares(session, lookups, id, args.pilares);
      }
      if (args.hashtags?.length) await mergeSerieHashtags(session, lookups, id, atual.serie_plataformas ?? [], args.hashtags);
      invalidateLookups();
      return json({
        ...serieView(await fetchSerie(session, id), await loadLookups(session)),
        ...avisos(ignorados),
        ...(estrutura.avisos.length ? {avisos_estrutura: estrutura.avisos} : {}),
      });
    }),
  );
}
