import { dataCache } from './dataCache.ts';
import { getCachedPlatforms } from './platformsCache.ts';
import { supabase } from './supabase.ts';
import { normalizeContentStatus } from '../features/contents/lib/contentPipeline';
import { hydrateIdeasFromDemotedContents } from '../features/ideas/lib/hydrateIdeasFromDemotedContents';
import { getIdeaNotes, normalizeIdea } from '../features/ideas/lib/ideaText';

// ============================================================================
// TYPES
// ============================================================================

export interface Platform {
  id: string;
  userId: string | null;
  nome: string;
  ativo: boolean;
  createdAt: string;
}

export interface DnaVoz {
  id: string;
  userId: string;
  promessaCentral: string;
  publico: string;
  tom: string;
  naoFaco: string[];
  alertas: string[];
  updatedAt: string;
}

export interface PilarPlataforma {
  pilarId: string;
  platformId: string;
  hashtags: string;
  /** 0 = domingo … 6 = sábado. Vazio = todos os dias. */
  melhoresDias: Array<0 | 1 | 2 | 3 | 4 | 5 | 6>;
  janelaHorarioInicio: string | null;
  janelaHorarioFim: string | null;
}

export interface Pilar {
  id: string;
  userId: string;
  nome: string;
  descricao: string;
  cor: string;
  ativo: boolean;
  frequenciaSemanal: number | null;
  metaCiclo: number | null;
  createdAt: string;
  updatedAt: string;
  plataformas: PilarPlataforma[];
}

export interface SeriePlataforma {
  serieId: string;
  platformId: string;
  hashtags: string;
}

export interface Serie {
  id: string;
  userId: string;
  name: string;
  template: string;
  notes: string;
  slotPadrao: string | null;
  formatoVisualPadrao: string | null;
  estruturaRoteiro: string | null;
  bordao: string | null;
  cor: string | null;
  ativa: boolean;
  frequenciaRecomendada: string | null;
  createdAt: string;
  updatedAt: string;
  pilarIds: string[];
  plataformas: SeriePlataforma[];
}

export interface Cenario {
  id: string;
  userId: string;
  nome: string;
  descricao: string;
  tempoSetupMinutos: number;
  ativo: boolean;
  createdAt: string;
}

export interface Look {
  id: string;
  userId: string;
  numero: number;
  descricao: string;
  cenarioId: string | null;
  ativo: boolean;
  createdAt: string;
}

export interface BibliotecaGenero {
  id: string;
  userId: string;
  nome: string;
  tipo: string | null;
  createdAt: string;
}

export interface Anotacao {
  id: string;
  userId: string;
  itemId: string;
  texto: string;
  tipo: 'Anotação' | 'Trecho' | 'Reação' | 'Análise' | 'Ideia de conteúdo' | 'Pergunta';
  capituloRef: string | null;
  contentPotential: boolean;
  destilada?: boolean;
  createdAt: string;
  deletedAt: string | null;
}

export interface BibliotecaItem {
  id: string;
  userId: string;
  tipo: 'livro' | 'filme' | 'série' | 'anime' | 'manga' | 'outro';
  titulo: string;
  autorDiretor: string;
  capaUrl: string | null;
  status:
    | 'Quero consumir'
    | 'Consumindo'
    | 'Pausado'
    | 'Concluído'
    | 'Quero ler'
    | 'Lendo'
    | 'Lido'
    | 'Abandonado'
    | 'Quero ver'
    | 'Assistindo'
    | 'Assistido';
  dataInicio: string | null;
  dataFim: string | null;
  avaliacao: number | null;
  notasGerais: string | null;
  potencialConteudo: number | null;
  totalPaginas: number | null;
  paginasLidas: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  generoIds: string[];
  anotacoes: Anotacao[];
}

export interface BibliotecaItemMeta {
  editora?: string;
  anoPublicacao?: string;
  isbn?: string;
  idioma?: string;
  traducao?: string;
  serieColecao?: string;
  colecaoStatus?: 'sim' | 'nao';
  colecaoNome?: string;
  generoAutor?: string;
  paisAutor?: string;
  racaAutor?: string;
  duracao?: string;
  episodios?: string;
  duracaoPorEpisodio?: string;
  roteirista?: string;
  distribuidora?: string;
  plataforma?: string;
  dataLancamento?: string;
  paisOrigem?: string;
  fazParteDeSerie?: 'sim' | 'nao';
  nomeDaSerie?: string;
  tagsPersonalizadas?: string[];
  quemIndicou?: string;
  motivoEscolha?: string;
  capitulosCobertos?: string[];
}

export interface ScriptNote {
  id: string;
  text: string;
  selection: { from: number; to: number };
  comment: string;
  color: string;
  createdAt: string;
}

export type PublicationKind = 'post' | 'repost';

export interface ContentPlataforma {
  id: string;
  contentId: string;
  platformId: string;
  legenda: string;
  hashtags: string;
  publishDate: string | null;
  publishTime?: string | null;
  publishDateEnabled?: boolean;
  /** post = publicação original, repost = republicação */
  publicationKind?: PublicationKind;
}

export interface Content {
  id: string;
  userId: string;
  title: string;
  status: string;
  classificacao?: string | null;
  slotType: 'ÚNICO' | 'SÉRIE' | 'JANELA' | null;
  seriesId: string | null;
  pilarId: string | null;
  lookId: string | null;
  cenarioId: string | null;
  bibliotecaItemId: string | null;
  formatoVisual: string | null;
  energiaNecessaria: 'baixa' | 'média' | 'alta' | null;
  publishDate: string | null;
  publishTime?: string | null;
  recordingDate: string | null;
  recordedAt?: string | null;
  postedAt?: string | null;
  publishDateEnabled?: boolean;
  recordingDateEnabled?: boolean;
  link: string | null;
  script: string | null;
  scriptNotes: ScriptNote[];
  tags: string[];
  notes: string | null;
  referencias: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  plataformas: ContentPlataforma[];
}

export interface Idea {
  id: string;
  userId: string;
  title: string | null;
  notes: string | null;
  text: string;
  pilarId: string | null;
  seriesId: string | null;
  origemId: string | null;
  promotedToContentId: string | null;
  demotedFromContentId: string | null;
  archived: boolean;
  createdAt: string;
}

export interface ProjetoEtapa {
  id: string;
  projetoId: string;
  nome: string;
  ordem: number;
  status: 'pendente' | 'em_andamento' | 'concluída';
  dataPrazo: string | null;
  createdAt: string;
}

export interface Projeto {
  id: string;
  userId: string;
  nome: string;
  tipo: 'campanha' | 'publi' | 'producao' | 'outro';
  status: string;
  dataInicio: string | null;
  dataFim: string | null;
  metaConteudos: number | null;
  bibliotecaItemId: string | null;
  brand: string | null;
  brandColor: string | null;
  color: string | null;
  value: number | null;
  currency: string;
  driveUrl: string | null;
  shareToken: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  etapas: ProjetoEtapa[];
  contentIds: string[];
}

export function normalizeProjetoTipo(tipo: Projeto['tipo'] | string): Projeto['tipo'] {
  return tipo === 'campanha' ? 'publi' : (tipo as Projeto['tipo']);
}

export interface RecordingBlockContent {
  blockId: string;
  contentId: string;
  ordem: number;
  gravado: boolean;
}

export interface RecordingBlock {
  id: string;
  userId: string;
  name: string;
  lookLabel?: string | null;
  cenarioLabel?: string | null;
  productionNotes?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  contents: RecordingBlockContent[];
}

export interface TemplateBloco {
  id: string;
  tipo: 'fixo' | 'variavel';
  label: string;
  conteudo: string;
  placeholder: string;
}

