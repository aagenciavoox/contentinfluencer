import type { ElementType } from 'react';
import {
  AudioLines,
  Briefcase,
  CalendarDays,
  Captions,
  ChartColumn,
  StickyNote,
  Clapperboard,
  Columns3,
  Library,
  ListVideo,
  Menu as MenuIcon,
  PenLine,
  SunMedium,
} from 'lucide-react';
import type { ModuleFlags } from '../../features/settings/lib/moduleFlags';

export type NavBadgeKey = 'editorial' | 'library';

export type NavItemDefinition = {
  to: string;
  label: string;
  icon: ElementType;
  end?: boolean;
  module?: keyof ModuleFlags;
  badgeKey?: NavBadgeKey;
  /** Itens recuados sob este destino, como Legendas sob Criação. */
  nested?: NavItemDefinition[];
};

export type NavSectionDefinition = {
  label: string | null;
  items: NavItemDefinition[];
};

/** Blocos do menu, também usados como rótulo acima do título das páginas. */
export const PAGE_SECTION = {
  hoje: 'Hoje',
  biblioteca: 'Biblioteca',
  producao: 'Produção',
  agenda: 'Agenda',
  estrategia: 'Estratégia',
  configuracoes: 'Configurações',
} as const;

export const STUDIO_ROUTES = [
  '/series',
  '/editorial',
] as const;


/** Tela Menu do celular: o resto do app, fora das abas da barra inferior. */
export const MOBILE_MENU_ROUTE = '/menu';

/** Left side of mobile bottom nav (before FAB). */
export const MOBILE_BOTTOM_NAV_LEFT: NavItemDefinition[] = [
  { to: '/criacao', label: 'Criação', icon: PenLine, badgeKey: 'editorial' },
  { to: '/biblioteca', label: 'Biblioteca', icon: Library, badgeKey: 'library', module: 'library' },
];

/** Right side of mobile bottom nav (after FAB). */
export const MOBILE_BOTTOM_NAV_RIGHT: NavItemDefinition[] = [
  { to: '/gravacao?tab=queue', label: 'Gravação', icon: Clapperboard, module: 'recording' },
  { to: MOBILE_MENU_ROUTE, label: 'Menu', icon: MenuIcon },
];

/** @deprecated Use MOBILE_BOTTOM_NAV_LEFT + MOBILE_BOTTOM_NAV_RIGHT */
export const MOBILE_BOTTOM_NAV_ITEMS: NavItemDefinition[] = [
  ...MOBILE_BOTTOM_NAV_LEFT,
  ...MOBILE_BOTTOM_NAV_RIGHT,
];

export function splitBottomNavItems<T>(items: T[]): { left: T[]; right: T[] } {
  const splitIndex = Math.ceil(items.length / 2);
  return {
    left: items.slice(0, splitIndex),
    right: items.slice(splitIndex),
  };
}

function pathMatches(pathname: string, target: string): boolean {
  return pathname === target || pathname.startsWith(`${target}/`);
}

const CREATION_SUBPAGES = ['/criacao/legendas', '/criacao/transcricao'] as const;

/** Sidebar / drawer highlight. `/criacao/legendas` marks Legendas, not Criação (same for Transcrição). */
export function isNavItemActive(to: string, pathname: string): boolean {
  const target = to.split('?')[0];

  if (target === '/hoje') {
    return pathname === '/hoje';
  }

  if ((CREATION_SUBPAGES as readonly string[]).includes(target)) {
    return pathMatches(pathname, target);
  }

  if (target === '/criacao') {
    return (pathMatches(pathname, '/criacao') && !CREATION_SUBPAGES.some(sub => pathMatches(pathname, sub)))
      || pathMatches(pathname, '/conteudos');
  }

  if (target === '/biblioteca') {
    return pathMatches(pathname, '/biblioteca');
  }

  if (target === '/projetos') {
    return pathMatches(pathname, '/projetos');
  }

  if (target === '/gravacao') {
    return pathMatches(pathname, '/gravacao');
  }

  if (target === '/planejamento') {
    return pathMatches(pathname, '/planejamento');
  }

  if (target === '/calendario') {
    return pathname === '/calendario' || pathname.startsWith('/calendario/');
  }

  if (target === '/editorial') {
    return pathMatches(pathname, '/editorial');
  }

  if (target === '/series') {
    return pathMatches(pathname, '/series') || pathMatches(pathname, '/clubes');
  }

  if (target === '/analises') {
    return pathMatches(pathname, '/analises');
  }

  if (target === '/configuracoes') {
    if (STUDIO_ROUTES.some(route => pathMatches(pathname, route))) return false;
    return pathMatches(pathname, '/configuracoes');
  }

  return pathMatches(pathname, target);
}

