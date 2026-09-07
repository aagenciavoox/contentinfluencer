import { GLOSSARY } from '../../lib/uiCopy.ts';

export interface MobileRouteMeta {
  title: string;
  subtitle?: string;
  mode?: 'menu' | 'back';
  backTo?: string;
  /** Titulo pequeno centralizado na barra superior (ex.: detalhe). */
  titleVariant?: 'default' | 'compact-center';
  /** Esconde o header fixo — a propria tela desenha o herói (ex.: Hoje). */
  hideHeader?: boolean;
  /** Esconde a bottom nav — telas de foco (ex.: escrever roteiro). */
  hideBottomNav?: boolean;
  /** Exibe wordmark Criaki no lugar do titulo textual. */
  showBrandLogo?: boolean;
}

export type MobileRouteContext = {
  contentTitle?: string | null;
  bibliotecaTitle?: string | null;
  recordingBlockName?: string | null;
};

function isContentScriptTab(search: string) {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const tab = params.get('tab');
  if (tab === 'gravacao') return false;
  if (
    tab === 'publicacao'
    || tab === 'fluxo'
    || tab === 'publicar'
    || tab === 'producao'
    || tab === 'postagem'
  ) {
    return false;
  }
  return true;
}

export function getMobileRouteMeta(pathname: string, search = ''): MobileRouteMeta {
  if (pathname === '/biblioteca/analise') {
    return {
      title: 'Análise',
      subtitle: 'Progresso e anotações por obra.',
      mode: 'back',
      backTo: '/biblioteca',
    };
  }

  if (pathname.startsWith('/biblioteca/')) {
    return {
      title: GLOSSARY.biblioteca,
      mode: 'back',
      backTo: '/biblioteca',
      titleVariant: 'compact-center',
    };
  }

  if (pathname.startsWith('/projetos/')) {
    return {
      title: 'Projeto',
      mode: 'back',
      backTo: '/projetos',
      titleVariant: 'compact-center',
    };
  }

  if (pathname.startsWith('/conteudos/')) {
    const isScriptTab = isContentScriptTab(search);
    return {
      title: GLOSSARY.roteiro,
      mode: 'back',
      backTo: '/criacao',
      titleVariant: 'compact-center',
      hideHeader: isScriptTab,
      hideBottomNav: isScriptTab,
    };
  }

  if (pathname.startsWith('/gravacao/')) {
    return {
      title: GLOSSARY.modoGravacao,
      mode: 'back',
      backTo: '/gravacao?tab=queue',
      titleVariant: 'compact-center',
    };
  }

  if (pathname.startsWith('/configuracoes/pilares/') && pathname.endsWith('/editar')) {
    return {
      title: 'Editar pilar',
      mode: 'back',
      backTo: '/configuracoes/pilares',
      titleVariant: 'compact-center',
    };
  }

  if (pathname === '/configuracoes/pilares/nova') {
    return {
      title: 'Novo pilar',
      mode: 'back',
      backTo: '/configuracoes/pilares',
      titleVariant: 'compact-center',
    };
  }

  if (pathname === '/configuracoes/pilares') {
    return {
      title: 'Pilares',
      mode: 'back',
      backTo: '/configuracoes',
      titleVariant: 'compact-center',
    };
  }

  if (pathname.startsWith('/configuracoes/series/') && pathname.endsWith('/roteiros')) {
    return {
      title: 'Série',
      mode: 'back',
      backTo: '/configuracoes/series',
      titleVariant: 'compact-center',
    };
  }

  if (pathname.startsWith('/configuracoes/series/') && pathname.endsWith('/editar')) {
    return {
      title: 'Editar série',
      mode: 'back',
      backTo: '/configuracoes/series',
      titleVariant: 'compact-center',
    };
  }

  if (pathname === '/configuracoes/series/nova') {
    return {
      title: 'Nova série',
      mode: 'back',
      backTo: '/configuracoes/series',
      titleVariant: 'compact-center',
    };
  }

  if (pathname === '/configuracoes/series') {
    return {
      title: 'Séries',
      mode: 'back',
      backTo: '/configuracoes',
      titleVariant: 'compact-center',
    };
  }

  if (pathname.startsWith('/configuracoes/')) {
    return {
      title: 'Configuração',
      mode: 'back',
      backTo: '/configuracoes',
    };
  }

  switch (pathname) {
    case '/hoje':
      return {
        title: 'Hoje',
        hideHeader: true,
      };
    case '/criacao':
      return {
        title: 'Criação',
        titleVariant: 'compact-center',
      };
    case '/conteudos':
      return {
        title: GLOSSARY.roteiros,
      };
    case '/ideias':
      return {
        title: 'Ideias',
        titleVariant: 'compact-center',
      };
    case '/calendario':
    case '/programacao':
      return {
        title: 'Calendário',
        subtitle: 'Ver a semana ou agendar postagens.',
      };
    case '/biblioteca':
      return {
        title: GLOSSARY.biblioteca,
        titleVariant: 'compact-center',
      };
    case '/projetos':
      return {
        title: 'Projetos',
        subtitle: 'Contexto e datas combinadas.',
      };
    case '/gravacao':
      return {
        title: 'Gravação',
        titleVariant: 'compact-center',
      };
    case '/configuracoes':
      return {
        title: 'Configurações',
      };
    default:
      return {
        title: 'Criaki',
      };
  }
}

export function resolveMobileRouteMeta(
  pathname: string,
  context: MobileRouteContext = {},
  search = '',
): MobileRouteMeta {
  const meta = getMobileRouteMeta(pathname, search);

  if (pathname.startsWith('/conteudos/') && context.contentTitle?.trim()) {
    return {
      ...meta,
      title: context.contentTitle.trim(),
      subtitle: undefined,
      titleVariant: 'compact-center',
    };
  }

  if (
    pathname.startsWith('/biblioteca/')
    && pathname !== '/biblioteca/analise'
    && context.bibliotecaTitle?.trim()
  ) {
    return {
      ...meta,
      title: context.bibliotecaTitle.trim(),
      subtitle: undefined,
      titleVariant: 'compact-center',
    };
  }

  if (pathname.startsWith('/gravacao/') && context.recordingBlockName?.trim()) {
    return {
      ...meta,
      title: context.recordingBlockName.trim(),
      subtitle: undefined,
      titleVariant: 'compact-center',
    };
  }

  return meta;
}
