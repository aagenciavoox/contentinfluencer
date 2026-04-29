import { supabase } from './supabase';

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
}

export interface Pilar {
  id: string;
  userId: string;
  nome: string;
  descricao: string;
  cor: string;
  ativo: boolean;
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
  tipo: 'livro' | 'filme' | 'série' | 'outro';
  titulo: string;
  autorDiretor: string;
  capaUrl: string | null;
  status: 'Quero consumir' | 'Consumindo' | 'Pausado' | 'Concluído';
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

export interface ScriptNote {
  id: string;
  text: string;
  selection: { from: number; to: number };
  comment: string;
  color: string;
  createdAt: string;
}

export interface ContentPlataforma {
  id: string;
  contentId: string;
  platformId: string;
  legenda: string;
  hashtags: string;
  publishDate: string | null;
}

export interface Content {
  id: string;
  userId: string;
  title: string;
  status: string;
  slotType: 'ÚNICO' | 'SÉRIE' | 'JANELA' | null;
  seriesId: string | null;
  pilarId: string | null;
  lookId: string | null;
  cenarioId: string | null;
  bibliotecaItemId: string | null;
  formatoVisual: string | null;
  energiaNecessaria: 'baixa' | 'média' | 'alta' | null;
  publishDate: string | null;
  recordingDate: string | null;
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
  text: string;
  pilarId: string | null;
  seriesId: string | null;
  origemId: string | null;
  promotedToContentId: string | null;
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
  value: number | null;
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  etapas: ProjetoEtapa[];
  contentIds: string[];
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
  tipo: 'pilar' | 'série' | 'formato' | 'publi' | 'plataforma';
  condicao: 'max' | 'min' | 'recomendado';
  periodo: 'dia' | 'semana' | 'mês';
  valor: number;
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

export interface AppData {
  platforms: Platform[];
  preferences: Record<string, any>;
  dnaVoz: DnaVoz | null;
  pilares: Pilar[];
  series: Serie[];
  cenarios: Cenario[];
  looks: Look[];
  bibliotecaItems: BibliotecaItem[];
  contents: Content[];
  ideas: Idea[];
  projetos: Projeto[];
  recordingBlocks: RecordingBlock[];
  templates: Template[];
  agendaItems: AgendaItem[];
  goldenRules: GoldenRule[];
  contentMetrics: ContentMetric[];

