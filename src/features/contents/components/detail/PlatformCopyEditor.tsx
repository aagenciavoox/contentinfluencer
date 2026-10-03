import {Check, Copy, Instagram, Plus, Youtube} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';
import {DEFAULT_PLATFORMS} from '../../../../constants';
import {useAppContext} from '../../../../context/AppContext';
import type {ContentPlataforma, Pilar, Serie} from '../../../../lib/database';
import {cn} from '../../../../lib/utils';
import {AppButton} from '../../../../components/ui/AppButton';
import {Surface} from '../../../../components/ui/Surface';
import {Text} from '../../../../components/ui/Text';
import {TagPill} from '../../../../components/ui/TagSelect';
import {
  CAPTION_HASHTAG_MAX,
  captionHashtagPresets,
  joinHashtags,
  mergeHashtags,
  parseHashtags,
} from '../../lib/captionHashtags';

const CHAR_LIMITS: Record<string, number> = {
  Instagram: 2200,
  TikTok: 2200,
  YouTube: 5000,
  Blog: 10000,
};

const PLATFORM_BRAND: Record<string, {shell: string; icon: string}> = {
  Instagram: {
    shell: 'bg-[color-mix(in_srgb,var(--accent-pink)_14%,var(--bg-elevated))]',
    icon: 'text-[var(--accent-pink)]',
  },
  TikTok: {
    shell: 'bg-[var(--bg-hover)]',
    icon: 'text-[var(--text-primary)]',
  },
  YouTube: {
    shell: 'bg-[color-mix(in_srgb,var(--danger)_12%,var(--bg-elevated))]',
    icon: 'text-[var(--danger)]',
  },
  Blog: {
    shell: 'bg-[var(--bg-hover)]',
    icon: 'text-[var(--text-secondary)]',
  },
};

function TikTokIcon({className}: {className?: string}) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M16.5 3.5c.7 1.4 1.8 2.5 3.2 3.1V10c-1.1-.1-2.2-.4-3.2-.9v6.8c0 3.4-2.8 6.2-6.2 6.2S4.1 19.3 4.1 15.9 6.9 9.7 10.3 9.7c.4 0 .8 0 1.2.1v3.4c-.3-.1-.7-.2-1.1-.2-1.6 0-2.9 1.3-2.9 2.9s1.3 2.9 2.9 2.9 2.9-1.3 2.9-2.9V3.5h3.2z" />
    </svg>
  );
}

function PlatformTabIcon({platform, className}: {platform: string; className?: string}) {
  if (platform === 'Instagram') return <Instagram className={className} />;
  if (platform === 'YouTube') return <Youtube className={className} />;
  if (platform === 'TikTok') return <TikTokIcon className={className} />;
  return <span className={cn('text-xs font-bold', className)}>{platform.slice(0, 2)}</span>;
}

function PlatformIconBadge({platform}: {platform: string}) {
  const brand = PLATFORM_BRAND[platform] ?? PLATFORM_BRAND.Blog;

  return (
    <span
      className={cn(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)]',
        brand.shell,
      )}
    >
      <PlatformTabIcon platform={platform} className={cn('h-3.5 w-3.5', brand.icon)} />
    </span>
  );
}

function PlatformStatusDot({status}: {status: 'empty' | 'partial' | 'complete'}) {
  if (status === 'empty') {
    return <span className="h-4 w-4 shrink-0" aria-hidden />;
  }

  if (status === 'partial') {
    return (
      <span
        className="h-2 w-2 shrink-0 rounded-full bg-[var(--warning)]"
        aria-label="Legenda sem hashtags"
      />
    );
  }

  return (
    <span
      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--success)]"
      aria-label="Legenda completa"
    >
      <Check className="h-2.5 w-2.5 text-[var(--bg-elevated)]" strokeWidth={3} />
    </span>
  );
}

