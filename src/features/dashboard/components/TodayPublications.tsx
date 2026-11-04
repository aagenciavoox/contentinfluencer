import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../../../components/ui/Badge';
import { PlatformIcon } from '../../../components/ui/PlatformIcon';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { Skeleton } from '../../../components/ui/Skeleton';
import type { Content } from '../../../lib/database';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import { CONTENT_STATUS, getDisplayStatus, isReadyToPublish } from '../../contents/lib/contentPipeline';
import { isPostedContent } from '../../contents/lib/contentWorkflow';
import { publishItemStatus } from '../../editorial-calendar/lib/publishCalendarItems';
import type { DetailBackState } from '../../../lib/navigation/detailBack';
import type { TodayPublication } from '../lib/todayPublications';
import { TodayLoadError } from './TodayLoadError';

interface GroupedPublication {
  contentId: string;
  content: Content;
  platforms: string[];
  time: string | null;
  allPosted: boolean;
  anyScheduled: boolean;
  contentStatus: string;
}

function resolveStatusChip(group: GroupedPublication): { status: string; label: string } {
  if (group.allPosted || isPostedContent(group.content)) {
    return { status: 'Postado', label: 'Postado' };
  }
  if (group.anyScheduled || isReadyToPublish(group.content)) {
    return { status: 'Agendado', label: 'Agendado' };
  }
  const status = group.contentStatus;
  if (status === 'Roteiro' || group.content.status === CONTENT_STATUS.ROTEIRO) {
    return { status: 'Roteiro', label: 'Roteiro' };
  }
  if (status === 'Edição' || group.content.status === CONTENT_STATUS.EDICAO) {
    return { status: 'Em edição', label: 'Em edição' };
  }
  return { status: 'Material em produção', label: 'Material em produção' };
}

export function TodayPublications({ items, loading, error, onRetry, detailBack }: {
  items: TodayPublication[]; loading: boolean; error: boolean; onRetry: () => void; detailBack: DetailBackState;
}) {
  const groupedItems = useMemo(() => {
    const map = new Map<string, GroupedPublication>();
    for (const item of items) {
      let group = map.get(item.contentId);
      if (!group) {
        group = {
          contentId: item.contentId,
          content: item.content,
          platforms: [],
          time: item.time,
          allPosted: true,
          anyScheduled: false,
          contentStatus: getDisplayStatus(item.content),
        };
        map.set(item.contentId, group);
      }
      if (item.time && (!group.time || item.time < group.time)) {
        group.time = item.time;
      }
      for (const name of item.platformNames) {
        if (name && !group.platforms.includes(name)) {
          group.platforms.push(name);
        }
      }
      if (!item.posted) {
        group.allPosted = false;
      }
      const itemStatus = publishItemStatus(item.content, item);
      if (item.programada || itemStatus === 'Programada' || itemStatus === 'Programado') {
        group.anyScheduled = true;
      }
    }
    // Fallback de plataformas quando item.platformNames estiver vazio
    for (const group of map.values()) {
      if (group.platforms.length === 0 && group.content.plataformas) {
        for (const p of group.content.plataformas) {
          if (p.platformId && !group.platforms.includes(p.platformId)) {
            group.platforms.push(p.platformId);
          }
        }
      }
    }
    return [...map.values()];
  }, [items]);

  return <section className="stack-sm" aria-labelledby="today-publications-title">
    <Text variant="sectionTitle" id="today-publications-title">Publicações de hoje</Text>
    <Surface variant="outlined" padding="md">
      {error ? <TodayLoadError label="as publicações" onRetry={onRetry} /> : loading ? (
        <div className="stack-sm" aria-busy="true" aria-label="Carregando publicações"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
      ) : !items.length ? <Text variant="secondary">Nenhuma publicação prevista para hoje.</Text> : (
        <ul className="stack-sm">{groupedItems.map(group => {
          const statusChip = resolveStatusChip(group);
          return <li key={group.contentId} className="rounded-[var(--radius-sm)] border border-[var(--border-color)] bg-[var(--surface-subtle)] p-3 transition-colors hover:bg-[var(--bg-hover)]">
            <Link to={buildContentDetailRoute(group.contentId, 'publicacao')} state={detailBack} className="block rounded-[var(--radius-sm)] stack-xs focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Text variant="bodyStrong" className="line-clamp-2">{group.content.title.trim() || 'Sem título'}</Text>
                {group.platforms.length > 0 ? (
                  <div className="flex items-center gap-1.5 shrink-0" aria-label={`Redes: ${group.platforms.join(', ')}`}>
                    {group.platforms.map(platform => (
                      <PlatformIcon key={platform} platform={platform} className="h-4 w-4" colored />
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Badge variant="neutral">{group.time || 'Sem horário'}</Badge>
                <Badge variant="status" status={statusChip.status}>{statusChip.label}</Badge>
              </div>
            </Link>
          </li>;
        })}</ul>
      )}
    </Surface>
  </section>;
}
