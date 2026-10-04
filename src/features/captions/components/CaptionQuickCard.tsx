import { Check, Copy } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { Surface } from '../../../components/ui/Surface';
import { Text } from '../../../components/ui/Text';
import { PlatformIcon as PlatformGlyph, platformDisplayName, platformKey } from '../../../components/ui/PlatformIcon';
import { ensurePlatformRecord } from '../../contents/components/detail/PlatformCopyEditor';
import {
  captionHashtagPresets,
  joinHashtags,
  mergeHashtags,
  parseHashtags,
} from '../../contents/lib/captionHashtags';
import { isContentBodyLoaded } from '../../contents/lib/contentBody';
import { getDisplayStatus } from '../../contents/lib/contentPipeline';
import { buildContentDetailRoute } from '../../contents/lib/contentDetailRoute';
import type { Content, ContentPlataforma, Pilar, Serie } from '../../../lib/database';
import { getVisualFormatLabel } from '../../../constants';
import { cn, htmlToReadableText } from '../../../lib/utils';
import { captionClipboardText, formatCaptionBlock } from '../lib/captionQueue';

const CHAR_LIMITS: Record<string, number> = {
  instagram: 2200,
  tiktok: 2200,
  youtube: 5000,
  blog: 10000,
};

function captionSnapshot(items: ContentPlataforma[]) {
  return items
    .map(item => `${item.platformId}\u0000${item.legenda}\u0000${item.hashtags}`)
    .sort()
    .join('\u0001');
}