function PlatformToggleButton({
  platform,
  isEnabled,
  isActive,
  completion,
  disabled,
  appearance = 'default',
  onClick,
}: {
  platform: string;
  isEnabled: boolean;
  isActive: boolean;
  completion: 'empty' | 'partial' | 'complete' | 'inactive';
  disabled?: boolean;
  appearance?: 'default' | 'manage';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isEnabled}
      className={cn(
        'inline-flex h-10 min-w-[132px] items-center gap-2.5 rounded-[var(--radius-input)] px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-50',
        appearance === 'manage'
          ? isActive
            ? 'border border-[var(--accent-blue)] bg-[color-mix(in_srgb,var(--accent-blue)_12%,var(--bg-elevated))] text-[var(--text-primary)]'
            : 'border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:border-[var(--border-strong)]'
          : isEnabled && isActive
            ? 'border-2 border-[var(--accent-purple)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
            : isEnabled
              ? 'border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent-purple)]'
              : 'border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]',
      )}
    >
      <PlatformIconBadge platform={platform} />
      <span className="min-w-0 flex-1 truncate text-left">{platform}</span>
      {appearance === 'manage' ? (
        isEnabled ? (
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent-blue)] text-[var(--bg-primary)]">
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
        ) : (
          <Plus className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
        )
      ) : isEnabled ? (
        <PlatformStatusDot status={completion === 'inactive' ? 'empty' : completion} />
      ) : null}
    </button>
  );
}

function platformCompletion(record: ContentPlataforma | undefined): 'empty' | 'partial' | 'complete' {
  if (!record?.legenda?.trim()) return 'empty';
  if (record.hashtags?.trim()) return 'complete';
  return 'partial';
}

export function ensurePlatformRecord(
  plataformas: ContentPlataforma[],
  platformId: string,
  contentId = ''
) {
  const existing = plataformas.find(plataforma => plataforma.platformId === platformId);
  if (existing) return existing;

  return {
    id: '',
    contentId,
    platformId,
    legenda: '',
    hashtags: '',
    publishDate: null,
    publishDateEnabled: false,
  } satisfies ContentPlataforma;
}

interface PlatformCopyEditorProps {
  plataformas: ContentPlataforma[];
  pilar: Pilar | null;
  serie: Serie | null;
  disabled?: boolean;
  onChange: (plataformas: ContentPlataforma[]) => void;
  embedded?: boolean;
  presentation?: 'panel' | 'manage';
}

