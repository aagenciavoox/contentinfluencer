import type { ElementType } from 'react';
import {
  BookOpen,
  Calendar,
  CalendarClock,
  Camera,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Layers,
  Lightbulb,
  Palette,
} from 'lucide-react';
import type { ModuleFlags } from '../../features/settings/lib/moduleFlags';
import { GLOSSARY } from '../../lib/uiCopy';

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
  { to: '/conteudos', label: 'Roteiros', icon: FileText, badgeKey: 'editorial' },
  { to: '/gravacao?tab=queue', label: 'Gravação', icon: Camera, module: 'recording' },
  { to: '/ideias', label: 'Ideias', icon: Lightbulb },
];

export function buildSidebarSections(moduleFlags: ModuleFlags): NavSectionDefinition[] {
  return [
    {
      label: null,
      items: [{ to: '/dashboard', label: 'Hoje', icon: LayoutDashboard }],
    },
    {
      label: 'Criação',
      items: [
        { to: '/ideias', label: 'Ideias', icon: Lightbulb },
        { to: '/conteudos', label: 'Roteiros', icon: FileText, badgeKey: 'editorial' },
        { to: '/configuracoes/series', label: 'Séries', icon: Layers },
        { to: '/configuracoes/pilares', label: 'Pilares', icon: Palette },
        { to: '/biblioteca', label: 'Biblioteca', icon: BookOpen, badgeKey: 'library', module: 'library' },
      ],
    },
    {
      label: 'Produção',
      items: [
        { to: '/gravacao?tab=queue', label: 'Gravação', icon: Camera, module: 'recording' },
        { to: '/programacao', label: GLOSSARY.gradePostagem, icon: CalendarClock, module: 'calendar' },
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