export interface Template {
  id: string;
  userId: string;
  nome: string;
  type?: 'roteiro' | 'legenda' | 'outro';
  platformId: string | null;
  seriesId: string | null;
  estrutura: TemplateBloco[];
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgendaItem {
  id: string;
  userId: string;
  title: string;
  date: string;
  time: string | null;
  tipo: 'Reunião' | 'Entrega' | 'Publicação' | 'Outro';
  projetoId: string | null;
  createdAt: string;
}

export interface GoldenRule {
  id: string;
  userId: string;
  descricao: string;
  titulo?: string | null;
  cor?: string | null;
  tipo: 'pilar' | 'série' | 'formato' | 'publi' | 'plataforma';
  condicao: 'recomendado' | 'impedir';
  periodo: 'semana' | 'quinzena' | 'mensal';
  valor: number;
  minimo?: number | null;
  maximo?: number | null;
  ativa: boolean;
  createdAt: string;
}

export interface ContentMetric {
  id: string;
  userId: string;
  contentId: string;
  platformId: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  reposts: number | null;
  newFollowers: number | null;
  accountsReached: number | null;
  watchTime: number | null;
  retentionRate: number | null;
  completionRate: number | null;
  qualitativeNotes: string | null;
  registeredAt: string;
  createdAt: string;
}

export interface PostingTimeEntry {
  id: string;
  userId: string;
  /** null = horário global (fallback para todas as plataformas) */
  platformId: string | null;
  /** 0 = domingo … 6 = sábado */
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** Formato "HH:MM" */
  time: string;
  createdAt: string;
}

export interface AppData {
  platforms: Platform[];
  preferences: Record<string, any>;
  dnaVoz: DnaVoz | null;
  pilares: Pilar[];
  series: Serie[];
  cenarios: Cenario[];
  looks: Look[];
  bibliotecaGeneros: BibliotecaGenero[];
  bibliotecaItems: BibliotecaItem[];
  contents: Content[];
  ideas: Idea[];
  projetos: Projeto[];
  recordingBlocks: RecordingBlock[];
  templates: Template[];
  agendaItems: AgendaItem[];
  goldenRules: GoldenRule[];
  contentMetrics: ContentMetric[];
  postingTimeEntries: PostingTimeEntry[];
}

export type AppDataDomain =
  | 'bootstrap'
  | 'content'
  | 'content-schedule'
  | 'content-summary'
  | 'library-generos'
  | 'ideas'
  | 'library'
  | 'projects'
  | 'recording'
  | 'templates'
  | 'agenda'
  | 'analytics'
  | 'rules'
  | 'voice'
  | 'production'
  | 'schedule';

/** Carregado logo após login — cobre dashboard e navegação inicial sem segunda rodada. */
export const BOOTSTRAP_DATA_DOMAINS: AppDataDomain[] = [
  'bootstrap',
  'production',
  'content-summary',
  'ideas',
  'projects',
  'agenda',
  'rules',
];

// ============================================================================
// HELPERS
// ============================================================================

function empty(): AppData {
  return {
    platforms: [], preferences: {}, dnaVoz: null, pilares: [], series: [],
    cenarios: [], looks: [], bibliotecaGeneros: [], bibliotecaItems: [],
    contents: [], ideas: [], projetos: [], recordingBlocks: [], templates: [],
    agendaItems: [], goldenRules: [], contentMetrics: [], postingTimeEntries: [],
  };
}

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
}

// ============================================================================
// MAPPERS (DB row → app type)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