export function PlatformCopyEditor({
  plataformas,
  pilar,
  serie,
  disabled = false,
  onChange,
  embedded = false,
  presentation = 'panel',
}: PlatformCopyEditorProps) {
  const {state} = useAppContext();
  const registeredPlatforms = useMemo(
    () => {
      const active = state.platforms.filter(platform => platform.ativo).map(platform => platform.nome);
      return active.length > 0 ? active : DEFAULT_PLATFORMS;
    },
    [state.platforms],
  );
  const [activePlatform, setActivePlatform] = useState<string>(
    plataformas[0]?.platformId || registeredPlatforms[0] || DEFAULT_PLATFORMS[0],
  );
  const [copied, setCopied] = useState<'legenda' | 'tudo' | null>(null);
  const legendaTextareaRef = useRef<HTMLTextAreaElement>(null);

  const activePlatformIds = plataformas.map(item => item.platformId);
  const currentPlatform = useMemo(
    () => ensurePlatformRecord(plataformas, activePlatform),
    [activePlatform, plataformas]
  );
  const hashtagTags = useMemo(() => parseHashtags(currentPlatform.hashtags), [currentPlatform.hashtags]);
  const hashtagPresets = useMemo(
    () => captionHashtagPresets(activePlatform, serie, pilar),
    [activePlatform, pilar, serie],
  );
  const charLimit = CHAR_LIMITS[activePlatform];
  const charCount = currentPlatform.legenda.length;

  useEffect(() => {
    if (registeredPlatforms.includes(activePlatform)) return;
    setActivePlatform(activePlatformIds[0] || registeredPlatforms[0] || DEFAULT_PLATFORMS[0]);
  }, [activePlatform, activePlatformIds, registeredPlatforms]);

  useEffect(() => {
    if (presentation === 'manage') return;
    const textarea = legendaTextareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [activePlatform, currentPlatform.legenda, presentation]);

  const handlePlatformClick = (platform: string) => {
    const isEnabled = activePlatformIds.includes(platform);

    if (!isEnabled) {
      onChange([...plataformas, ensurePlatformRecord(plataformas, platform)]);
      setActivePlatform(platform);
      return;
    }

    if (activePlatform !== platform) {
      setActivePlatform(platform);
      return;
    }

    const next = plataformas.filter(item => item.platformId !== platform);
    onChange(next);
    setActivePlatform(next[0]?.platformId || registeredPlatforms.find(name => name !== platform) || '');
  };

  const updatePlatform = (platformId: string, updates: Partial<ContentPlataforma>) => {
    const next = plataformas.map(plataforma =>
      plataforma.platformId === platformId ? {...plataforma, ...updates} : plataforma
    );

    if (!plataformas.some(plataforma => plataforma.platformId === platformId)) {
      next.push({...ensurePlatformRecord(plataformas, platformId), ...updates});
    }

    onChange(next);
  };

  const setHashtags = (tags: string[]) => {
    updatePlatform(activePlatform, {hashtags: joinHashtags(tags.slice(0, CAPTION_HASHTAG_MAX))});
  };

  const handleCopy = async (mode: 'legenda' | 'tudo') => {
    const text =
      mode === 'legenda'
        ? currentPlatform.legenda.trim()
        : [currentPlatform.legenda.trim(), currentPlatform.hashtags.trim()].filter(Boolean).join('\n\n');
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(mode);
    window.setTimeout(() => setCopied(null), 1500);
  };

  const addHashtag = (raw: string) => {
    const next = parseHashtags(raw);
    if (next.length === 0) return;
    setHashtags(mergeHashtags(hashtagTags, next));
  };

  if (presentation === 'manage') {
    return (
      <Surface variant="outlined" padding="lg" className="flex h-full flex-col bg-[var(--bg-elevated)]">
        <Text variant="sectionTitle" as="h3">Legendas</Text>
        <Text variant="secondary" className="mt-1">
          Prepare uma versão para cada plataforma.
        </Text>
        <span className="mb-2 mt-4 block text-sm text-[var(--text-secondary)]">Plataformas</span>
        {registeredPlatforms.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {registeredPlatforms.map(platform => {
              const isEnabled = activePlatformIds.includes(platform);
              const record = plataformas.find(item => item.platformId === platform);
              return (
                <PlatformToggleButton
                  key={platform}
                  platform={platform}
                  isEnabled={isEnabled}
                  isActive={isEnabled && activePlatform === platform}
                  completion={isEnabled ? platformCompletion(record) : 'inactive'}
                  disabled={disabled}
                  appearance="manage"
                  onClick={() => handlePlatformClick(platform)}
                />
              );
            })}
          </div>
        ) : (
          <Text variant="secondary">Cadastre uma plataforma em Configurações → Plataformas.</Text>
        )}
        {activePlatformIds.length > 0 && activePlatformIds.includes(activePlatform) ? (
          <div className="mt-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Legenda para {activePlatform}
            </p>
            <div className="relative mt-2">
              <textarea
                ref={legendaTextareaRef}
                value={currentPlatform.legenda}
                disabled={disabled}
                rows={4}
                onChange={event => updatePlatform(activePlatform, {legenda: event.target.value})}
                className="block min-h-28 w-full resize-none rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 pb-8 pt-3 text-sm leading-6 text-[var(--text-primary)] outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-60"
                placeholder="Escreva a legenda desta publicação..."
              />
              <span
                className={cn(
                  'pointer-events-none absolute bottom-2 right-3 text-xs',
                  charLimit && charCount > charLimit
                    ? 'text-[var(--danger)]'
                    : 'text-[var(--text-tertiary)]',
                )}
              >
                {charCount} caracteres
              </span>
            </div>
          </div>
        ) : registeredPlatforms.length > 0 ? (
          <Text variant="secondary" className="mt-4">
            Ative pelo menos uma plataforma para preparar legendas.
          </Text>
        ) : null}
      </Surface>
    );
  }

  return (
    <section className="cms-panel overflow-hidden">
      <div className="border-b border-[var(--border-color)] px-4 py-3">
        <Text variant="sectionTitle">{embedded ? 'Legendas' : 'Preparar distribuicao'}</Text>
        {embedded ? (
          <Text variant="secondary" className="mt-0.5">
            Gerencie as legendas para cada plataforma.
          </Text>
        ) : null}
      </div>

      <div className="p-4">
        {registeredPlatforms.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {registeredPlatforms.map(platform => {
              const isEnabled = activePlatformIds.includes(platform);
              const record = plataformas.find(item => item.platformId === platform);

              return (
                <PlatformToggleButton
                  key={platform}
                  platform={platform}
                  isEnabled={isEnabled}
                  isActive={activePlatform === platform}
                  completion={isEnabled ? platformCompletion(record) : 'inactive'}
                  disabled={disabled}
                  onClick={() => handlePlatformClick(platform)}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            Cadastre uma plataforma em Configuracoes → Plataformas.
          </p>
        )}

        {activePlatformIds.length > 0 && activePlatformIds.includes(activePlatform) ? (
          <>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Legenda para {activePlatform}
              </p>
              <p
                className={cn(
                  'text-xs font-semibold',
                  charCount > 0 && charCount <= (charLimit ?? Infinity)
                    ? 'text-[var(--success)]'
                    : 'text-[var(--text-tertiary)]',
                )}
              >
                {charCount} caracteres
              </p>
            </div>

            <div className="mt-3">
              <div className="relative w-full rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)]">
                <textarea
                  ref={legendaTextareaRef}
                  value={currentPlatform.legenda}
                  disabled={disabled}
                  rows={1}
                  onChange={event => updatePlatform(activePlatform, {legenda: event.target.value})}
                  className="block min-h-[4.5rem] w-full resize-none overflow-hidden bg-transparent px-4 pt-4 pb-8 text-sm leading-7 text-[var(--text-primary)] outline-none disabled:opacity-60"
                  placeholder={`Copy para ${activePlatform}`}
                />
                {charLimit ? (
                  <span
                    className={cn(
                      'absolute bottom-2 right-3 text-xs font-semibold',
                      charCount > charLimit ? 'text-[var(--danger)]' : 'text-[var(--text-tertiary)]',
                    )}
                  >
                    {charCount} / {charLimit}
                  </span>
                ) : null}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopy('legenda')}
                  disabled={!currentPlatform.legenda.trim()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-40"
                >
                  {copied === 'legenda' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  Copiar legenda
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopy('tudo')}
                  disabled={!currentPlatform.legenda.trim() && !currentPlatform.hashtags.trim()}
                  className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-40"
                >
                  {copied === 'tudo' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  Copiar tudo (legenda + hashtags)
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Hashtags</p>
              {hashtagPresets.length > 0 ? (
                <div className="mt-3 stack-sm">
                  {hashtagPresets.map(preset => {
                    const missing = preset.tags.filter(
                      tag => !hashtagTags.some(existing => existing.toLowerCase() === tag.toLowerCase()),
                    );
                    const alreadyIncluded = missing.length === 0;
                    const atLimit = hashtagTags.length >= CAPTION_HASHTAG_MAX;
                    const pullLabel = alreadyIncluded
                      ? 'Já incluídas'
                      : atLimit
                        ? 'Limite de 10'
                        : `Puxar da ${preset.sourceLabel}`;

                    return (
                      <div
                        key={preset.key}
                        className="flex flex-col gap-2 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <Text variant="meta" className="font-semibold text-[var(--text-primary)]">
                            {preset.sourceLabel === 'série' ? 'Série' : 'Pilar'} · {preset.name}
                          </Text>
                          <Text variant="secondary" className="mt-0.5 break-words">
                            {preset.tags.join(' ')}
                          </Text>
                        </div>
                        <AppButton
                          size="xs"
                          variant="secondary"
                          disabled={disabled || alreadyIncluded || atLimit}
                          aria-label={`${pullLabel}: ${preset.tags.join(' ')}`}
                          onClick={() => addHashtag(preset.tags.join(' '))}
                        >
                          {pullLabel}
                        </AppButton>
                      </div>
                    );
                  })}
                </div>
              ) : serie || pilar ? (
                <Text variant="meta" className="mt-2">
                  {serie && pilar
                    ? `Nenhuma hashtag definida em ${serie.name} ou ${pilar.nome} para ${activePlatform}.`
                    : serie
                      ? `Nenhuma hashtag definida em ${serie.name} para ${activePlatform}.`
                      : `Nenhuma hashtag definida em ${pilar?.nome} para ${activePlatform}.`}
                </Text>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {hashtagTags.map(tag => (
                  <TagPill
                    key={tag}
                    label={tag}
                    disabled={disabled}
                    onRemove={() => setHashtags(hashtagTags.filter(item => item !== tag))}
                  />
                ))}
                {hashtagTags.length < CAPTION_HASHTAG_MAX ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      const value = window.prompt('Nova hashtag');
                      if (value) addHashtag(value);
                    }}
                    className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-dashed border-[var(--border-color)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50"
                  >
                    <Plus className="h-3 w-3" />
                    Adicionar
                  </button>
                ) : null}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-xs text-[var(--text-tertiary)]">
                  Dica: use até 10 hashtags relevantes para aumentar seu alcance.
                </p>
                <p className="text-xs font-semibold text-[var(--text-tertiary)]">
                  {hashtagTags.length} / {CAPTION_HASHTAG_MAX}
                </p>
              </div>
            </div>
          </>
        ) : registeredPlatforms.length > 0 ? (
          <p className="mt-4 text-sm text-[var(--text-secondary)]">
            Ative pelo menos uma plataforma para preparar legendas.
          </p>
        ) : null}
      </div>
    </section>
  );
}
