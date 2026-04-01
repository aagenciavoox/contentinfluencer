import {
  ContentStatus,
  Series,
  PartnershipStatus,
  Platform,
  VisualFormat,
  Pilar,
  GoldenRule,
} from './types';

// ─── Pipeline de Status ───────────────────────────────────────────────────────

export const STATUS_STAGES: ContentStatus[] = [
  'Ideia',
  'Pronto para Gravar',
  'Gravado',
  'A Editar',
  'Editado',
  'Programado',
  'Postado',
];

export const PARTNERSHIP_STAGES: PartnershipStatus[] = [
  'Leitura',
  'Roteiro',
  'Envio de Roteiro',
  'Gravação',
  'Edição',
  'Aprovação',
  'Postagem',
  'Métricas',
];

// ─── Plataformas e Formatos Visuais ──────────────────────────────────────────

export const PLATFORMS: Platform[] = ['Instagram', 'TikTok', 'YouTube', 'Blog'];

export const VISUAL_FORMATS: VisualFormat[] = [
  'Talking Head',
  'Tela Verde',
  'Voiceover',
  'POV Texto',
  'Reação',
  'Vlog',
  'Misto',
];

// Legado — mantido para retrocompatibilidade com dados antigos
export const FORMATS = ['Reels', 'Stories', 'YouTube', 'Newsletter', 'Post'];

// Mapeamento de formato legado → plataforma
export function mapLegacyFormatToPlataforma(format: string): Platform[] {
  const map: Record<string, Platform[]> = {
    Reels: ['Instagram'],
    Stories: ['Instagram'],
    YouTube: ['YouTube'],
    Newsletter: ['Blog'],
    Post: ['Instagram', 'TikTok'],
  };
  return map[format] || ['Instagram'];
}

// ─── Pilares da Dizaianne ─────────────────────────────────────────────────────

export const PILLARS = [
  'Humor',
  'Análise',
  'Identificação',
  'Opinião',
  'Indicação',
  'Cultura Pop',
  'Ciência',
];

export const INITIAL_PILARES: Pilar[] = [
  {
    id: 'pilar-humor',
    nome: 'Humor',
    descricao: 'GSA, POV, Tipos de Leitores, trends, exagero',
    cor: '#F5C543',
    hashtagsInstagram: '#dizaianne #gsadiza #booktok #humor #leitura',
    hashtagsTikTok: '#dizaianne #gsadiza #booktok #humor #leitura',
    hashtagsYouTube: '#dizaianne #booktube #humor #livros #leitura #literatura #booktok #literário',
    templateLegenda:
      'Gancho: [Situação absurda/engraçada]\n\nCorpo: [Desenvolvimento do humor]\n\nCTA: [Marca quem é assim / Salva pra mandar pra alguém]',
    ativo: true,
  },
  {
    id: 'pilar-analise',
    nome: 'Análise',
    descricao: 'Calma eu te explico, Teoria da Conspiração, profundidade',
    cor: '#4A90D9',
    hashtagsInstagram: '#dizaianne #calmaeudiza #booktok #leitura #literatura',
    hashtagsTikTok: '#dizaianne #calmaeudiza #booktok #leitura #análise',
    hashtagsYouTube: '#dizaianne #booktube #análise #livros #leitura #literatura #resenha #booktok',
    templateLegenda:
      'Gancho: [Fato curioso ou questão provocativa]\n\nCorpo: [Explicação aprofundada]\n\nCTA: [Compartilhe com um amigo / O que você acha?]',
    ativo: true,
  },
  {
    id: 'pilar-identificacao',
    nome: 'Identificação',
    descricao: 'É sobre você sim, frases, situações relacionáveis',
    cor: '#E8A0BF',
    hashtagsInstagram: '#dizaianne #booktok #leitura #ésobrevocêsim #livros',
    hashtagsTikTok: '#dizaianne #booktok #leitura #ésobrevocêsim #livros',
    hashtagsYouTube: '#dizaianne #booktube #leitura #livros #identificação #literatura #booktok #conexão',
    templateLegenda:
      'Gancho: [Situação que todo leitor já viveu]\n\nCorpo: [Desenvolvimento da identificação]\n\nCTA: [É sobre você sim / Marca quem precisa ver isso]',
    ativo: true,
  },
  {
    id: 'pilar-opiniao',
    nome: 'Opinião',
    descricao: 'Inimigo comum, caixinha polêmica, posição forte',
    cor: '#D44C47',
    hashtagsInstagram: '#dizaianne #booktok #opiniãoliterária #leitura #livros',
    hashtagsTikTok: '#dizaianne #booktok #opinião #leitura #livros',
    hashtagsYouTube: '#dizaianne #booktube #opinião #livros #leitura #literatura #booktok #literário',
    templateLegenda:
      'Gancho: [Posição forte ou afirmação polêmica]\n\nCorpo: [Argumento e desenvolvimento]\n\nCTA: [Concorda? Me fala nos comentários]',
    ativo: true,
  },
  {
    id: 'pilar-indicacao',
    nome: 'Indicação',
    descricao: 'Resenhas, recomendações, curadoria',
    cor: '#448361',
    hashtagsInstagram: '#dizaianne #indicaçãodelivros #booktok #livros #leitura',
    hashtagsTikTok: '#dizaianne #indicação #booktok #livros #leitura',
    hashtagsYouTube: '#dizaianne #booktube #indicação #livros #leitura #resenha #literatura #booktok',
    templateLegenda:
      'Gancho: [Por que esse livro é diferente]\n\nCorpo: [O que você vai encontrar + para quem é]\n\nCTA: [Já leu? Me conta / Link na bio]',
    ativo: true,
  },
  {
    id: 'pilar-culturapop',
    nome: 'Cultura Pop',
    descricao: 'Guerra de Filmes, adaptações, séries, tendências',
    cor: '#9065B0',
    hashtagsInstagram: '#dizaianne #culturapop #adaptação #booktok #filmes',
    hashtagsTikTok: '#dizaianne #culturapop #adaptação #booktok #filmes',
    hashtagsYouTube: '#dizaianne #booktube #culturapop #adaptação #filmes #livros #booktok #literário',
    templateLegenda:
      'Gancho: [Polêmica ou comparação provocativa]\n\nCorpo: [Análise e argumentos]\n\nCTA: [Qual lado você escolhe? / Comenta aí]',
    ativo: true,
  },
  {
    id: 'pilar-ciencia',
    nome: 'Ciência',
    descricao: 'Calma eu te explico com base científica, comportamento',
    cor: '#2EAADC',
    hashtagsInstagram: '#dizaianne #calmaeudiza #ciência #booktok #leitura',
    hashtagsTikTok: '#dizaianne #calmaeudiza #ciência #booktok #leitura',
    hashtagsYouTube: '#dizaianne #booktube #ciência #comportamento #leitura #livros #booktok #literário',
    templateLegenda:
      'Gancho: [Dado ou descoberta surpreendente]\n\nCorpo: [Explicação científica acessível]\n\nCTA: [Compartilha com quem precisa saber disso]',
    ativo: true,
  },
];