function parsePreferenceValue(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function serializePreferenceValue(value: unknown) {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function assertQuerySuccess<T>(label: string, result: { data: T; error: { message?: string } | null }): T {
  if (result.error) {
    throw new Error(`${label}: ${result.error.message || 'unknown database error'}`);
  }
  return result.data;
}

function looksLikeUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizePlatformRef(platformId: string, platformNameById: Map<string, string>) {
  return platformNameById.get(platformId) || platformId;
}

function isMissingPublishTimeColumn(error: {message?: string} | null | undefined) {
  return !!error?.message?.includes("'publish_time' column");
}

function isMissingPublicationKindColumn(error: {message?: string} | null | undefined) {
  return !!error?.message?.includes('publication_kind');
}

function isMissingMilestoneColumn(error: {message?: string} | null | undefined) {
  return !!error?.message?.includes("'recorded_at'") || !!error?.message?.includes("'posted_at'");
}

const mp = {
  platform: (r: Row): Platform => ({
    id: r.id, userId: r.user_id, nome: r.nome, ativo: r.ativo, createdAt: r.created_at,
  }),
  dnaVoz: (r: Row): DnaVoz => ({
    id: r.id, userId: r.user_id,
    promessaCentral: r.promessa_central || '', publico: r.publico || '', tom: r.tom || '',
    naoFaco: r.nao_faco || [], alertas: r.alertas || [], updatedAt: r.updated_at,
  }),
  pilar: (r: Row): Pilar => ({
    id: r.id, userId: r.user_id, nome: r.nome, descricao: r.descricao || '',
    cor: r.cor, ativo: r.ativo,
    frequenciaSemanal: r.frequencia_semanal ?? null,
    metaCiclo: r.meta_ciclo ?? null,
    createdAt: r.created_at, updatedAt: r.updated_at,
    plataformas: (r.pilar_plataformas || []).map((p: Row) => ({
      pilarId: p.pilar_id, platformId: p.platform_id, hashtags: p.hashtags || '',
      melhoresDias: Array.isArray(p.melhores_dias)
        ? p.melhores_dias.filter((day: number) => day >= 0 && day <= 6)
        : [],
      janelaHorarioInicio: p.janela_inicio ?? null,
      janelaHorarioFim: p.janela_fim ?? null,
    })),
  }),
  serie: (r: Row): Serie => ({
    id: r.id, userId: r.user_id, name: r.name, template: r.template || '',
    notes: r.notes || '', slotPadrao: r.slot_padrao, formatoVisualPadrao: r.formato_visual_padrao,
    estruturaRoteiro: r.estrutura_roteiro, bordao: r.bordao, cor: r.cor,
    ativa: r.ativa ?? true, frequenciaRecomendada: r.frequencia_recomendada,
    createdAt: r.created_at, updatedAt: r.updated_at,
    pilarIds: (r.serie_pilares || []).map((sp: Row) => sp.pilar_id),
    plataformas: (r.serie_plataformas || []).map((sp: Row) => ({
      serieId: sp.serie_id, platformId: sp.platform_id, hashtags: sp.hashtags || '',
    })),
  }),
  cenario: (r: Row): Cenario => ({
    id: r.id, userId: r.user_id, nome: r.nome, descricao: r.descricao || '',
    tempoSetupMinutos: r.tempo_setup_minutos ?? 0, ativo: r.ativo, createdAt: r.created_at,
  }),
  look: (r: Row): Look => ({
    id: r.id, userId: r.user_id, numero: r.numero, descricao: r.descricao || '',
    cenarioId: r.cenario_id, ativo: r.ativo, createdAt: r.created_at,
  }),
  genero: (r: Row): BibliotecaGenero => ({
    id: r.id, userId: r.user_id, nome: r.nome, tipo: r.tipo, createdAt: r.created_at,
  }),
  anotacao: (r: Row): Anotacao => ({
    id: r.id, userId: r.user_id, itemId: r.item_id, texto: r.texto, tipo: r.tipo,
    capituloRef: r.capitulo_ref, contentPotential: r.content_potential ?? false,
    destilada: r.destilada ?? false,
    createdAt: r.created_at, deletedAt: r.deleted_at,
  }),
  bibliotecaItem: (r: Row): BibliotecaItem => ({
    id: r.id, userId: r.user_id, tipo: r.tipo, titulo: r.titulo,
    autorDiretor: r.autor_diretor || '', capaUrl: r.capa_url, status: r.status,
    dataInicio: r.data_inicio, dataFim: r.data_fim, avaliacao: r.avaliacao,
    notasGerais: r.notas_gerais, potencialConteudo: r.potencial_conteudo,
    totalPaginas: r.total_paginas, paginasLidas: r.paginas_lidas,
    createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at,
    generoIds: (r.item_generos || []).map((g: Row) => g.biblioteca_generos?.nome || g.genero_id),
    anotacoes: (r.anotacoes || []).filter((a: Row) => !a.deleted_at).map(mp.anotacao),
  }),
  content: (r: Row): Content => ({
    id: r.id, userId: r.user_id, title: r.title, status: normalizeContentStatus(r.status),
    classificacao: r.classificacao,
    slotType: r.slot_type, seriesId: r.series_id, pilarId: r.pilar_id,
    lookId: r.look_id, cenarioId: r.cenario_id, bibliotecaItemId: r.biblioteca_item_id,
    formatoVisual: r.formato_visual, energiaNecessaria: r.energia_necessaria,
    publishDate: r.publish_date, publishTime: r.publish_time, recordingDate: r.recording_date,
    recordedAt: r.recorded_at ?? null, postedAt: r.posted_at ?? null,
    link: r.link,
    publishDateEnabled: r.publish_date_enabled ?? (r.publish_date != null),
    recordingDateEnabled: r.recording_date_enabled ?? (r.recording_date != null),
    script: r.script, scriptNotes: r.script_notes || [], tags: r.tags || [],
    notes: r.notes, referencias: r.referencias,
    createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at,
    plataformas: (r.content_plataformas || []).map((p: Row) => ({
      id: p.id, contentId: p.content_id, platformId: p.platform_id,
      legenda: p.legenda || '', hashtags: p.hashtags || '', publishDate: p.publish_date,
      publishTime: p.publish_time,
      publishDateEnabled: p.publish_date_enabled ?? (p.publish_date != null),
      publicationKind: p.publication_kind === 'repost' ? 'repost' : 'post',
    })),
  }),
  idea: (r: Row): Idea => normalizeIdea({
    id: r.id,
    userId: r.user_id,
    title: r.title ?? null,
    notes: r.notes ?? null,
    text: r.text,
    pilarId: r.pilar_id,
    seriesId: r.series_id, origemId: r.origem_id,
    promotedToContentId: r.promoted_to_content_id,
    demotedFromContentId: r.demoted_from_content_id ?? null,
    archived: r.archived,
    createdAt: r.created_at,
  }),
  projeto: (r: Row): Projeto => ({
    id: r.id, userId: r.user_id, nome: r.nome, tipo: normalizeProjetoTipo(r.tipo), status: r.status,
    dataInicio: r.data_inicio, dataFim: r.data_fim, metaConteudos: r.meta_conteudos,
    bibliotecaItemId: r.biblioteca_item_id, brand: r.brand, brandColor: r.brand_color,
    color: r.color || null, value: r.value, currency: r.currency || 'BRL',
    driveUrl: r.drive_url || null, shareToken: r.share_token || null, notes: r.notes,
    createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at,
    etapas: (r.projeto_etapas || []).map((e: Row) => ({
      id: e.id, projetoId: e.projeto_id, nome: e.nome, ordem: e.ordem,
      status: e.status, dataPrazo: e.data_prazo, createdAt: e.created_at,
    })),
    contentIds: (r.projeto_conteudos || []).map((pc: Row) => pc.content_id),
  }),
  recordingBlock: (r: Row): RecordingBlock => ({
    id: r.id, userId: r.user_id, name: r.name,
    lookLabel: r.look_label, cenarioLabel: r.cenario_label,
    productionNotes: r.production_notes, metadata: r.metadata || {},
    createdAt: r.created_at,
    contents: (r.recording_block_contents || []).map((c: Row) => ({
      blockId: c.block_id, contentId: c.content_id, ordem: c.ordem, gravado: c.gravado,
    })),
  }),
  template: (r: Row): Template => ({
    id: r.id, userId: r.user_id, nome: r.nome, platformId: r.platform_id,
    type: r.type || 'roteiro', seriesId: r.series_id, estrutura: r.estrutura || [], ativo: r.ativo,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }),
  agendaItem: (r: Row): AgendaItem => ({
    id: r.id, userId: r.user_id, title: r.title, date: r.date, time: r.time,
    tipo: r.tipo, projetoId: r.projeto_id, createdAt: r.created_at,
  }),
  goldenRule: (r: Row): GoldenRule => ({
    id: r.id, userId: r.user_id, descricao: r.descricao, titulo: r.titulo, cor: r.cor,
    tipo: r.tipo, condicao: r.condicao, periodo: r.periodo, valor: r.valor,
    minimo: r.minimo, maximo: r.maximo, ativa: r.ativa,
    createdAt: r.created_at,
  }),
  contentMetric: (r: Row): ContentMetric => ({
    id: r.id, userId: r.user_id, contentId: r.content_id, platformId: r.platform_id,
    views: r.views, likes: r.likes, comments: r.comments, saves: r.saves,
    shares: r.shares, reposts: r.reposts, newFollowers: r.new_followers,
    accountsReached: r.accounts_reached, watchTime: r.watch_time,
    retentionRate: r.retention_rate, completionRate: r.completion_rate,
    qualitativeNotes: r.qualitative_notes, registeredAt: r.registered_at,
    createdAt: r.created_at,
  }),
  postingTimeEntry: (r: Row): PostingTimeEntry => ({
    id: r.id, userId: r.user_id, platformId: r.platform_id ?? null,
    weekday: r.weekday as PostingTimeEntry['weekday'], time: r.time, createdAt: r.created_at,
  }),
};

function mapContentWithPlatforms(row: Row, platformNameById: Map<string, string>): Content {
  return {
    ...mp.content(row),
    plataformas: (row.content_plataformas || []).map((p: Row) => ({
      id: p.id,
      contentId: p.content_id,
      platformId: normalizePlatformRef(p.platform_id, platformNameById),
      legenda: p.legenda || '',
      hashtags: p.hashtags || '',
      publishDate: p.publish_date,
      publishTime: p.publish_time,
      publishDateEnabled: p.publish_date_enabled ?? (p.publish_date != null),
      publicationKind: p.publication_kind === 'repost' ? 'repost' : 'post',
    })),
  };
}

const POSTED_CONTENT_STATUS = 'Postado';
const CONTENT_SUMMARY_LIMIT = 80;

/** Colunas leves para grade, calendário e filas — sem roteiro. */
const CONTENT_SCHEDULE_SELECT_COLUMNS = [
  'id',
  'user_id',
  'title',
  'status',
  'slot_type',
  'series_id',
  'pilar_id',
  'look_id',
  'cenario_id',
  'biblioteca_item_id',
  'formato_visual',
  'energia_necessaria',
  'publish_date',
  'publish_time',
  'publish_date_enabled',
  'recording_date',
  'link',
  'tags',
  'created_at',
  'updated_at',
  'deleted_at',
  'content_plataformas(id, content_id, platform_id, legenda, hashtags, publish_date, publish_time, publish_date_enabled, publication_kind)',
] as const;

const CONTENT_SCHEDULE_MILESTONE_COLUMNS = ['recorded_at', 'posted_at'] as const;

function buildContentScheduleSelect(includeMilestones: boolean): string {
  const columns = includeMilestones
    ? [
        ...CONTENT_SCHEDULE_SELECT_COLUMNS.slice(0, 15),
        ...CONTENT_SCHEDULE_MILESTONE_COLUMNS,
        ...CONTENT_SCHEDULE_SELECT_COLUMNS.slice(15),
      ]
    : [...CONTENT_SCHEDULE_SELECT_COLUMNS];
  return columns.join(', ');
}

const CONTENT_SCHEDULE_SELECT = buildContentScheduleSelect(true);
const CONTENT_SCHEDULE_SELECT_WITHOUT_MILESTONES = buildContentScheduleSelect(false);

type SupabaseListResult<T> = { data: T; error: { message?: string } | null; count?: number | null };

async function runContentScheduleSelect<T>(
  label: string,
  run: (select: string) => Promise<SupabaseListResult<T>>,
): Promise<SupabaseListResult<T>> {
  const result = await run(CONTENT_SCHEDULE_SELECT);
  if (!result.error || !isMissingMilestoneColumn(result.error)) return result;
  return run(CONTENT_SCHEDULE_SELECT_WITHOUT_MILESTONES);
}
const CONTENT_LIST_SORT_COLUMNS: Record<string, string> = {
  createdAt: 'created_at',
  title: 'title',
  status: 'status',
  updatedAt: 'updated_at',
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
};

export type ContentsListQuery = {
  page: number;
  pageSize: number;
  listMode: 'editorial' | 'published';
  status?: string;
  seriesId?: string;
  pilarId?: string;
  search?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
};

export type BibliotecaListQuery = {
  page: number;
  pageSize: number;
  tipo?: string;
  status?: string;
  genero?: string;
  search?: string;
  sortValue?: string;
};

export async function fetchContentsPage(
  userId: string,
  query: ContentsListQuery,
): Promise<PaginatedResult<Content>> {
  if (!supabase) return { items: [], total: 0 };

  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;
  const sortColumn = CONTENT_LIST_SORT_COLUMNS[query.sortField || 'createdAt'] || 'created_at';
  const ascending = query.sortDirection === 'asc';

  const buildPageRequest = (select: string) => {
    let pageRequest = supabase
      .from('contents')
      .select(select, { count: 'exact' })
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (query.listMode === 'published') {
      pageRequest = pageRequest.eq('status', POSTED_CONTENT_STATUS);
    } else {
      pageRequest = pageRequest.neq('status', POSTED_CONTENT_STATUS);
    }

    if (query.status && query.status !== 'Todos') {
      pageRequest = pageRequest.eq('status', query.status);
    }

    if (query.seriesId && query.seriesId !== 'Todas') {
      pageRequest = pageRequest.eq('series_id', query.seriesId);
    }

    if (query.pilarId && query.pilarId !== 'Todos') {
      pageRequest = pageRequest.eq('pilar_id', query.pilarId);
    }

    const normalizedSearch = query.search?.trim();
    if (normalizedSearch) {
      pageRequest = pageRequest.or(`title.ilike.%${normalizedSearch}%,notes.ilike.%${normalizedSearch}%`);
    }

    return pageRequest.order(sortColumn, { ascending }).range(from, to);
  };

  const result = await runContentScheduleSelect('contents page fetch', buildPageRequest);

  const platforms = await getCachedPlatforms(userId, async () =>
    assertQuerySuccess(
      'platforms fetch',
      await supabase.from('platforms').select('*').or(`user_id.is.null,user_id.eq.${userId}`),
    ) || [],
  );
  const platformNameById = new Map(platforms.map((platform: Row) => [platform.id, platform.nome]));
  const rows = assertQuerySuccess('contents page fetch', result) || [];

  return {
    items: rows.map((row: Row) => mapContentWithPlatforms(row, platformNameById)),
    total: result.count ?? rows.length,
  };
}

export async function fetchContentsByIds(
  userId: string,
  ids: readonly string[],
  options?: {includeDeleted?: boolean},
): Promise<Content[]> {
  if (!supabase || ids.length === 0) return [];

  const uniqueIds = [...new Set(ids)];
  let contentsQuery = supabase
    .from('contents')
    .select('*, content_plataformas(*)')
    .eq('user_id', userId)
    .in('id', uniqueIds);

  if (!options?.includeDeleted) {
    contentsQuery = contentsQuery.is('deleted_at', null);
  }

  const [platforms, contentsResult] = await Promise.all([
    getCachedPlatforms(userId, async () =>
      assertQuerySuccess(
        'platforms fetch',
        await supabase.from('platforms').select('*').or(`user_id.is.null,user_id.eq.${userId}`),
      ) || [],
    ),
    contentsQuery,
  ]);

  const platformNameById = new Map(platforms.map((platform: Row) => [platform.id, platform.nome]));
  const rows = assertQuerySuccess('contents by ids fetch', contentsResult) || [];

  return rows.map((row: Row) => mapContentWithPlatforms(row, platformNameById));
}

export async function fetchContentStatusCounts(
  userId: string,
  query: Pick<ContentsListQuery, 'listMode' | 'seriesId' | 'pilarId' | 'search'>,
): Promise<Record<string, number>> {
  if (!supabase) return { Todos: 0 };

  const cacheKey = `stats:content-status-counts:${userId}:${JSON.stringify(query)}`;
  if (dataCache.isValueFresh(cacheKey)) {
    const cached = dataCache.getValue<Record<string, number>>(cacheKey);
    if (cached) return cached;
  }

  const { data, error } = await supabase.rpc('get_content_status_counts', {
    p_list_mode: query.listMode,
    p_series_id: query.seriesId && query.seriesId !== 'Todas' ? query.seriesId : null,
    p_pilar_id: query.pilarId && query.pilarId !== 'Todos' ? query.pilarId : null,
    p_search: query.search?.trim() || null,
  });

  if (error || !data || typeof data !== 'object') return { Todos: 0 };

  const counts = data as Record<string, number>;
  dataCache.setValue(cacheKey, counts);
  return counts;
}

export async function fetchContentStats(userId: string): Promise<{ editorialCount: number; postedCount: number; libraryCount: number }> {
  if (!supabase) return { editorialCount: 0, postedCount: 0, libraryCount: 0 };

  const [editorialResult, postedResult, libraryResult] = await Promise.all([
    supabase
      .from('contents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .neq('status', POSTED_CONTENT_STATUS),
    supabase
      .from('contents')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null)
      .eq('status', POSTED_CONTENT_STATUS),
    supabase
      .from('biblioteca_items')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null),
  ]);

  if (editorialResult.error) throw new Error(`editorial count: ${editorialResult.error.message}`);
  if (postedResult.error) throw new Error(`posted count: ${postedResult.error.message}`);
  if (libraryResult.error) throw new Error(`library count: ${libraryResult.error.message}`);

  return {
    editorialCount: editorialResult.count ?? 0,
    postedCount: postedResult.count ?? 0,
    libraryCount: libraryResult.count ?? 0,
  };
}

export async function fetchBibliotecaPage(
  userId: string,
  query: BibliotecaListQuery,
): Promise<PaginatedResult<BibliotecaItem>> {
  if (!supabase) return { items: [], total: 0 };

  const from = (query.page - 1) * query.pageSize;
  const to = from + query.pageSize - 1;
  const generoFilter = Boolean(query.genero && query.genero !== 'Todos');

  let request = supabase
    .from('biblioteca_items')
    .select(
      generoFilter
        ? '*, item_generos!inner(genero_id, biblioteca_generos!inner(nome))'
        : '*, item_generos(genero_id, biblioteca_generos(nome))',
      { count: 'exact' },
    )
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (query.tipo && query.tipo !== 'Todos') {
    request = request.eq('tipo', query.tipo);
  }

  if (query.status && query.status !== 'Todos') {
    request = request.eq('status', query.status);
  }

  if (generoFilter) {
    request = request.eq('item_generos.biblioteca_generos.nome', query.genero);
  }

  const normalizedSearch = query.search?.trim();
  if (normalizedSearch) {
    request = request.or(`titulo.ilike.%${normalizedSearch}%,autor_diretor.ilike.%${normalizedSearch}%`);
  }

  switch (query.sortValue) {
    case 'titulo:asc':
      request = request.order('titulo', { ascending: true });
      break;
    case 'autor:asc':
      request = request.order('autor_diretor', { ascending: true });
      break;
    case 'status:asc':
      request = request.order('status', { ascending: true });
      break;
    case 'recentes':
    default:
      request = request.order('updated_at', { ascending: false });
      break;
  }

  const result = await request.range(from, to);
  const rows = assertQuerySuccess('biblioteca page fetch', result) || [];

  return {
    items: rows.map((row: Row) => mp.bibliotecaItem({ ...row, anotacoes: [] })),
    total: result.count ?? rows.length,
  };
}

export async function fetchBibliotecaContentCounts(userId: string): Promise<Map<string, number>> {
  if (!supabase) return new Map();

  const cacheKey = `stats:biblioteca-content-counts:${userId}`;
  if (dataCache.isValueFresh(cacheKey)) {
    const cached = dataCache.getValue<Map<string, number>>(cacheKey);
    if (cached) return cached;
  }

  const rows = assertQuerySuccess(
    'biblioteca content counts fetch',
    await supabase
      .from('contents')
      .select('biblioteca_item_id')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .not('biblioteca_item_id', 'is', null),
  ) || [];

  const counts = new Map<string, number>();
  for (const row of rows as Row[]) {
    const itemId = row.biblioteca_item_id as string;
    counts.set(itemId, (counts.get(itemId) || 0) + 1);
  }

  dataCache.setValue(cacheKey, counts);
  return counts;
}

export async function fetchBibliotecaItemById(userId: string, itemId: string): Promise<BibliotecaItem | null> {
  if (!supabase) return null;

  const row = assertQuerySuccess(
    'biblioteca item fetch',
    await supabase
      .from('biblioteca_items')
      .select('*, item_generos(genero_id, biblioteca_generos(nome)), anotacoes(*)')
      .eq('user_id', userId)
      .eq('id', itemId)
      .is('deleted_at', null)
      .maybeSingle(),
  );

  return row ? mp.bibliotecaItem(row) : null;
}

// ============================================================================
// FETCH
// ============================================================================

export async function fetchAllData(): Promise<AppData> {
  return {
    ...empty(),
    ...(await fetchDataDomains([
      'bootstrap',
      'content',
      'ideas',
      'library',
      'projects',
      'recording',
      'templates',
      'agenda',
      'analytics',
      'rules',
      'voice',
      'production',
    ])),
  };
}

export async function fetchDataDomains(
  domains: readonly AppDataDomain[],
  userId?: string | null,
): Promise<Partial<AppData>> {
  if (!supabase) return empty();
  const uid = userId ?? (await currentUserId());
  if (!uid) return empty();
  const requested = new Set(domains);
  const payload: Partial<AppData> = {};

  const needsPlatforms =
    requested.has('bootstrap') ||
    requested.has('production') ||
    requested.has('content') ||
    requested.has('content-schedule') ||
    requested.has('content-summary') ||
    requested.has('analytics');

  const platformsPromise = needsPlatforms
    ? supabase.from('platforms').select('*').or(`user_id.is.null,user_id.eq.${uid}`)
    : null;

  const platformNameByIdPromise = platformsPromise
    ? platformsPromise.then(result => {
      const platforms = assertQuerySuccess('platforms fetch', result) || [];
      return new Map(platforms.map((platform: Row) => [platform.id, platform.nome]));
    })
    : Promise.resolve(new Map<string, string>());

  const tasks: Promise<void>[] = [];

  if (requested.has('bootstrap')) {
    tasks.push((async () => {
      const [platformsResult, prefsResult] = await Promise.all([
        platformsPromise!,
        supabase.from('user_preferences').select('*').eq('user_id', uid),
      ]);
      const platforms = assertQuerySuccess('platforms fetch', platformsResult) || [];
      const prefs = assertQuerySuccess('preferences fetch', prefsResult) || [];
      payload.platforms = platforms.map(mp.platform);
      payload.preferences = prefs.reduce(
        (acc: Record<string, unknown>, p: Row) => ({ ...acc, [p.key]: parsePreferenceValue(p.value) }),
        {},
      );
    })());
  }

  if (requested.has('voice')) {
    tasks.push((async () => {
      const dnaVozRow = assertQuerySuccess(
        'dna_voz fetch',
        await supabase.from('dna_voz').select('*').eq('user_id', uid).maybeSingle(),
      );
      payload.dnaVoz = dnaVozRow ? mp.dnaVoz(dnaVozRow) : null;
    })());
  }

  if (requested.has('production')) {
    tasks.push((async () => {
      const platformNameById = await platformNameByIdPromise;
      const [pilaresResult, seriesResult, cenariosResult, looksResult] = await Promise.all([
        supabase.from('pilares').select('*, pilar_plataformas(*)').eq('user_id', uid).is('deleted_at', null),
        supabase.from('series').select('*, serie_pilares(pilar_id), serie_plataformas(*)').eq('user_id', uid).is('deleted_at', null),
        supabase.from('cenarios').select('*').eq('user_id', uid).is('deleted_at', null),
        supabase.from('looks').select('*').eq('user_id', uid).is('deleted_at', null).order('numero'),
      ]);
      const pilaresRows = assertQuerySuccess('pilares fetch', pilaresResult) || [];
      const seriesRows = assertQuerySuccess('series fetch', seriesResult) || [];
      payload.pilares = pilaresRows.map((row: Row) => ({
        ...mp.pilar(row),
        plataformas: (row.pilar_plataformas || []).map((p: Row) => ({
          pilarId: p.pilar_id,
          platformId: normalizePlatformRef(p.platform_id, platformNameById),
          hashtags: p.hashtags || '',
          melhoresDias: Array.isArray(p.melhores_dias)
            ? p.melhores_dias.filter((day: number) => day >= 0 && day <= 6)
            : [],
          janelaHorarioInicio: p.janela_inicio ?? null,
          janelaHorarioFim: p.janela_fim ?? null,
        })),
      }));
      payload.series = seriesRows.map((row: Row) => ({
        ...mp.serie(row),
        plataformas: (row.serie_plataformas || []).map((p: Row) => ({
          serieId: p.serie_id,
          platformId: normalizePlatformRef(p.platform_id, platformNameById),
          hashtags: p.hashtags || '',
        })),
      }));
      payload.cenarios = (assertQuerySuccess('cenarios fetch', cenariosResult) || []).map(mp.cenario);
      payload.looks = (assertQuerySuccess('looks fetch', looksResult) || []).map(mp.look);
    })());
  }

  if (requested.has('library') || requested.has('library-generos')) {
    tasks.push((async () => {
      const generosResult = await supabase.from('biblioteca_generos').select('*').eq('user_id', uid).order('nome');
      payload.bibliotecaGeneros = (assertQuerySuccess('biblioteca_generos fetch', generosResult) || []).map(mp.genero);

      if (!requested.has('library')) return;

      const bibliotecaResult = await supabase.from('biblioteca_items')
        .select('*, item_generos(genero_id, biblioteca_generos(nome)), anotacoes(*)')
        .eq('user_id', uid).is('deleted_at', null)
        .order('created_at', { ascending: false });
      payload.bibliotecaItems = (assertQuerySuccess('biblioteca_items fetch', bibliotecaResult) || []).map(mp.bibliotecaItem);
    })());
  }

  if (requested.has('content') || requested.has('content-summary') || requested.has('content-schedule')) {
    tasks.push((async () => {
      const platformNameById = await platformNameByIdPromise;
      const lightOnly = requested.has('content-schedule') && !requested.has('content') && !requested.has('content-summary');

      const buildDomainContentsRequest = (select: string) => {
        let domainQuery = supabase.from('contents')
          .select(select)
          .eq('user_id', uid)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (requested.has('content-summary') && !requested.has('content')) {
          domainQuery = domainQuery.limit(CONTENT_SUMMARY_LIMIT);
        }

        return domainQuery;
      };

      const contentsResult = lightOnly
        ? await runContentScheduleSelect('contents fetch', buildDomainContentsRequest)
        : await buildDomainContentsRequest('*, content_plataformas(*)');
      const contentsRows = assertQuerySuccess('contents fetch', contentsResult) || [];
      payload.contents = contentsRows.map((row: Row) => mapContentWithPlatforms(row, platformNameById));
    })());
  }

  if (requested.has('ideas')) {
    tasks.push((async () => {
      const ideas = (assertQuerySuccess(
        'ideas fetch',
        await supabase.from('ideas').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      ) || []).map(mp.idea);

      const demotedContentIds = ideas
        .filter(idea => idea.demotedFromContentId && !getIdeaNotes(idea).trim())
        .map(idea => idea.demotedFromContentId as string);

      if (demotedContentIds.length === 0) {
        payload.ideas = ideas;
        return;
      }

      const demotedContents = await fetchContentsByIds(uid, demotedContentIds, {includeDeleted: true});
      payload.ideas = hydrateIdeasFromDemotedContents(ideas, demotedContents);
    })());
  }

  if (requested.has('projects')) {
    tasks.push((async () => {
      payload.projetos = (assertQuerySuccess(
        'projetos fetch',
        await supabase.from('projetos')
          .select('*, projeto_etapas(*), projeto_conteudos(content_id)')
          .eq('user_id', uid).is('deleted_at', null)
          .order('created_at', { ascending: false }),
      ) || []).map(mp.projeto);
    })());
  }

  if (requested.has('recording')) {
    tasks.push((async () => {
      payload.recordingBlocks = (assertQuerySuccess(
        'recording_blocks fetch',
        await supabase.from('recording_blocks')
          .select('*, recording_block_contents(*)')
          .eq('user_id', uid)
          .order('created_at', { ascending: false }),
      ) || []).map(mp.recordingBlock);
    })());
  }

  if (requested.has('templates')) {
    tasks.push((async () => {
      payload.templates = (assertQuerySuccess(
        'templates fetch',
        await supabase.from('templates').select('*').eq('user_id', uid),
      ) || []).map(mp.template);
    })());
  }

  if (requested.has('agenda')) {
    tasks.push((async () => {
      payload.agendaItems = (assertQuerySuccess(
        'agenda_items fetch',
        await supabase.from('agenda_items').select('*').eq('user_id', uid).order('date'),
      ) || []).map(mp.agendaItem);
    })());
  }

  if (requested.has('rules')) {
    tasks.push((async () => {
      payload.goldenRules = (assertQuerySuccess(
        'golden_rules fetch',
        await supabase.from('golden_rules').select('*').eq('user_id', uid),
      ) || []).map(mp.goldenRule);
    })());
  }

  if (requested.has('analytics')) {
    tasks.push((async () => {
      const platformNameById = await platformNameByIdPromise;
      payload.contentMetrics = (assertQuerySuccess(
        'content_metrics fetch',
        await supabase.from('content_metrics').select('*').eq('user_id', uid),
      ) || []).map((row: Row) => ({
        ...mp.contentMetric(row),
        platformId: normalizePlatformRef(row.platform_id, platformNameById),
      }));
    })());
  }

  if (requested.has('schedule')) {
    tasks.push((async () => {
      payload.postingTimeEntries = (assertQuerySuccess(
        'posting_times fetch',
        await supabase
          .from('posting_times')
          .select('*')
          .eq('user_id', uid)
          .order('weekday')
          .order('time'),
      ) || []).map(mp.postingTimeEntry);
    })());
  }

  await Promise.all(tasks);
  return payload;
}

async function resolvePlatformIds(platformRefs: string[]): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  const refs = [...new Set(platformRefs.filter(Boolean))];
  if (!supabase || refs.length === 0) return resolved;

  refs.forEach(ref => {
    if (looksLikeUuid(ref)) resolved.set(ref, ref);
  });

  const unresolvedRefs = refs.filter(ref => !resolved.has(ref));
  if (unresolvedRefs.length === 0) return resolved;

  const uid = await currentUserId();
  const query = supabase.from('platforms').select('id, nome').in('nome', unresolvedRefs);
  const scopedQuery = uid ? query.or(`user_id.is.null,user_id.eq.${uid}`) : query.is('user_id', null);
  const { data, error } = await scopedQuery;
  if (error) throw new Error(`platforms resolve: ${error.message}`);

  (data || []).forEach((platform: Row) => resolved.set(platform.nome, platform.id));
  return resolved;
}

