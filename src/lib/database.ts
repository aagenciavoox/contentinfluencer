import { dataCache } from './dataCache.ts';
import { getCachedPlatforms } from './platformsCache.ts';
import { supabase } from './supabase.ts';
import { normalizeContentStatus } from '../features/contents/lib/contentPipeline';
import { hydrateIdeasFromDemotedContents } from '../features/ideas/lib/hydrateIdeasFromDemotedContents';
import { getIdeaNotes, normalizeIdea } from '../features/ideas/lib/ideaText';
import { aplicarLivros, livroIdsEfetivos } from './livroIds.ts';
import { generateUUID } from '../utils/uuid';
import { readAvisoDias } from '../features/projects/lib/evento.ts';

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

/** Seis funções fixas do produto. O agrupamento topo/meio/fundo é calculado. */
export type FuncaoEditorial = 'atrair' | 'converter' | 'aprofundar' | 'comunidade' | 'acao' | 'reter';

/** Função padrão da série. `varia` deixa a escolha para cada roteiro. */
export type FuncaoPadraoSerie = FuncaoEditorial | 'varia';

/** De onde veio a função do roteiro. Vazio = ainda não escolhida. */
export type FuncaoOrigem = 'herdada' | 'escolhida' | 'nenhuma' | 'aplicada' | 'migrada';

export type EnergiaNivel = 'baixa' | 'média' | 'alta';

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
  capaUrl: string | null;
  ativa: boolean;
  frequenciaRecomendada: string | null;
  /** Função herdada pelos roteiros que ainda não escolhem a própria. */
  funcaoPadrao: FuncaoPadraoSerie | null;
  /** Energia aplicada aos conteúdos criados a partir da série. */
  energiaPadrao: EnergiaNivel | null;
  /** Pilar que o conteúdo herda. Ausente no banco antigo. */
  pilarPrincipalId?: string | null;
  /** Como a série aparece na tela. Ausente no banco antigo. */
  formatoApresentacao?: string | null;
  motivoSalvar?: string | null;
  motivoEnviar?: string | null;
  createdAt: string;
  updatedAt: string;
  pilarIds: string[];
  plataformas: SeriePlataforma[];
}

