import { dataCache } from './dataCache.ts';
import { getCachedUserId, supabase } from './supabase.ts';
import { CONTENT_STATUS, normalizeContentStatus } from '../features/contents/lib/contentPipeline';
import { hydrateIdeasFromDemotedContents } from '../features/ideas/lib/hydrateIdeasFromDemotedContents';
import { getIdeaNotes, normalizeIdea } from '../features/ideas/lib/ideaText';
import { aplicarLivros, livroIdsEfetivos } from './livroIds.ts';
import { generateUUID } from '../utils/uuid';
import { normalizarRedesPostIt } from '../features/planejamento/lib/redesPostIt.ts';
import { normalizeWritingMode, readCarouselSlides, slidesHaveContent } from '../features/contents/lib/carouselSlides.ts';
import { nomeIndicaBlog } from '../features/contas/lib/contas.ts';
import { readAvisoDias } from '../features/projects/lib/evento.ts';
import { DEFAULT_EDITORIAL_SETTINGS, type EditorialSettings } from '../features/editorial/lib/editorialSettings.ts';
import { readProporcao } from '../features/editorial/lib/proporcaoObjetivos.ts';
import type { PeriodoSelecionado } from '../features/editorial/lib/periodoEditorial.ts';
import { lerAvaliacaoCriterios, type AvaliacaoCriterios } from '../features/library/lib/avaliacaoCriterios.ts';

// ============================================================================
// TYPES
// ============================================================================

/** Plataforma da conta. `blog` é Blog/site; `outra` cobre cadastros fora dessas redes. */
export type RedeSocial = 'instagram' | 'tiktok' | 'youtube' | 'blog' | 'outra';

/** Estado da conexão com uma integração. Cadastrar o @ não muda este valor. */
export type ConexaoStatus = 'nao_conectada' | 'conectada' | 'expirada' | 'erro';

export interface ContaConexao {
  status: ConexaoStatus;
  /** Ex.: `instagram_graph`. Vazio enquanto não há integração. */
  provedor: string | null;
  /** Id da conta na integração, quando ela devolver. */
  contaExternaId: string | null;
  atualizadaEm: string | null;
}

/**
 * Uma conta de publicação. O nome da tabela continua `platforms`: cada linha
 * é uma conta, e os vínculos (publicações, horários, hashtags, métricas)
 * usam o `id`. O `handle` só identifica na tela e pode mudar.
 */
export interface Platform {
  id: string;
  userId: string | null;
  /** Nome de identificação da conta. */
  nome: string;
  /** Estado de cadastro: ativa para criação ou guardada só para histórico. */
  ativo: boolean;
  createdAt: string;
  /** Vazio no banco antigo ou quando o nome não indica a plataforma. */
  rede?: RedeSocial | null;
  /** O @, guardado sem arroba. */
  handle?: string | null;
  conexao?: ContaConexao;
  updatedAt?: string | null;
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
  /** Id da conta. */
  platformId: string;
  hashtags: string;
  /** Versão da legenda da série para esta conta. Vazio usa a legenda-base da série. */
  legenda?: string | null;
}

/** Seis funções fixas do produto. O agrupamento topo/meio/fundo é calculado. */
export type FuncaoEditorial = 'atrair' | 'converter' | 'aprofundar' | 'comunidade' | 'acao' | 'reter';

/** Objetivo padrão da série. `varia` deixa a escolha para cada roteiro. */
export type FuncaoPadraoSerie = FuncaoEditorial | 'varia';

/** De onde veio a função do roteiro. Vazio = ainda não escolhida. */
export type FuncaoOrigem = 'herdada' | 'escolhida' | 'nenhuma' | 'aplicada' | 'migrada';

/** De onde veio o pilar. `aplicada` não existe aqui. */
export type PilarOrigem = 'herdada' | 'escolhida' | 'nenhuma';

/** O roteiro ainda é o modelo da série, ou a pessoa já escreveu por cima. */
export type ScriptOrigem = 'modelo' | 'autor';

/** `regra` segue Stories/Live/reter. `manual` foi a pessoa que marcou. */
export type ContaNaGradeOrigem = 'regra' | 'manual';

export type EnergiaNivel = 'baixa' | 'média' | 'alta';

/** Lista limpa, sem vazios nem repetidos (ignora maiúsculas). */
export function normalizeFormatoList(values: ReadonlyArray<string | null | undefined> | null | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values ?? []) {
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (!value || seen.has(value.toLowerCase())) continue;
    seen.add(value.toLowerCase());
    out.push(value);
  }
  return out;
}

/**
 * Lê formato_visual_padrao / formato_apresentacao. Aceita text[] (depois da migração
 * 20261016190000) e o texto único antigo, que vira lista de um item.
 */
export function readFormatoList(value: unknown): string[] {
  if (Array.isArray(value)) return normalizeFormatoList(value.map(item => (typeof item === 'string' ? item : null)));
  if (typeof value !== 'string') return [];
  const text = value.trim();
  if (text.startsWith('[') && text.endsWith(']')) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (Array.isArray(parsed)) return readFormatoList(parsed);
    } catch {
      // texto comum
    }
  }
  return normalizeFormatoList([text]);
}

export interface Serie {
  id: string;
  userId: string;
  name: string;
  template: string;
  notes: string;
  slotPadrao: string | null;
  /** Formatos de publicação (vários). Banco antigo guardava texto único. */
  formatoVisualPadrao: string[];
  estruturaRoteiro: string | null;
  bordao: string | null;
  cor: string | null;
  capaUrl: string | null;
  ativa: boolean;
  frequenciaRecomendada: string | null;
  /** Quantas vezes a série entra no período. Ausente no banco antigo. */
  frequenciaVezes?: number | null;
  /** semana, mes ou outro texto livre. Ausente no banco antigo. */
  frequenciaUnidade?: string | null;
  /** Primeiro dia em que a frequência passa a valer. */
  frequenciaAPartirDe?: string | null;
  /** Função herdada pelos roteiros que ainda não escolhem a própria. */
  funcaoPadrao: FuncaoPadraoSerie | null;
  /** Energia aplicada aos conteúdos criados a partir da série. */
  energiaPadrao: EnergiaNivel | null;
  /** Pilar que o conteúdo herda. Ausente no banco antigo. */
  pilarPrincipalId?: string | null;
  /** Como a série aparece na tela. Ausente no banco antigo. */
  formatoApresentacao?: string[];
  motivoSalvar?: string | null;
  motivoEnviar?: string | null;
  /** Legenda que orienta os roteiros novos da série. Ausente no banco antigo. */
  legendaBase?: string | null;
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
  tipo: 'livro' | 'quadrinho' | 'filme' | 'série' | 'anime' | 'manga' | 'outro';
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
  /** Ficha do item. Colunas próprias em `biblioteca_items`, não preferência. */
  ficha?: BibliotecaItemMeta;
  /** Unidade gravada no item; nula usa o padrão do formato (ver `unidadeProgressoDoItem`). */
  unidadeProgresso?: BibliotecaUnidadeProgresso | null;
  /** Histórico de progresso (tabela `biblioteca_progresso_eventos`). Vazio se a tabela não existir. */
  progressoEventos?: BibliotecaProgressoEvento[];
}

export type BibliotecaUnidadeProgresso = 'paginas' | 'capitulos' | 'episodios' | 'minutos';

export interface BibliotecaProgressoEvento {
  id: string;
  itemId: string;
  occurredAt: string;
  delta: number;
  valorAtual: number;
  unidade: BibliotecaUnidadeProgresso;
}

/** Unidade de progresso do item: a gravada, ou o padrão do formato (mangá conta capítulos). */
export function unidadeProgressoDoItem(item: Pick<BibliotecaItem, 'tipo' | 'unidadeProgresso'>): BibliotecaUnidadeProgresso {
  if (item.unidadeProgresso) return item.unidadeProgresso;
  if (item.tipo === 'manga') return 'capitulos';
  if (item.tipo === 'filme') return 'minutos';
  if (item.tipo === 'série' || item.tipo === 'anime') return 'episodios';
  return 'paginas';
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
  /** Notas de 0 a 5 por critério (coluna jsonb `avaliacao_criterios`). */
  avaliacaoCriterios?: AvaliacaoCriterios;
}

export interface ScriptNoteReply {
  id: string;
  comment: string;
  authorName?: string;
  createdAt: string;
}

/**
 * Comentário do roteiro (JSON em contents.script_notes).
 * A âncora fica no próprio roteiro (<span data-comment-id="id">); `selection` é a posição na criação (legado).
 */
export interface ScriptNote {
  id: string;
  text: string;
  selection: { from: number; to: number };
  comment: string;
  color: string;
  createdAt: string;
  authorName?: string;
  replies?: ScriptNoteReply[];
  resolvedAt?: string | null;
}

/** Como o roteiro é escrito: texto corrido ou telas de carrossel. */
export type WritingMode = 'texto' | 'carrossel';

/** Link (URL) ou nota livre de imagem de uma tela, para usar depois no design. */
export interface CarouselImageRef {
  id: string;
  value: string;
}