  // Aliases for legacy support (will be mapped in AppContext)
  books: BibliotecaItem[];
  partnerships: Projeto[];
  results: ContentMetric[];
  agenda: AgendaItem[];
}

export interface EnergyLog {
  id: string;
  userId: string;
  date: string;
  level: number;
  notes?: string;
  createdAt?: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function empty(): AppData {
  return {
    platforms: [], preferences: {}, dnaVoz: null, pilares: [], series: [],
    cenarios: [], looks: [], bibliotecaItems: [],
    contents: [], ideas: [], projetos: [], recordingBlocks: [], templates: [],
    agendaItems: [], goldenRules: [], contentMetrics: [],
    books: [], partnerships: [], results: [], agenda: [],
  };
}

async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user.id ?? null;
}

// ============================================================================
// MAPPERS (DB row → app type)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

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
    cor: r.cor, ativo: r.ativo, createdAt: r.created_at, updatedAt: r.updated_at,
    plataformas: (r.pilar_plataformas || []).map((p: Row) => ({
      pilarId: p.pilar_id, platformId: p.platform_id, hashtags: p.hashtags || '',
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
    createdAt: r.created_at, deletedAt: r.deleted_at,
  }),
  bibliotecaItem: (r: Row): BibliotecaItem => ({
    id: r.id, userId: r.user_id, tipo: r.tipo, titulo: r.titulo,
    autorDiretor: r.autor_diretor || '', capaUrl: r.capa_url, status: r.status,
    dataInicio: r.data_inicio, dataFim: r.data_fim, avaliacao: r.avaliacao,
    notasGerais: r.notas_gerais, potencialConteudo: r.potencial_conteudo,
    totalPaginas: r.total_paginas, paginasLidas: r.paginas_lidas,
    createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at,
    generoIds: (r.item_generos || []).map((g: Row) => g.genero_id),
    anotacoes: (r.anotacoes || []).filter((a: Row) => !a.deleted_at).map(mp.anotacao),
  }),
  content: (r: Row): Content => ({
    id: r.id, userId: r.user_id, title: r.title, status: r.status,
    slotType: r.slot_type, seriesId: r.series_id, pilarId: r.pilar_id,
    lookId: r.look_id, cenarioId: r.cenario_id, bibliotecaItemId: r.biblioteca_item_id,
    formatoVisual: r.formato_visual, energiaNecessaria: r.energia_necessaria,
    publishDate: r.publish_date, recordingDate: r.recording_date, link: r.link,
    script: r.script, scriptNotes: r.script_notes || [], tags: r.tags || [],
    notes: r.notes, referencias: r.referencias,
    createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at,
    plataformas: (r.content_plataformas || []).map((p: Row) => ({
      id: p.id, contentId: p.content_id, platformId: p.platform_id,
      legenda: p.legenda || '', hashtags: p.hashtags || '', publishDate: p.publish_date,
    })),
  }),
  idea: (r: Row): Idea => ({
    id: r.id, userId: r.user_id, text: r.text, pilarId: r.pilar_id,
    seriesId: r.series_id, origemId: r.origem_id,
    promotedToContentId: r.promoted_to_content_id, archived: r.archived,
    createdAt: r.created_at,
  }),
  projeto: (r: Row): Projeto => ({
    id: r.id, userId: r.user_id, nome: r.nome, tipo: r.tipo, status: r.status,
    dataInicio: r.data_inicio, dataFim: r.data_fim, metaConteudos: r.meta_conteudos,
    bibliotecaItemId: r.biblioteca_item_id, brand: r.brand, brandColor: r.brand_color,
    value: r.value, currency: r.currency || 'BRL', notes: r.notes,
    createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at,
    etapas: (r.projeto_etapas || []).map((e: Row) => ({
      id: e.id, projetoId: e.projeto_id, nome: e.nome, ordem: e.ordem,
      status: e.status, dataPrazo: e.data_prazo, createdAt: e.created_at,
    })),
    contentIds: (r.projeto_conteudos || []).map((pc: Row) => pc.content_id),
  }),
  recordingBlock: (r: Row): RecordingBlock => ({
    id: r.id, userId: r.user_id, name: r.name, createdAt: r.created_at,
    contents: (r.recording_block_contents || []).map((c: Row) => ({
      blockId: c.block_id, contentId: c.content_id, ordem: c.ordem, gravado: c.gravado,
    })),
  }),
  template: (r: Row): Template => ({
    id: r.id, userId: r.user_id, nome: r.nome, platformId: r.platform_id,
    seriesId: r.series_id, estrutura: r.estrutura || [], ativo: r.ativo,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }),
  agendaItem: (r: Row): AgendaItem => ({
    id: r.id, userId: r.user_id, title: r.title, date: r.date, time: r.time,
    tipo: r.tipo, projetoId: r.projeto_id, createdAt: r.created_at,
  }),
  goldenRule: (r: Row): GoldenRule => ({
    id: r.id, userId: r.user_id, descricao: r.descricao, tipo: r.tipo,
    condicao: r.condicao, periodo: r.periodo, valor: r.valor, ativa: r.ativa,
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
};

// ============================================================================
// FETCH
// ============================================================================

export async function fetchAllData(): Promise<AppData> {
  if (!supabase) return empty();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return empty();
  const uid = session.user.id;

  const [
    { data: platforms },
    { data: prefs },
    { data: dnaVozRow },
    { data: pilaresRows },
    { data: seriesRows },
    { data: cenariosRows },
    { data: looksRows },
    { data: bibliotecaRows },
    { data: contentsRows },
    { data: ideasRows },
    { data: projetosRows },
    { data: blocksRows },
    { data: templatesRows },
    { data: agendaRows },
    { data: rulesRows },
    { data: metricsRows },
  ] = await Promise.all([
    supabase.from('platforms').select('*').or(`user_id.is.null,user_id.eq.${uid}`).eq('ativo', true),
    supabase.from('user_preferences').select('*').eq('user_id', uid),
    supabase.from('dna_voz').select('*').eq('user_id', uid).maybeSingle(),
    supabase.from('pilares').select('*, pilar_plataformas(*)').eq('user_id', uid),
    supabase.from('series').select('*, serie_pilares(pilar_id), serie_plataformas(*)').eq('user_id', uid),
    supabase.from('cenarios').select('*').eq('user_id', uid),
    supabase.from('looks').select('*').eq('user_id', uid).order('numero'),
    supabase.from('biblioteca_items')
      .select('*, item_generos(genero_id), anotacoes(*)')
      .eq('user_id', uid).is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('contents')
      .select('*, content_plataformas(*)')
      .eq('user_id', uid).is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('ideas').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
    supabase.from('projetos')
      .select('*, projeto_etapas(*), projeto_conteudos(content_id)')
      .eq('user_id', uid).is('deleted_at', null)
      .order('created_at', { ascending: false }),
    supabase.from('recording_blocks')
      .select('*, recording_block_contents(*)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false }),
    supabase.from('templates').select('*').eq('user_id', uid),
    supabase.from('agenda_items').select('*').eq('user_id', uid).order('date'),
    supabase.from('golden_rules').select('*').eq('user_id', uid),
    supabase.from('content_metrics').select('*').eq('user_id', uid),
  ]);

  return {
    platforms:        (platforms       || []).map(mp.platform),
    preferences:      (prefs           || []).reduce((acc: Record<string, any>, p: Row) => ({ ...acc, [p.key]: p.value }), {}),
    dnaVoz:           dnaVozRow ? mp.dnaVoz(dnaVozRow) : null,
    pilares:          (pilaresRows     || []).map(mp.pilar),
    series:           (seriesRows      || []).map(mp.serie),
    cenarios:         (cenariosRows    || []).map(mp.cenario),
    looks:            (looksRows       || []).map(mp.look),
    bibliotecaItems:  (bibliotecaRows  || []).map(mp.bibliotecaItem),
    contents:         (contentsRows    || []).map(mp.content),
    ideas:            (ideasRows       || []).map(mp.idea),
    projetos:         (projetosRows    || []).map(mp.projeto),
    recordingBlocks:  (blocksRows      || []).map(mp.recordingBlock),
    templates:        (templatesRows || []).map(mp.template),
    agendaItems:      (agendaRows    || []).map(mp.agendaItem),
    goldenRules:      (rulesRows     || []).map(mp.goldenRule),
    contentMetrics:   (metricsRows   || []).map(mp.contentMetric),
    // Legacy aliases
    books:            (bibliotecaRows  || []).map(mp.bibliotecaItem),
    partnerships:     (projetosRows    || []).map(mp.projeto),
    results:          (metricsRows     || []).map(mp.contentMetric),
    agenda:           (agendaRows      || []).map(mp.agendaItem),
  };
}

// ============================================================================
// PREFERENCES
// ============================================================================

export async function savePreference(key: string, value: any): Promise<void> {
  if (!supabase) return;
  const uid = await currentUserId();
  if (!uid) return;
  const { error } = await supabase.from('user_preferences')
    .upsert({ user_id: uid, key, value }, { onConflict: 'user_id,key' });
  if (error) throw new Error(`preferences: ${error.message}`);
}

// ============================================================================
// DNA DA VOZ
// ============================================================================

export async function saveDnaVoz(
  dna: Pick<DnaVoz, 'promessaCentral' | 'publico' | 'tom' | 'naoFaco' | 'alertas'>
): Promise<void> {
  if (!supabase) return;
  const uid = await currentUserId();
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
  });
  if (error) throw new Error(`pilares: ${error.message}`);
}

export async function savePilarPlataformas(pilarId: string, plataformas: PilarPlataforma[]): Promise<void> {
  if (!supabase) return;
  await supabase.from('pilar_plataformas').delete().eq('pilar_id', pilarId);
  if (plataformas.length === 0) return;
  const { error } = await supabase.from('pilar_plataformas').insert(
    plataformas.map(p => ({ pilar_id: pilarId, platform_id: p.platformId, hashtags: p.hashtags }))
  );
  if (error) throw new Error(`pilar_plataformas: ${error.message}`);
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
  await supabase.from('serie_pilares').delete().eq('serie_id', serieId);
  if (pilarIds.length === 0) return;
  const { error } = await supabase.from('serie_pilares').insert(
    pilarIds.map(pid => ({ serie_id: serieId, pilar_id: pid }))
  );
  if (error) throw new Error(`serie_pilares: ${error.message}`);
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
  await supabase.from('item_generos').delete().eq('item_id', itemId);
  if (generoIds.length === 0) return;
  const { error } = await supabase.from('item_generos').insert(
    generoIds.map(gid => ({ item_id: itemId, genero_id: gid }))
  );
  if (error) throw new Error(`item_generos: ${error.message}`);
}

export async function deleteBibliotecaItem(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('biblioteca_items')
    .update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`delete biblioteca_item: ${error.message}`);
}

export async function saveAnotacao(anotacao: Omit<Anotacao, 'createdAt' | 'deletedAt'>): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('anotacoes').upsert({
    id: anotacao.id, user_id: anotacao.userId, item_id: anotacao.itemId,
    texto: anotacao.texto, tipo: anotacao.tipo, capitulo_ref: anotacao.capituloRef,
    content_potential: anotacao.contentPotential,
  });
  if (error) throw new Error(`anotacoes: ${error.message}`);
}

export async function deleteAnotacao(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('anotacoes')
    .update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`delete anotacao: ${error.message}`);
}

