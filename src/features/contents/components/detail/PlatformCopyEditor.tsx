import {Check, Copy} from 'lucide-react';
import {useEffect, useMemo, useRef, useState} from 'react';
import {DEFAULT_PLATFORMS} from '../../../../constants';
import {useAppContext} from '../../../../context/AppContext';
import type {ContentPlataforma, Pilar, Serie} from '../../../../lib/database';
import {generateUUID} from '../../../../utils/uuid';
import {cn} from '../../../../lib/utils';
import {AppButton} from '../../../../components/ui/AppButton';
import {PlatformIcon as PlatformTabIcon, platformDisplayName, platformKey} from '../../../../components/ui/PlatformIcon';
import {Text} from '../../../../components/ui/Text';
import {TagPill} from '../../../../components/ui/TagSelect';
import {DestinationChips} from '../../../editorial/components/DestinationChips';
import {adaptarLegenda, definirLegendaCompartilhada, legendaEfetiva} from '../../../editorial/lib/captions';
import {destinoMarcado, publicacaoDoDestino, type DestinoPlataforma} from '../../../editorial/lib/destinations';
import {getEditorialSettings, limiteHashtagsDaRede} from '../../../editorial/lib/editorialSettings';
import {platformShowsField} from '../../../editorial/lib/platformFields';
import {
  joinHashtags,
  mergeHashtags,
  parseHashtags,
  suggestHashtags,
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

function HashtagInlineField({
  disabled = false,
  onAdd,
}: {
  disabled?: boolean;
  onAdd: (raw: string) => void;
}) {
  const [value, setValue] = useState('');

  const commit = () => {
    const next = value.trim();
    if (!next) return;
    onAdd(next);
    setValue('');
  };

  return (
    <input
      type="text"
      value={value}
      disabled={disabled}
      placeholder="Nova hashtag"
      aria-label="Nova hashtag"
      className="h-8 min-w-[8.5rem] max-w-[12rem] rounded-[var(--radius-pill)] border border-dashed border-[var(--border-color)] bg-transparent px-2.5 text-xs font-semibold text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] focus-visible:shadow-[var(--focus-ring)] disabled:opacity-50"
      onChange={event => setValue(event.target.value)}
      onKeyDown={event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          setValue('');
        }
      }}
    />
  );
}

export function ensurePlatformRecord(
  plataformas: ContentPlataforma[],
  platformId: string,
  contentId = ''
) {
  const existing = plataformas.find(plataforma => plataforma.platformId === platformId);
  if (existing) return existing;

  return {
    id: generateUUID(),
    contentId,
    platformId,
    legenda: '',
    hashtags: '',
    publishDate: null,
    publishDateEnabled: false,
    status: 'agendada',
    realizadaManualEm: null,
    realizadaApiEm: null,
    postCodigo: null,
    postUrl: null,
    legendaPropria: false,
    contaNaGrade: true,
  } satisfies ContentPlataforma;
}

interface PlatformCopyEditorProps {
  plataformas: ContentPlataforma[];
  pilar: Pilar | null;
  serie: Serie | null;
  disabled?: boolean;
  onChange: (plataformas: ContentPlataforma[]) => void;
  embedded?: boolean;
  contentId?: string;
  legendaBase?: string | null;
  onLegendaBaseChange?: (value: string) => void;
  titulo?: string;
  onTituloChange?: (value: string) => void;
}