// ============================================================================
// PREFERENCES
// ============================================================================

export async function savePreference(key: string, value: any): Promise<void> {
  if (!supabase) return;
  const uid = await currentUserId();
  if (!uid) return;
  const { error } = await supabase.from('user_preferences')
    .upsert({ user_id: uid, key, value: serializePreferenceValue(value) }, { onConflict: 'user_id,key' });
  if (error) throw new Error(`preferences: ${error.message}`);
}

export async function savePlatform(platform: Omit<Platform, 'createdAt'>): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado');
  const uid = platform.userId ?? (await currentUserId());
  if (!uid) throw new Error('Usuário não autenticado');
  const { error } = await supabase.from('platforms').upsert(
    {
      id: platform.id,
      user_id: uid,
      nome: platform.nome,
      ativo: platform.ativo,
    },
    { onConflict: 'id' },
  );
  if (error) throw new Error(`platforms: ${error.message}`);
}

export async function deletePlatform(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado');
  const { error } = await supabase.from('platforms').delete().eq('id', id);
  if (error) throw new Error(`delete platform: ${error.message}`);
}

// ============================================================================
// DNA DA VOZ
// ============================================================================

export async function saveDnaVoz(
  dna: Pick<DnaVoz, 'promessaCentral' | 'publico' | 'tom' | 'naoFaco' | 'alertas'>,
  userId?: string
): Promise<void> {
  if (!supabase) return;
  const uid = userId ?? await currentUserId();
  if (!uid) return;
  const { error } = await supabase.from('dna_voz').upsert({
    user_id: uid,
    promessa_central: dna.promessaCentral,
    publico: dna.publico,
    tom: dna.tom,
    nao_faco: dna.naoFaco,
    alertas: dna.alertas,
  }, { onConflict: 'user_id' });
  if (error) throw new Error(`dna_voz: ${error.message}`);
}

