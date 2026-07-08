/** Shared UI copy — glossary, confirmations, errors, empty states, loading. */

// ─── Glossary ─────────────────────────────────────────────────────────────────

export const GLOSSARY = {
  roteiros: 'Roteiros',
  roteiro: 'Roteiro',
  biblioteca: 'Biblioteca',
  blocoGravacao: 'Bloco de gravação',
  modoGravacao: 'Modo gravação',
  publicados: 'Publicados',
  gradePostagem: 'Grade de Postagem',
} as const;

// ─── Confirmations ────────────────────────────────────────────────────────────

export type ConfirmCopy = {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
};

export type ConfirmState = ConfirmCopy & {
  onConfirm: () => void;
};

export const CONFIRM = {
  excluirPilar: {
    message:
      'Excluir pilar? Roteiros vinculados continuam salvos, mas ficam sem esse pilar.',
    confirmLabel: 'Excluir pilar',
    cancelLabel: 'Manter pilar',
  },
  excluirSerie: {
    message:
      'Excluir série? Os roteiros continuam salvos, mas deixam de aparecer nesta série.',
    confirmLabel: 'Excluir série',
    cancelLabel: 'Manter série',
  },
  excluirBloco: {
    message:
      'Excluir bloco de gravação? Os roteiros voltam a ficar disponíveis para outro bloco.',
    confirmLabel: 'Excluir bloco',
    cancelLabel: 'Manter bloco',
  },
  excluirTemplate: {
    message:
      'Excluir template? Roteiros já criados com ele continuam salvos, mas novos roteiros não usarão este modelo.',
    confirmLabel: 'Excluir template',
    cancelLabel: 'Manter template',
  },
  excluirProjeto: (nome: string) => ({
    message: `Excluir o projeto "${nome}"? Etapas, eventos e roteiros vinculados deixam de aparecer neste projeto.`,
    confirmLabel: 'Excluir projeto',
    cancelLabel: 'Manter projeto',
  }),
  excluirRoteiros: (count: number) => ({
    message: `Excluir ${count} roteiro${count === 1 ? '' : 's'}? Esta ação não pode ser desfeita.`,
    confirmLabel: count === 1 ? 'Excluir roteiro' : `Excluir ${count} roteiros`,
    cancelLabel: 'Manter seleção',
  }),
  moverParaIdeias: (count: number) => ({
    message:
      `Mover ${count} roteiro${count === 1 ? '' : 's'} para Ideias? ${count === 1 ? 'Ele sai' : 'Eles saem'} da lista editorial e ${count === 1 ? 'volta' : 'voltam'} ao inbox. O texto editado é preservado. Se ${count === 1 ? 'estiver' : 'estiverem'} em bloco de gravação, ${count === 1 ? 'sai' : 'saem'} dele.`,
    confirmLabel: count === 1 ? 'Mover para Ideias' : `Mover ${count} para Ideias`,
    cancelLabel: 'Manter como roteiro',
  }),
  excluirIdeia: {
    message: 'Remover esta ideia da lista ativa?',
    confirmLabel: 'Remover ideia',
    cancelLabel: 'Manter ideia',
  },
  promoverIdeia: {
    message: 'Transformar esta ideia em roteiro? Ela sai do inbox e abre no editor.',
    confirmLabel: 'Promover para roteiro',
    cancelLabel: 'Manter como ideia',
  },
  excluirBiblioteca: (titulo: string) => ({
    message: `Remover "${titulo}" da biblioteca? Anotações e roteiros vinculados continuam salvos.`,
    confirmLabel: 'Remover da biblioteca',
    cancelLabel: 'Manter na biblioteca',
  }),
  excluirRegra: {
    message: 'Remover esta regra dos combinados editoriais?',
    confirmLabel: 'Remover regra',
    cancelLabel: 'Manter regra',
  },
} satisfies Record<string, ConfirmCopy | ((...args: never[]) => ConfirmCopy)>;

// ─── Errors ───────────────────────────────────────────────────────────────────

export const ERRORS = {
  salvar:
    'Não foi possível salvar agora. Verifique sua conexão e tente novamente.',
  criarRoteiro:
    'Não foi possível criar o roteiro. Tente novamente em alguns segundos.',
  salvarRoteiro:
    'Não foi possível salvar o roteiro. Verifique sua conexão e tente novamente.',
  salvarGenerico:
    'Não foi possível salvar agora. Verifique sua conexão e tente novamente.',
  sincronizar:
    'Não foi possível sincronizar agora. Verifique sua conexão e tente novamente.',
  carregarDados: 'Não foi possível carregar os dados. Tente novamente.',
  atualizarStatusMassa:
    'Não foi possível atualizar o status em massa. Tente novamente.',
  aplicarAlteracoesMassa:
    'Não foi possível aplicar as alterações em massa. Tente novamente.',
  moverParaIdeiasMassa:
    'Não foi possível mover os roteiros para Ideias. Tente novamente.',
  importarRoteiros:
    'Não foi possível importar todos os roteiros. Tente novamente.',
  autenticacao:
    'Não foi possível entrar. Confira e-mail e senha ou tente novamente.',
  supabaseDesconectado: 'Conecte o Supabase para alterar dados da conta.',
} as const;

// ─── Loading / saving ─────────────────────────────────────────────────────────

export const LOADING = {
  area: 'Carregando área...',
  serie: 'Carregando série...',
  salvandoAlteracoes: 'Salvando alterações...',
  importandoRoteiros: (count: number) => `Importando ${count} roteiros...`,
  montandoBloco: 'Montando bloco de gravação...',
  criandoRoteiro: 'Criando roteiro...',
  salvandoRoteiro: 'Salvando roteiro...',
  salvando: 'Salvando...',
} as const;

// ─── Empty states ─────────────────────────────────────────────────────────────

export const EMPTY = {
  roteiros: {
    title: 'Nenhum roteiro nesta visão',
    description:
      'Crie um roteiro ou ajuste os filtros para encontrar outros itens.',
  },
  roteirosPublicados: {
    title: 'Nenhum roteiro publicado',
    description: 'Roteiros marcados como postados aparecem aqui.',
  },
  ideias: {
    title: 'Nenhuma ideia na caixa de entrada',
    description: 'Capture uma nota rápida quando algo aparecer.',
  },
  ideiasArquivadas: {
    title: 'Nenhuma ideia arquivada',
    description: 'Ideias arquivadas aparecem aqui.',
  },
  biblioteca: {
    title: 'Sua biblioteca ainda está vazia',
    description:
      'Adicione livros, filmes ou séries para transformar repertório em ideias.',
  },
  bibliotecaSemResultado: {
    title: 'Nenhum resultado',
    description: 'Tente ajustar os filtros ou a busca.',
  },
  blocos: {
    title: 'Nenhum bloco de gravação montado',
    description: 'Selecione roteiros prontos para criar um bloco.',
  },
  roteirosSemBloco: {
    title: 'Nenhum roteiro disponível fora de blocos',
    description:
      'Finalize roteiros e deixe-os prontos para gravação, ou ajuste os filtros acima.',
  },
  projetos: {
    title: 'Nenhum projeto encontrado',
    description:
      'Crie um projeto para reunir etapas, eventos e roteiros.',
  },
  templates: {
    title: 'Nenhum template ainda',
    description: 'Crie um modelo para reutilizar estruturas de roteiro.',
  },
  dashboardSpotlight: {
    title: 'Nada chamando atenção agora',
    description:
      'Comece criando um roteiro ou capturando uma ideia quando fizer sentido.',
  },
} as const;
