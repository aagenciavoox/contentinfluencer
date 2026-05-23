interface MobileRouteMeta {
  title: string;
  subtitle: string;
  mode?: 'menu' | 'back';
  backTo?: string;
  /** Titulo pequeno centralizado na barra superior (ex.: Ideias). */
  titleVariant?: 'default' | 'compact-center';
}

export function getMobileRouteMeta(pathname: string): MobileRouteMeta {
  if (pathname.startsWith('/biblioteca/')) {
    return {
      title: 'Leitura',
      subtitle: 'Consulta e anotacoes do item atual.',
      mode: 'back',
      backTo: '/biblioteca',
    };
  }

  if (pathname.startsWith('/projetos/')) {
    return {
      title: 'Projeto',
      subtitle: 'Status, eventos e proximas acoes.',
      mode: 'back',
      backTo: '/projetos',
    };
  }

  if (pathname.startsWith('/conteudos/')) {
    return {
      title: 'Conteudo',
      subtitle: 'Pipeline continuo em um unico detalhe.',
      mode: 'back',
      backTo: '/conteudos',
    };
  }

  if (pathname.startsWith('/gravacao/')) {
    return {
      title: 'Modo Explosao',
      subtitle: 'Leitura e execucao do bloco em camada mobile.',
      mode: 'back',
      backTo: '/gravacao?tab=blocks',
    };
  }

  if (pathname.startsWith('/configuracoes/')) {
    return {
      title: 'Configuracao',
      subtitle: 'Ajustes em fluxo dedicado para mobile.',
      mode: 'back',
      backTo: '/configuracoes',
    };
  }

  switch (pathname) {
    case '/dashboard':
      return {
        title: 'Foco do dia',
        subtitle: 'Resumo curto das prioridades em andamento.',
      };
    case '/conteudos':
      return {
        title: 'Conteudos',
        subtitle: 'Roteiro, postagem e historico em uma mesma fila.',
      };
    case '/ideias':
      return {
        title: 'Ideias',
        subtitle: '',
        titleVariant: 'compact-center',
      };
    case '/calendario':
      return {
        title: 'Agenda',
        subtitle: 'Visao objetiva da semana editorial.',
      };
    case '/biblioteca':
      return {
        title: 'Acervo',
        subtitle: 'Busca leve e referencias em leitura.',
      };
    case '/projetos':
      return {
        title: 'Projetos',
        subtitle: 'Lista enxuta com prazo e progresso.',
      };
    case '/gravacao':
      return {
        title: 'Gravacao',
        subtitle: 'Fila ativa e acesso ao modo explosao.',
      };
    case '/analise':
      return {
        title: 'Insights',
        subtitle: 'Alertas e leituras resumidas.',
      };
    case '/configuracoes':
      return {
        title: 'Configuracoes',
        subtitle: 'Hub de ajustes em camadas mobile.',
      };
    default:
      return {
        title: 'Content OS',
        subtitle: 'Navegacao mobile dedicada.',
      };
  }
}
