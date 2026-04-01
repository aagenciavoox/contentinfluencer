// ─── Status e tipos base ─────────────────────────────────────────────────────

export type ContentStatus =
  | 'Ideia'
  | 'Pronto para Gravar'
  | 'Gravado'
  | 'A Editar'
  | 'Editado'
  | 'Programado'
  | 'Postado';

export type SlotType = 'Curto' | 'Série' | 'Janela';

// Plataformas de publicação
export type Platform = 'Instagram' | 'TikTok' | 'YouTube' | 'Blog';

// Formato visual de produção (separado de plataforma)
export type VisualFormat =
  | 'Talking Head'
  | 'Tela Verde'
  | 'Voiceover'
  | 'POV Texto'
  | 'Reação'
  | 'Vlog'
  | 'Misto';

// ContentFormat e ContentPillar mantidos como string para retrocompatibilidade
export type ContentFormat = string;
export type ContentPillar = string;

// ─── Entidades de Configuração ────────────────────────────────────────────────

export interface Pilar {
  id: string;
  nome: string;
  descricao: string;
  cor: string; // hex, ex: '#FFCC00'
  hashtagsInstagram: string; // 5 hashtags separadas por espaço
  hashtagsTikTok: string;
  hashtagsYouTube: string;
  templateLegenda: string; // com variáveis {{titulo}} e {{cta}}
  ativo: boolean;
}

export interface Look {
  id: string;
  numero: number;
  descricao: string;
  cenarioAssociadoId?: string;
  ativo: boolean;
}

export interface Cenario {
  id: string;
  nome: string;
  descricao: string;
  tempoSetupMinutos: number;
  ativo: boolean;
}

// ─── Livros e Anotações ───────────────────────────────────────────────────────

export type StatusLeitura = 'Quero ler' | 'Lendo' | 'Pausado' | 'Lido';

export type GeneroLivro =
  | 'Fantasy'
  | 'Dark Romance'
  | 'Ficção Científica'
  | 'Clássico'
  | 'Não-ficção'
  | 'Romance'
  | 'Thriller'
  | 'Horror'
  | 'Outro';

export type TipoAnotacao =
  | 'Trecho'
  | 'Reação'
  | 'Análise'
  | 'Ideia de conteúdo'
  | 'Pergunta';

export interface BookAnnotation {
  id: string;
  livroId: string;
  texto: string;
  tipo: TipoAnotacao;
  capituloRef?: string;
  destilada: boolean;
  createdAt: string;
}

export interface Book {
  id: string;
  titulo: string;
  autor: string;
  generos: GeneroLivro[];
  capaUrl?: string;
  statusLeitura: StatusLeitura;
  dataInicio?: string;
  dataFim?: string;
  avaliacao?: 1 | 2 | 3 | 4 | 5;
  notasGerais?: string;
  anotacoes: BookAnnotation[];
  createdAt: string;
}

// ─── Conteúdo ─────────────────────────────────────────────────────────────────

export interface Content {
  id: string;
  title: string;
  seriesId: string;
  pillar: ContentPillar;
  format: ContentFormat; // legado — mantido para retrocompatibilidade
  status: ContentStatus;
  slotType?: SlotType;
  publishDate?: string;
  recordingDate?: string;
  lookId?: string;
  scenario?: string;
  estimatedDuration?: number;
  link?: string;
  script?: string;
  caption?: string; // legado — mantido para retrocompatibilidade
  tags?: string;
  notes?: string;
  references?: string;
  createdAt: string;
  // Novos campos
  plataformas?: Platform[];
  formatoVisual?: VisualFormat;
  livroOrigemId?: string;
  legendas?: Partial<Record<Platform, string>>;
}

// ─── Ideia ────────────────────────────────────────────────────────────────────

export interface Idea {
  id: string;
  text: string;
  createdAt: string;
  pillar?: ContentPillar;
  seriesId?: string;
  promotedToContentId?: string;
  archived: boolean;
  livroOrigemId?: string; // Novo: vinculação com livro
}

// ─── Série ────────────────────────────────────────────────────────────────────

export interface Series {
  id: string;
  name: string;
  template: string;
  notes: string;
  // Novos campos
  pilarId?: string;
  slotPadrao?: SlotType;
  plataformasPrincipais?: Platform[];
  formatoVisualPadrao?: VisualFormat;
  estruturaRoteiro?: string;
  bordao?: string;
  cor?: string;
  ativa?: boolean;
  frequenciaRecomendada?: 'Semanal' | 'Quinzenal' | 'Mensal' | 'Sob demanda';
}

// ─── Parceria ─────────────────────────────────────────────────────────────────

export type PartnershipStatus =
  | 'Leitura'
  | 'Roteiro'
  | 'Envio de Roteiro'
  | 'Gravação'
  | 'Edição'
  | 'Aprovação'
  | 'Postagem'
  | 'Métricas';

export interface Partnership {
  id: string;
  brand: string;
  brandColor: string;
  title: string;
  status: PartnershipStatus;
  deadline?: string;
  publishDate?: string;
  recordingDate?: string;
  value?: number;
  notes?: string;
  script?: string;
  link?: string;
  createdAt: string;
  deliveredOnTime?: boolean;
  relationshipQuality?: 1 | 2 | 3 | 4 | 5;
  wouldDoAgain?: boolean;
}

// ─── Resultado ────────────────────────────────────────────────────────────────

export interface Result {
  id: string;
  contentId?: string;
  partnershipId?: string;
  metrics: string;
  qualitativeNotes: string;
  worthIt: 'Sim' | 'Não' | 'Mais ou menos';
  engagement?: string;
  creativeSatisfaction?: 1 | 2 | 3 | 4 | 5;
  learningBySeries?: string;
  createdAt: string;
}

// ─── Agenda ───────────────────────────────────────────────────────────────────

export interface AgendaItem {
  id: string;
  title: string;
  date: string;
  type: 'Reunião' | 'Entrega' | 'Publicação';
  slotType?: SlotType;
  external: boolean;
}

// ─── Energia ──────────────────────────────────────────────────────────────────

export interface EnergyLog {
  date: string;
  level: number; // 1-5
}

// ─── Regras de Ouro ───────────────────────────────────────────────────────────

export interface GoldenRule {
  id: string; // 'RG-01' etc.
  descricao: string;
  tipo: 'error' | 'warning' | 'info';
  ativa: boolean;
}

export interface Violation {
  ruleId: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  affectedContentIds: string[];
}