// ============================================================================
// PILARES
// ============================================================================

export async function savePilar(pilar: Omit<Pilar, 'plataformas' | 'createdAt' | 'updatedAt'>): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('pilares').upsert({
    id: pilar.id, user_id: pilar.userId, nome: pilar.nome,
    descricao: pilar.descricao, cor: pilar.cor, ativo: pilar.ativo,
    frequencia_semanal: pilar.frequenciaSemanal,
    meta_ciclo: pilar.metaCiclo,
  });
  if (error) throw new Error(`pilares: ${error.message}`);
}

export async function savePilarPlataformas(pilarId: string, plataformas: PilarPlataforma[]): Promise<void> {
  if (!supabase) return;
  const { error: deleteError } = await supabase.from('pilar_plataformas').delete().eq('pilar_id', pilarId);
  if (deleteError) throw new Error(`pilar_plataformas delete: ${deleteError.message}`);
  if (plataformas.length === 0) return;
  const platformIds = await resolvePlatformIds(plataformas.map(p => p.platformId));
  const { error } = await supabase.from('pilar_plataformas').insert(
    plataformas
      .map(p => ({
        pilar_id: pilarId,
        platform_id: platformIds.get(p.platformId),
        hashtags: p.hashtags,
        melhores_dias: p.melhoresDias.length > 0 ? p.melhoresDias : null,
        janela_inicio: p.janelaHorarioInicio,
        janela_fim: p.janelaHorarioFim,
      }))
      .filter((row): row is {
        pilar_id: string;
        platform_id: string;
        hashtags: string;
        melhores_dias: number[] | null;
        janela_inicio: string | null;
        janela_fim: string | null;
      } => !!row.platform_id)
  );
  if (error) throw new Error(`pilar_plataformas: ${error.message}`);
}

