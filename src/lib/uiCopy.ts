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
      'Excluir template? Roteiros já criados com ele continuam salvos, mas novos roteiros não usarão este template.',
    confirmLabel: 'Excluir template',
    cancelLabel: 'Manter template',
  },
  excluirPlataforma: {
    message:
      'Excluir plataforma? Leituras históricas podem ficar sem este canal; roteiros vinculados preservam o nome já salvo.',
    confirmLabel: 'Excluir plataforma',
    cancelLabel: 'Manter plataforma',
  },
  excluirProjeto: (nome: string) => ({
    message: `Excluir o projeto "${nome}"? Etapas, eventos e roteiros vinculados deixam de aparecer neste projeto.`,
    confirmLabel: 'Excluir projeto',
    cancelLabel: 'Manter projeto',
  }),
  excluirRoteiros: (count: number) => ({
    message:
      count === 1
        ? 'Mover 1 roteiro para a lixeira? Ele poderá ser restaurado depois.'
        : `Mover ${count} roteiros para a lixeira? Eles poderão ser restaurados depois.`,
    confirmLabel: count === 1 ? 'Mover para a lixeira' : `Mover ${count} para a lixeira`,
    cancelLabel: 'Manter seleção',
  }),
  moverParaIdeias: (count: number) => ({
    message:
      count === 1
        ? 'Mover 1 roteiro para Ideias? Ele sai da lista editorial e volta para Ideias. O texto editado é preservado. Se estiver em bloco de gravação, sai dele.'
        : `Mover ${count} roteiros para Ideias? Eles saem da lista editorial e voltam para Ideias. O texto editado é preservado. Se estiverem em bloco de gravação, saem dele.`,
    confirmLabel: count === 1 ? 'Mover para Ideias' : `Mover ${count} para Ideias`,
    cancelLabel: 'Manter como roteiro',
  }),
  excluirIdeia: {
    message: 'Remover esta ideia da lista ativa?',
    confirmLabel: 'Remover ideia',
    cancelLabel: 'Manter ideia',
  },
  promoverIdeia: {
    message: 'Transformar esta ideia em roteiro? Ela sai de Ideias e abre no editor.',
    confirmLabel: 'Transformar em roteiro',
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
  supabaseDesconectado:
    'Sem conexão com o servidor. Recarregue a página para alterar dados da conta.',
} as const;

// ─── Loading / saving ─────────────────────────────────────────────────────────

export const LOADING = {
  area: 'Carregando área…',
  dados: 'Carregando seus dados…',
  serie: 'Carregando série…',
  salvandoAlteracoes: 'Salvando alterações…',
  importandoRoteiros: (count: number) => `Importando ${count} roteiros…`,
  montandoBloco: 'Montando bloco de gravação…',
  criandoRoteiro: 'Criando roteiro…',
  salvandoRoteiro: 'Salvando roteiro…',
  salvando: 'Salvando…',
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
    description: 'Capture uma ideia rápida quando algo aparecer.',
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
    description: 'Crie um template para reutilizar estruturas de roteiro.',
  },
  dashboardSpotlight: {
    title: 'Nada chamando atenção agora',
    description:
      'Comece criando um roteiro ou capturando uma ideia quando fizer sentido.',
  },
  dailySession: {
    title: 'Nada disponível para gravar',
    description:
      'Quando um roteiro estiver pronto, ele aparece aqui para montar a sessão do dia.',
  },
} as const;