/**
 * Bottom nav keeps Criação highlighted on `/criacao/legendas` and `/criacao/transcricao`.
 * Menu fica marcado em toda tela que não pertence às outras abas (Hoje, Calendário, Planejamento…),
 * para sempre haver uma aba marcada.
 */
export function isBottomNavItemActive(to: string, pathname: string): boolean {
  const target = to.split('?')[0];
  if (target === MOBILE_MENU_ROUTE) {
    return !MOBILE_BOTTOM_NAV_ITEMS
      .filter(item => item.to !== MOBILE_MENU_ROUTE)
      .some(item => isBottomNavItemActive(item.to, pathname));
  }
  if (target === '/criacao') {
    return pathMatches(pathname, '/criacao') || pathMatches(pathname, '/conteudos');
  }
  return isNavItemActive(to, pathname);
}

/**
 * Seções da tela Menu: as mesmas do menu do desktop, sem o que já está na barra inferior.
 * Subitens (Legendas, Transcrição) sobem para a seção, já que o pai (Criação) é uma aba.
 */
export function buildMobileMenuSections(moduleFlags: ModuleFlags): NavSectionDefinition[] {
  const barTargets = new Set(MOBILE_BOTTOM_NAV_ITEMS.map(item => item.to));
  return buildSidebarSections(moduleFlags)
    .map(section => ({
      label: section.label,
      items: section.items
        .flatMap(item => (barTargets.has(item.to) ? item.nested ?? [] : [item, ...(item.nested ?? [])]))
        .filter(item => !barTargets.has(item.to) && !isNavItemHidden(item, moduleFlags)),
    }))
    .filter(section => section.items.length > 0);
}

/**
 * Blocos por tipo de trabalho: começar o dia e ler; produzir; cumprir datas; decidir a direção.
 * Contas e horários vivem dentro do Editorial (aba "Contas e formatos").
 */
export function buildSidebarSections(moduleFlags: ModuleFlags): NavSectionDefinition[] {
  return [
    {
      label: null,
      items: [
        { to: '/hoje', label: 'Hoje', icon: SunMedium },
        { to: '/biblioteca', label: 'Biblioteca', icon: Library, badgeKey: 'library', module: 'library' },
      ],
    },
    {
      label: PAGE_SECTION.producao,
      items: [
        {
          to: '/criacao',
          label: 'Criação',
          icon: PenLine,
          badgeKey: 'editorial',
          nested: [
            { to: '/criacao/legendas', label: 'Legendas', icon: Captions },
            { to: '/criacao/transcricao', label: 'Transcrição', icon: AudioLines },
          ],
        },
        { to: '/series', label: 'Séries e quadros', icon: ListVideo, end: false },
        { to: '/gravacao?tab=queue', label: 'Gravação', icon: Clapperboard, module: 'recording' },
      ],
    },
    {
      label: PAGE_SECTION.agenda,
      items: [
        { to: '/calendario', label: 'Calendário', icon: CalendarDays, module: 'calendar' },
        { to: '/projetos', label: 'Projetos', icon: Briefcase, module: 'projects' },
      ],
    },
    {
      label: PAGE_SECTION.estrategia,
      items: [
        { to: '/editorial', label: 'Editorial', icon: Columns3 },
        { to: '/planejamento', label: 'Planejamento', icon: StickyNote, module: 'calendar' },
        // Área desligada por padrão (moduleFlags.analyses) enquanto está em preparação.
        { to: '/analises', label: 'Análises', icon: ChartColumn, module: 'analyses' },
      ],
    },
  ];
}

export function isNavItemHidden(item: NavItemDefinition, moduleFlags: ModuleFlags): boolean {
  if (!item.module) return false;
  return !moduleFlags[item.module];
}

export function resolveNavBadge(
  item: NavItemDefinition,
  counts: { editorialCount: number; libraryCount: number },
  libraryFallback = 0,
): number | undefined {
  if (item.badgeKey === 'editorial') {
    return counts.editorialCount || undefined;
  }
  if (item.badgeKey === 'library') {
    return counts.libraryCount || libraryFallback || undefined;
  }
  return undefined;
}

/** O que o número ao lado do item conta, para não parecer outra contagem da mesma tela. */
export function navBadgeHint(item: NavItemDefinition, count: number): string {
  if (item.badgeKey === 'editorial') {
    return `${count} em andamento: ideias, roteiros e produção`;
  }
  if (item.badgeKey === 'library') {
    return count === 1 ? '1 obra na biblioteca' : `${count} obras na biblioteca`;
  }
  return `${count} itens`;
}

export function isSettingsNavActive(pathname: string, _isActive = false): boolean {
  return isNavItemActive('/configuracoes', pathname);
}