// ============================================================================
// CONTEÚDOS
// ============================================================================

export async function saveContent(
  content: Omit<Content, 'plataformas' | 'updatedAt' | 'deletedAt'>
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('contents').upsert({
    id: content.id, user_id: content.userId, title: content.title,
    status: content.status, slot_type: content.slotType, series_id: content.seriesId,
    pilar_id: content.pilarId, look_id: content.lookId, cenario_id: content.cenarioId,
    biblioteca_item_id: content.bibliotecaItemId, formato_visual: content.formatoVisual,
    energia_necessaria: content.energiaNecessaria, publish_date: content.publishDate,
    recording_date: content.recordingDate, link: content.link, script: content.script,
    script_notes: content.scriptNotes, tags: content.tags,
    notes: content.notes, referencias: content.referencias,
  });
  if (error) throw new Error(`contents: ${error.message}`);
}

export async function saveContentPlataformas(
  contentId: string,
  plataformas: Omit<ContentPlataforma, 'id' | 'contentId'>[]
): Promise<void> {
  if (!supabase) return;
  await supabase.from('content_plataformas').delete().eq('content_id', contentId);
  if (plataformas.length === 0) return;
  const { error } = await supabase.from('content_plataformas').insert(
    plataformas.map(p => ({
      content_id: contentId, platform_id: p.platformId,
      legenda: p.legenda, hashtags: p.hashtags, publish_date: p.publishDate,
    }))
  );
  if (error) throw new Error(`content_plataformas: ${error.message}`);
}