/** Rótulo leve do roteiro. Não herda função, pilar nem estrutura de série. */
export interface Tema {
  id: string;
  userId: string;
  nome: string;
  createdAt: string;
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

export type PublicacaoStatus = 'agendada' | 'publicada' | 'nao_publicada' | 'removida';

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
  status?: PublicacaoStatus;
  /** O que a pessoa informou. A API, na fase 3, não apaga este valor. */
  realizadaManualEm?: string | null;
  realizadaApiEm?: string | null;
  postCodigo?: string | null;
  postUrl?: string | null;
  legendaPropria?: boolean;
  /** Usado em reposts. Ausente no banco antigo conta como verdadeiro. */
  contaNaGrade?: boolean;
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
  /** Livros citados. Lista vazia ainda usa o livro único quando ele existir. */
  livroIds?: string[];
  formatoVisual: string | null;
  energiaNecessaria: EnergiaNivel | null;
  /** Valor gravado. Vazio quando a origem ainda lê a série. */
  funcao: FuncaoEditorial | null;
  funcaoOrigem: FuncaoOrigem | null;
  /** Preenchido na primeira publicação. A partir daí a série não altera este roteiro. */
  classificacaoCongeladaEm: string | null;
  /** Quando falso, o roteiro fica de fora da grade. */
  contaNaGrade: boolean;
  /** Legenda compartilhada. Cada rede usa esta até adaptar a própria. */
  legendaBase?: string | null;
  publishDate: string | null;
  publishTime?: string | null;
  recordingDate: string | null;
  /** Horário local da gravação. Ausente no banco antigo. */
  recordingTime?: string | null;
  recordedAt?: string | null;
  postedAt?: string | null;
  publishDateEnabled?: boolean;
  recordingDateEnabled?: boolean;
  link: string | null;
  script: string | null;
  scriptNotes: ScriptNote[];
  tags: string[];
  /** Temas leves, como Halloween. Ausente enquanto o vínculo não foi carregado. */
  temaIds?: string[];
  notes: string | null;
  referencias: string | null;
  /** Notas livres ao lado do roteiro. Ausente enquanto o corpo não foi carregado. */
  writingNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  /** Arquivamento editorial reversível. Exclusão continua usando deletedAt. */
  archivedAt?: string | null;
  /** Identificador da antiga tabela ideas, usado para migração e deduplicação. */
  legacyIdeaId?: string | null;
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
  /** `'evento'` entra só aqui. A coluna `projetos.tipo` não tem CHECK. */
  tipo: 'campanha' | 'publi' | 'producao' | 'outro' | 'evento';
  status: string;
  dataInicio: string | null;
  dataFim: string | null;
  /** Dias de antecedência do aviso. 0–120, ou vazio. Usado quando `tipo` é `evento`. */
  avisoDias: number | null;
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
  // `campanha` é o valor legado. `evento` permanece; o banco não restringe o texto.
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

/** Nota anterior à ideia. Pode estar vazia ou puxar um conteúdo sem alterar o status. */
export interface PlanejamentoPostIt {
  id: string;
  userId: string;
  texto: string;
  date: string | null;
  contentId: string | null;
  createdAt: string;
  updatedAt: string;
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
  temas: Tema[];
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
  postIts: PlanejamentoPostIt[];
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
  | 'planejamento'
  | 'analytics'
  | 'rules'
  | 'voice'
  | 'production'
  | 'schedule';

/** Carregado logo após login — cobre dashboard e navegação inicial sem segunda rodada. */
export const CRITICAL_BOOTSTRAP_DOMAINS: AppDataDomain[] = [
  'bootstrap',
  'production',
  // Lista leve completa (~200 itens): evita segundo fetch em Criação/Calendário/Gravação.
  'content',
];

/** Domínios úteis, mas que não bloqueiam a primeira pintura do shell. */
export const DEFERRED_BOOTSTRAP_DOMAINS: AppDataDomain[] = [
  'ideas',
  'projects',
  'agenda',
  'rules',
];

export const BOOTSTRAP_DATA_DOMAINS: AppDataDomain[] = [
  ...CRITICAL_BOOTSTRAP_DOMAINS,
  ...DEFERRED_BOOTSTRAP_DOMAINS,
];

// ============================================================================
// HELPERS
// ============================================================================

function empty(): AppData {
  return {
    platforms: [], preferences: {}, dnaVoz: null, pilares: [], series: [], temas: [],
    cenarios: [], looks: [], bibliotecaGeneros: [], bibliotecaItems: [],
    contents: [], ideas: [], projetos: [], recordingBlocks: [], templates: [],
    agendaItems: [], postIts: [], goldenRules: [], contentMetrics: [], postingTimeEntries: [],
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

function isMissingRecordingTimeColumn(error: {message?: string} | null | undefined) {
  return !!error?.message && isMissingNamedColumn(error.message, 'recording_time');
}

function isMissingPublicationKindColumn(error: {message?: string} | null | undefined) {
  return !!error?.message?.includes('publication_kind');
}

function isMissingMilestoneColumn(error: {message?: string} | null | undefined) {
  return !!error?.message?.includes("'recorded_at'") || !!error?.message?.includes("'posted_at'");
}

/** Cobre o schema cache ("'posted_at' column") e o erro SQL cru de coluna inexistente. */
function isMissingPostedAtColumn(error: {message?: string} | null | undefined) {
  return isMissingMilestoneColumn(error) || !!error?.message?.includes('posted_at');
}

function isMissingWritingNotesColumn(error: {message?: string} | null | undefined) {
  return !!error?.message?.includes('writing_notes');
}

function isMissingTemasTable(error: {message?: string} | null | undefined) {
  const message = error?.message?.toLowerCase() ?? '';
  if (!message) return false;
  const missing = message.includes('schema cache')
    || message.includes('does not exist')
    || message.includes('could not find');
  return missing && (message.includes('content_temas') || message.includes('temas'));
}

function isMissingCreationColumn(error: {message?: string} | null | undefined) {
  return !!error?.message && (
    error.message.includes('archived_at') ||
    error.message.includes('legacy_idea_id')
  );
}

function isMissingNamedColumn(message: string, column: string) {
  const quoted = "'" + column + "'";
  return (
    message.includes(quoted + " column") ||
    (message.includes(quoted) && message.includes("schema cache")) ||
    (message.includes(column) && message.includes("does not exist"))
  );
}

const SERIE_OPTIONAL_COLUMNS = [
  'energia_padrao',
  'funcao_padrao',
  'pilar_principal_id',
  'formato_apresentacao',
  'motivo_salvar',
  'motivo_enviar',
] as const;

function isMissingLegendaBaseColumn(error: {message?: string} | null | undefined) {
  return !!error?.message && isMissingNamedColumn(error.message, 'legenda_base');
}

function isMissingLivroIdsColumn(error: {message?: string} | null | undefined) {
  return !!error?.message && isMissingNamedColumn(error.message, 'livro_ids');
}

function readLivroIds(row: Row): string[] {
  return livroIdsEfetivos({
    livroIds: Array.isArray(row.livro_ids) ? row.livro_ids.filter((id: unknown): id is string => typeof id === 'string') : undefined,
    bibliotecaItemId: typeof row.biblioteca_item_id === 'string' ? row.biblioteca_item_id : null,
  });
}

function isMissingFuncaoColumns(error: {message?: string} | null | undefined) {
  const message = error?.message;
  if (!message) return false;
  return (
    isMissingNamedColumn(message, 'funcao') ||
    isMissingNamedColumn(message, 'funcao_origem') ||
    isMissingNamedColumn(message, 'classificacao_congelada_em') ||
    isMissingNamedColumn(message, 'conta_na_grade')
  );
}

/** Colunas da M2 em content_plataformas ainda não aplicadas. */
function isMissingPublicacaoColumns(error: {message?: string} | null | undefined) {
  const message = error?.message;
  if (!message) return false;
  const markers = [
    'realizada_manual_em',
    'realizada_api_em',
    'post_codigo',
    'post_url',
    'legenda_propria',
  ];
  if (markers.some(column => isMissingNamedColumn(message, column))) return true;
  if (!message.includes('content_plataformas')) return false;
  return (
    isMissingNamedColumn(message, 'status') ||
    isMissingNamedColumn(message, 'conta_na_grade') ||
    isMissingNamedColumn(message, 'updated_at')
  );
}

function readPublicacaoStatus(value: unknown): PublicacaoStatus {
  return value === 'publicada' || value === 'nao_publicada' || value === 'removida' || value === 'agendada'
    ? value
    : 'agendada';
}

function mapContentPlataforma(p: Row, platformId: string = p.platform_id): ContentPlataforma {
  return {
    id: p.id,
    contentId: p.content_id,
    platformId,
    legenda: p.legenda || '',
    hashtags: p.hashtags || '',
    publishDate: p.publish_date,
    publishTime: p.publish_time,
    publishDateEnabled: p.publish_date_enabled ?? (p.publish_date != null),
    publicationKind: p.publication_kind === 'repost' ? 'repost' : 'post',
    status: readPublicacaoStatus(p.status),
    realizadaManualEm: p.realizada_manual_em ?? null,
    realizadaApiEm: p.realizada_api_em ?? null,
    postCodigo: p.post_codigo ?? null,
    postUrl: p.post_url ?? null,
    legendaPropria: p.legenda_propria === true,
    contaNaGrade: p.conta_na_grade === false ? false : true,
  };
}

function readEnergiaNivel(value: unknown): EnergiaNivel | null {
  return value === 'baixa' || value === 'média' || value === 'alta' ? value : null;
}

function readFuncaoEditorial(value: unknown): FuncaoEditorial | null {
  return value === 'atrair' || value === 'converter' || value === 'aprofundar'
    || value === 'comunidade' || value === 'acao' || value === 'reter'
    ? value
    : null;
}

function readFuncaoPadrao(value: unknown): FuncaoPadraoSerie | null {
  if (value === 'varia') return 'varia';
  return readFuncaoEditorial(value);
}

function readFuncaoOrigem(value: unknown): FuncaoOrigem | null {
  return value === 'herdada' || value === 'escolhida' || value === 'nenhuma'
    || value === 'aplicada' || value === 'migrada'
    ? value
    : null;
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
    capaUrl: r.capa_url || null,
    ativa: r.ativa ?? true, frequenciaRecomendada: r.frequencia_recomendada,
    funcaoPadrao: readFuncaoPadrao(r.funcao_padrao),
    energiaPadrao: readEnergiaNivel(r.energia_padrao),
    pilarPrincipalId: typeof r.pilar_principal_id === 'string' && r.pilar_principal_id ? r.pilar_principal_id : null,
    formatoApresentacao: typeof r.formato_apresentacao === 'string' ? r.formato_apresentacao : null,
    motivoSalvar: typeof r.motivo_salvar === 'string' ? r.motivo_salvar : null,
    motivoEnviar: typeof r.motivo_enviar === 'string' ? r.motivo_enviar : null,
    createdAt: r.created_at, updatedAt: r.updated_at,
    pilarIds: (r.serie_pilares || []).map((sp: Row) => sp.pilar_id),
    plataformas: (r.serie_plataformas || []).map((sp: Row) => ({
      serieId: sp.serie_id, platformId: sp.platform_id, hashtags: sp.hashtags || '',
    })),
  }),
  tema: (r: Row): Tema => ({
    id: r.id,
    userId: r.user_id,
    nome: typeof r.nome === 'string' ? r.nome : '',
    createdAt: r.created_at,
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
    livroIds: readLivroIds(r),
    formatoVisual: r.formato_visual, energiaNecessaria: r.energia_necessaria,
    funcao: readFuncaoEditorial(r.funcao),
    funcaoOrigem: readFuncaoOrigem(r.funcao_origem),
    classificacaoCongeladaEm: r.classificacao_congelada_em ?? null,
    contaNaGrade: r.conta_na_grade === false ? false : true,
    legendaBase: typeof r.legenda_base === 'string' ? r.legenda_base : null,
    publishDate: r.publish_date, publishTime: r.publish_time, recordingDate: r.recording_date,
    recordingTime: typeof r.recording_time === 'string' ? r.recording_time : null,
    recordedAt: r.recorded_at ?? null, postedAt: r.posted_at ?? null,
    link: r.link,
    publishDateEnabled: r.publish_date_enabled ?? (r.publish_date != null),
    recordingDateEnabled: r.recording_date_enabled ?? (r.recording_date != null),
    script: r.script, scriptNotes: r.script_notes || [], tags: r.tags || [],
    notes: r.notes, referencias: r.referencias,
    writingNotes: r.writing_notes,
    createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at,
    archivedAt: r.archived_at ?? null,
    legacyIdeaId: r.legacy_idea_id ?? null,
    plataformas: (r.content_plataformas || []).map((p: Row) => mapContentPlataforma(p)),
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
    dataInicio: r.data_inicio, dataFim: r.data_fim, avisoDias: readAvisoDias(r.aviso_dias),
    metaConteudos: r.meta_conteudos,
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
  postIt: (r: Row): PlanejamentoPostIt => ({
    id: r.id,
    userId: r.user_id,
    texto: r.texto ?? '',
    date: r.date ? String(r.date).slice(0, 10) : null,
    contentId: r.content_id ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? r.created_at,
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
    plataformas: (row.content_plataformas || []).map((p: Row) => (
      mapContentPlataforma(p, normalizePlatformRef(p.platform_id, platformNameById))
    )),
  };
}

async function fetchTemaIdsByContent(contentIds: readonly string[]): Promise<Map<string, string[]> | null> {
  if (!supabase || contentIds.length === 0) return new Map();
  const links = new Map<string, string[]>();
  const chunkSize = 100;

  for (let index = 0; index < contentIds.length; index += chunkSize) {
    const chunk = contentIds.slice(index, index + chunkSize);
    const {data, error} = await supabase
      .from('content_temas')
      .select('content_id, tema_id')
      .in('content_id', chunk);
    if (error) {
      if (isMissingTemasTable(error)) return null;
      throw new Error(`content_temas: ${error.message}`);
    }
    for (const row of data || []) {
      const contentId = String(row.content_id);
      const temaId = String(row.tema_id);
      const current = links.get(contentId) ?? [];
      current.push(temaId);
      links.set(contentId, current);
    }
  }

  return links;
}

/** Anexa os temas. Se a tabela ainda não existe, devolve o conteúdo como veio. */
async function withTemaIds(contents: Content[]): Promise<Content[]> {
  if (contents.length === 0) return contents;
  const links = await fetchTemaIdsByContent(contents.map(content => content.id));
  if (!links) return contents;
  return contents.map(content => ({
    ...content,
    temaIds: links.get(content.id) ?? [],
  }));
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
  'archived_at',
  'legacy_idea_id',
  'content_plataformas(id, content_id, platform_id, legenda, hashtags, publish_date, publish_time, publish_date_enabled, publication_kind)',
] as const;

const CONTENT_PLATAFORMAS_PUBLICACAO_COLUMNS = 'status, realizada_manual_em, realizada_api_em, post_codigo, post_url, legenda_propria, conta_na_grade';

function contentPlataformasSelect(includePublicacaoColumns: boolean): string {
  const base = 'content_plataformas(id, content_id, platform_id, legenda, hashtags, publish_date, publish_time, publish_date_enabled, publication_kind';
  if (!includePublicacaoColumns) return base + ')';
  return base + ', ' + CONTENT_PLATAFORMAS_PUBLICACAO_COLUMNS + ')';
}

const CONTENT_SCHEDULE_MILESTONE_COLUMNS = ['recorded_at', 'posted_at'] as const;

const CONTENT_SCHEDULE_FUNCAO_COLUMNS = [
  'funcao',
  'funcao_origem',
  'classificacao_congelada_em',
  'conta_na_grade',
] as const;

function buildContentScheduleSelect(
  includeMilestones: boolean,
  includeCreationColumns = true,
  includeFuncaoColumns = true,
  includePublicacaoColumns = true,
  includeLegendaBase = true,
  includeLivroIds = true,
  includeRecordingTime = true,
): string {
  let columns: readonly string[] = includeMilestones
    ? [
        ...CONTENT_SCHEDULE_SELECT_COLUMNS.slice(0, 15),
        ...CONTENT_SCHEDULE_MILESTONE_COLUMNS,
        ...CONTENT_SCHEDULE_SELECT_COLUMNS.slice(15),
      ]
    : [...CONTENT_SCHEDULE_SELECT_COLUMNS];
  if (!includeCreationColumns) {
    columns = columns.filter(
      column => column !== 'archived_at' && column !== 'legacy_idea_id',
    );
  }
  if (includeFuncaoColumns) {
    const relation = columns[columns.length - 1];
    columns = [...columns.slice(0, -1), ...CONTENT_SCHEDULE_FUNCAO_COLUMNS, relation];
  }
  if (includeLegendaBase) {
    const relation = columns[columns.length - 1];
    columns = [...columns.slice(0, -1), 'legenda_base', relation];
  }
  if (includeLivroIds) {
    const relation = columns[columns.length - 1];
    columns = [...columns.slice(0, -1), 'livro_ids', relation];
  }
  if (includeRecordingTime) {
    const relation = columns[columns.length - 1];
    columns = [...columns.slice(0, -1), 'recording_time', relation];
  }
  if (includePublicacaoColumns) {
    columns = columns.map(column => (
      column.startsWith('content_plataformas(') ? contentPlataformasSelect(true) : column
    ));
  }
  return columns.join(', ');
}

type SupabaseListResult<T> = { data: T; error: { message?: string } | null; count?: number | null };

async function runContentScheduleSelect<T>(
  label: string,
  run: (select: string) => PromiseLike<SupabaseListResult<T>>,
): Promise<SupabaseListResult<T>> {
  let includeMilestones = true;
  let includeCreationColumns = true;
  let includeFuncaoColumns = true;
  let includePublicacaoColumns = true;
  let includeLegendaBase = true;
  let includeLivroIds = true;
  let includeRecordingTime = true;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const result = await run(
      buildContentScheduleSelect(
        includeMilestones,
        includeCreationColumns,
        includeFuncaoColumns,
        includePublicacaoColumns,
        includeLegendaBase,
        includeLivroIds,
        includeRecordingTime,
      ),
    );
    if (!result.error) return result;
    if (includeRecordingTime && isMissingRecordingTimeColumn(result.error)) {
      includeRecordingTime = false;
      continue;
    }
    if (includeLivroIds && isMissingLivroIdsColumn(result.error)) {
      includeLivroIds = false;
      continue;
    }
    if (includeLegendaBase && isMissingLegendaBaseColumn(result.error)) {
      includeLegendaBase = false;
      continue;
    }
    if (includePublicacaoColumns && isMissingPublicacaoColumns(result.error)) {
      includePublicacaoColumns = false;
      continue;
    }
    if (includeFuncaoColumns && isMissingFuncaoColumns(result.error)) {
      includeFuncaoColumns = false;
      continue;
    }
    if (includeCreationColumns && isMissingCreationColumn(result.error)) {
      includeCreationColumns = false;
      continue;
    }
    if (includeMilestones && isMissingMilestoneColumn(result.error)) {
      includeMilestones = false;
      continue;
    }
    return result;
  }

  return run(buildContentScheduleSelect(false, false, false, false, false, false, false));
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
  listMode: 'editorial' | 'published' | 'all';
  status?: string;
  seriesId?: string;
  pilarId?: string;
  search?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  archiveMode?: 'active' | 'archived' | 'all';
};

export type BibliotecaListQuery = {
  page: number;
  pageSize: number;
  tipo?: string;
  status?: string;
  genero?: string;
  /** Todos | sem | com */
  capa?: string;
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

  const buildPageRequest = (select: string, includeArchiveFilter = true) => {
    let pageRequest = supabase
      .from('contents')
      .select(select, { count: 'exact' })
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (includeArchiveFilter && query.archiveMode !== 'all') {
      pageRequest = query.archiveMode === 'archived'
        ? pageRequest.not('archived_at', 'is', null)
        : pageRequest.is('archived_at', null);
    }

    if (query.listMode === 'published') {
      pageRequest = pageRequest.eq('status', POSTED_CONTENT_STATUS);
    } else if (query.listMode === 'editorial') {
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

  let result = await runContentScheduleSelect<Row[]>(
    'contents page fetch',
    select => buildPageRequest(select),
  );
  if (result.error && isMissingCreationColumn(result.error)) {
    if (query.archiveMode === 'archived') {
      return {items: [], total: 0};
    }
    result = await runContentScheduleSelect<Row[]>(
      'contents page fetch',
      select => buildPageRequest(select, false),
    );
  }

  const platforms = await getCachedPlatforms(userId, async () =>
    assertQuerySuccess(
      'platforms fetch',
      await supabase.from('platforms').select('*').or(`user_id.is.null,user_id.eq.${userId}`),
    ) || [],
  );
  const platformNameById = new Map(platforms.map((platform: Row) => [platform.id, platform.nome]));
  const rows = assertQuerySuccess('contents page fetch', result) || [];

  return {
    items: await withTemaIds(rows.map((row: Row) => mapContentWithPlatforms(row, platformNameById))),
    total: result.count ?? rows.length,
  };
}

export async function fetchArchivedContents(userId: string): Promise<Content[]> {
  if (!supabase) return [];

  const contentsResult = await runContentScheduleSelect<Row[]>(
    'archived contents fetch',
    select => supabase
      .from('contents')
      .select(select)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .not('archived_at', 'is', null)
      .order('updated_at', {ascending: false}),
  );

  if (contentsResult.error) {
    if (isMissingCreationColumn(contentsResult.error)) return [];
    throw new Error(`archived contents fetch: ${contentsResult.error.message}`);
  }

  const platforms = await getCachedPlatforms(userId, async () =>
    assertQuerySuccess(
      'platforms fetch',
      await supabase.from('platforms').select('*').or(`user_id.is.null,user_id.eq.${userId}`),
    ) || [],
  );
  const platformNameById = new Map(
    platforms.map((platform: Row) => [platform.id, platform.nome]),
  );
  return withTemaIds((contentsResult.data || []).map(
    (row: Row) => mapContentWithPlatforms(row, platformNameById),
  ));
}

export async function fetchDeletedContents(userId: string): Promise<Content[]> {
  if (!supabase) return [];

  const contentsResult = await runContentScheduleSelect<Row[]>(
    'deleted contents fetch',
    select => supabase
      .from('contents')
      .select(select)
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
      .order('deleted_at', {ascending: false}),
  );

  if (contentsResult.error) {
    throw new Error(`deleted contents fetch: ${contentsResult.error.message}`);
  }

  const platforms = await getCachedPlatforms(userId, async () =>
    assertQuerySuccess(
      'platforms fetch',
      await supabase.from('platforms').select('*').or(`user_id.is.null,user_id.eq.${userId}`),
    ) || [],
  );
  const platformNameById = new Map(
    platforms.map((platform: Row) => [platform.id, platform.nome]),
  );
  return withTemaIds((contentsResult.data || []).map(
    (row: Row) => mapContentWithPlatforms(row, platformNameById),
  ));
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

  return withTemaIds(rows.map((row: Row) => mapContentWithPlatforms(row, platformNameById)));
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

  const runContentCount = (
    mode: 'editorial' | 'published',
    includeArchiveFilter: boolean,
    includePostedAt: boolean,
  ) => {
    let query = supabase
      .from('contents')
      .select('*', {count: 'exact', head: true})
      .eq('user_id', userId)
      .is('deleted_at', null);
    if (includeArchiveFilter) {
      query = query.is('archived_at', null);
    }
    if (mode === 'published') {
      return includePostedAt
        ? query.or(`status.eq.${POSTED_CONTENT_STATUS},posted_at.not.is.null`)
        : query.eq('status', POSTED_CONTENT_STATUS);
    }
    return includePostedAt
      ? query.is('posted_at', null).neq('status', POSTED_CONTENT_STATUS)
      : query.neq('status', POSTED_CONTENT_STATUS);
  };

  const runContentCounts = async () => {
    let includeArchiveFilter = true;
    let includePostedAt = true;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const results = await Promise.all([
        runContentCount('editorial', includeArchiveFilter, includePostedAt),
        runContentCount('published', includeArchiveFilter, includePostedAt),
      ]);
      const error = results[0].error || results[1].error;
      if (!error) return results;
      if (includePostedAt && isMissingPostedAtColumn(error)) {
        includePostedAt = false;
        continue;
      }
      if (includeArchiveFilter && isMissingCreationColumn(error)) {
        includeArchiveFilter = false;
        continue;
      }
      return results;
    }

    return Promise.all([
      runContentCount('editorial', false, false),
      runContentCount('published', false, false),
    ]);
  };

  const [[editorialResult, postedResult], libraryResult] = await Promise.all([
    runContentCounts(),
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

  if (query.capa === 'sem') {
    request = request.is('capa_url', null);
  } else if (query.capa === 'com') {
    request = request.not('capa_url', 'is', null);
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

  const withList = await supabase
    .from('contents')
    .select('biblioteca_item_id, livro_ids')
    .eq('user_id', userId)
    .is('deleted_at', null);

  let rows: Row[] = [];
  if (!withList.error) {
    rows = withList.data || [];
  } else if (isMissingLivroIdsColumn(withList.error)) {
    rows = assertQuerySuccess(
      'biblioteca content counts fetch',
      await supabase
        .from('contents')
        .select('biblioteca_item_id')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .not('biblioteca_item_id', 'is', null),
    ) || [];
  } else {
    throw new Error(`biblioteca content counts fetch: ${withList.error.message}`);
  }

  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const itemId of livroIdsEfetivos({
      livroIds: Array.isArray(row.livro_ids) ? row.livro_ids.filter((id: unknown): id is string => typeof id === 'string') : undefined,
      bibliotecaItemId: typeof row.biblioteca_item_id === 'string' ? row.biblioteca_item_id : null,
    })) {
      counts.set(itemId, (counts.get(itemId) || 0) + 1);
    }
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
      'planejamento',
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

      const temasResult = await supabase
        .from('temas')
        .select('id, user_id, nome, created_at')
        .eq('user_id', uid)
        .order('nome');
      if (temasResult.error && isMissingTemasTable(temasResult.error)) {
        payload.temas = [];
      } else {
        payload.temas = (assertQuerySuccess('temas fetch', temasResult) || []).map(mp.tema);
      }
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

      const buildDomainContentsRequest = (
        select: string,
        includeArchiveFilter = true,
      ) => {
        let domainQuery = supabase.from('contents')
          .select(select)
          .eq('user_id', uid)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (includeArchiveFilter) {
          domainQuery = domainQuery.is('archived_at', null);
        }

        if (
          requested.has('content-summary')
          && !requested.has('content')
          && !requested.has('content-schedule')
        ) {
          domainQuery = domainQuery.limit(CONTENT_SUMMARY_LIMIT);
        }

        return domainQuery;
      };

      let contentsResult = await runContentScheduleSelect<Row[]>(
        'contents fetch',
        buildDomainContentsRequest,
      );
      if (contentsResult.error && isMissingCreationColumn(contentsResult.error)) {
        contentsResult = await runContentScheduleSelect<Row[]>(
          'contents fetch',
          select => buildDomainContentsRequest(select, false),
        );
      }
      const contentsRows = assertQuerySuccess('contents fetch', contentsResult) || [];
      payload.contents = await withTemaIds(
        contentsRows.map((row: Row) => mapContentWithPlatforms(row, platformNameById)),
      );
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

  if (requested.has('planejamento')) {
    tasks.push((async () => {
      payload.postIts = (assertQuerySuccess(
        'planejamento_postits fetch',
        await supabase.from('planejamento_postits').select('*').eq('user_id', uid).order('created_at'),
      ) || []).map(mp.postIt);
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
      .filter(
        (row): row is typeof row & {platform_id: string} =>
          typeof row.platform_id === 'string',
      )
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
  let row: Record<string, unknown> = {
    id: serie.id, user_id: serie.userId, name: serie.name, template: serie.template,
    notes: serie.notes, slot_padrao: serie.slotPadrao, formato_visual_padrao: serie.formatoVisualPadrao,
    estrutura_roteiro: serie.estruturaRoteiro, bordao: serie.bordao, cor: serie.cor,
    capa_url: serie.capaUrl?.trim() || null,
    ativa: serie.ativa, frequencia_recomendada: serie.frequenciaRecomendada,
    energia_padrao: serie.energiaPadrao ?? null,
    funcao_padrao: serie.funcaoPadrao ?? null,
    pilar_principal_id: serie.pilarPrincipalId ?? null,
    formato_apresentacao: serie.formatoApresentacao?.trim() || null,
    motivo_salvar: serie.motivoSalvar?.trim() || null,
    motivo_enviar: serie.motivoEnviar?.trim() || null,
  };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { error } = await supabase.from('series').upsert(row);
    if (!error) return;

    const missing = SERIE_OPTIONAL_COLUMNS.find(column =>
      column in row && !!error.message && isMissingNamedColumn(error.message, column),
    );
    if (missing) {
      const {[missing]: _removed, ...rest} = row;
      row = rest;
      continue;
    }

    throw new Error(`series: ${error.message}`);
  }

  throw new Error('series: schema compatibility retries exhausted');
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

export async function saveTema(tema: Omit<Tema, 'createdAt'>): Promise<void> {
  if (!supabase) return;
  const nome = tema.nome.trim().replace(/\s+/g, ' ');
  const { error } = await supabase.from('temas').upsert({
    id: tema.id,
    user_id: tema.userId,
    nome,
  });
  if (error) {
    if (isMissingTemasTable(error)) return;
    throw new Error(`temas: ${error.message}`);
  }
}

export async function saveContentTemas(contentId: string, temaIds: readonly string[]): Promise<void> {
  if (!supabase) return;
  const unique = [...new Set(temaIds.filter(Boolean))];
  const removed = await supabase.from('content_temas').delete().eq('content_id', contentId);
  if (removed.error) {
    if (isMissingTemasTable(removed.error)) return;
    throw new Error(`content_temas delete: ${removed.error.message}`);
  }
  if (unique.length === 0) return;
  const { error } = await supabase.from('content_temas').insert(
    unique.map(temaId => ({ content_id: contentId, tema_id: temaId })),
  );
  if (error) throw new Error(`content_temas: ${error.message}`);
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
  const uniqueNames = Array.from(
    new Set(generoIds.map(nome => nome.trim()).filter(Boolean)),
  );
  if (uniqueNames.length === 0) return;

  const { data: existingGeneros, error: fetchError } = await supabase
    .from('biblioteca_generos')
    .select('id, nome')
    .eq('user_id', uid)
    .in('nome', uniqueNames);
  if (fetchError) throw new Error(`biblioteca_generos fetch: ${fetchError.message}`);

  const existingByName = new Map((existingGeneros || []).map((genero: Row) => [genero.nome, genero.id]));
  const missingNames = uniqueNames.filter(nome => !existingByName.has(nome));

  if (missingNames.length > 0) {
    const { data: insertedGeneros, error: insertGeneroError } = await supabase
      .from('biblioteca_generos')
      .insert(
        missingNames.map(nome => ({
          id: generateUUID(),
          user_id: uid,
          nome,
          tipo: null,
        })),
      )
      .select('id, nome');
    if (insertGeneroError) throw new Error(`biblioteca_generos insert: ${insertGeneroError.message}`);
    (insertedGeneros || []).forEach((genero: Row) => existingByName.set(genero.nome, genero.id));
  }

  const { error } = await supabase.from('item_generos').insert(
    uniqueNames
      .map(nome => existingByName.get(nome))
      .filter((generoId): generoId is string => !!generoId)
      .map(generoId => ({ item_id: itemId, genero_id: generoId }))
  );
  if (error) throw new Error(`item_generos: ${error.message}`);
}

async function detachLivroFromContents(livroId: string): Promise<void> {
  if (!supabase) return;

  const listed = await supabase
    .from('contents')
    .select('id, biblioteca_item_id, livro_ids')
    .contains('livro_ids', [livroId]);

  let includeLivroIds = true;
  let rows: Row[] = [];

  if (listed.error && isMissingLivroIdsColumn(listed.error)) {
    includeLivroIds = false;
    const primaryOnly = await supabase
      .from('contents')
      .select('id, biblioteca_item_id')
      .eq('biblioteca_item_id', livroId);
    if (primaryOnly.error) throw new Error(`detach livro: ${primaryOnly.error.message}`);
    rows = primaryOnly.data || [];
  } else if (listed.error) {
    throw new Error(`detach livro: ${listed.error.message}`);
  } else {
    const primary = await supabase
      .from('contents')
      .select('id, biblioteca_item_id, livro_ids')
      .eq('biblioteca_item_id', livroId);
    if (primary.error) throw new Error(`detach livro: ${primary.error.message}`);
    const byId = new Map<string, Row>();
    for (const row of [...(listed.data || []), ...(primary.data || [])]) {
      byId.set(String(row.id), row);
    }
    rows = [...byId.values()];
  }

  for (const row of rows) {
    const atuais = includeLivroIds
      ? livroIdsEfetivos({
        livroIds: Array.isArray(row.livro_ids)
          ? row.livro_ids.filter((item: unknown): item is string => typeof item === 'string')
          : undefined,
        bibliotecaItemId: typeof row.biblioteca_item_id === 'string' ? row.biblioteca_item_id : null,
      })
      : [];
    const livroIds = atuais.filter(item => item !== livroId);
    const bibliotecaItemId = livroIds[0] ?? null;
    const payload: Record<string, unknown> = includeLivroIds
      ? { livro_ids: livroIds, biblioteca_item_id: bibliotecaItemId }
      : { biblioteca_item_id: null };

    const { error } = await supabase.from('contents').update(payload).eq('id', row.id);
    if (!error) continue;
    if (includeLivroIds && isMissingLivroIdsColumn(error)) {
      const fallback = await supabase
        .from('contents')
        .update({ biblioteca_item_id: row.biblioteca_item_id === livroId ? null : row.biblioteca_item_id })
        .eq('id', row.id);
      if (fallback.error) throw new Error(`detach livro: ${fallback.error.message}`);
      continue;
    }
    throw new Error(`detach livro: ${error.message}`);
  }
}

export async function deleteBibliotecaItem(id: string): Promise<void> {
  if (!supabase) return;

  const { data: existing } = await supabase
    .from('biblioteca_items')
    .select('user_id, capa_url')
    .eq('id', id)
    .maybeSingle();

  await detachLivroFromContents(id);

  const { error } = await supabase.from('biblioteca_items')
    .delete().eq('id', id);
  if (error) throw new Error(`delete biblioteca_item: ${error.message}`);

  if (existing?.user_id) {
    dataCache.invalidateValue(`stats:biblioteca-content-counts:${existing.user_id}`);
  }

  if (existing?.user_id) {
    const { deleteLibraryItemCovers } = await import('../features/library/lib/libraryCoverStorage');
    void deleteLibraryItemCovers({
      userId: existing.user_id,
      itemId: id,
      capaUrl: existing.capa_url,
    });
  }
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
  const livros = aplicarLivros(content);
  const bodyLoaded =
    content.script !== undefined || content.notes !== undefined || content.referencias !== undefined;
  let row: Record<string, unknown> = {
    id: content.id, user_id: content.userId, title: content.title,
    status: content.status, classificacao: content.classificacao,
    slot_type: content.slotType, series_id: content.seriesId,
    pilar_id: content.pilarId, look_id: content.lookId, cenario_id: content.cenarioId,
    biblioteca_item_id: livros.bibliotecaItemId,
    livro_ids: livros.livroIds,
    formato_visual: content.formatoVisual,
    energia_necessaria: content.energiaNecessaria, publish_date: content.publishDate,
    publish_time: content.publishTime,
    publish_date_enabled: content.publishDateEnabled ?? (content.publishDate != null),
    recording_date: content.recordingDate,
    ...(content.recordingTime !== undefined ? {recording_time: content.recordingTime} : {}),
    recorded_at: content.recordedAt,
    posted_at: content.postedAt,
    recording_date_enabled: content.recordingDateEnabled ?? (content.recordingDate != null),
    link: content.link, script: content.script,
    // Listas leves não trazem os comentários: gravar `[]` apagaria os do servidor.
    ...(bodyLoaded ? {script_notes: content.scriptNotes} : {}),
    tags: content.tags,
    notes: content.notes, referencias: content.referencias,
    funcao: content.funcao ?? null,
    funcao_origem: content.funcaoOrigem ?? null,
    classificacao_congelada_em: content.classificacaoCongeladaEm ?? null,
    conta_na_grade: content.contaNaGrade ?? true,
    legenda_base: content.legendaBase ?? null,
    ...(content.writingNotes !== undefined ? {writing_notes: content.writingNotes} : {}),
    archived_at: content.archivedAt ?? null,
    legacy_idea_id: content.legacyIdeaId ?? null,
    updated_at: new Date().toISOString(),
  };

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const {error} = await supabase.from('contents').upsert(row);
    if (!error) return;

    if (isMissingLivroIdsColumn(error) && 'livro_ids' in row) {
      const {livro_ids: _livroIds, ...rowWithoutLivroIds} = row;
      row = rowWithoutLivroIds;
      continue;
    }

    if (isMissingLegendaBaseColumn(error) && 'legenda_base' in row) {
      const {legenda_base: _legendaBase, ...rowWithoutLegendaBase} = row;
      row = rowWithoutLegendaBase;
      continue;
    }

    if (isMissingFuncaoColumns(error) && (
      'funcao' in row || 'funcao_origem' in row || 'classificacao_congelada_em' in row || 'conta_na_grade' in row
    )) {
      const {
        funcao: _funcao,
        funcao_origem: _funcaoOrigem,
        classificacao_congelada_em: _classificacaoCongeladaEm,
        conta_na_grade: _contaNaGrade,
        ...rowWithoutFuncao
      } = row;
      row = rowWithoutFuncao;
      continue;
    }

    if (isMissingWritingNotesColumn(error)) {
      const {writing_notes: _writingNotes, ...rowWithoutWritingNotes} = row;
      row = rowWithoutWritingNotes;
      continue;
    }

    if (isMissingCreationColumn(error)) {
      const {
        archived_at: _archivedAt,
        legacy_idea_id: _legacyIdeaId,
        ...rowWithoutCreationColumns
      } = row;
      row = rowWithoutCreationColumns;
      continue;
    }

    if (isMissingMilestoneColumn(error)) {
      const {
        recorded_at: _recordedAt,
        posted_at: _postedAt,
        ...rowWithoutMilestones
      } = row;
      row = rowWithoutMilestones;
      continue;
    }

    if (isMissingPublishTimeColumn(error)) {
      const {publish_time: _publishTime, ...rowWithoutPublishTime} = row;
      row = rowWithoutPublishTime;
      continue;
    }

    if (isMissingRecordingTimeColumn(error) && 'recording_time' in row) {
      const {recording_time: _recordingTime, ...rowWithoutRecordingTime} = row;
      row = rowWithoutRecordingTime;
      continue;
    }

    throw new Error(`contents: ${error.message}`);
  }

  throw new Error('contents: schema compatibility retries exhausted');
}

export async function saveContentPlataformas(
  contentId: string,
  plataformas: ContentPlataforma[]
): Promise<void> {
  if (!supabase) return;

  const {data: existing, error: existingError} = await supabase
    .from('content_plataformas')
    .select('id')
    .eq('content_id', contentId);
  if (existingError) throw new Error(`content_plataformas list: ${existingError.message}`);

  const existingIds = new Set((existing || []).map((row: Row) => String(row.id)));
  const withIds = plataformas.map(plataforma => ({
    ...plataforma,
    id: plataforma.id?.trim() ? plataforma.id : generateUUID(),
  }));

  if (withIds.length > 0) {
    const platformIds = await resolvePlatformIds(withIds.map(plataforma => plataforma.platformId));
    const rows = withIds.map(plataforma => ({
      id: plataforma.id,
      content_id: contentId,
      platform_id: platformIds.get(plataforma.platformId),
      legenda: plataforma.legenda,
      hashtags: plataforma.hashtags,
      publish_date: plataforma.publishDate,
      publish_time: plataforma.publishTime,
      publish_date_enabled: plataforma.publishDateEnabled ?? (plataforma.publishDate != null),
      publication_kind: plataforma.publicationKind ?? 'post',
      status: plataforma.status ?? 'agendada',
      realizada_manual_em: plataforma.realizadaManualEm ?? null,
      realizada_api_em: plataforma.realizadaApiEm ?? null,
      post_codigo: plataforma.postCodigo ?? null,
      post_url: plataforma.postUrl ?? null,
      legenda_propria: plataforma.legendaPropria ?? false,
      conta_na_grade: plataforma.contaNaGrade ?? true,
      updated_at: new Date().toISOString(),
    })).filter(
      (row): row is typeof row & {platform_id: string} => typeof row.platform_id === 'string',
    );

    let includePublicacao = true;
    let includeKind = true;
    let includeTime = true;
    let saved = rows.length === 0;

    const upsertRows = async (payload: Array<Record<string, unknown>>) => {
      const {error} = await supabase.from('content_plataformas').upsert(payload);
      return error;
    };

    for (let attempt = 0; attempt < 6 && !saved; attempt += 1) {
      const payload = rows.map(row => {
        const next: Record<string, unknown> = {...row};
        if (!includePublicacao) {
          delete next.status;
          delete next.realizada_manual_em;
          delete next.realizada_api_em;
          delete next.post_codigo;
          delete next.post_url;
          delete next.legenda_propria;
          delete next.conta_na_grade;
          delete next.updated_at;
        }
        if (!includeKind) delete next.publication_kind;
        if (!includeTime) delete next.publish_time;
        return next;
      });
      const error = await upsertRows(payload);
      if (!error) {
        saved = true;
        break;
      }
      if (includePublicacao && isMissingPublicacaoColumns(error)) {
        includePublicacao = false;
        continue;
      }
      if (includeKind && isMissingPublicationKindColumn(error)) {
        includeKind = false;
        continue;
      }
      if (includeTime && isMissingPublishTimeColumn(error)) {
        includeTime = false;
        continue;
      }
      throw new Error(`content_plataformas: ${error.message}`);
    }

    if (!saved) throw new Error('content_plataformas: schema compatibility retries exhausted');
  }

  const incomingIds = new Set(withIds.map(plataforma => plataforma.id));
  const removedIds = [...existingIds].filter(id => !incomingIds.has(id));
  if (removedIds.length > 0) {
    const {error: deleteError} = await supabase
      .from('content_plataformas')
      .delete()
      .in('id', removedIds);
    if (deleteError) throw new Error(`content_plataformas delete: ${deleteError.message}`);
  }
}

export async function deleteContent(id: string): Promise<void> {
  if (!supabase) return;
  const deletedAt = new Date().toISOString();
  const { error } = await supabase.from('contents')
    .update({deleted_at: deletedAt, updated_at: deletedAt})
    .eq('id', id)
    .is('deleted_at', null);
  if (error) throw new Error(`delete content: ${error.message}`);
}

export async function restoreContent(id: string, userId: string): Promise<void> {
  if (!supabase) return;
  const {error} = await supabase
    .from('contents')
    .update({deleted_at: null, updated_at: new Date().toISOString()})
    .eq('id', id)
    .eq('user_id', userId)
    .not('deleted_at', 'is', null);
  if (error) throw new Error(`restore content: ${error.message}`);
}

export async function permanentlyDeleteContent(id: string, userId: string): Promise<void> {
  if (!supabase) return;
  const {error} = await supabase
    .from('contents')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .not('deleted_at', 'is', null);
  if (error) throw new Error(`permanently delete content: ${error.message}`);
}

export async function emptyContentTrash(userId: string): Promise<number> {
  if (!supabase) return 0;
  const {data, error} = await supabase
    .from('contents')
    .delete()
    .eq('user_id', userId)
    .not('deleted_at', 'is', null)
    .select('id');
  if (error) throw new Error(`empty content trash: ${error.message}`);
  return data?.length ?? 0;
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
  const tipo = normalizeProjetoTipo(projeto.tipo);
  let row: Record<string, unknown> = {
    id: projeto.id, user_id: uid, nome: projeto.nome, tipo,
    status: projeto.status, data_inicio: projeto.dataInicio, data_fim: projeto.dataFim,
    meta_conteudos: projeto.metaConteudos, biblioteca_item_id: projeto.bibliotecaItemId,
    brand: projeto.brand, brand_color: projeto.brandColor, color: projeto.color,
    drive_url: projeto.driveUrl, value: projeto.value, currency: projeto.currency, notes: projeto.notes,
    aviso_dias: tipo === 'evento' ? readAvisoDias(projeto.avisoDias) : null,
  };
  const { error } = await supabase.from('projetos').upsert(row);
  if (!error) return;
  if (error.message && isMissingNamedColumn(error.message, 'aviso_dias') && 'aviso_dias' in row) {
    const { aviso_dias: _avisoDias, ...withoutAviso } = row;
    row = withoutAviso;
    const retry = await supabase.from('projetos').upsert(row);
    if (retry.error) throw new Error(`projetos: ${retry.error.message}`);
    return;
  }
  throw new Error(`projetos: ${error.message}`);
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
  const { error: deleteError } = await supabase.from('recording_block_contents').delete().eq('block_id', blockId);
  if (deleteError) throw new Error(`recording_block_contents delete: ${deleteError.message}`);
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

export async function savePlanejamentoPostIt(item: PlanejamentoPostIt): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('planejamento_postits').upsert({
    id: item.id,
    user_id: item.userId,
    texto: item.texto ?? '',
    date: item.date,
    content_id: item.contentId,
    updated_at: item.updatedAt || new Date().toISOString(),
  });
  if (error) throw new Error(`planejamento_postits: ${error.message}`);
}

export async function deletePlanejamentoPostIt(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('planejamento_postits').delete().eq('id', id);
  if (error) throw new Error(`delete planejamento_postit: ${error.message}`);
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
