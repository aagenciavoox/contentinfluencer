interface MobileRouteMeta {
  title: string;
  subtitle: string;
  mode?: 'menu' | 'back';
  backTo?: string;
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
      subtitle: 'Status, prazo e proximas acoes.',
      mode: 'back',
      backTo: '/projetos',
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
        subtitle: 'Pipeline editorial para operacao rapida.',
      };
    case '/conteudos/historico':
      return {
        title: 'Postagem',
        subtitle: 'Historico e producao publicados.',
      };
    case '/ideias':
      return {
        title: 'Ideias',
        subtitle: 'Capture, refine e promova rapidamente.',
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
