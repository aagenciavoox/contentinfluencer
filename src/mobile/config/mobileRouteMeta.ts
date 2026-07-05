import { GLOSSARY } from '../../lib/uiCopy';

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
      subtitle: 'Consulta e anotações do item atual.',
      mode: 'back',
      backTo: '/biblioteca',
    };
  }

  if (pathname.startsWith('/projetos/')) {
    return {
      title: 'Projeto',
      subtitle: 'Contexto, eventos e caminhos possíveis.',
      mode: 'back',
      backTo: '/projetos',
    };
  }

  if (pathname.startsWith('/conteudos/')) {
    return {
      title: GLOSSARY.roteiro,
      subtitle: 'Etapas do roteiro em um único detalhe.',
      mode: 'back',
      backTo: '/conteudos',
    };
  }

  if (pathname.startsWith('/gravacao/')) {
    return {
      title: GLOSSARY.modoGravacao,
      subtitle: 'Leitura e execução do bloco em camada mobile.',
      mode: 'back',
      backTo: '/gravacao?tab=queue',
    };
  }

  if (pathname.startsWith('/configuracoes/pilares/') && pathname.endsWith('/editar')) {
    return {
      title: 'Editar pilar',
      subtitle: 'Identidade, distribuição e hashtags.',
      mode: 'back',
      backTo: '/configuracoes/pilares',
      titleVariant: 'compact-center',
    };
  }

  if (pathname === '/configuracoes/pilares/nova') {
    return {
      title: 'Novo pilar',
      subtitle: 'Cadastro de tema editorial.',
      mode: 'back',
      backTo: '/configuracoes/pilares',
      titleVariant: 'compact-center',
    };
  }

  if (pathname === '/configuracoes/pilares') {
    return {
      title: 'Pilares',
      subtitle: 'Temas editoriais e hashtags por plataforma.',
      mode: 'back',
      backTo: '/configuracoes',
      titleVariant: 'compact-center',
    };
  }

  if (pathname.startsWith('/configuracoes/series/') && pathname.endsWith('/roteiros')) {
    return {
      title: 'Série',
      subtitle: 'Criar roteiros, ver vinculados e identidade.',
      mode: 'back',
      backTo: '/configuracoes/series',
      titleVariant: 'compact-center',
    };
  }

  if (pathname.startsWith('/configuracoes/series/') && pathname.endsWith('/editar')) {
    return {
      title: 'Editar série',
      subtitle: 'Identidade, estrutura e hashtags.',
      mode: 'back',
      backTo: '/configuracoes/series',
      titleVariant: 'compact-center',
    };
  }

  if (pathname === '/configuracoes/series/nova') {
    return {
      title: 'Nova série',
      subtitle: 'Cadastro de quadro recorrente.',
      mode: 'back',
      backTo: '/configuracoes/series',
      titleVariant: 'compact-center',
    };
  }

  if (pathname === '/configuracoes/series') {
    return {
      title: 'Séries',
      subtitle: 'Quadros recorrentes e roteiros vinculados.',
      mode: 'back',
      backTo: '/configuracoes',
      titleVariant: 'compact-center',
    };
  }

  if (pathname.startsWith('/configuracoes/')) {
    return {
      title: 'Configuração',
      subtitle: 'Ajustes em fluxo dedicado para mobile.',
      mode: 'back',
      backTo: '/configuracoes',
    };
  }

  switch (pathname) {
    case '/dashboard':
      return {
        title: 'Hoje',
        subtitle: 'Talvez útil para escolher sem pressa.',
      };
    case '/conteudos':
      return {
        title: GLOSSARY.roteiros,
        subtitle: 'Roteiros em produção e publicados.',
      };
    case '/ideias':
      return {
        title: 'Ideias',
        subtitle: '',
        titleVariant: 'compact-center',
      };
    case '/calendario':
      return {
        title: 'Calendário',
        subtitle: 'Visão objetiva da semana editorial.',
      };
    case '/biblioteca':
      return {
        title: GLOSSARY.biblioteca,
        subtitle: 'Busca leve e referências em leitura.',
      };
    case '/projetos':
      return {
        title: 'Projetos',
        subtitle: 'Lista leve com contexto e datas combinadas.',
      };
    case '/gravacao':
      return {
        title: 'Gravação',
        subtitle: 'Fila ativa e acesso ao modo gravação.',
      };
    case '/programacao':
      return {
        title: GLOSSARY.gradePostagem,
        subtitle: 'Programação editorial e fila de publicação.',
      };
    case '/configuracoes':
      return {
        title: 'Configurações',
        subtitle: 'Hub de ajustes em camadas mobile.',
      };
    default:
      return {
        title: 'Content OS',
        subtitle: 'Navegação mobile dedicada.',
      };
  }
}
