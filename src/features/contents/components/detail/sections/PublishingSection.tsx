import {AlertTriangle, CalendarDays, Check, Copy, Image, Plus, Send} from 'lucide-react';
import {useMemo, useState} from 'react';
import {DEFAULT_PLATFORMS} from '../../../../../constants';
import type {Content, ContentPlataforma, Pilar, Serie} from '../../../../../lib/database';
import {cn} from '../../../../../lib/utils';
import {AppButton} from '../../../../../components/ui/AppButton';
import {TagSelect} from '../../../../../components/ui/TagSelect';
import {CONTENT_STATUS} from '../../../lib/contentPipeline';
import type {PostingAlert} from '../../../lib/contentPipeline';

type PublishingDraft = Pick<
  Content,
  'status' | 'publishDate' | 'publishDateEnabled' | 'plataformas' | 'notes'
>;

interface PublishingSectionProps {
  draft: PublishingDraft;
  pilar: Pilar | null;
  serie: Serie | null;
  alerts: PostingAlert[];
  onChange: (updates: Partial<PublishingDraft>) => void;
  onMarkPosted?: () => void;
  isSaving?: boolean;
}

const CHAR_LIMITS: Record<string, number> = {
  Instagram: 2200,
  TikTok: 2200,
  YouTube: 5000,
  Blog: 10000,
};