export async function clearPilarReferences(pilarId: string): Promise<void> {
  if (!supabase) return;
  const { error: contentsError } = await supabase
    .from('contents')
    .update({ pilar_id: null })
    .eq('pilar_id', pilarId);
  if (contentsError) throw new Error(`clear pilar contents: ${contentsError.message}`);

  const { error: ideasError } = await supabase
    .from('ideas')
    .update({ pilar_id: null })
    .eq('pilar_id', pilarId);
  if (ideasError) throw new Error(`clear pilar ideas: ${ideasError.message}`);
}

export async function deletePilar(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('pilares').delete().eq('id', id);
  if (error) throw new Error(`delete pilar: ${error.message}`);
}

// ============================================================================
// SÉRIES
// ============================================================================

export async function saveSerie(serie: Omit<Serie, 'pilarIds' | 'plataformas' | 'createdAt' | 'updatedAt'>): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('series').upsert({
    id: serie.id, user_id: serie.userId, name: serie.name, template: serie.template,
    notes: serie.notes, slot_padrao: serie.slotPadrao, formato_visual_padrao: serie.formatoVisualPadrao,
    estrutura_roteiro: serie.estruturaRoteiro, bordao: serie.bordao, cor: serie.cor,
    ativa: serie.ativa, frequencia_recomendada: serie.frequenciaRecomendada,
  });
  if (error) throw new Error(`series: ${error.message}`);
}

export async function saveSeriePilares(serieId: string, pilarIds: string[]): Promise<void> {
  if (!supabase) return;
  const { error: deleteError } = await supabase.from('serie_pilares').delete().eq('serie_id', serieId);
  if (deleteError) throw new Error(`serie_pilares delete: ${deleteError.message}`);
  if (pilarIds.length === 0) return;
  const { error } = await supabase.from('serie_pilares').insert(
    pilarIds.map(pid => ({ serie_id: serieId, pilar_id: pid }))
  );
  if (error) throw new Error(`serie_pilares: ${error.message}`);
}

export async function saveSeriePlataformas(serieId: string, plataformas: SeriePlataforma[]): Promise<void> {
  if (!supabase) return;
  const { error: deleteError } = await supabase.from('serie_plataformas').delete().eq('serie_id', serieId);
  if (deleteError) throw new Error(`serie_plataformas delete: ${deleteError.message}`);
  if (plataformas.length === 0) return;
  const platformIds = await resolvePlatformIds(plataformas.map(plataforma => plataforma.platformId));
  const { error } = await supabase.from('serie_plataformas').insert(
    plataformas.map(plataforma => ({
      serie_id: serieId,
      platform_id: platformIds.get(plataforma.platformId),
      hashtags: plataforma.hashtags,
    })).filter((row): row is { serie_id: string; platform_id: string; hashtags: string } => !!row.platform_id)
  );
  if (error) throw new Error(`serie_plataformas: ${error.message}`);
}

export async function deleteSerie(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('series').delete().eq('id', id);
  if (error) throw new Error(`delete serie: ${error.message}`);
}

// ============================================================================
// CENÁRIOS
// ============================================================================

export async function saveCenario(cenario: Omit<Cenario, 'createdAt'>): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('cenarios').upsert({
    id: cenario.id, user_id: cenario.userId, nome: cenario.nome,
    descricao: cenario.descricao, tempo_setup_minutos: cenario.tempoSetupMinutos, ativo: cenario.ativo,
  });
  if (error) throw new Error(`cenarios: ${error.message}`);
}

export async function deleteCenario(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('cenarios').delete().eq('id', id);
  if (error) throw new Error(`delete cenario: ${error.message}`);
}

// ============================================================================
// LOOKS
// ============================================================================

export async function saveLook(look: Omit<Look, 'createdAt'>): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('looks').upsert({
    id: look.id, user_id: look.userId, numero: look.numero,
    descricao: look.descricao, cenario_id: look.cenarioId, ativo: look.ativo,
  });
  if (error) throw new Error(`looks: ${error.message}`);
}

export async function deleteLook(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('looks').delete().eq('id', id);
  if (error) throw new Error(`delete look: ${error.message}`);
}

// ============================================================================
// BIBLIOTECA
// ============================================================================

export async function saveBibliotecaItem(
  item: Omit<BibliotecaItem, 'anotacoes' | 'generoIds' | 'createdAt' | 'updatedAt' | 'deletedAt'>
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('biblioteca_items').upsert({
    id: item.id, user_id: item.userId, tipo: item.tipo, titulo: item.titulo,
    autor_diretor: item.autorDiretor, capa_url: item.capaUrl, status: item.status,
    data_inicio: item.dataInicio, data_fim: item.dataFim, avaliacao: item.avaliacao,
    notas_gerais: item.notasGerais, potencial_conteudo: item.potencialConteudo,
    total_paginas: item.totalPaginas, paginas_lidas: item.paginasLidas,
  });
  if (error) throw new Error(`biblioteca_items: ${error.message}`);
}

export async function saveItemGeneros(itemId: string, generoIds: string[]): Promise<void> {
  if (!supabase) return;
  const uid = await currentUserId();
  if (!uid) return;

  await supabase.from('item_generos').delete().eq('item_id', itemId);
  if (generoIds.length === 0) return;

  const { data: existingGeneros, error: fetchError } = await supabase
    .from('biblioteca_generos')
    .select('id, nome')
    .eq('user_id', uid)
    .in('nome', generoIds);
  if (fetchError) throw new Error(`biblioteca_generos fetch: ${fetchError.message}`);

  const existingByName = new Map((existingGeneros || []).map((genero: Row) => [genero.nome, genero.id]));
  const missingNames = generoIds.filter(nome => !existingByName.has(nome));

  if (missingNames.length > 0) {
    const { data: insertedGeneros, error: insertGeneroError } = await supabase
      .from('biblioteca_generos')
      .insert(missingNames.map(nome => ({ user_id: uid, nome, tipo: null })))
      .select('id, nome');
    if (insertGeneroError) throw new Error(`biblioteca_generos insert: ${insertGeneroError.message}`);
    (insertedGeneros || []).forEach((genero: Row) => existingByName.set(genero.nome, genero.id));
  }

  const { error } = await supabase.from('item_generos').insert(
    generoIds
      .map(nome => existingByName.get(nome))
      .filter((generoId): generoId is string => !!generoId)
      .map(generoId => ({ item_id: itemId, genero_id: generoId }))
  );
  if (error) throw new Error(`item_generos: ${error.message}`);
}