export async function deleteContent(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('contents')
    .update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`delete content: ${error.message}`);
}

// ============================================================================
// IDEIAS
// ============================================================================

export async function saveIdea(idea: Omit<Idea, 'createdAt'>): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('ideas').upsert({
    id: idea.id, user_id: idea.userId, text: idea.text, pilar_id: idea.pilarId,
    series_id: idea.seriesId, origem_id: idea.origemId,
    promoted_to_content_id: idea.promotedToContentId, archived: idea.archived,
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
  const { error } = await supabase.from('projetos').upsert({
    id: projeto.id, user_id: projeto.userId, nome: projeto.nome, tipo: projeto.tipo,
    status: projeto.status, data_inicio: projeto.dataInicio, data_fim: projeto.dataFim,
    meta_conteudos: projeto.metaConteudos, biblioteca_item_id: projeto.bibliotecaItemId,
    brand: projeto.brand, brand_color: projeto.brandColor, value: projeto.value,
    currency: projeto.currency, notes: projeto.notes,
  });
  if (error) throw new Error(`projetos: ${error.message}`);
}

export async function deleteProjeto(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('projetos')
    .update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(`delete projeto: ${error.message}`);
}

// ============================================================================
// GRAVAÇÃO
// ============================================================================

export async function saveRecordingBlock(block: Omit<RecordingBlock, 'contents' | 'createdAt'>): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('recording_blocks').upsert({
    id: block.id, user_id: block.userId, name: block.name,
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
    estrutura: template.estrutura, ativo: template.ativo,
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
    id: rule.id, user_id: rule.userId, descricao: rule.descricao, tipo: rule.tipo,
    condicao: rule.condicao, periodo: rule.periodo, valor: rule.valor, ativa: rule.ativa,
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
  const { error } = await supabase.from('content_metrics').upsert({
    user_id: metric.userId, content_id: metric.contentId, platform_id: metric.platformId,
    views: metric.views, likes: metric.likes, comments: metric.comments,
    saves: metric.saves, shares: metric.shares, reposts: metric.reposts,
    new_followers: metric.newFollowers, accounts_reached: metric.accountsReached,
    watch_time: metric.watchTime, retention_rate: metric.retentionRate,
    completion_rate: metric.completionRate, qualitative_notes: metric.qualitativeNotes,
    registered_at: metric.registeredAt,
  }, { onConflict: 'content_id,platform_id' });
  if (error) throw new Error(`content_metrics: ${error.message}`);
}

export async function deleteContentMetric(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('content_metrics').delete().eq('id', id);
  if (error) throw new Error(`delete content_metric: ${error.message}`);
}
