import { GLOSSARY } from '../../lib/uiCopy.ts';

/** Tela Menu do celular (mesmo valor de MOBILE_MENU_ROUTE em navConfig). */
const MENU_ROUTE = '/menu';

/** Telas abertas pela tela Menu: voltam para ela, com a aba Menu marcada na barra. */
function fromMenu(title: string): MobileRouteMeta {
  return { title, mode: 'back', backTo: MENU_ROUTE, titleVariant: 'compact-center' };
}

export interface MobileRouteMeta {
  title: string;
  subtitle?: string;
  /** `root`: aba da barra inferior, sem botão à esquerda. `back`: tela secundária, com Voltar. */
  mode?: 'root' | 'back';
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
      mode: 'back',
      backTo: '/biblioteca',
    };
  }

  if (pathname === '/biblioteca/anotacoes') {
    return {
      title: 'Anotações',
      mode: 'back',
      backTo: '/biblioteca/analise',
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

  if (pathname === '/editorial/pilares/nova') {
    return {
      title: 'Novo pilar',
      mode: 'back',
      backTo: '/editorial',
      titleVariant: 'compact-center',
    };
  }

  if (pathname.startsWith('/editorial/pilares/')) {
    return {
      title: 'Editar pilar',
      mode: 'back',
      backTo: '/editorial',
      titleVariant: 'compact-center',
    };
  }

  if (pathname === '/editorial/series/nova' || pathname === '/series/nova' || pathname === '/series/novo') {
    return {
      title: 'Criar série',
      mode: 'back',
      backTo: '/series',
      titleVariant: 'compact-center',
    };
  }

  if (pathname.startsWith('/editorial/series/')) {
    const serieId = pathname.split('/')[3] || '';
    return {
      title: 'Editar definições',
      mode: 'back',
      backTo: serieId ? `/series/${serieId}` : '/series',
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

  if (pathname.startsWith('/series/') && pathname.endsWith('/editar')) {
    const serieId = pathname.split('/')[2] || '';
    return {
      title: 'Editar série',
      mode: 'back',
      backTo: serieId ? `/series/${serieId}` : '/series',
      titleVariant: 'compact-center',
    };
  }

  if (pathname.startsWith('/series/') && pathname.endsWith('/quadros/novo')) {
    const serieId = pathname.split('/')[2] || '';
    return {
      title: 'Criar quadro',
      mode: 'back',
      backTo: serieId ? `/series/${serieId}?aba=quadros` : '/series',
      titleVariant: 'compact-center',
    };
  }

  if (pathname.startsWith('/series/') && pathname.endsWith('/criacao-em-massa')) {
    const serieId = pathname.split('/')[2] || '';
    return {
      title: 'Adicionar em massa',
      mode: 'back',
      backTo: serieId ? `/series/${serieId}` : '/series',
      titleVariant: 'compact-center',
    };
  }

  if (pathname.startsWith('/series/') && pathname.includes('/temporadas/')) {
    const serieId = pathname.split('/')[2] || '';
    return {
      title: 'Temporada',
      mode: 'back',
      backTo: serieId ? `/series/${serieId}` : '/series',
      titleVariant: 'compact-center',
    };
  }

  if (pathname.startsWith('/series/')) {
    return {
      title: 'Série',
      mode: 'back',
      backTo: '/series',
      titleVariant: 'compact-center',
    };
  }

  if (pathname === '/configuracoes/perfil') {
    return {
      title: 'Perfil',
      mode: 'back',
      backTo: '/configuracoes',
    };
  }

  if (pathname.startsWith('/configuracoes/')) {
    return {
      title: 'Configurações',
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
    case '/criacao/legendas':
      return {
        title: 'Legendas',
        mode: 'back',
        backTo: '/criacao',
        titleVariant: 'compact-center',
      };
    case '/criacao/transcricao':
      return {
        title: 'Transcrição',
        mode: 'back',
        // Lendo o texto de um vídeo (`?ver=`), voltar leva para a fila.
        backTo: new URLSearchParams(search).has('ver') ? '/criacao/transcricao' : '/criacao',
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
      return fromMenu('Calendário');
    case '/planejamento':
    case '/programacao':
      return fromMenu('Planejamento');
    case '/series':
      return fromMenu('Séries e quadros');
    case '/editorial':
      return fromMenu('Editorial');
    case '/analises':
      return fromMenu('Análises');
    case '/contas':
      return fromMenu('Contas e horários');
    case '/biblioteca':
      return {
        title: GLOSSARY.biblioteca,
        titleVariant: 'compact-center',
      };
    case '/projetos':
      return fromMenu('Projetos');
    case '/gravacao':
      return {
        title: 'Gravação',
        titleVariant: 'compact-center',
      };
    case '/configuracoes':
      return fromMenu('Configurações');
    case MENU_ROUTE:
      return {
        title: 'Menu',
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
  // Um alinhamento só para o título em todas as telas: centralizado entre os dois botões.
  const meta: MobileRouteMeta = { ...getMobileRouteMeta(pathname, search), titleVariant: 'compact-center' };

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