export function PlatformCopyEditor({
  plataformas,
  pilar,
  serie,
  disabled = false,
  onChange,
  embedded = false,
  contentId = '',
  legendaBase = null,
  onLegendaBaseChange,
  titulo = '',
  onTituloChange,
}: PlatformCopyEditorProps) {
  const {state} = useAppContext();
  const registeredPlatforms = useMemo<DestinoPlataforma[]>(
    () => {
      const active = state.platforms
        .filter(platform => platform.ativo)
        .map(platform => ({id: platform.id, nome: platform.nome}));
      if (active.length > 0) return active;
      return DEFAULT_PLATFORMS.map(nome => ({id: nome, nome}));
    },
    [state.platforms],
  );
  const [activePlatform, setActivePlatform] = useState<string>(
    plataformas[0]?.platformId || registeredPlatforms[0]?.id || '',
  );
  const [copied, setCopied] = useState<'legenda' | 'tudo' | null>(null);
  const legendaTextareaRef = useRef<HTMLTextAreaElement>(null);
  
  const activeDestino = registeredPlatforms.find(platform => platform.id === activePlatform)
    ?? registeredPlatforms.find(platform => platform.nome === activePlatform)
    ?? {id: activePlatform, nome: activePlatform};
  const currentPlatform = useMemo(
    () => publicacaoDoDestino(plataformas, activeDestino) ?? ensurePlatformRecord(plataformas, activeDestino.id, contentId),
    [activeDestino, contentId, plataformas]
  );
  const hashtagTags = useMemo(() => parseHashtags(currentPlatform.hashtags), [currentPlatform.hashtags]);
  const hashtagLimit = limiteHashtagsDaRede(
    getEditorialSettings(state.preferences),
    activeDestino.id,
    activeDestino.nome,
  );
  const sugestaoHashtags = useMemo(
    () => suggestHashtags({
      platformId: activeDestino.nome,
      serie,
      pilar,
      limite: hashtagLimit,
    }),
    [activeDestino.nome, hashtagLimit, pilar, serie],
  );
  const legendaVisivel = legendaEfetiva(legendaBase, currentPlatform);
  const charCount = legendaVisivel.length;
  const redeNome = platformDisplayName(activeDestino.nome || activePlatform);
  const mostraTitulo = platformShowsField(redeNome, 'titulo');
  const mostraHashtags = platformShowsField(redeNome, 'hashtags');
  const charLimit = CHAR_LIMITS[redeNome];

  useEffect(() => {
    const current = registeredPlatforms.find(platform => platform.id === activePlatform);
    if (current && destinoMarcado(plataformas, current)) return;
    const marked = registeredPlatforms.find(platform => destinoMarcado(plataformas, platform));
    if (marked) {
      setActivePlatform(marked.id);
      return;
    }
    if (!current) setActivePlatform(registeredPlatforms[0]?.id || '');
  }, [activePlatform, plataformas, registeredPlatforms]);

  useEffect(() => {
    const textarea = legendaTextareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [activePlatform, legendaVisivel]);

  const updatePlatform = (platformId: string, updates: Partial<ContentPlataforma>) => {
    const alvo = registeredPlatforms.find(platform => platform.id === platformId)
      ?? {id: platformId, nome: platformId};
    const next = plataformas.map(plataforma =>
      plataforma.platformId === alvo.id || plataforma.platformId === alvo.nome
        ? {...plataforma, ...updates}
        : plataforma
    );
    if (!next.some(plataforma => plataforma.platformId === alvo.id || plataforma.platformId === alvo.nome)) {
      next.push({...ensurePlatformRecord(plataformas, alvo.id, contentId), ...updates});
    }
    onChange(next);
  };

  const setHashtags = (tags: string[]) => {
    updatePlatform(activePlatform, {hashtags: joinHashtags(tags.slice(0, hashtagLimit))});
  };

  const handleCopy = async (mode: 'legenda' | 'tudo') => {
    const text =
      mode === 'legenda'
        ? legendaVisivel.trim()
        : [legendaVisivel.trim(), mostraHashtags ? currentPlatform.hashtags.trim() : ''].filter(Boolean).join('\n\n');
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(mode);
    window.setTimeout(() => setCopied(null), 1500);
  };

  const addHashtag = (raw: string) => {
    const next = parseHashtags(raw);
    if (next.length === 0) return;
    setHashtags(mergeHashtags(hashtagTags, next, hashtagLimit));
  };

  return (
    <section className={cn('cms-panel overflow-hidden', embedded && 'flex h-full flex-col')}>
      <div className="border-b border-[var(--border-color)] px-4 py-3">
        <Text variant="sectionTitle">{embedded ? 'Legendas' : 'Preparar distribuição'}</Text>
        {embedded ? (
          <Text variant="secondary" className="mt-0.5">
            Gerencie as legendas para cada plataforma.
          </Text>
        ) : null}
      </div>

      <div className="p-4">
        <DestinationChips
          platforms={registeredPlatforms}
          publications={plataformas}
          contentId={contentId}
          disabled={disabled}
          activePlatformId={activeDestino.id}
          onActivate={setActivePlatform}
          onChange={onChange}
        />

        {destinoMarcado(plataformas, activeDestino) ? (
          <>
            {mostraTitulo ? (
              <label className="mt-4 block">
                <span className="mb-1.5 block text-xs font-semibold text-[var(--text-tertiary)]">Título</span>
                <input
                  value={titulo}
                  disabled={disabled}
                  onChange={event => onTituloChange?.(event.target.value)}
                  className="min-h-11 w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-60"
                />
              </label>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {currentPlatform.legendaPropria ? 'Legenda para ' + redeNome : 'Legenda compartilhada'}
              </p>
              {currentPlatform.legendaPropria ? null : (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(adaptarLegenda(legendaBase, plataformas, activeDestino))}
                  className="inline-flex min-h-11 items-center rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 text-xs font-semibold text-[var(--text-primary)]"
                >
                  {'Adaptar para ' + redeNome}
                </button>
              )}
            </div>

            <div className="mt-3">
              <div className="relative w-full rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)]">
                <textarea
                  ref={legendaTextareaRef}
                  value={legendaVisivel}
                  disabled={disabled}
                  rows={1}
                  onChange={event => {
                    const value = event.target.value;
                    if (currentPlatform.legendaPropria) {
                      updatePlatform(activeDestino.id, {legenda: value, legendaPropria: true});
                      return;
                    }
                    const shared = definirLegendaCompartilhada({
                      legendaBaseAtual: legendaBase,
                      novoTexto: value,
                      publicacoes: plataformas,
                      plataformaEditada: activeDestino,
                    });
                    onLegendaBaseChange?.(shared.legendaBase);
                    onChange(shared.publicacoes);
                  }}
                  className="block min-h-[4.5rem] w-full resize-none overflow-hidden bg-transparent px-4 pt-4 pb-8 text-sm leading-7 text-[var(--text-primary)] outline-none disabled:opacity-60"
                  placeholder={currentPlatform.legendaPropria ? 'Legenda para ' + redeNome : 'Legenda compartilhada'}
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
                  disabled={!legendaVisivel.trim()}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-40"
                >
                  {copied === 'legenda' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  Copiar legenda
                </button>
                {mostraHashtags ? (
                  <button
                    type="button"
                    onClick={() => void handleCopy('tudo')}
                    disabled={!legendaVisivel.trim() && !currentPlatform.hashtags.trim()}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-40"
                  >
                    {copied === 'tudo' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    Copiar tudo (legenda + hashtags)
                  </button>
                ) : null}
              </div>
            </div>

            {mostraHashtags ? (
            <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Hashtags</p>
              {sugestaoHashtags.length > 0 ? (
                <div className="mt-3 flex flex-col gap-2 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <Text variant="meta" className="font-semibold text-[var(--text-primary)]">
                      Sugestão
                    </Text>
                    <Text variant="secondary" className="mt-0.5 break-words">
                      {sugestaoHashtags.join(' ')}
                    </Text>
                  </div>
                  <AppButton
                    size="xs"
                    variant="secondary"
                    disabled={disabled || sugestaoHashtags.every(tag => hashtagTags.some(existing => existing.toLowerCase() === tag.toLowerCase())) || hashtagTags.length >= hashtagLimit}
                    aria-label={`Usar sugestão: ${sugestaoHashtags.join(' ')}`}
                    onClick={() => addHashtag(sugestaoHashtags.join(' '))}
                  >
                    {sugestaoHashtags.every(tag => hashtagTags.some(existing => existing.toLowerCase() === tag.toLowerCase()))
                      ? 'Já incluídas'
                      : hashtagTags.length >= hashtagLimit
                        ? `Limite de ${hashtagLimit}`
                        : 'Usar sugestão'}
                  </AppButton>
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
                {hashtagTags.length < hashtagLimit ? (
                  <HashtagInlineField
                    disabled={disabled}
                    onAdd={addHashtag}
                  />
                ) : null}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <p className="text-xs text-[var(--text-tertiary)]">
                  Até {hashtagLimit} hashtags nesta rede.
                </p>
                <p className="text-xs font-semibold text-[var(--text-tertiary)]">
                  {hashtagTags.length} / {hashtagLimit}
                </p>
              </div>
            </div>
            ) : null}
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
