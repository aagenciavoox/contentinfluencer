import type { ElementType } from 'react';
import {
  Briefcase,
  CalendarDays,
  Captions,
  Clapperboard,
  Columns3,
  Library,
  ListVideo,
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

export const PAGE_SECTION = {
  hoje: 'Hoje',
  criacao: 'Criação',
  producao: 'Produção',
  configuracoes: 'Configurações',
} as const;

export const STUDIO_ROUTES = [
  '/series',
  '/editorial',
] as const;

/** Left side of mobile bottom nav (before FAB). */
export const MOBILE_BOTTOM_NAV_LEFT: NavItemDefinition[] = [
  { to: '/hoje', label: 'Hoje', icon: SunMedium },
  { to: '/criacao', label: 'Criação', icon: PenLine, badgeKey: 'editorial' },
];

/** Right side of mobile bottom nav (after FAB). */
export const MOBILE_BOTTOM_NAV_RIGHT: NavItemDefinition[] = [
  { to: '/biblioteca', label: 'Biblioteca', icon: Library, badgeKey: 'library', module: 'library' },
  { to: '/gravacao?tab=queue', label: 'Gravação', icon: Clapperboard, module: 'recording' },
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

/** Sidebar / drawer highlight. `/criacao/legendas` marks Legendas, not Criação. */
export function isNavItemActive(to: string, pathname: string): boolean {
  const target = to.split('?')[0];

  if (target === '/hoje') {
    return pathname === '/hoje';
  }

  if (target === '/criacao/legendas') {
    return pathMatches(pathname, '/criacao/legendas');
  }

  if (target === '/criacao') {
    return (pathMatches(pathname, '/criacao') && !pathMatches(pathname, '/criacao/legendas'))
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

  if (target === '/editorial') {
    return pathMatches(pathname, '/editorial');
  }

  if (target === '/series') {
    return pathMatches(pathname, '/series');
  }

  if (target === '/configuracoes') {
    if (STUDIO_ROUTES.some(route => pathMatches(pathname, route))) return false;
    return pathMatches(pathname, '/configuracoes');
  }

  return pathMatches(pathname, target);
}

/** Bottom nav keeps Criação highlighted on `/criacao/legendas`. */
export function isBottomNavItemActive(to: string, pathname: string): boolean {
  const target = to.split('?')[0];
  if (target === '/criacao') {
    return pathMatches(pathname, '/criacao') || pathMatches(pathname, '/conteudos');
  }
  return isNavItemActive(to, pathname);
}

export function buildSidebarSections(moduleFlags: ModuleFlags): NavSectionDefinition[] {
  return [
    {
      label: null,
      items: [
        { to: '/hoje', label: 'Hoje', icon: SunMedium },
      ],
    },
    {
      label: 'Criação',
      items: [
        {
          to: '/criacao',
          label: 'Criação',
          icon: PenLine,
          badgeKey: 'editorial',
          nested: [
            { to: '/criacao/legendas', label: 'Legendas', icon: Captions },
          ],
        },
        { to: '/series', label: 'Séries', icon: ListVideo, end: false },
        { to: '/editorial', label: 'Editorial', icon: Columns3 },
        { to: '/biblioteca', label: 'Biblioteca', icon: Library, badgeKey: 'library', module: 'library' },
      ],
    },
    {
      label: 'Produção',
      items: [
        { to: '/gravacao?tab=queue', label: 'Gravação', icon: Clapperboard, module: 'recording' },
        { to: '/calendario', label: 'Calendário', icon: CalendarDays, module: 'calendar' },
        { to: '/projetos', label: 'Projetos', icon: Briefcase, module: 'projects' },
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

export function isSettingsNavActive(pathname: string, _isActive = false): boolean {
  return isNavItemActive('/configuracoes', pathname);
}
