import type { ElementType } from 'react';
import {
  BookOpen,
  Calendar,
  Camera,
  FolderKanban,
  Layers,
  Palette,
  Sparkles,
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
};

export type NavSectionDefinition = {
  label: string | null;
  items: NavItemDefinition[];
};

export const STUDIO_ROUTES = [
  '/configuracoes/pilares',
  '/configuracoes/series',
] as const;

export const MOBILE_BOTTOM_NAV_ITEMS: NavItemDefinition[] = [
  { to: '/calendario', label: 'Calendário', icon: Calendar, module: 'calendar' },
  { to: '/criacao', label: 'Criação', icon: Sparkles, badgeKey: 'editorial' },
  { to: '/gravacao?tab=queue', label: 'Gravação', icon: Camera, module: 'recording' },
];

export function splitBottomNavItems<T>(items: T[]): { left: T[]; right: T[] } {
  const splitIndex = Math.ceil(items.length / 2);
  return {
    left: items.slice(0, splitIndex),
    right: items.slice(splitIndex),
  };
}

export function isBottomNavItemActive(to: string, pathname: string): boolean {
  const target = to.split('?')[0];

  if (target === '/criacao') {
    return pathname === '/criacao' || pathname.startsWith('/conteudos/');
  }

  if (target === '/gravacao') {
    return pathname === '/gravacao' || pathname.startsWith('/gravacao/');
  }

  return pathname === target || pathname.startsWith(`${target}/`);
}

export function buildSidebarSections(moduleFlags: ModuleFlags): NavSectionDefinition[] {
  return [
    {
      label: 'Criação',
      items: [
        { to: '/criacao', label: 'Criação', icon: Sparkles, badgeKey: 'editorial' },
        { to: '/configuracoes/series', label: 'Séries', icon: Layers },
        { to: '/configuracoes/pilares', label: 'Pilares', icon: Palette },
        { to: '/biblioteca', label: 'Biblioteca', icon: BookOpen, badgeKey: 'library', module: 'library' },
      ],
    },
    {
      label: 'Produção',
      items: [
        { to: '/gravacao?tab=queue', label: 'Gravação', icon: Camera, module: 'recording' },
        { to: '/calendario', label: 'Calendário', icon: Calendar, module: 'calendar' },
        { to: '/projetos', label: 'Projetos', icon: FolderKanban, module: 'projects' },
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

export function isSettingsNavActive(pathname: string, isActive: boolean): boolean {
  const isStudio = STUDIO_ROUTES.some(route => pathname.startsWith(route));
  return !isStudio && (isActive || pathname.startsWith('/configuracoes'));
}
