import type {Platform} from '../../../lib/database';
import {CONTENT_STATUS, DISPLAY_STATUS} from '../../contents/lib/contentPipeline';

export const ALL_PLATFORMS = 'todas';
export const ALL_STATUSES = 'todos';

export const CONTENT_STATUS_FILTER_OPTIONS = [
  {label: 'Todos os status', value: ALL_STATUSES},
  {label: CONTENT_STATUS.IDEIA, value: CONTENT_STATUS.IDEIA},
  {label: CONTENT_STATUS.ROTEIRO, value: CONTENT_STATUS.ROTEIRO},
  {label: CONTENT_STATUS.PRODUCAO, value: CONTENT_STATUS.PRODUCAO},
  {label: DISPLAY_STATUS.PROGRAMADO, value: DISPLAY_STATUS.PROGRAMADO},
  {label: CONTENT_STATUS.POSTADO, value: CONTENT_STATUS.POSTADO},
];

export function collectPlatformNames(platforms: Platform[], usedNames: Iterable<string> = []) {
  const names = new Set<string>();
  platforms.filter(platform => platform.ativo).forEach(platform => names.add(platform.nome));
  for (const name of usedNames) {
    const trimmed = name.trim();
    if (trimmed) names.add(trimmed);
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function platformFilterOptions(names: string[]) {
  return [
    {label: 'Todas as plataformas', value: ALL_PLATFORMS},
    ...names.map(name => ({label: name, value: name})),
  ];
}

export function matchesContentFilters(input: {
  platformNames: string[];
  status: string;
  platformFilter: string;
  statusFilter: string;
}) {
  if (input.statusFilter !== ALL_STATUSES && input.status !== input.statusFilter) return false;
  if (input.platformFilter !== ALL_PLATFORMS && !input.platformNames.includes(input.platformFilter)) return false;
  return true;
}