function ensurePlatformRecord(
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

function updatePlatformDate(
  plataformas: ContentPlataforma[],
  platformId: string,
  publishDate: string | null
) {
  return plataformas.map(plataforma =>
    plataforma.platformId === platformId
      ? {...plataforma, publishDate, publishDateEnabled: Boolean(publishDate)}
      : plataforma
  );
}

export function PublishingSection({
  draft,
  pilar,
  serie,
  alerts,
  onChange,
  onMarkPosted,
  isSaving = false,
}: PublishingSectionProps) {
  const [activePlatform, setActivePlatform] = useState<string>(
    draft.plataformas[0]?.platformId || DEFAULT_PLATFORMS[0]
  );
  const [copied, setCopied] = useState<string | null>(null);

  const activePlatformIds = draft.plataformas.length > 0 ? draft.plataformas.map(item => item.platformId) : [];
  const currentPlatform = useMemo(
    () => ensurePlatformRecord(draft.plataformas, activePlatform),
    [activePlatform, draft.plataformas]
  );
  // Série tem prioridade sobre pilar (mais específica)
  const hashtagSuggestion =
    serie?.plataformas.find(item => item.platformId === activePlatform)?.hashtags ||
    pilar?.plataformas.find(item => item.platformId === activePlatform)?.hashtags ||
    '';
  const hashtagSuggestionSource = serie?.plataformas.find(item => item.platformId === activePlatform)?.hashtags
    ? 'série'
    : pilar?.plataformas.find(item => item.platformId === activePlatform)?.hashtags
      ? 'pilar'
      : null;
  const charLimit = CHAR_LIMITS[activePlatform];
  const charCount = currentPlatform.legenda.length;
  const isPosted = draft.status === CONTENT_STATUS.POSTADO;

  const updatePlatform = (platformId: string, updates: Partial<ContentPlataforma>) => {
    const next = draft.plataformas.map(plataforma =>
      plataforma.platformId === platformId ? {...plataforma, ...updates} : plataforma
    );

    if (!draft.plataformas.some(plataforma => plataforma.platformId === platformId)) {
      next.push({...ensurePlatformRecord(draft.plataformas, platformId), ...updates});
    }

    onChange({plataformas: next});
  };

  const handleCopy = async () => {
    const parts = [currentPlatform.legenda.trim(), currentPlatform.hashtags.trim()].filter(Boolean);
    if (parts.length === 0) return;
    await navigator.clipboard.writeText(parts.join('\n\n'));
    setCopied(activePlatform);
    window.setTimeout(() => setCopied(previous => (previous === activePlatform ? null : previous)), 1500);
  };

  return (
    <div className="grid gap-6">
      <section className="rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm md:p-7">
        <div className="flex items-center gap-2 text-xs font-semibold  text-[var(--text-tertiary)]">
          <CalendarDays className="h-4 w-4" />
          Agendamento
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold  text-[var(--text-tertiary)]">
              Data principal
            </span>
            <input
              type="date"
              value={draft.publishDate ? draft.publishDate.slice(0, 10) : ''}
              disabled={isPosted}
              onChange={event =>
                onChange({
                  publishDate: event.target.value ? `${event.target.value}T12:00:00.000Z` : null,
                  publishDateEnabled: Boolean(event.target.value),
                  plataformas: draft.plataformas.map(plataforma => ({
                    ...plataforma,
                    publishDate: event.target.value ? `${event.target.value}T12:00:00.000Z` : null,
                    publishDateEnabled: Boolean(event.target.value),
                  })),
                })
              }
              className="w-full rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-primary)]/30 disabled:opacity-60"
            />
          </label>

          <div className="rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-4">
            <p className="text-xs font-semibold  text-[var(--text-tertiary)]">
              Status atual
            </p>
            <p className="mt-3 text-xl font-semibold text-[var(--text-primary)]">{draft.status}</p>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Datas ficam guardadas aqui para lembrar, reagendar ou marcar como postado quando fizer sentido.
            </p>
          </div>
        </div>
      </section>

      {alerts.length > 0 ? (
        <section className="grid gap-3">
          {alerts.map(alert => (
            <article
              key={alert.id}
              className="flex items-start gap-3 rounded-[22px] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4"
            >
              {alert.tone === 'warning' ? (
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
              ) : (
                <CalendarDays className="mt-0.5 h-5 w-5 text-sky-500" />
              )}
              <p className="text-sm font-semibold text-[var(--text-primary)]">{alert.message}</p>
            </article>
          ))}
        </section>
      ) : null}

      <section className="rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm md:p-7">
        <p className="text-xs font-semibold  text-[var(--text-tertiary)]">
          Plataformas e copy
        </p>
        <h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Preparar distribuicao</h2>

        <TagSelect
          label="Plataformas"
          hint="Selecione uma ou mais plataformas para preparar a distribuicao."
          values={activePlatformIds}
          onChange={platformIds => {
            onChange({
              plataformas: platformIds.map(platformId =>
                ensurePlatformRecord(draft.plataformas, platformId)
              ),
            });
            if (!platformIds.includes(activePlatform)) {
              setActivePlatform(platformIds[0] || DEFAULT_PLATFORMS[0]);
            }
          }}
          options={DEFAULT_PLATFORMS.map(platform => ({ value: platform, label: platform }))}
          disabled={isPosted}
          placeholder="Selecione plataformas"
        />

        {activePlatformIds.length > 0 ? (
          <>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {activePlatformIds.map(platform => (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => setActivePlatform(platform)}
                    className={cn(
                      'rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition-all',
                      activePlatform === platform
                        ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                        : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'
                    )}
                  >
                    {platform}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void handleCopy()}
                disabled={!currentPlatform.legenda.trim() && !currentPlatform.hashtags.trim()}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-primary)] disabled:opacity-40"
              >
                {copied === activePlatform ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied === activePlatform ? 'Copiado' : 'Copiar'}
              </button>
            </div>

            {/* Bloco unificado: legenda + hashtags */}
            <div className="mt-5 overflow-hidden rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-primary)]">
              {/* Legenda */}
              <div className="relative">
                <textarea
                  value={currentPlatform.legenda}
                  disabled={isPosted}
                  onChange={event => updatePlatform(activePlatform, {legenda: event.target.value})}
                  className={cn(
                    'min-h-[200px] w-full bg-transparent px-5 pt-4 pb-3 text-sm leading-7 text-[var(--text-primary)] outline-none transition-colors disabled:opacity-60',
                    charLimit && charCount > charLimit ? 'placeholder:text-red-400' : ''
                  )}
                  placeholder={`Copy para ${activePlatform}`}
                />
                {charLimit ? (
                  <span
                    className={cn(
                      'absolute bottom-2 right-4 text-xs font-semibold',
                      charCount > charLimit ? 'text-red-500' : 'text-[var(--text-tertiary)]'
                    )}
                  >
                    {charCount}/{charLimit}
                  </span>
                ) : null}
              </div>

              {/* Divisor com botão de sugestão */}
              <div className="flex items-center gap-2 border-t border-[var(--border-color)] px-4 py-2">
                <span className="text-xs font-semibold  text-[var(--text-tertiary)]">
                  Hashtags
                </span>
                {hashtagSuggestion ? (
                  <button
                    type="button"
                    disabled={isPosted}
                    onClick={() => {
                      if (!currentPlatform.hashtags.includes(hashtagSuggestion.split(' ')[0] || '')) {
                        updatePlatform(activePlatform, {
                          hashtags: `${currentPlatform.hashtags} ${hashtagSuggestion}`.trim(),
                        });
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"
                  >
                    <Plus className="h-3 w-3" />
                    Puxar da {hashtagSuggestionSource}
                  </button>
                ) : null}
              </div>

              {/* Hashtags */}
              <textarea
                value={currentPlatform.hashtags}
                disabled={isPosted}
                onChange={event => updatePlatform(activePlatform, {hashtags: event.target.value})}
                rows={2}
                className="w-full bg-transparent px-5 pb-4 pt-2 text-sm leading-6 text-[var(--text-primary)] outline-none transition-colors disabled:opacity-60"
                placeholder="#hashtag1 #hashtag2"
              />
            </div>

            <div className="mt-6 space-y-4 border-t border-[var(--border-color)] pt-6">
              <div className="flex items-center gap-2 text-xs font-semibold  text-[var(--text-tertiary)]">
                <Send className="h-4 w-4" />
                Datas por plataforma
              </div>
              {draft.plataformas.map(plataforma => (
                <article
                  key={plataforma.platformId}
                  className="rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{plataforma.platformId}</p>
                    <label className="block md:min-w-[220px]">
                      <span className="mb-2 block text-xs font-semibold  text-[var(--text-tertiary)]">
                        Data
                      </span>
                      <input
                        type="date"
                        value={plataforma.publishDate ? plataforma.publishDate.slice(0, 10) : ''}
                        disabled={isPosted}
                        onChange={event =>
                          onChange({
                            plataformas: updatePlatformDate(
                              draft.plataformas,
                              plataforma.platformId,
                              event.target.value ? `${event.target.value}T12:00:00.000Z` : null
                            ),
                          })
                        }
                        className="w-full rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-primary)]/30 disabled:opacity-60"
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-5 text-sm text-[var(--text-secondary)]">
            Ative pelo menos uma plataforma para preparar legendas e agendamento.
          </p>
        )}
      </section>

      <section className="rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm md:p-7">
        <div className="flex items-center gap-2 text-xs font-semibold  text-[var(--text-tertiary)]">
          <Image className="h-4 w-4" />
          Assets e observacoes
        </div>
        <textarea
          value={draft.notes ?? ''}
          disabled={isPosted}
          onChange={event => onChange({notes: event.target.value})}
          className="mt-4 min-h-[140px] w-full rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-primary)] px-5 py-4 text-sm leading-7 text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-primary)]/30 disabled:opacity-60"
          placeholder="Links de assets, instruções de edição, thumb, cortes e observações"
        />
      </section>

      {!isPosted && onMarkPosted ? (
        <div className="flex justify-end">
          <AppButton variant="primary" disabled={isSaving} onClick={onMarkPosted}>
            {isSaving ? 'Salvando...' : 'Marcar como postado'}
          </AppButton>
        </div>
      ) : null}
    </div>
  );
}