// ─── Templates de Legenda por Pilar ──────────────────────────────────────────

export const CAPTION_TEMPLATES: Record<string, string> = {
  Humor:
    "Gancho: [Situação absurda/engraçada]\n\nCorpo: [Desenvolvimento do humor]\n\nCTA: [Marca quem é assim]",
  Análise:
    "Gancho: [Fato curioso ou questão provocativa]\n\nCorpo: [Explicação aprofundada]\n\nCTA: [Compartilhe com um amigo]",
  Identificação:
    "Gancho: [Situação que todo leitor já viveu]\n\nCorpo: [Desenvolvimento da identificação]\n\nCTA: [Marca quem precisa ver isso]",
  Opinião:
    "Gancho: [Posição forte ou afirmação polêmica]\n\nCorpo: [Argumento e desenvolvimento]\n\nCTA: [Concorda? Me fala nos comentários]",
  Indicação:
    "Gancho: [Por que esse livro é diferente]\n\nCorpo: [O que você vai encontrar + para quem é]\n\nCTA: [Já leu? Me conta]",
  'Cultura Pop':
    "Gancho: [Polêmica ou comparação provocativa]\n\nCorpo: [Análise e argumentos]\n\nCTA: [Qual lado você escolhe?]",
  Ciência:
    "Gancho: [Dado ou descoberta surpreendente]\n\nCorpo: [Explicação científica acessível]\n\nCTA: [Compartilha com quem precisa saber disso]",
};

// ─── Séries da Dizaianne ─────────────────────────────────────────────────────