/** Uma tela do carrossel (JSON em contents.carousel_slides). */
export interface CarouselSlide {
  id: string;
  /** HTML do editor de texto. */
  html: string;
  images: CarouselImageRef[];
  /** Comentários ancorados no texto desta tela. */
  comments?: ScriptNote[];
}

export type PublicationKind = 'post' | 'repost';

/**
 * Situação da publicação na conta.
 * `agendada` é legado no banco; o app lê como `prevista` (parte 1 da migração).
 */
export type PublicacaoStatus =
  | 'prevista'
  | 'programada'
  | 'publicada'
  | 'nao_publicada'
  | 'removida'
  | 'agendada';

/**
 * Publicação: a ocorrência de um conteúdo numa conta. Conta, legenda, datas,
 * status, link e métricas são desta publicação, não do conteúdo.
 */
export interface ContentPlataforma {
  id: string;
  contentId: string;
  /** Id da conta (`platforms.id`). */
  platformId: string;
  legenda: string;
  hashtags: string;
  publishDate: string | null;
  publishTime?: string | null;
  publishDateEnabled?: boolean;
  /** post = publicação original, repost = republicação */
  publicationKind?: PublicationKind;
  /** Ciclo de publicação. 1 = original; 2+ = reaproveitamento. Ausente no banco antigo = 1. */
  ciclo?: number;
  status?: PublicacaoStatus;
  /** O que a pessoa informou. A API, na fase 3, não apaga este valor. */
  realizadaManualEm?: string | null;
  realizadaApiEm?: string | null;
  postCodigo?: string | null;
  postUrl?: string | null;
  /** Id da publicação na integração. Só a integração preenche. */
  externoId?: string | null;
  /** Verdadeiro: versão própria. Falso: acompanha a legenda-base do conteúdo. */
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
  /** Por que conta ou não. Ausente no banco antigo. */
  contaNaGradeOrigem?: ContaNaGradeOrigem | null;
  /** Pilar veio da série, foi escolhido, ou a pessoa tirou. */
  pilarOrigem?: PilarOrigem | null;
  /** Modelo da série ou texto da pessoa. Não é análise do conteúdo. */
  scriptOrigem?: ScriptOrigem | null;
  /** true/false manda; null herda de scriptOrigem/texto. */
  pautaDefinida?: boolean | null;
  /** Rede de referência no momento da primeira publicação. */
  redeReferenciaCongeladaId?: string | null;
  /** Legenda compartilhada. Cada rede usa esta até adaptar a própria. */
  legendaBase?: string | null;
  publishDate: string | null;
  publishTime?: string | null;
  recordingDate: string | null;
  /** Horário local da gravação. Ausente no banco antigo. */
  recordingTime?: string | null;
  recordedAt?: string | null;
  /** Edição concluída ou dispensada: Edição · Pronto para publicar. Ausente quando não foi carregado. */
  edicaoConcluidaEm?: string | null;
  /** A pessoa dispensou a edição em vez de concluí-la. */
  edicaoDispensada?: boolean;
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
  /** Modo de escrita. Ausente quando o banco ainda não tem a coluna (vale como texto). */
  writingMode?: WritingMode;
  /** Telas do modo Carrossel. Ausente enquanto o corpo não foi carregado. */
  carouselSlides?: CarouselSlide[];
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

/** Livro usado nas atividades de um projeto. Pode apontar para a biblioteca ou só ter nome. */
export interface ProjetoLivro {
  id: string;
  projetoId: string;
  userId: string;
  nome: string;
  bibliotecaItemId: string | null;
  createdAt: string;
}

export interface Projeto {
  id: string;
  userId: string;
  nome: string;
  /**
   * A coluna `projetos.tipo` não tem CHECK.
   * `campanha` é legado de publi. `producao` permanece e não é reclassificado sozinho.
   */
  tipo: 'campanha' | 'publi' | 'parceria' | 'producao' | 'outro' | 'evento' | 'maratona';
  /** Nome livre quando `tipo` é `outro`. Reaparece como opção nos outros projetos. */
  tipoPersonalizado?: string | null;
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
  livros?: ProjetoLivro[];
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
  /** `Entrega` é o valor antigo. Os novos tipos não reescrevem os registros existentes. */
  tipo: 'Reunião' | 'Escrever roteiro' | 'Enviar roteiro' | 'Publicação' | 'Período de leitura' | 'Outro' | 'Entrega';
  projetoId: string | null;
  notes?: string | null;
  /** Último dia inclusive. Usado pelo período de leitura. Vazio = só `date`. */
  dateEnd?: string | null;
  projetoLivroId?: string | null;
  /** Livro da Biblioteca do período de leitura. Funciona com ou sem projeto. */
  bibliotecaItemId?: string | null;
  createdAt: string;
}

/** Nota anterior à ideia. Pode estar vazia ou puxar um conteúdo sem alterar o status. */
export interface PlanejamentoPostIt {
  id: string;
  userId: string;
  texto: string;
  date: string | null;
  contentId: string | null;
  /** Série, pilar e função anotados antes de virar roteiro. */
  serieId?: string | null;
  pilarId?: string | null;
  objetivo?: FuncaoEditorial | null;
  /** Redes onde vai sair. Só a plataforma, sem conta. */
  redes?: RedeSocial[];
  /** true/false manda; null herda do texto. */
  pautaDefinida?: boolean | null;
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

/** De onde vieram os números. Nada é estimado pelo app. */
export type MetricaOrigem = 'manual' | 'importacao' | 'api';

export interface ContentMetric {
  id: string;
  userId: string;
  contentId: string;
  /** Id da conta. */
  platformId: string;
  /** Publicação dona destes números. Vazio em métrica antiga ainda sem publicação única. */
  publicacaoId?: string | null;
  origem?: MetricaOrigem;
  /** Última atualização dos números. */
  atualizadoEm?: string | null;
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
  /** Id da conta. null = horário geral, usado pelas contas sem horário próprio no dia. */
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
  /** Ajustes e decisões do editorial. Uma conta, várias decisões de intervalo. */
  editorial: EditorialSettings;
  /** Janela reaberta na aba Período. Null abre na semana de hoje. */
  editorialVisao: PeriodoSelecionado | null;
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
    editorial: DEFAULT_EDITORIAL_SETTINGS,
    editorialVisao: null,
  };
}

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const cached = getCachedUserId();
  if (cached) return cached;
  // Sem evento de auth ainda: getSession le o storage local, sem ida ao servidor.
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
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

function isMissingPublishTimeColumn(error: {message?: string} | null | undefined) {
  return !!error?.message?.includes("'publish_time' column");
}

function isMissingRecordingTimeColumn(error: {message?: string} | null | undefined) {
  return !!error?.message && isMissingNamedColumn(error.message, 'recording_time');
}

const CONTENT_EDICAO_COLUMNS = ['edicao_concluida_em', 'edicao_dispensada'] as const;

/** Banco antes da migração da etapa Edição. */
function isMissingEdicaoColumns(error: {message?: string} | null | undefined) {
  const message = error?.message;
  if (!message) return false;
  return CONTENT_EDICAO_COLUMNS.some(column => isMissingNamedColumn(message, column));
}

function isMissingPublicationKindColumn(error: {message?: string} | null | undefined) {
  return !!error?.message?.includes('publication_kind');
}

function isMissingCicloColumn(error: {message?: string} | null | undefined) {
  return !!error?.message?.includes('ciclo');
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
  'frequencia_vezes',
  'frequencia_unidade',
  'frequencia_a_partir_de',
  'legenda_base',
] as const;

const MIGRACAO_CONTAS = '20261015120000_contas_legendas_metricas';

const CONTENT_CONTAGEM_ORIGEM_COLUMNS = [
  'rede_referencia_congelada_id',
  'script_origem',
  'conta_na_grade_origem',
  'pilar_origem',
] as const;

const POSTIT_OPTIONAL_COLUMNS = ['serie_id', 'pilar_id', 'objetivo', 'redes', 'pauta_definida'] as const;

function isMissingLegendaBaseColumn(error: {message?: string} | null | undefined) {
  return !!error?.message && isMissingNamedColumn(error.message, 'legenda_base');
}

function isMissingLivroIdsColumn(error: {message?: string} | null | undefined) {
  return !!error?.message && isMissingNamedColumn(error.message, 'livro_ids');
}

/** Migração que cria o modo de escrita Carrossel e a rede Blog/site. */
export const MIGRACAO_CARROSSEL_BLOG = '20261017120000_rede_blog_site_carrossel';

export class CarrosselMigracaoPendenteError extends Error {
  constructor() {
    super(`Para guardar o carrossel, aplique a migração ${MIGRACAO_CARROSSEL_BLOG}. O resto do roteiro foi salvo.`);
    this.name = 'CarrosselMigracaoPendenteError';
  }
}

export class BlogMigracaoPendenteError extends Error {
  constructor() {
    super(`Para usar Blog/site como plataforma, aplique a migração ${MIGRACAO_CARROSSEL_BLOG}.`);
    this.name = 'BlogMigracaoPendenteError';
  }
}

const CONTENT_CAROUSEL_COLUMNS = ['writing_mode', 'carousel_slides'] as const;

/** `null` = ainda não se sabe; `false` = o banco não tem as colunas do carrossel. */
let contentCarouselColumnsAvailable: boolean | null = null;

/** O banco aceita o modo Carrossel? Enquanto não se sabe, conta como sim. */
export function isCarouselStorageAvailable(): boolean {
  return contentCarouselColumnsAvailable !== false;
}

function isMissingCarouselColumns(error: {message?: string} | null | undefined) {
  const message = error?.message;
  if (!message) return false;
  return CONTENT_CAROUSEL_COLUMNS.some(column => isMissingNamedColumn(message, column));
}

/** Colunas ausentes no select (banco antigo) ficam `undefined`, não "texto vazio". */
function readCarouselColumns(row: Row): Pick<Content, 'writingMode' | 'carouselSlides'> {
  const out: Pick<Content, 'writingMode' | 'carouselSlides'> = {};
  if (row && 'writing_mode' in row) {
    contentCarouselColumnsAvailable = true;
    out.writingMode = normalizeWritingMode(row.writing_mode);
  }
  if (row && 'carousel_slides' in row) {
    out.carouselSlides = readCarouselSlides(row.carousel_slides);
  }
  return out;
}

function readLivroIds(row: Row): string[] {
  return livroIdsEfetivos({
    livroIds: Array.isArray(row.livro_ids) ? row.livro_ids.filter((id: unknown): id is string => typeof id === 'string') : undefined,
    bibliotecaItemId: typeof row.biblioteca_item_id === 'string' ? row.biblioteca_item_id : null,
  });
}

function isMissingContagemOrigemColumns(error: {message?: string} | null | undefined) {
  const message = error?.message;
  if (!message) return false;
  return CONTENT_CONTAGEM_ORIGEM_COLUMNS.some(column => isMissingNamedColumn(message, column));
}

function readScriptOrigem(value: unknown): ScriptOrigem | null {
  return value === 'modelo' || value === 'autor' ? value : null;
}

function readContaNaGradeOrigem(value: unknown): ContaNaGradeOrigem | null {
  return value === 'regra' || value === 'manual' ? value : null;
}

function readPilarOrigem(value: unknown): PilarOrigem | null {
  return value === 'herdada' || value === 'escolhida' || value === 'nenhuma' ? value : null;
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
  if (value === 'publicada' || value === 'nao_publicada' || value === 'removida' || value === 'programada' || value === 'prevista') {
    return value;
  }
  // Legado: agendada e qualquer valor estranho entram como prevista.
  return 'prevista';
}

function readRede(value: unknown): RedeSocial | null {
  return value === 'instagram' || value === 'tiktok' || value === 'youtube' || value === 'blog' || value === 'outra'
    ? value
    : null;
}

function readConexaoStatus(value: unknown): ConexaoStatus {
  return value === 'conectada' || value === 'expirada' || value === 'erro' ? value : 'nao_conectada';
}

function readTextoOpcional(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function readMetricaOrigem(value: unknown): MetricaOrigem {
  return value === 'importacao' || value === 'api' ? value : 'manual';
}

function mapContentPlataforma(p: Row): ContentPlataforma {
  return {
    id: p.id,
    contentId: p.content_id,
    platformId: String(p.platform_id),
    legenda: p.legenda || '',
    hashtags: p.hashtags || '',
    publishDate: p.publish_date,
    publishTime: p.publish_time,
    publishDateEnabled: p.publish_date_enabled ?? (p.publish_date != null),
    publicationKind: p.publication_kind === 'repost' ? 'repost' : 'post',
    ciclo: typeof p.ciclo === 'number' && p.ciclo >= 1
      ? Math.floor(p.ciclo)
      : (p.publication_kind === 'repost' ? 2 : 1),
    status: readPublicacaoStatus(p.status),
    realizadaManualEm: p.realizada_manual_em ?? null,
    realizadaApiEm: p.realizada_api_em ?? null,
    postCodigo: p.post_codigo ?? null,
    postUrl: p.post_url ?? null,
    externoId: readTextoOpcional(p.externo_id),
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

function textoFicha(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function simNaoFicha(value: unknown): 'sim' | 'nao' | undefined {
  return value === 'sim' || value === 'nao' ? value : undefined;
}

function listaFicha(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const itens = value.map(item => (typeof item === 'string' ? item.trim() : '')).filter(Boolean);
  return itens.length ? itens : undefined;
}

function fichaDaLinha(r: Row): BibliotecaItemMeta {
  const ficha: BibliotecaItemMeta = {};
  const texto = (coluna: string, campo: keyof BibliotecaItemMeta) => {
    const valor = textoFicha(r[coluna]);
    if (valor) (ficha as Record<string, unknown>)[campo] = valor;
  };
  texto('editora', 'editora');
  texto('ano_publicacao', 'anoPublicacao');
  texto('isbn', 'isbn');
  texto('idioma', 'idioma');
  texto('traducao', 'traducao');
  texto('serie_colecao', 'serieColecao');
  texto('colecao_nome', 'colecaoNome');
  texto('genero_autor', 'generoAutor');
  texto('pais_autor', 'paisAutor');
  texto('raca_autor', 'racaAutor');
  texto('duracao', 'duracao');
  texto('episodios', 'episodios');
  texto('duracao_por_episodio', 'duracaoPorEpisodio');
  texto('roteirista', 'roteirista');
  texto('distribuidora', 'distribuidora');
  texto('plataforma', 'plataforma');
  texto('data_lancamento', 'dataLancamento');
  texto('pais_origem', 'paisOrigem');
  texto('nome_da_serie', 'nomeDaSerie');
  texto('quem_indicou', 'quemIndicou');
  texto('motivo_escolha', 'motivoEscolha');
  const colecao = simNaoFicha(r.colecao_status);
  if (colecao) ficha.colecaoStatus = colecao;
  const serie = simNaoFicha(r.faz_parte_de_serie);
  if (serie) ficha.fazParteDeSerie = serie;
  const tags = listaFicha(r.tags_personalizadas);
  if (tags) ficha.tagsPersonalizadas = tags;
  const capitulos = listaFicha(r.capitulos_cobertos);
  if (capitulos) ficha.capitulosCobertos = capitulos;
  const criterios = lerAvaliacaoCriterios(r.avaliacao_criterios);
  if (criterios) ficha.avaliacaoCriterios = criterios;
  return ficha;
}

function colunaTextoFicha(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function fichaParaColunas(ficha: BibliotecaItemMeta) {
  return {
    editora: colunaTextoFicha(ficha.editora),
    ano_publicacao: colunaTextoFicha(ficha.anoPublicacao),
    isbn: colunaTextoFicha(ficha.isbn),
    idioma: colunaTextoFicha(ficha.idioma),
    traducao: colunaTextoFicha(ficha.traducao),
    serie_colecao: colunaTextoFicha(ficha.serieColecao),
    colecao_status: ficha.colecaoStatus === 'sim' || ficha.colecaoStatus === 'nao' ? ficha.colecaoStatus : null,
    colecao_nome: colunaTextoFicha(ficha.colecaoNome),
    genero_autor: colunaTextoFicha(ficha.generoAutor),
    pais_autor: colunaTextoFicha(ficha.paisAutor),
    raca_autor: colunaTextoFicha(ficha.racaAutor),
    duracao: colunaTextoFicha(ficha.duracao),
    episodios: colunaTextoFicha(ficha.episodios),
    duracao_por_episodio: colunaTextoFicha(ficha.duracaoPorEpisodio),
    roteirista: colunaTextoFicha(ficha.roteirista),
    distribuidora: colunaTextoFicha(ficha.distribuidora),
    plataforma: colunaTextoFicha(ficha.plataforma),
    data_lancamento: colunaTextoFicha(ficha.dataLancamento),
    pais_origem: colunaTextoFicha(ficha.paisOrigem),
    faz_parte_de_serie: ficha.fazParteDeSerie === 'sim' || ficha.fazParteDeSerie === 'nao' ? ficha.fazParteDeSerie : null,
    nome_da_serie: colunaTextoFicha(ficha.nomeDaSerie),
    tags_personalizadas: (ficha.tagsPersonalizadas ?? []).map(tag => tag.trim()).filter(Boolean),
    quem_indicou: colunaTextoFicha(ficha.quemIndicou),
    motivo_escolha: colunaTextoFicha(ficha.motivoEscolha),
    capitulos_cobertos: (ficha.capitulosCobertos ?? []).map(capitulo => capitulo.trim()).filter(Boolean),
    // Só vai quando o item tem avaliação por critério: os outros itens não tocam a coluna.
    ...(ficha.avaliacaoCriterios !== undefined
      ? { avaliacao_criterios: lerAvaliacaoCriterios(ficha.avaliacaoCriterios) ?? null }
      : {}),
  };
}

const mp = {
  platform: (r: Row): Platform => ({
    id: String(r.id), userId: r.user_id, nome: r.nome, ativo: r.ativo, createdAt: r.created_at,
    rede: readRede(r.rede),
    handle: readTextoOpcional(r.handle),
    conexao: {
      status: readConexaoStatus(r.conexao_status),
      provedor: readTextoOpcional(r.conexao_provedor),
      contaExternaId: readTextoOpcional(r.conexao_conta_externa_id),
      atualizadaEm: readTextoOpcional(r.conexao_atualizada_em),
    },
    updatedAt: readTextoOpcional(r.updated_at),
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
    notes: r.notes || '', slotPadrao: r.slot_padrao, formatoVisualPadrao: readFormatoList(r.formato_visual_padrao),
    estruturaRoteiro: r.estrutura_roteiro, bordao: r.bordao, cor: r.cor,
    capaUrl: r.capa_url || null,
    ativa: r.ativa ?? true, frequenciaRecomendada: r.frequencia_recomendada,
    frequenciaVezes: typeof r.frequencia_vezes === 'number' ? r.frequencia_vezes : null,
    frequenciaUnidade: typeof r.frequencia_unidade === 'string' && r.frequencia_unidade
      ? r.frequencia_unidade
      : null,
    frequenciaAPartirDe: typeof r.frequencia_a_partir_de === 'string' && r.frequencia_a_partir_de
      ? String(r.frequencia_a_partir_de).slice(0, 10)
      : null,
    funcaoPadrao: readFuncaoPadrao(r.funcao_padrao),
    energiaPadrao: readEnergiaNivel(r.energia_padrao),
    pilarPrincipalId: typeof r.pilar_principal_id === 'string' && r.pilar_principal_id ? r.pilar_principal_id : null,
    formatoApresentacao: readFormatoList(r.formato_apresentacao),
    motivoSalvar: typeof r.motivo_salvar === 'string' ? r.motivo_salvar : null,
    motivoEnviar: typeof r.motivo_enviar === 'string' ? r.motivo_enviar : null,
    legendaBase: typeof r.legenda_base === 'string' ? r.legenda_base : null,
    createdAt: r.created_at, updatedAt: r.updated_at,
    pilarIds: (r.serie_pilares || []).map((sp: Row) => sp.pilar_id),
    plataformas: (r.serie_plataformas || []).map((sp: Row) => ({
      serieId: sp.serie_id,
      platformId: String(sp.platform_id),
      hashtags: sp.hashtags || '',
      legenda: typeof sp.legenda === 'string' ? sp.legenda : null,
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
    ficha: fichaDaLinha(r),
    unidadeProgresso: r.unidade_progresso ?? null,
  }),
  progressoEvento: (r: Row): BibliotecaProgressoEvento => ({
    id: r.id, itemId: r.item_id, occurredAt: r.occurred_at,
    delta: Number(r.delta) || 0, valorAtual: Number(r.valor_atual) || 0, unidade: r.unidade,
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
    contaNaGradeOrigem: readContaNaGradeOrigem(r.conta_na_grade_origem),
    pilarOrigem: readPilarOrigem(r.pilar_origem),
    scriptOrigem: readScriptOrigem(r.script_origem),
    pautaDefinida: typeof r.pauta_definida === 'boolean' ? r.pauta_definida : null,
    redeReferenciaCongeladaId: typeof r.rede_referencia_congelada_id === 'string' && r.rede_referencia_congelada_id
      ? r.rede_referencia_congelada_id
      : null,
    legendaBase: typeof r.legenda_base === 'string' ? r.legenda_base : null,
    publishDate: r.publish_date, publishTime: r.publish_time, recordingDate: r.recording_date,
    recordingTime: typeof r.recording_time === 'string' ? r.recording_time : null,
    recordedAt: r.recorded_at ?? null, postedAt: r.posted_at ?? null,
    // Sem a coluna na consulta fica ausente, para o salvar não apagar o valor do servidor.
    ...('edicao_concluida_em' in r ? {edicaoConcluidaEm: r.edicao_concluida_em ?? null} : {}),
    ...('edicao_dispensada' in r ? {edicaoDispensada: r.edicao_dispensada === true} : {}),
    link: r.link,
    publishDateEnabled: r.publish_date_enabled ?? (r.publish_date != null),
    recordingDateEnabled: r.recording_date_enabled ?? (r.recording_date != null),
    script: r.script, scriptNotes: r.script_notes || [], tags: r.tags || [],
    notes: r.notes, referencias: r.referencias,
    writingNotes: r.writing_notes,
    ...readCarouselColumns(r),
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
    tipoPersonalizado: typeof r.tipo_personalizado === 'string' && r.tipo_personalizado.trim()
      ? r.tipo_personalizado.trim()
      : null,
    createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at,
    etapas: (r.projeto_etapas || []).map((e: Row) => ({
      id: e.id, projetoId: e.projeto_id, nome: e.nome, ordem: e.ordem,
      status: e.status, dataPrazo: e.data_prazo, createdAt: e.created_at,
    })),
    contentIds: (r.projeto_conteudos || []).map((pc: Row) => pc.content_id),
    livros: (r.projeto_livros || []).map((livro: Row) => ({
      id: livro.id,
      projetoId: livro.projeto_id,
      userId: livro.user_id,
      nome: livro.nome,
      bibliotecaItemId: livro.biblioteca_item_id ?? null,
      createdAt: livro.created_at,
    })),
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
    id: r.id, userId: r.user_id, title: r.title,
    date: r.date ? String(r.date).slice(0, 10) : r.date,
    time: r.time,
    tipo: r.tipo, projetoId: r.projeto_id, createdAt: r.created_at,
    notes: r.notes ?? null,
    dateEnd: r.date_end ? String(r.date_end).slice(0, 10) : null,
    projetoLivroId: r.projeto_livro_id ?? null,
    bibliotecaItemId: r.biblioteca_item_id ?? null,
  }),
  postIt: (r: Row): PlanejamentoPostIt => ({
    id: r.id,
    userId: r.user_id,
    texto: r.texto ?? '',
    date: r.date ? String(r.date).slice(0, 10) : null,
    contentId: r.content_id ?? null,
    serieId: typeof r.serie_id === 'string' && r.serie_id ? r.serie_id : null,
    pilarId: typeof r.pilar_id === 'string' && r.pilar_id ? r.pilar_id : null,
    objetivo: readFuncaoEditorial(r.objetivo),
    redes: normalizarRedesPostIt(r.redes),
    pautaDefinida: typeof r.pauta_definida === 'boolean' ? r.pauta_definida : null,
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
    id: r.id, userId: r.user_id, contentId: r.content_id, platformId: String(r.platform_id),
    publicacaoId: r.publicacao_id == null ? null : String(r.publicacao_id),
    origem: readMetricaOrigem(r.origem),
    atualizadoEm: readTextoOpcional(r.atualizado_em) ?? readTextoOpcional(r.created_at),
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

/**
 * Publicações chegam com o id da conta. Antes o app trocava o id pelo nome da
 * plataforma, o que confundia duas contas da mesma rede.
 */
function mapContentWithPlatforms(row: Row): Content {
  return mp.content(row);
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

const POSTED_CONTENT_STATUS = CONTENT_STATUS.POSTADO;
/** "Postado" é o valor antigo de Publicado, até a migração da etapa Edição mover os dados. */
const POSTED_CONTENT_STATUS_FILTER = `(${POSTED_CONTENT_STATUS},Postado)`;
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

function contentPlataformasSelect(includePublicacaoColumns: boolean, includeExternoId = false): string {
  const base = 'content_plataformas(id, content_id, platform_id, legenda, hashtags, publish_date, publish_time, publish_date_enabled, publication_kind';
  if (!includePublicacaoColumns) return base + ')';
  return base + ', ' + CONTENT_PLATAFORMAS_PUBLICACAO_COLUMNS + (includeExternoId ? ', externo_id' : '') + ')';
}

function isMissingExternoIdColumn(error: {message?: string} | null | undefined) {
  return !!error?.message && isMissingNamedColumn(error.message, 'externo_id');
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
  includeContagemOrigem = true,
  includeExternoId = true,
  includeWritingMode = true,
  includeEdicao = true,
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
  if (includeContagemOrigem) {
    const relation = columns[columns.length - 1];
    columns = [...columns.slice(0, -1), ...CONTENT_CONTAGEM_ORIGEM_COLUMNS, relation];
  }
  if (includeWritingMode) {
    // Leve: só o modo. As telas vêm com o corpo, como o roteiro.
    const relation = columns[columns.length - 1];
    columns = [...columns.slice(0, -1), 'writing_mode', relation];
  }
  if (includeEdicao) {
    // A lista precisa saber o que está pronto para publicar.
    const relation = columns[columns.length - 1];
    columns = [...columns.slice(0, -1), ...CONTENT_EDICAO_COLUMNS, relation];
  }
  if (includePublicacaoColumns) {
    columns = columns.map(column => (
      column.startsWith('content_plataformas(') ? contentPlataformasSelect(true, includeExternoId) : column
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
  let includeContagemOrigem = true;
  let includeExternoId = true;
  let includeWritingMode = true;
  let includeEdicao = true;

  for (let attempt = 0; attempt < 13; attempt += 1) {
    const result = await run(
      buildContentScheduleSelect(
        includeMilestones,
        includeCreationColumns,
        includeFuncaoColumns,
        includePublicacaoColumns,
        includeLegendaBase,
        includeLivroIds,
        includeRecordingTime,
        includeContagemOrigem,
        includeExternoId,
        includeWritingMode,
        includeEdicao,
      ),
    );
    if (!result.error) return result;
    if (includeEdicao && isMissingEdicaoColumns(result.error)) {
      includeEdicao = false;
      continue;
    }
    if (includeWritingMode && isMissingCarouselColumns(result.error)) {
      // Migração do carrossel ainda não rodou: a lista carrega sem o modo.
      contentCarouselColumnsAvailable = false;
      includeWritingMode = false;
      continue;
    }
    if (includeExternoId && isMissingExternoIdColumn(result.error)) {
      includeExternoId = false;
      continue;
    }
    if (includeContagemOrigem && isMissingContagemOrigemColumns(result.error)) {
      includeContagemOrigem = false;
      continue;
    }
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

  return run(buildContentScheduleSelect(false, false, false, false, false, false, false, false, false, false, false));
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
      pageRequest = pageRequest.filter('status', 'in', POSTED_CONTENT_STATUS_FILTER);
    } else if (query.listMode === 'editorial') {
      pageRequest = pageRequest.not('status', 'in', POSTED_CONTENT_STATUS_FILTER);
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

  const rows = assertQuerySuccess('contents page fetch', result) || [];

  return {
    items: await withTemaIds(rows.map((row: Row) => mapContentWithPlatforms(row))),
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

  return withTemaIds((contentsResult.data || []).map(
    (row: Row) => mapContentWithPlatforms(row),
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

  return withTemaIds((contentsResult.data || []).map(
    (row: Row) => mapContentWithPlatforms(row),
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

  const contentsResult = await contentsQuery;
  const rows = assertQuerySuccess('contents by ids fetch', contentsResult) || [];

  return withTemaIds(rows.map((row: Row) => mapContentWithPlatforms(row)));
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
      // Contador do menu: 'estimated' é exato em tabela pequena e usa a estimativa do planner nas grandes.
      .select('id', {count: 'estimated', head: true})
      .eq('user_id', userId)
      .is('deleted_at', null);
    if (includeArchiveFilter) {
      query = query.is('archived_at', null);
    }
    if (mode === 'published') {
      return includePostedAt
        ? query.or(`status.in.${POSTED_CONTENT_STATUS_FILTER},posted_at.not.is.null`)
        : query.filter('status', 'in', POSTED_CONTENT_STATUS_FILTER);
    }
    return includePostedAt
      ? query.is('posted_at', null).not('status', 'in', POSTED_CONTENT_STATUS_FILTER)
      : query.not('status', 'in', POSTED_CONTENT_STATUS_FILTER);
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
      .select('id', { count: 'estimated', head: true })
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

  // As contas vêm no bootstrap. Os vínculos usam o id, então os outros domínios não precisam delas.
  const platformsPromise = requested.has('bootstrap')
    ? supabase.from('platforms').select('*').or(`user_id.is.null,user_id.eq.${uid}`)
    : null;

  const tasks: Promise<void>[] = [];

  if (requested.has('bootstrap')) {
    tasks.push((async () => {
      const [platformsResult, prefsResult, contaResult, visaoResult, destinosResult, limitesResult, decisoesResult, ajustesResult] = await Promise.all([
        platformsPromise!,
        supabase.from('user_preferences').select('*').eq('user_id', uid),
        supabase.from('editorial_conta').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('editorial_visao').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('editorial_destino_padrao').select('platform_id').eq('user_id', uid),
        supabase.from('editorial_limite_hashtag').select('platform_id, limite').eq('user_id', uid),
        supabase.from('decisao_periodo').select('*').eq('user_id', uid),
        supabase.from('ajuste_semana').select('decisao_id, inicio, fim, limite').eq('user_id', uid),
      ]);
      const platforms = assertQuerySuccess('platforms fetch', platformsResult) || [];
      const prefs = assertQuerySuccess('preferences fetch', prefsResult) || [];
      payload.platforms = platforms.map(mp.platform);
      payload.preferences = prefs.reduce(
        (acc: Record<string, unknown>, p: Row) => ({ ...acc, [p.key]: parsePreferenceValue(p.value) }),
        {},
      );
      payload.editorial = editorialDasLinhas(
        assertQuerySuccess('editorial_conta fetch', contaResult),
        assertQuerySuccess('editorial_destino_padrao fetch', destinosResult) || [],
        assertQuerySuccess('editorial_limite_hashtag fetch', limitesResult) || [],
        assertQuerySuccess('decisao_periodo fetch', decisoesResult) || [],
        assertQuerySuccess('ajuste_semana fetch', ajustesResult) || [],
      );
      payload.editorialVisao = visaoDaLinha(assertQuerySuccess('editorial_visao fetch', visaoResult));
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
          platformId: String(p.platform_id),
          hashtags: p.hashtags || '',
          melhoresDias: Array.isArray(p.melhores_dias)
            ? p.melhores_dias.filter((day: number) => day >= 0 && day <= 6)
            : [],
          janelaHorarioInicio: p.janela_inicio ?? null,
          janelaHorarioFim: p.janela_fim ?? null,
        })),
      }));
      payload.series = seriesRows.map((row: Row) => mp.serie(row));
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
      const items = (assertQuerySuccess('biblioteca_items fetch', bibliotecaResult) || []).map(mp.bibliotecaItem);
      payload.bibliotecaItems = await anexarProgressoEventos(uid, items);
    })());
  }

  if (requested.has('content') || requested.has('content-summary') || requested.has('content-schedule')) {
    tasks.push((async () => {
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
        contentsRows.map((row: Row) => mapContentWithPlatforms(row)),
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
          .select('*, projeto_etapas(*), projeto_conteudos(content_id), projeto_livros(*)')
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
      payload.contentMetrics = (assertQuerySuccess(
        'content_metrics fetch',
        await supabase.from('content_metrics').select('*').eq('user_id', uid),
      ) || []).map(mp.contentMetric);
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

/**
 * Resolve o vínculo de conta para o id gravado no banco.
 * O app manda o id. Um nome só aparece em dado antigo (cache, preferência) e só
 * resolve quando uma única conta tem aquele nome: com duas, fica sem resolver
 * em vez de escolher uma delas em silêncio.
 */
async function resolvePlatformIds(platformRefs: string[]): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  const refs = [...new Set(platformRefs.filter(Boolean))];
  if (!supabase || refs.length === 0) return resolved;

  // A tabela é pequena; ler tudo evita comparar texto com coluna uuid.
  const uid = await currentUserId();
  const query = supabase.from('platforms').select('id, nome');
  const scopedQuery = uid ? query.or(`user_id.is.null,user_id.eq.${uid}`) : query.is('user_id', null);
  const { data, error } = await scopedQuery;
  if (error) throw new Error(`platforms resolve: ${error.message}`);

  const contas = (data || []).map((row: Row) => ({ id: String(row.id), nome: String(row.nome ?? '') }));
  const ids = new Set(contas.map(conta => conta.id));
  for (const ref of refs) {
    if (ids.has(ref)) {
      resolved.set(ref, ref);
      continue;
    }
    const mesmoNome = contas.filter(conta => conta.nome === ref);
    if (mesmoNome.length === 1) resolved.set(ref, mesmoNome[0].id);
  }
  return resolved;
}

// ============================================================================
// PREFERENCES
// ============================================================================

function inteiroOpcional(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined;
}

function diaDaLinha(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const dia = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : null;
}

function editorialDasLinhas(
  conta: Row | null,
  destinos: Row[],
  limites: Row[],
  decisoes: Row[],
  ajustes: Row[],
): EditorialSettings {
  const limitesHashtags: Record<string, number> = {};
  for (const limite of limites) {
    const quantidade = inteiroOpcional(limite.limite);
    if (typeof limite.platform_id === 'string' && quantidade != null) {
      limitesHashtags[limite.platform_id] = quantidade;
    }
  }

  const ajustesPorDecisao = new Map<string, EditorialSettings['periodos'][number]['ajustesSemana']>();
  for (const ajuste of ajustes) {
    const inicio = diaDaLinha(ajuste.inicio);
    const fim = diaDaLinha(ajuste.fim);
    const limite = inteiroOpcional(ajuste.limite);
    if (!inicio || !fim || limite == null || typeof ajuste.decisao_id !== 'string') continue;
    const lista = ajustesPorDecisao.get(ajuste.decisao_id) ?? [];
    lista.push({ inicio, fim, limite });
    ajustesPorDecisao.set(ajuste.decisao_id, lista);
  }

  const periodos = decisoes.flatMap(decisao => {
    const inicio = diaDaLinha(decisao.inicio);
    const fim = diaDaLinha(decisao.fim);
    if (!inicio || !fim) return [];
    const metas: EditorialSettings['periodos'][number]['metas'] = {};
    const atrair = inteiroOpcional(decisao.meta_atrair);
    const converter = inteiroOpcional(decisao.meta_converter);
    const aprofundar = inteiroOpcional(decisao.meta_aprofundar);
    const comunidade = inteiroOpcional(decisao.meta_comunidade);
    const acao = inteiroOpcional(decisao.meta_acao);
    const reter = inteiroOpcional(decisao.meta_reter);
    if (atrair != null) metas.atrair = atrair;
    if (converter != null) metas.converter = converter;
    if (aprofundar != null) metas.aprofundar = aprofundar;
    if (comunidade != null) metas.comunidade = comunidade;
    if (acao != null) metas.acao = acao;
    if (reter != null) metas.reter = reter;
    return [{
      inicio,
      fim,
      prioridade: typeof decisao.prioridade === 'string' ? decisao.prioridade : '',
      metas,
      ajustesSemana: ajustesPorDecisao.get(String(decisao.id)) ?? [],
    }];
  });

  if (!conta) {
    return {
      ...DEFAULT_EDITORIAL_SETTINGS,
      destinosPadrao: destinos.map(destino => String(destino.platform_id)),
      limitesHashtags,
      periodos,
    };
  }

  const rede = typeof conta.rede_referencia_id === 'string' ? conta.rede_referencia_id : null;
  const reservaProntos = inteiroOpcional(conta.reserva_prontos) ?? null;
  return {
    versao: DEFAULT_EDITORIAL_SETTINGS.versao,
    quickSeriesCreate: conta.quick_series_create !== false,
    openInfoNotices: conta.open_info_notices !== false,
    redeReferenciaId: rede,
    destinosPadrao: destinos.map(destino => String(destino.platform_id)),
    distribuicaoFuncoes: null,
    proporcaoFuncoes: readProporcao(conta.proporcao_funcoes),
    estoqueDesejado: reservaProntos,
    limitesHashtags,
    preferencias: {
      limiteSemanal: inteiroOpcional(conta.limite_semanal) ?? null,
      reservaForaSeriesSemanal: inteiroOpcional(conta.reserva_fora_series_semanal) ?? null,
      redeReferenciaId: rede,
      reservaProntos,
      publicoLinguagem: typeof conta.publico_linguagem === 'string' ? conta.publico_linguagem : '',
      disponibilidade: typeof conta.disponibilidade === 'string' ? conta.disponibilidade : '',
      hashtagsForaSeries: typeof conta.hashtags_fora_series === 'string' ? conta.hashtags_fora_series : '',
    },
    periodos,
  };
}

function visaoDaLinha(row: Row | null): PeriodoSelecionado | null {
  if (!row) return null;
  const inicio = diaDaLinha(row.inicio);
  const fim = diaDaLinha(row.fim);
  if (!inicio || !fim || inicio > fim) return null;
  if (row.modo !== 'semana' && row.modo !== 'mes' && row.modo !== 'intervalo') return null;
  return { modo: row.modo, inicio, fim };
}

export async function saveEditorial(settings: EditorialSettings): Promise<void> {
  if (!supabase) return;
  const uid = await currentUserId();
  if (!uid) return;
  const preferencias = settings.preferencias;
  const contaRow: Record<string, unknown> = {
    user_id: uid,
    limite_semanal: preferencias.limiteSemanal,
    reserva_fora_series_semanal: preferencias.reservaForaSeriesSemanal,
    rede_referencia_id: preferencias.redeReferenciaId,
    reserva_prontos: preferencias.reservaProntos,
    publico_linguagem: preferencias.publicoLinguagem,
    disponibilidade: preferencias.disponibilidade,
    hashtags_fora_series: preferencias.hashtagsForaSeries,
    quick_series_create: settings.quickSeriesCreate,
    open_info_notices: settings.openInfoNotices,
    proporcao_funcoes: settings.proporcaoFuncoes,
    updated_at: new Date().toISOString(),
  };
  let { error: contaError } = await supabase.from('editorial_conta').upsert(contaRow, { onConflict: 'user_id' });
  // Sem a migração 20261016220000 a coluna não existe: o resto grava, a proporção fica só nesta sessão.
  if (contaError && /proporcao_funcoes/.test(contaError.message)) {
    const { proporcao_funcoes: _proporcao, ...semProporcao } = contaRow;
    ({ error: contaError } = await supabase.from('editorial_conta').upsert(semProporcao, { onConflict: 'user_id' }));
  }
  if (contaError) throw new Error(`editorial_conta: ${contaError.message}`);

  const { error: destinosDeleteError } = await supabase.from('editorial_destino_padrao').delete().eq('user_id', uid);
  if (destinosDeleteError) throw new Error(`editorial_destino_padrao: ${destinosDeleteError.message}`);
  if (settings.destinosPadrao.length > 0) {
    const { error } = await supabase.from('editorial_destino_padrao').insert(
      settings.destinosPadrao.map(platformId => ({ user_id: uid, platform_id: platformId })),
    );
    if (error) throw new Error(`editorial_destino_padrao: ${error.message}`);
  }

  const { error: limitesDeleteError } = await supabase.from('editorial_limite_hashtag').delete().eq('user_id', uid);
  if (limitesDeleteError) throw new Error(`editorial_limite_hashtag: ${limitesDeleteError.message}`);
  const limites = Object.entries(settings.limitesHashtags).filter((entry): entry is [string, number] => (
    Number.isInteger(entry[1]) && entry[1] >= 0
  ));
  if (limites.length > 0) {
    const { error } = await supabase.from('editorial_limite_hashtag').insert(
      limites.map(([platformId, limite]) => ({ user_id: uid, platform_id: platformId, limite })),
    );
    if (error) throw new Error(`editorial_limite_hashtag: ${error.message}`);
  }

  const { error: ajustesDeleteError } = await supabase.from('ajuste_semana').delete().eq('user_id', uid);
  if (ajustesDeleteError) throw new Error(`ajuste_semana: ${ajustesDeleteError.message}`);
  const { error: decisoesDeleteError } = await supabase.from('decisao_periodo').delete().eq('user_id', uid);
  if (decisoesDeleteError) throw new Error(`decisao_periodo: ${decisoesDeleteError.message}`);

  if (settings.periodos.length === 0) return;
  const linhas = settings.periodos.map(periodo => ({
    id: generateUUID(),
    user_id: uid,
    inicio: periodo.inicio,
    fim: periodo.fim,
    prioridade: periodo.prioridade,
    meta_atrair: periodo.metas.atrair ?? null,
    meta_converter: periodo.metas.converter ?? null,
    meta_aprofundar: periodo.metas.aprofundar ?? null,
    meta_comunidade: periodo.metas.comunidade ?? null,
    meta_acao: periodo.metas.acao ?? null,
    meta_reter: periodo.metas.reter ?? null,
    ajustes: periodo.ajustesSemana,
  }));
  const { error: decisoesError } = await supabase.from('decisao_periodo').insert(
    linhas.map(({ ajustes: _ajustes, ...linha }) => linha),
  );
  if (decisoesError) throw new Error(`decisao_periodo: ${decisoesError.message}`);
  const ajustes = linhas.flatMap(linha => linha.ajustes.map(ajuste => ({
    decisao_id: linha.id,
    user_id: uid,
    inicio: ajuste.inicio,
    fim: ajuste.fim,
    limite: ajuste.limite,
  })));
  if (ajustes.length === 0) return;
  const { error: ajustesError } = await supabase.from('ajuste_semana').insert(ajustes);
  if (ajustesError) throw new Error(`ajuste_semana: ${ajustesError.message}`);
}

export async function saveEditorialVisao(visao: PeriodoSelecionado): Promise<void> {
  if (!supabase) return;
  const uid = await currentUserId();
  if (!uid) return;
  const { error } = await supabase.from('editorial_visao').upsert({
    user_id: uid,
    modo: visao.modo,
    inicio: visao.inicio,
    fim: visao.fim,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw new Error(`editorial_visao: ${error.message}`);
}

export async function savePreference(key: string, value: any): Promise<void> {
  if (!supabase) return;
  const uid = await currentUserId();
  if (!uid) return;
  const { error } = await supabase.from('user_preferences')
    .upsert({ user_id: uid, key, value: serializePreferenceValue(value) }, { onConflict: 'user_id,key' });
  if (error) throw new Error(`preferences: ${error.message}`);
}

const PLATFORM_ACCOUNT_COLUMNS = ['rede', 'handle', 'updated_at'] as const;

export class ContaMigracaoPendenteError extends Error {
  constructor() {
    super('Para guardar a plataforma e o @ da conta, aplique a migração 20261015120000_contas_legendas_metricas.');
    this.name = 'ContaMigracaoPendenteError';
  }
}

/** Grava a conta. A conexão não é gravada aqui: só a integração muda esse estado. */
export async function savePlatform(platform: Omit<Platform, 'createdAt'>): Promise<void> {
  if (!supabase) throw new Error('Supabase não configurado');
  const uid = platform.userId ?? (await currentUserId());
  if (!uid) throw new Error('Usuário não autenticado');
  let row: Record<string, unknown> = {
    id: platform.id,
    user_id: uid,
    nome: platform.nome,
    ativo: platform.ativo,
    rede: platform.rede ?? null,
    handle: platform.handle?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { error } = await supabase.from('platforms').upsert(row, { onConflict: 'id' });
    if (!error) return;
    if (row.rede === 'blog' && error.message?.includes('platforms_rede_check')) {
      // Banco sem a migração do Blog/site. Uma conta chamada Blog/site volta a ser lida
      // como Blog/site pelo nome; outro nome perderia a escolha, então avisa.
      if (!nomeIndicaBlog(platform.nome)) throw new BlogMigracaoPendenteError();
      row = { ...row, rede: 'outra' };
      continue;
    }
    const missing = PLATFORM_ACCOUNT_COLUMNS.find(column =>
      column in row && !!error.message && isMissingNamedColumn(error.message, column),
    );
    if (!missing) throw new Error(`platforms: ${error.message}`);
    // Sem a migração, só dá para gravar nome e estado. Plataforma e @ não podem sumir calados.
    if ((missing === 'rede' || missing === 'handle') && row[missing] != null) {
      throw new ContaMigracaoPendenteError();
    }
    const { [missing]: _removed, ...rest } = row;
    row = rest;
  }
  throw new Error('platforms: schema compatibility retries exhausted');
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
    notes: serie.notes, slot_padrao: serie.slotPadrao, formato_visual_padrao: normalizeFormatoList(serie.formatoVisualPadrao),
    estrutura_roteiro: serie.estruturaRoteiro, bordao: serie.bordao, cor: serie.cor,
    capa_url: serie.capaUrl?.trim() || null,
    ativa: serie.ativa, frequencia_recomendada: serie.frequenciaRecomendada,
    energia_padrao: serie.energiaPadrao ?? null,
    funcao_padrao: serie.funcaoPadrao ?? null,
    pilar_principal_id: serie.pilarPrincipalId ?? null,
    formato_apresentacao: normalizeFormatoList(serie.formatoApresentacao),
    motivo_salvar: serie.motivoSalvar?.trim() || null,
    motivo_enviar: serie.motivoEnviar?.trim() || null,
  };
  if ('frequenciaVezes' in serie) row.frequencia_vezes = serie.frequenciaVezes ?? null;
  if ('frequenciaUnidade' in serie) row.frequencia_unidade = serie.frequenciaUnidade?.trim() || null;
  if ('frequenciaAPartirDe' in serie) row.frequencia_a_partir_de = serie.frequenciaAPartirDe || null;
  if ('legendaBase' in serie) row.legenda_base = serie.legendaBase?.trim() ? serie.legendaBase : null;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { error } = await supabase.from('series').upsert(row);
    if (!error) return;

    const missing = SERIE_OPTIONAL_COLUMNS.find(column =>
      column in row && !!error.message && isMissingNamedColumn(error.message, column),
    );
    if (missing) {
      // A legenda da série não pode sumir calada quando a coluna ainda não existe.
      if (missing === 'legenda_base' && row.legenda_base != null) {
        throw new Error(`Para guardar a legenda da série, aplique a migração ${MIGRACAO_CONTAS}.`);
      }
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
  const platformIds = await resolvePlatformIds(plataformas.map(plataforma => plataforma.platformId));
  const rows = plataformas.map(plataforma => ({
    serie_id: serieId,
    platform_id: platformIds.get(plataforma.platformId),
    hashtags: plataforma.hashtags,
    legenda: plataforma.legenda?.trim() ? plataforma.legenda : null,
  })).filter((row): row is typeof row & { platform_id: string } => !!row.platform_id);

  const { error: deleteError } = await supabase.from('serie_plataformas').delete().eq('serie_id', serieId);
  if (deleteError) throw new Error(`serie_plataformas delete: ${deleteError.message}`);
  if (rows.length === 0) return;

  let { error } = await supabase.from('serie_plataformas').insert(rows);
  if (error && isMissingNamedColumn(error.message ?? '', 'legenda')) {
    if (rows.some(row => row.legenda != null)) {
      // Sem a coluna, as versões por conta não têm onde ficar. As hashtags voltam a ser gravadas.
      await supabase.from('serie_plataformas').insert(rows.map(({ legenda: _legenda, ...rest }) => rest));
      throw new Error(`Para guardar as versões da legenda por conta, aplique a migração ${MIGRACAO_CONTAS}.`);
    }
    ({ error } = await supabase.from('serie_plataformas').insert(rows.map(({ legenda: _legenda, ...rest }) => rest)));
  }
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

/**
 * Anexa o histórico de progresso aos itens. Se a tabela ainda não existir (migração
 * não aplicada) ou a leitura falhar, os itens seguem sem histórico.
 */
async function anexarProgressoEventos(uid: string, items: BibliotecaItem[]): Promise<BibliotecaItem[]> {
  if (!supabase || items.length === 0) return items;
  try {
    const { data, error } = await supabase.from('biblioteca_progresso_eventos')
      .select('id, item_id, occurred_at, delta, valor_atual, unidade')
      .eq('user_id', uid)
      .order('occurred_at', { ascending: true });
    if (error || !data) return items;
    const porItem = new Map<string, BibliotecaProgressoEvento[]>();
    (data as Row[]).map(mp.progressoEvento).forEach(evento => {
      const lista = porItem.get(evento.itemId) ?? [];
      lista.push(evento);
      porItem.set(evento.itemId, lista);
    });
    return items.map(item => ({ ...item, progressoEventos: porItem.get(item.id) ?? [] }));
  } catch {
    return items;
  }
}

/**
 * Registra a mudança de progresso. Nunca derruba o salvamento do item:
 * sem a tabela (migração pendente) ou sem permissão, só não registra.
 */
async function registrarProgressoEvento(
  item: Pick<BibliotecaItem, 'id' | 'userId' | 'tipo' | 'unidadeProgresso' | 'paginasLidas'>,
  anterior: number | null,
): Promise<void> {
  if (!supabase) return;
  const atual = item.paginasLidas ?? 0;
  const delta = atual - (anterior ?? 0);
  if (delta === 0) return;
  try {
    await supabase.from('biblioteca_progresso_eventos').insert({
      user_id: item.userId, item_id: item.id, delta, valor_atual: atual,
      unidade: unidadeProgressoDoItem(item),
    });
  } catch {
    // Histórico é opcional.
  }
}

export async function saveBibliotecaItem(
  item: Omit<BibliotecaItem, 'anotacoes' | 'generoIds' | 'createdAt' | 'updatedAt' | 'deletedAt'>
): Promise<void> {
  if (!supabase) return;
  let progressoAnterior: number | null | undefined;
  try {
    const { data: atual } = await supabase.from('biblioteca_items')
      .select('paginas_lidas').eq('id', item.id).maybeSingle();
    progressoAnterior = atual ? (atual as Row).paginas_lidas ?? null : undefined;
  } catch {
    progressoAnterior = undefined;
  }
  const { error } = await supabase.from('biblioteca_items').upsert({
    id: item.id, user_id: item.userId, tipo: item.tipo, titulo: item.titulo,
    autor_diretor: item.autorDiretor, capa_url: item.capaUrl, status: item.status,
    data_inicio: item.dataInicio, data_fim: item.dataFim, avaliacao: item.avaliacao,
    notas_gerais: item.notasGerais, potencial_conteudo: item.potencialConteudo,
    total_paginas: item.totalPaginas, paginas_lidas: item.paginasLidas,
    ...(item.ficha ? fichaParaColunas(item.ficha) : {}),
  });
  if (error) throw new Error(`biblioteca_items: ${error.message}`);
  // Item novo (sem linha antes) com progresso também registra, a partir de zero.
  if (progressoAnterior !== undefined || (item.paginasLidas ?? 0) > 0) {
    await registrarProgressoEvento(item, progressoAnterior ?? null);
  }
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
    // Só grava o que veio carregado: sem o valor, o do servidor fica.
    ...(content.edicaoConcluidaEm !== undefined ? {edicao_concluida_em: content.edicaoConcluidaEm} : {}),
    ...(content.edicaoDispensada !== undefined ? {edicao_dispensada: content.edicaoDispensada} : {}),
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
    ...('contaNaGradeOrigem' in content ? {conta_na_grade_origem: content.contaNaGradeOrigem ?? null} : {}),
    ...('pilarOrigem' in content ? {pilar_origem: content.pilarOrigem ?? null} : {}),
    ...('scriptOrigem' in content ? {script_origem: content.scriptOrigem ?? null} : {}),
    ...('redeReferenciaCongeladaId' in content
      ? {rede_referencia_congelada_id: content.redeReferenciaCongeladaId ?? null}
      : {}),
    ...(content.writingNotes !== undefined ? {writing_notes: content.writingNotes} : {}),
    // Só grava o que veio carregado: lista leve não traz as telas e não pode apagá-las.
    ...(content.writingMode !== undefined ? {writing_mode: content.writingMode} : {}),
    ...(content.carouselSlides !== undefined ? {carousel_slides: content.carouselSlides} : {}),
    archived_at: content.archivedAt ?? null,
    legacy_idea_id: content.legacyIdeaId ?? null,
    updated_at: new Date().toISOString(),
  };

  // Sem a migração do carrossel, o resto do roteiro é salvo e o carrossel avisa que não foi.
  let carouselDropped = false;

  for (let attempt = 0; attempt < 16; attempt += 1) {
    const {error} = await supabase.from('contents').upsert(row);
    if (!error) {
      if (carouselDropped) throw new CarrosselMigracaoPendenteError();
      return;
    }

    if (isMissingCarouselColumns(error) && ('writing_mode' in row || 'carousel_slides' in row)) {
      contentCarouselColumnsAvailable = false;
      const slides = row.carousel_slides;
      carouselDropped = row.writing_mode === 'carrossel'
        || (Array.isArray(slides) && slidesHaveContent(slides as CarouselSlide[]));
      const {writing_mode: _writingMode, carousel_slides: _carouselSlides, ...rowWithoutCarousel} = row;
      row = rowWithoutCarousel;
      continue;
    }

    if (isMissingLivroIdsColumn(error) && 'livro_ids' in row) {
      const {livro_ids: _livroIds, ...rowWithoutLivroIds} = row;
      row = rowWithoutLivroIds;
      continue;
    }

    if (isMissingEdicaoColumns(error) && ('edicao_concluida_em' in row || 'edicao_dispensada' in row)) {
      const {edicao_concluida_em: _edicaoConcluidaEm, edicao_dispensada: _edicaoDispensada, ...rowWithoutEdicao} = row;
      row = rowWithoutEdicao;
      continue;
    }

    if (isMissingLegendaBaseColumn(error) && 'legenda_base' in row) {
      const {legenda_base: _legendaBase, ...rowWithoutLegendaBase} = row;
      row = rowWithoutLegendaBase;
      continue;
    }

    const missingContagem = CONTENT_CONTAGEM_ORIGEM_COLUMNS.find(column =>
      column in row && !!error.message && isMissingNamedColumn(error.message, column),
    );
    if (missingContagem) {
      const {[missingContagem]: _removed, ...rowWithoutContagem} = row;
      row = rowWithoutContagem;
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
      ciclo: plataforma.ciclo ?? (plataforma.publicationKind === 'repost' ? 2 : 1),
      status: plataforma.status === 'agendada' ? 'prevista' : (plataforma.status ?? 'prevista'),
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
    let includeCiclo = true;
    let includeTime = true;
    let saved = rows.length === 0;

    const upsertRows = async (payload: Array<Record<string, unknown>>) => {
      const {error} = await supabase.from('content_plataformas').upsert(payload);
      return error;
    };

    for (let attempt = 0; attempt < 8 && !saved; attempt += 1) {
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
        if (!includeCiclo) delete next.ciclo;
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
      if (includeCiclo && isMissingCicloColumn(error)) {
        includeCiclo = false;
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
    tipo_personalizado: tipo === 'outro' ? (projeto.tipoPersonalizado?.trim() || null) : null,
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

export async function saveProjetoLivro(livro: ProjetoLivro): Promise<void> {
  if (!supabase) return;
  const uid = await currentUserId();
  if (!uid) throw new Error('projeto_livros: authenticated session unavailable');
  const { error } = await supabase.from('projeto_livros').upsert({
    id: livro.id,
    projeto_id: livro.projetoId,
    user_id: uid,
    nome: livro.nome.trim(),
    biblioteca_item_id: livro.bibliotecaItemId,
  });
  if (error) throw new Error(`projeto_livros: ${error.message}`);
}

export async function saveAgendaItem(item: Omit<AgendaItem, 'createdAt'>): Promise<void> {
  if (!supabase) return;
  const periodo = item.tipo === 'Período de leitura';
  const row = {
    id: item.id, user_id: item.userId, title: item.title, date: item.date,
    time: item.time || null, tipo: item.tipo, projeto_id: item.projetoId,
    notes: item.notes?.trim() || null,
    date_end: periodo ? (item.dateEnd || null) : null,
    projeto_livro_id: periodo ? (item.projetoLivroId || null) : null,
  };
  let { error } = await supabase.from('agenda_items').upsert({
    ...row,
    biblioteca_item_id: periodo ? (item.bibliotecaItemId || null) : null,
  });
  if (error && isMissingNamedColumn(error.message ?? '', 'biblioteca_item_id')) {
    // Banco sem a migration 20261025160000: grava o evento sem o vínculo com a Biblioteca.
    ({ error } = await supabase.from('agenda_items').upsert(row));
  }
  if (error) throw new Error(`agenda_items: ${error.message}`);
}

export async function deleteAgendaItem(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('agenda_items').delete().eq('id', id);
  if (error) throw new Error(`delete agenda_item: ${error.message}`);
}

export async function savePlanejamentoPostIt(item: PlanejamentoPostIt): Promise<void> {
  if (!supabase) return;
  let row: Record<string, unknown> = {
    id: item.id,
    user_id: item.userId,
    texto: item.texto ?? '',
    date: item.date,
    content_id: item.contentId,
    serie_id: item.serieId ?? null,
    pilar_id: item.pilarId ?? null,
    objetivo: item.objetivo ?? null,
    redes: normalizarRedesPostIt(item.redes ?? []),
    pauta_definida: item.pautaDefinida ?? null,
    updated_at: item.updatedAt || new Date().toISOString(),
  };

  for (let attempt = 0; attempt <= POSTIT_OPTIONAL_COLUMNS.length; attempt += 1) {
    const {error} = await supabase.from('planejamento_postits').upsert(row);
    if (!error) return;
    if (error.message?.includes('planejamento_postits_redes_check') && Array.isArray(row.redes) && row.redes.includes('blog')) {
      throw new BlogMigracaoPendenteError();
    }
    const missing = POSTIT_OPTIONAL_COLUMNS.find(column =>
      column in row && !!error.message && isMissingNamedColumn(error.message, column),
    );
    if (!missing) throw new Error(`planejamento_postits: ${error.message}`);
    const {[missing]: _removed, ...rest} = row;
    row = rest;
  }

  throw new Error('planejamento_postits: schema compatibility retries exhausted');
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

/**
 * Métrica da publicação. Com `publicacaoId`, cada publicação tem a sua linha:
 * o mesmo vídeo em duas contas guarda dois resultados.
 * Sem a migração, volta ao formato antigo (uma linha por conteúdo e conta).
 */
export async function saveContentMetric(metric: Omit<ContentMetric, 'id' | 'createdAt'> & { id?: string }): Promise<void> {
  if (!supabase) return;
  const platformIds = await resolvePlatformIds([metric.platformId]);
  const platformId = platformIds.get(metric.platformId);
  if (!platformId) throw new Error(`content_metrics: conta não encontrada para "${metric.platformId}"`);
  const numeros = {
    user_id: metric.userId, content_id: metric.contentId, platform_id: platformId,
    views: metric.views, likes: metric.likes, comments: metric.comments,
    saves: metric.saves, shares: metric.shares, reposts: metric.reposts,
    new_followers: metric.newFollowers, accounts_reached: metric.accountsReached,
    watch_time: metric.watchTime, retention_rate: metric.retentionRate,
    completion_rate: metric.completionRate, qualitative_notes: metric.qualitativeNotes,
    registered_at: metric.registeredAt,
  };

  if (metric.publicacaoId) {
    const row = {
      ...numeros,
      publicacao_id: metric.publicacaoId,
      origem: metric.origem ?? 'manual',
      atualizado_em: metric.atualizadoEm ?? new Date().toISOString(),
    };
    const existente = metric.id
      ? { data: { id: metric.id }, error: null }
      : await supabase.from('content_metrics').select('id').eq('publicacao_id', metric.publicacaoId).maybeSingle();
    if (existente.error && !isMissingNamedColumn(existente.error.message ?? '', 'publicacao_id')) {
      throw new Error(`content_metrics: ${existente.error.message}`);
    }
    if (!existente.error) {
      const { error } = existente.data?.id
        ? await supabase.from('content_metrics').update(row).eq('id', existente.data.id)
        : await supabase.from('content_metrics').insert(row);
      if (!error) return;
      if (!['publicacao_id', 'origem', 'atualizado_em'].some(column => isMissingNamedColumn(error.message ?? '', column))) {
        throw new Error(`content_metrics: ${error.message}`);
      }
    }
  }

  const { error } = await supabase.from('content_metrics').upsert(numeros, { onConflict: 'content_id,platform_id' });
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