export async function deleteBibliotecaItem(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('biblioteca_items')
    .delete().eq('id', id);
  if (error) throw new Error(`delete biblioteca_item: ${error.message}`);
}

export async function saveAnotacao(anotacao: Omit<Anotacao, 'createdAt' | 'deletedAt'>): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('anotacoes').upsert({
    id: anotacao.id, user_id: anotacao.userId, item_id: anotacao.itemId,
    texto: anotacao.texto, tipo: anotacao.tipo, capitulo_ref: anotacao.capituloRef,
    content_potential: anotacao.contentPotential,
    destilada: anotacao.destilada ?? false,
  });
  if (error) throw new Error(`anotacoes: ${error.message}`);
}

export async function deleteAnotacao(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('anotacoes')
    .delete().eq('id', id);
  if (error) throw new Error(`delete anotacao: ${error.message}`);
}

// ============================================================================
// CONTEÚDOS
// ============================================================================

export async function saveContent(
  content: Omit<Content, 'plataformas' | 'updatedAt' | 'deletedAt'>
): Promise<void> {
  if (!supabase) return;
  const row = {
    id: content.id, user_id: content.userId, title: content.title,
    status: content.status, classificacao: content.classificacao,
    slot_type: content.slotType, series_id: content.seriesId,
    pilar_id: content.pilarId, look_id: content.lookId, cenario_id: content.cenarioId,
    biblioteca_item_id: content.bibliotecaItemId, formato_visual: content.formatoVisual,
    energia_necessaria: content.energiaNecessaria, publish_date: content.publishDate,
    publish_time: content.publishTime,
    publish_date_enabled: content.publishDateEnabled ?? (content.publishDate != null),
    recording_date: content.recordingDate,
    recorded_at: content.recordedAt,
    posted_at: content.postedAt,
    recording_date_enabled: content.recordingDateEnabled ?? (content.recordingDate != null),
    link: content.link, script: content.script,
    script_notes: content.scriptNotes, tags: content.tags,
    notes: content.notes, referencias: content.referencias,
  };
  const { error } = await supabase.from('contents').upsert(row);
  if (isMissingMilestoneColumn(error)) {
    const {recorded_at: _recordedAt, posted_at: _postedAt, ...rowWithoutMilestones} = row;
    const retry = await supabase.from('contents').upsert(rowWithoutMilestones);
    if (retry.error && isMissingPublishTimeColumn(retry.error)) {
      const {publish_time: _publishTime, ...rowWithoutPublishTime} = rowWithoutMilestones;
      const retryPublish = await supabase.from('contents').upsert(rowWithoutPublishTime);
      if (retryPublish.error) throw new Error(`contents: ${retryPublish.error.message}`);
      return;
    }
    if (retry.error) throw new Error(`contents: ${retry.error.message}`);
    return;
  }
  if (isMissingPublishTimeColumn(error)) {
    const { publish_time: _publishTime, ...rowWithoutPublishTime } = row;
    const retry = await supabase.from('contents').upsert(rowWithoutPublishTime);
    if (retry.error) throw new Error(`contents: ${retry.error.message}`);
    return;
  }
  if (error) throw new Error(`contents: ${error.message}`);
}

export async function saveContentPlataformas(
  contentId: string,
  plataformas: Omit<ContentPlataforma, 'id' | 'contentId'>[]
): Promise<void> {
  if (!supabase) return;
  const { error: deleteError } = await supabase.from('content_plataformas').delete().eq('content_id', contentId);
  if (deleteError) throw new Error(`content_plataformas delete: ${deleteError.message}`);
  if (plataformas.length === 0) return;
  const platformIds = await resolvePlatformIds(plataformas.map(p => p.platformId));
  const rows = plataformas.map(p => ({
      content_id: contentId, platform_id: platformIds.get(p.platformId),
      legenda: p.legenda, hashtags: p.hashtags, publish_date: p.publishDate,
      publish_time: p.publishTime,
      publish_date_enabled: p.publishDateEnabled ?? (p.publishDate != null),
      publication_kind: p.publicationKind ?? 'post',
    })).filter((row): row is {
      content_id: string;
      platform_id: string;
      legenda: string;
      hashtags: string;
      publish_date: string | null;
      publish_time: string | null | undefined;
      publish_date_enabled: boolean;
      publication_kind: string;
    } => !!row.platform_id);

  const insertRows = async (payload: typeof rows) => {
    const { error } = await supabase.from('content_plataformas').insert(payload);
    return error;
  };

  let error = await insertRows(rows);
  if (isMissingPublicationKindColumn(error)) {
    const rowsWithoutKind = rows.map(({publication_kind: _publicationKind, ...row}) => row);
    error = await insertRows(rowsWithoutKind as typeof rows);
  }
  if (isMissingPublishTimeColumn(error)) {
    const rowsWithoutPublishTime = rows.map(({publish_time: _publishTime, publication_kind: _publicationKind, ...row}) => row);
    error = await insertRows(rowsWithoutPublishTime as typeof rows);
    if (isMissingPublicationKindColumn(error)) {
      error = await insertRows(rowsWithoutPublishTime.map(({publication_kind: _k, ...row}) => row) as typeof rows);
    }
  }
  if (error) throw new Error(`content_plataformas: ${error.message}`);
}

export async function deleteContent(id: string): Promise<void> {
  if (!supabase) return;
  const deletedAt = new Date().toISOString();
  const { error } = await supabase.from('contents')
    .update({deleted_at: deletedAt})
    .eq('id', id)
    .is('deleted_at', null);
  if (error) throw new Error(`delete content: ${error.message}`);
}

// ============================================================================
// IDEIAS
// ============================================================================

export async function saveIdea(idea: Omit<Idea, 'createdAt'>): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('ideas').upsert({
    id: idea.id,
    user_id: idea.userId,
    title: idea.title,
    notes: idea.notes,
    text: idea.text,
    pilar_id: idea.pilarId,
    series_id: idea.seriesId, origem_id: idea.origemId,
    promoted_to_content_id: idea.promotedToContentId,
    demoted_from_content_id: idea.demotedFromContentId,
    archived: idea.archived,
  });
  if (error) throw new Error(`ideas: ${error.message}`);
}

export async function deleteIdea(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('ideas').delete().eq('id', id);
  if (error) throw new Error(`delete idea: ${error.message}`);
}

// ============================================================================
// PROJETOS
// ============================================================================

export async function saveProjeto(
  projeto: Omit<Projeto, 'etapas' | 'contentIds' | 'updatedAt' | 'deletedAt'>
): Promise<void> {
  if (!supabase) return;
  const uid = await currentUserId();
  if (!uid) {
    throw new Error('projetos: authenticated session unavailable');
  }
  const { error } = await supabase.from('projetos').upsert({
    id: projeto.id, user_id: uid, nome: projeto.nome, tipo: normalizeProjetoTipo(projeto.tipo),
    status: projeto.status, data_inicio: projeto.dataInicio, data_fim: projeto.dataFim,
    meta_conteudos: projeto.metaConteudos, biblioteca_item_id: projeto.bibliotecaItemId,
    brand: projeto.brand, brand_color: projeto.brandColor, color: projeto.color,
    drive_url: projeto.driveUrl, value: projeto.value, currency: projeto.currency, notes: projeto.notes,
  });
  if (error) throw new Error(`projetos: ${error.message}`);
}

export async function saveProjetoEtapa(etapa: Omit<ProjetoEtapa, 'createdAt'>): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('projeto_etapas').upsert({
    id: etapa.id,
    projeto_id: etapa.projetoId,
    nome: etapa.nome,
    ordem: etapa.ordem,
    status: etapa.status,
    data_prazo: etapa.dataPrazo,
  });
  if (error) throw new Error(`projeto_etapas: ${error.message}`);
}

export async function saveProjetoEtapas(etapas: Omit<ProjetoEtapa, 'createdAt'>[]): Promise<void> {
  if (!supabase || etapas.length === 0) return;
  const rows = etapas.map(etapa => ({
    id: etapa.id,
    projeto_id: etapa.projetoId,
    nome: etapa.nome,
    ordem: etapa.ordem,
    status: etapa.status,
    data_prazo: etapa.dataPrazo,
  }));
  const { error } = await supabase.from('projeto_etapas').upsert(rows);
  if (error) throw new Error(`projeto_etapas bulk: ${error.message}`);
}