export const INITIAL_SERIES: Series[] = [
  {
    id: 'calma-explico',
    name: 'Calma eu te explico',
    template: 'Foco em autoridade e explicação clara. Começa com uma pergunta ou dado surpreendente.',
    notes: 'Melhor dia: Terça-feira.',
    pilarId: 'pilar-analise',
    slotPadrao: 'Série',
    plataformasPrincipais: ['Instagram', 'TikTok'],
    formatoVisualPadrao: 'Talking Head',
    bordao: 'Calma, eu te explico.',
    cor: '#4A90D9',
    ativa: true,
    frequenciaRecomendada: 'Semanal',
  },
  {
    id: 'gsa',
    name: 'GSA — Gestão de Sensatez Aplicada',
    template: 'Humor inteligente. Situação absurda com lógica interna coerente.',
    notes: '',
    pilarId: 'pilar-humor',
    slotPadrao: 'Série',
    plataformasPrincipais: ['Instagram', 'TikTok'],
    formatoVisualPadrao: 'Talking Head',
    bordao: 'Gestão de Sensatez Aplicada.',
    cor: '#F5C543',
    ativa: true,
    frequenciaRecomendada: 'Semanal',
  },
  {
    id: 'sobre-voce',
    name: 'É sobre você sim',
    template: 'Profundidade e conexão. Começa como se fosse sobre o livro, revela que é sobre o leitor.',
    notes: '',
    pilarId: 'pilar-identificacao',
    slotPadrao: 'Série',
    plataformasPrincipais: ['Instagram', 'TikTok'],
    formatoVisualPadrao: 'Talking Head',
    bordao: 'É sobre você sim.',
    cor: '#E8A0BF',
    ativa: true,
    frequenciaRecomendada: 'Semanal',
  },
  {
    id: 'teoria-conspiracao',
    name: 'Teoria da Conspiração',
    template: 'Curiosidade e engajamento. Apresenta uma teoria sobre livros/leitura.',
    notes: '',
    pilarId: 'pilar-analise',
    slotPadrao: 'Série',
    plataformasPrincipais: ['Instagram', 'TikTok'],
    formatoVisualPadrao: 'Talking Head',
    cor: '#4A90D9',
    ativa: true,
    frequenciaRecomendada: 'Quinzenal',
  },
  {
    id: 'guerra-filmes',
    name: 'Guerra de Filmes',
    template: 'Comparação provocativa entre adaptações e livros. Dois lados, uma vencedora.',
    notes: '',
    pilarId: 'pilar-culturapop',
    slotPadrao: 'Série',
    plataformasPrincipais: ['Instagram', 'TikTok', 'YouTube'],
    formatoVisualPadrao: 'Talking Head',
    cor: '#9065B0',
    ativa: true,
    frequenciaRecomendada: 'Quinzenal',
  },
  {
    id: 'tipos-leitores',
    name: 'Tipos de Leitores',
    template: 'Comportamento e arquétipos. Humor de identificação.',
    notes: '',
    pilarId: 'pilar-humor',
    slotPadrao: 'Curto',
    plataformasPrincipais: ['Instagram', 'TikTok'],
    formatoVisualPadrao: 'POV Texto',
    cor: '#F5C543',
    ativa: true,
    frequenciaRecomendada: 'Semanal',
  },
  {
    id: 'mudando-nome',
    name: 'Mudando o nome dos livros',
    template: 'Humor. Renomear livros famosos de forma cômica e certeira.',
    notes: '',
    pilarId: 'pilar-humor',
    slotPadrao: 'Curto',
    plataformasPrincipais: ['Instagram', 'TikTok'],
    formatoVisualPadrao: 'POV Texto',
    cor: '#F5C543',
    ativa: true,
    frequenciaRecomendada: 'Sob demanda',
  },
];

// ─── Regras de Ouro ───────────────────────────────────────────────────────────

export const GOLDEN_RULES: GoldenRule[] = [
  {
    id: 'RG-01',
    descricao: 'Mesmo assunto/tema: máx. 2 conteúdos na mesma semana',
    tipo: 'warning',
    ativa: true,
  },
  {
    id: 'RG-02',
    descricao: 'Mesma série: máx. 1 episódio por semana',
    tipo: 'warning',
    ativa: true,
  },
  {
    id: 'RG-03',
    descricao: 'Mesmo formato visual: máx. 1 por dia',
    tipo: 'info',
    ativa: true,
  },
  {
    id: 'RG-04',
    descricao: 'Publicidade: mín. 3 conteúdos orgânicos entre cada publi',
    tipo: 'warning',
    ativa: true,
  },
  {
    id: 'RG-05',
    descricao: 'Instagram/TikTok: máx. 5 hashtags por legenda',
    tipo: 'error',
    ativa: true,
  },
  {
    id: 'RG-06',
    descricao: 'YouTube: recomendado 8–10 hashtags na descrição',
    tipo: 'info',
    ativa: true,
  },
  {
    id: 'RG-07',
    descricao: 'Pilar único dominando semana (>60% dos posts)',
    tipo: 'warning',
    ativa: true,
  },
];