function useCaptionDraft(
  content: Content,
  onSave: (content: Content) => Promise<void>,
) {
  const [plataformas, setPlataformas] = useState(content.plataformas);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const baselineRef = useRef(content.plataformas);
  const contentRef = useRef(content);
  const onSaveRef = useRef(onSave);
  contentRef.current = content;
  onSaveRef.current = onSave;

  useEffect(() => {
    if (editing) return;
    baselineRef.current = content.plataformas;
    setPlataformas(content.plataformas);
  }, [content.id, content.plataformas, content.updatedAt, editing]);

  const commit = useCallback(async (snapshot: ContentPlataforma[]) => {
    setPlataformas(snapshot);
    await onSaveRef.current({
      ...contentRef.current,
      plataformas: snapshot,
    });
    baselineRef.current = snapshot;
  }, []);

  const update = useCallback((next: ContentPlataforma[]) => {
    setPlataformas(next);
  }, []);

  const startEdit = useCallback(() => {
    baselineRef.current = plataformas;
    setEditing(true);
  }, [plataformas]);

  const cancel = useCallback(() => {
    setPlataformas(baselineRef.current);
    setEditing(false);
  }, []);

  const save = useCallback(async () => {
    if (captionSnapshot(plataformas) === captionSnapshot(baselineRef.current)) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await commit(plataformas);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [commit, plataformas]);

  const dirty = captionSnapshot(plataformas) !== captionSnapshot(baselineRef.current);

  return { plataformas, update, editing, saving, dirty, startEdit, cancel, save, commit };
}

function mergePlatform(
  plataformas: ContentPlataforma[],
  contentId: string,
  platformId: string,
  patch: Partial<ContentPlataforma>,
) {
  const existing = plataformas.find(item => item.platformId === platformId);
  const next = { ...(existing ?? ensurePlatformRecord(plataformas, platformId, contentId)), ...patch };
  const hasText = formatCaptionBlock(next).length > 0;
  const scheduled = Boolean(next.publishDate);
  if (!hasText && !scheduled) {
    return plataformas.filter(item => item.platformId !== platformId);
  }
  if (!existing) return [...plataformas, next];
  return plataformas.map(item => (item.platformId === platformId ? next : item));
}

const videoCellClass = 'sticky left-0 z-10 w-[220px] min-w-[200px] border-b border-r border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 py-3 align-top';
const networkCellClass = 'min-w-[200px] border-b border-[var(--border-color)] px-3 py-3 align-top';
const stickyEdgeShadowClass = 'shadow-[8px_0_16px_-8px_color-mix(in_srgb,var(--text-primary)_24%,transparent)]';

function alignPlatformHashtags<T extends { platformId: string }>(
  items: T[] | undefined,
  names: string[],
) {
  return (items ?? []).map(item => {
    const match = names.find(name => platformKey(name) === platformKey(item.platformId));
    if (!match || match === item.platformId) return item;
    return { ...item, platformId: match };
  });
}

function missingPresetTags(tags: string[], hashtags: string) {
  const current = parseHashtags(hashtags);
  return tags.filter(tag => !current.some(existing => existing.toLowerCase() === tag.toLowerCase()));
}

function CaptionGridRow({
  content,
  platforms,
  series,
  pilares,
  onSave,
  hasHydrationError = false,
  onRetryHydration,
  stickyEdge = false,
}: {
  content: Content;
  platforms: string[];
  series: Serie[];
  pilares: Pilar[];
  onSave: (content: Content) => Promise<void>;
  hasHydrationError?: boolean;
  onRetryHydration?: () => void;
  stickyEdge?: boolean;
}) {
  const { plataformas, update, editing, saving, dirty, startEdit, cancel, save, commit } = useCaptionDraft(content, onSave);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const pulledRef = useRef(false);
  const title = content.title.trim() || 'Sem título';
  const status = getDisplayStatus(content);
  const formatValue = content.formatoVisual?.trim();
  const format = formatValue ? getVisualFormatLabel(formatValue) : null;
  const serie = useMemo(() => {
    const found = series.find(item => item.id === content.seriesId);
    if (!found) return null;
    return { ...found, plataformas: alignPlatformHashtags(found.plataformas, platforms) };
  }, [content.seriesId, platforms, series]);
  const pilar = useMemo(() => {
    const found = pilares.find(item => item.id === content.pilarId);
    if (!found) return null;
    return { ...found, plataformas: alignPlatformHashtags(found.plataformas, platforms) };
  }, [content.pilarId, pilares, platforms]);

  useEffect(() => {
    if (pulledRef.current || editing) return;
    if (content.seriesId && !serie) return;
    if (content.pilarId && !pilar) return;

    let next = plataformas;
    let changed = false;
    for (const platform of platforms) {
      const presets = captionHashtagPresets(platform, serie, pilar);
      if (presets.length === 0) continue;
      const record = next.find(item => item.platformId === platform);
      if (record?.hashtags.trim()) continue;
      const tags = mergeHashtags([], presets.flatMap(preset => preset.tags));
      if (tags.length === 0) continue;
      next = mergePlatform(next, content.id, platform, { hashtags: joinHashtags(tags) });
      changed = true;
    }

    pulledRef.current = true;
    if (changed) void commit(next);
  }, [commit, content.id, content.pilarId, content.seriesId, editing, pilar, plataformas, platforms, serie]);

  const updatePlatform = (platformId: string, patch: Partial<ContentPlataforma>) => {
    update(mergePlatform(plataformas, content.id, platformId, patch));
  };

  const handleCopy = async (platformId: string) => {
    const text = captionClipboardText(plataformas, platformId);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPlatform(platformId);
      window.setTimeout(() => setCopiedPlatform(current => (current === platformId ? null : current)), 1500);
    } catch {
      setCopiedPlatform(null);
    }
  };

  const scriptText = htmlToReadableText(content.script).trim();
  const scriptReady = isContentBodyLoaded(content);
  const scriptLoading = !scriptReady && !hasHydrationError;
  const scriptEmpty = scriptReady && scriptText.length === 0;

  const handleCopyScript = async () => {
    if (hasHydrationError) {
      onRetryHydration?.();
      return;
    }
    if (!scriptText) return;
    try {
      await navigator.clipboard.writeText(scriptText);
      setCopiedScript(true);
      window.setTimeout(() => setCopiedScript(false), 1500);
    } catch {
      setCopiedScript(false);
    }
  };

  const scriptButtonLabel = copiedScript
    ? 'Copiado'
    : hasHydrationError
      ? 'Tentar de novo'
      : scriptLoading
        ? 'Carregando…'
        : 'Copiar roteiro';

  return (
    <tr>
      <th scope="row" className={cn(videoCellClass, stickyEdge && stickyEdgeShadowClass, 'text-left font-normal')}>
        <Link
          to={buildContentDetailRoute(content.id)}
          state={{ from: '/criacao/legendas' }}
          className="block min-w-0 rounded-[var(--radius-sm)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
        >
          <Text variant="itemTitle">{title}</Text>
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant="status" status={status}>{status}</Badge>
          {format ? <Text variant="meta">{format}</Text> : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AppButton
            size="xs"
            variant="secondary"
            disabled={scriptLoading || scriptEmpty}
            aria-label={
              scriptEmpty
                ? `Roteiro de ${title} ainda não tem texto`
                : hasHydrationError
                  ? `Tentar carregar o roteiro de ${title}`
                  : `Copiar roteiro de ${title}`
            }
            title={scriptEmpty ? 'Este roteiro ainda não tem texto.' : undefined}
            leftIcon={copiedScript ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            onClick={() => void handleCopyScript()}
          >
            {scriptButtonLabel}
          </AppButton>
        </div>
      </th>
      {platforms.map(platform => {
        const record = plataformas.find(item => item.platformId === platform);
        const legenda = record?.legenda ?? '';
        const hashtags = record?.hashtags ?? '';
        const limit = CHAR_LIMITS[platformKey(platform)];
        const overLimit = Boolean(limit && legenda.length > limit);
        const canCopy = Boolean(record && formatCaptionBlock(record));

        return (
          <td key={platform} className={networkCellClass}>
            <textarea
              value={legenda}
              rows={4}
              readOnly={!editing}
              tabIndex={editing ? 0 : -1}
              placeholder={`Legenda para ${platformDisplayName(platform)}`}
              aria-label={`Legenda de ${platformDisplayName(platform)} para ${title}`}
              aria-readonly={!editing}
              className={cn('w-full', !editing && 'caption-locked')}
              onChange={event => updatePlatform(platform, { legenda: event.target.value })}
            />
            <input
              type="text"
              value={hashtags}
              readOnly={!editing}
              tabIndex={editing ? 0 : -1}
              placeholder="#leitura #livros"
              aria-label={`Hashtags de ${platformDisplayName(platform)} para ${title}`}
              aria-readonly={!editing}
              className={cn('mt-2 w-full', !editing && 'caption-locked')}
              onChange={event => updatePlatform(platform, { hashtags: event.target.value })}
            />
            <CaptionHashtagSources
              platform={platform}
              hashtags={hashtags}
              serie={serie}
              pilar={pilar}
              readOnly={!editing}
              onPull={tags => updatePlatform(platform, {
                hashtags: joinHashtags(mergeHashtags(parseHashtags(hashtags), tags)),
              })}
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {editing ? (
                  <>
                    <AppButton size="xs" variant="secondary" disabled={saving} onClick={cancel}>
                      Cancelar
                    </AppButton>
                    <AppButton
                      size="xs"
                      variant="primary"
                      disabled={saving || !dirty}
                      onClick={() => void save()}
                    >
                      {saving ? 'Salvando…' : 'Salvar'}
                    </AppButton>
                  </>
                ) : (
                  <AppButton size="xs" variant="secondary" onClick={startEdit}>
                    Editar
                  </AppButton>
                )}
                <Text variant="meta" className={overLimit ? 'text-[var(--danger)]' : undefined}>
                  {limit ? `${legenda.length} / ${limit}` : `${legenda.length}`}
                </Text>
              </div>
              <AppButton
                size="xs"
                variant="ghost"
                iconOnly
                disabled={!canCopy}
                aria-label={`Copiar legenda de ${platformDisplayName(platform)}`}
                leftIcon={copiedPlatform === platform ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                onClick={() => void handleCopy(platform)}
              />
            </div>
          </td>
        );
      })}
    </tr>
  );
}

function CaptionHashtagSources({
  platform,
  hashtags,
  serie,
  pilar,
  readOnly = false,
  onPull,
}: {
  platform: string;
  hashtags: string;
  serie: Serie | null;
  pilar: Pilar | null;
  readOnly?: boolean;
  onPull: (tags: string[]) => void;
}) {
  const presets = captionHashtagPresets(platform, serie, pilar);
  if (presets.length === 0) return null;

  const pending = presets.flatMap(preset => {
    const missing = missingPresetTags(preset.tags, hashtags);
    if (missing.length === 0) return [];
    const label = preset.key === 'serie' ? 'Puxar da série' : 'Puxar do pilar';
    return [{ key: preset.key, label, missing }];
  });

  if (readOnly && pending.length > 0) return null;

  if (pending.length === 0) {
    const sources = presets.map(preset => (preset.key === 'serie' ? 'série' : 'pilar'));
    const label = sources.length === 2
      ? 'Hashtags da série e do pilar'
      : sources[0] === 'série'
        ? 'Hashtags da série'
        : 'Hashtags do pilar';
    return <Text variant="meta" className="mt-2">{label}</Text>;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {pending.map(preset => (
        <AppButton
          key={preset.key}
          size="xs"
          variant="secondary"
          aria-label={`${preset.label}: ${preset.missing.join(' ')}`}
          onClick={() => onPull(preset.missing)}
        >
          {preset.label}
        </AppButton>
      ))}
    </div>
  );
}

interface CaptionGridProps {
  contents: Content[];
  platforms: string[];
  series: Serie[];
  pilares: Pilar[];
  onSave: (content: Content) => Promise<void>;
  hasHydrationError?: (id: string) => boolean;
  onRetryHydration?: (id: string) => void;
}

export function CaptionGrid({
  contents,
  platforms,
  series,
  pilares,
  onSave,
  hasHydrationError = () => false,
  onRetryHydration,
}: CaptionGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollEdge, setScrollEdge] = useState({ left: false, right: false });

  const updateScrollEdge = useCallback(() => {
    const node = scrollRef.current;
    if (!node) {
      setScrollEdge({ left: false, right: false });
      return;
    }
    const left = node.scrollLeft > 1;
    const right = node.scrollLeft + node.clientWidth < node.scrollWidth - 1;
    setScrollEdge(previous => (
      previous.left === left && previous.right === right ? previous : { left, right }
    ));
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    updateScrollEdge();
    const observer = new ResizeObserver(updateScrollEdge);
    observer.observe(node);
    node.addEventListener('scroll', updateScrollEdge, { passive: true });
    return () => {
      observer.disconnect();
      node.removeEventListener('scroll', updateScrollEdge);
    };
  }, [contents.length, platforms.length, updateScrollEdge]);

  const showStickyShadow = scrollEdge.left || scrollEdge.right;

  return (
    <div className="relative min-w-0 max-w-full">
      <Surface variant="outlined" padding="none" className="min-w-0 max-w-full overflow-hidden">
        <div ref={scrollRef} className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left">
            <thead>
              <tr>
                <th
                  scope="col"
                  className={cn(
                    'sticky left-0 z-20 w-[220px] min-w-[200px] border-b border-r border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-left',
                    showStickyShadow && stickyEdgeShadowClass,
                  )}
                >
                  <Text variant="label">Roteiro</Text>
                </th>
                {platforms.map(platform => (
                  <th
                    key={platform}
                    scope="col"
                    className="min-w-[200px] border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-3 text-left"
                  >
                    <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
                      <PlatformGlyph platform={platform} className="h-4 w-4" />
                      <Text variant="label">{platformDisplayName(platform)}</Text>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contents.map(content => (
                <CaptionGridRow
                  key={content.id}
                  content={content}
                  platforms={platforms}
                  series={series}
                  pilares={pilares}
                  onSave={onSave}
                  hasHydrationError={hasHydrationError(content.id)}
                  onRetryHydration={onRetryHydration ? () => onRetryHydration(content.id) : undefined}
                  stickyEdge={showStickyShadow}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Surface>
      {scrollEdge.right ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-px right-px w-8 rounded-r-[var(--radius-card)] bg-gradient-to-l from-[var(--bg-elevated)] to-transparent"
        />
      ) : null}
    </div>
  );
}