export async function deleteProjetoEtapa(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('projeto_etapas').delete().eq('id', id);
  if (error) throw new Error(`delete projeto_etapa: ${error.message}`);
}

export async function saveProjetoConteudos(projetoId: string, contentIds: string[]): Promise<void> {
  if (!supabase) return;
  await supabase.from('projeto_conteudos').delete().eq('projeto_id', projetoId);
  if (contentIds.length === 0) return;
  const { error } = await supabase.from('projeto_conteudos').insert(
    contentIds.map(contentId => ({ projeto_id: projetoId, content_id: contentId }))
  );
  if (error) throw new Error(`projeto_conteudos: ${error.message}`);
}

export async function deleteProjeto(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('projetos')
    .delete().eq('id', id);
  if (error) throw new Error(`delete projeto: ${error.message}`);
}

// ============================================================================
// GRAVAÇÃO
// ============================================================================

export async function saveRecordingBlock(block: Omit<RecordingBlock, 'contents' | 'createdAt'>): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('recording_blocks').upsert({
    id: block.id, user_id: block.userId, name: block.name,
    look_label: block.lookLabel, cenario_label: block.cenarioLabel,
    production_notes: block.productionNotes, metadata: block.metadata || {},
  });
  if (error) throw new Error(`recording_blocks: ${error.message}`);
}

export async function saveRecordingBlockContents(blockId: string, contents: RecordingBlockContent[]): Promise<void> {
  if (!supabase) return;
  await supabase.from('recording_block_contents').delete().eq('block_id', blockId);
  if (contents.length === 0) return;
  const { error } = await supabase.from('recording_block_contents').insert(
    contents.map(c => ({
      block_id: blockId, content_id: c.contentId, ordem: c.ordem, gravado: c.gravado,
    }))
  );
  if (error) throw new Error(`recording_block_contents: ${error.message}`);
}

export async function deleteRecordingBlock(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('recording_blocks').delete().eq('id', id);
  if (error) throw new Error(`delete recording_block: ${error.message}`);
}

// ============================================================================
// TEMPLATES
// ============================================================================

export async function saveTemplate(template: Omit<Template, 'createdAt' | 'updatedAt'>): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('templates').upsert({
    id: template.id, user_id: template.userId, nome: template.nome,
    platform_id: template.platformId, series_id: template.seriesId,
    type: template.type || 'roteiro', estrutura: template.estrutura, ativo: template.ativo,
  });
  if (error) throw new Error(`templates: ${error.message}`);
}

export async function deleteTemplate(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('templates').delete().eq('id', id);
  if (error) throw new Error(`delete template: ${error.message}`);
}

// ============================================================================
// AGENDA
// ============================================================================

export async function saveAgendaItem(item: Omit<AgendaItem, 'createdAt'>): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('agenda_items').upsert({
    id: item.id, user_id: item.userId, title: item.title, date: item.date,
    time: item.time, tipo: item.tipo, projeto_id: item.projetoId,
  });
  if (error) throw new Error(`agenda_items: ${error.message}`);
}

export async function deleteAgendaItem(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('agenda_items').delete().eq('id', id);
  if (error) throw new Error(`delete agenda_item: ${error.message}`);
}

// ============================================================================
// REGRAS DE OURO
// ============================================================================

export async function saveGoldenRule(rule: Omit<GoldenRule, 'createdAt'>): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('golden_rules').upsert({
    id: rule.id, user_id: rule.userId, descricao: rule.descricao, titulo: rule.titulo,
    cor: rule.cor, tipo: rule.tipo, condicao: rule.condicao, periodo: rule.periodo,
    valor: rule.valor, minimo: rule.minimo, maximo: rule.maximo, ativa: rule.ativa,
  });
  if (error) throw new Error(`golden_rules: ${error.message}`);
}

export async function deleteGoldenRule(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('golden_rules').delete().eq('id', id);
  if (error) throw new Error(`delete golden_rule: ${error.message}`);
}

// ============================================================================
// MÉTRICAS
// ============================================================================

export async function saveContentMetric(metric: Omit<ContentMetric, 'id' | 'createdAt'>): Promise<void> {
  if (!supabase) return;
  const platformIds = await resolvePlatformIds([metric.platformId]);
  const platformId = platformIds.get(metric.platformId);
  if (!platformId) throw new Error(`content_metrics: platform not found for "${metric.platformId}"`);
  const { error } = await supabase.from('content_metrics').upsert({
    user_id: metric.userId, content_id: metric.contentId, platform_id: platformId,
    views: metric.views, likes: metric.likes, comments: metric.comments,
    saves: metric.saves, shares: metric.shares, reposts: metric.reposts,
    new_followers: metric.newFollowers, accounts_reached: metric.accountsReached,
    watch_time: metric.watchTime, retention_rate: metric.retentionRate,
    completion_rate: metric.completionRate, qualitative_notes: metric.qualitativeNotes,
    registered_at: metric.registeredAt,
  }, { onConflict: 'content_id,platform_id' });
  if (error) throw new Error(`content_metrics: ${error.message}`);
}

// ============================================================================
// CAMPANHA PÚBLICA (sem autenticação — via share_token)
// ============================================================================

export interface CampanhaPublicaEtapa {
  id: string;
  nome: string;
  ordem: number;
  status: 'pendente' | 'em_andamento' | 'concluída';
  data_prazo: string | null;
}

export interface CampanhaPublicaAgendaItem {
  id: string;
  title: string;
  date: string;
  time: string | null;
  tipo: string;
}

export interface CampanhaPublicaConteudo {
  id: string;
  title: string;
  status: string;
  publish_date: string | null;
  publish_time: string | null;
  posted_at: string | null;
  link: string | null;
}

export interface CampanhaPublicaMetric {
  id: string;
  content_id: string;
  platform_id: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  reposts: number | null;
  new_followers: number | null;
  accounts_reached: number | null;
  watch_time: number | null;
  retention_rate: number | null;
  completion_rate: number | null;
  registered_at: string;
}

export interface CampanhaPublicaPlatform {
  id: string;
  nome: string;
}

export interface CampanhaPublicaData {
  projeto: {
    id: string;
    nome: string;
    tipo: string;
    status: string;
    brand: string | null;
    brand_color: string | null;
    color: string | null;
    drive_url: string | null;
    data_inicio: string | null;
    data_fim: string | null;
    meta_conteudos: number | null;
    notes: string | null;
    created_at: string;
  };
  etapas: CampanhaPublicaEtapa[];
  agenda_items: CampanhaPublicaAgendaItem[];
  conteudos: CampanhaPublicaConteudo[];
  metrics: CampanhaPublicaMetric[];
  platforms: CampanhaPublicaPlatform[];
}

export async function fetchCampanhaPublica(token: string): Promise<CampanhaPublicaData | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('get_campanha_publica', { p_token: token });
  if (error || !data) return null;
  return data as CampanhaPublicaData;
}

export async function deleteContentMetric(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('content_metrics').delete().eq('id', id);
  if (error) throw new Error(`delete content_metric: ${error.message}`);
}

// ============================================================================
// HORARIOS DE POSTAGEM
// ============================================================================

export async function savePostingTimeEntry(
  entry: Omit<PostingTimeEntry, 'id' | 'createdAt'>
): Promise<PostingTimeEntry> {
  if (!supabase) throw new Error('posting_times: supabase not configured');
  const uid = await currentUserId();
  if (!uid) throw new Error('posting_times: unauthenticated');
  const { data, error } = await supabase
    .from('posting_times')
    .insert({
      user_id: uid,
      platform_id: entry.platformId ?? null,
      weekday: entry.weekday,
      time: entry.time,
    })
    .select()
    .single();
  if (error) throw new Error(`posting_times: ${error.message}`);
  return mp.postingTimeEntry(data);
}

export async function deletePostingTimeEntry(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('posting_times').delete().eq('id', id);
  if (error) throw new Error(`delete posting_time: ${error.message}`);
}

export async function replacePostingTimesForPlatform(
  platformId: string | null,
  weekday: PostingTimeEntry['weekday'],
  times: string[],
): Promise<void> {
  if (!supabase) return;
  const uid = await currentUserId();
  if (!uid) return;

  if (platformId === null) {
    await supabase
      .from('posting_times')
      .delete()
      .eq('user_id', uid)
      .eq('weekday', weekday)
      .is('platform_id', null);
  } else {
    await supabase
      .from('posting_times')
      .delete()
      .eq('user_id', uid)
      .eq('weekday', weekday)
      .eq('platform_id', platformId);
  }

  if (times.length === 0) return;

  const { error } = await supabase.from('posting_times').insert(
    times.map(function(time) {
      return {
        user_id: uid,
        platform_id: platformId ?? null,
        weekday: weekday,
        time: time,
      };
    })
  );
  if (error) throw new Error(`posting_times replace: ${error.message}`);
}
