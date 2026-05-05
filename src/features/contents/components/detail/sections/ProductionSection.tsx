import {Check, Copy, Image, Plus} from 'lucide-react';
import {useMemo, useState} from 'react';
import {DEFAULT_PLATFORMS} from '../../../../../constants';
import type {Content, ContentPlataforma, Pilar} from '../../../../../lib/database';
import {cn} from '../../../../../lib/utils';

type ProductionDraft = Pick<Content, 'plataformas' | 'notes'>;

interface ProductionSectionProps {
  draft: ProductionDraft;
  pilar: Pilar | null;
  onChange: (updates: Partial<ProductionDraft>) => void;
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

export function ProductionSection({draft, pilar, onChange}: ProductionSectionProps) {
  const [activePlatform, setActivePlatform] = useState<string>(
    draft.plataformas[0]?.platformId || DEFAULT_PLATFORMS[0]
  );
  const [copied, setCopied] = useState<string | null>(null);

  const activePlatformIds = draft.plataformas.length > 0 ? draft.plataformas.map(item => item.platformId) : [];
  const currentPlatform = useMemo(
    () => ensurePlatformRecord(draft.plataformas, activePlatform),
    [activePlatform, draft.plataformas]
  );
  const hashtagSuggestion = pilar?.plataformas.find(item => item.platformId === activePlatform)?.hashtags || '';
  const charLimit = CHAR_LIMITS[activePlatform];
  const charCount = currentPlatform.legenda.length;

  const togglePlatform = (platformId: string) => {
    const exists = draft.plataformas.some(plataforma => plataforma.platformId === platformId);
    const next = exists
      ? draft.plataformas.filter(plataforma => plataforma.platformId !== platformId)
      : [...draft.plataformas, ensurePlatformRecord(draft.plataformas, platformId)];

    onChange({plataformas: next});

    if (platformId === activePlatform && exists) {
      setActivePlatform(next[0]?.platformId || DEFAULT_PLATFORMS[0]);
    }

    if (!exists) {
      setActivePlatform(platformId);
    }
  };

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
    if (!currentPlatform.legenda.trim()) return;
    await navigator.clipboard.writeText(currentPlatform.legenda);
    setCopied(activePlatform);
    window.setTimeout(() => setCopied(previous => (previous === activePlatform ? null : previous)), 1500);
  };

  return (
    <div className="grid gap-6">
      <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm md:p-7">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
          Producao
        </p>
        <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Assets e copy por plataforma</h2>

        <div className="mt-5 flex flex-wrap gap-2">
          {DEFAULT_PLATFORMS.map(platform => {
            const active = activePlatformIds.includes(platform);
            return (
              <button
                key={platform}
                type="button"
                onClick={() => togglePlatform(platform)}
                className={cn(
                  'rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
                  active
                    ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                    : 'border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
              >
                {platform}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Legenda e copy
            </p>
            <h2 className="mt-2 text-xl font-black text-[var(--text-primary)]">Texto pronto para distribuicao</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!currentPlatform.legenda.trim()}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-primary)] disabled:opacity-40"
            >
              {copied === activePlatform ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === activePlatform ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {(activePlatformIds.length > 0 ? activePlatformIds : [DEFAULT_PLATFORMS[0]]).map(platform => (
            <button
              key={platform}
              type="button"
              onClick={() => setActivePlatform(platform)}
              className={cn(
                'rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
                activePlatform === platform
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)]'
                  : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'
              )}
            >
              {platform}
            </button>
          ))}
        </div>

        <textarea
          value={currentPlatform.legenda}
          onChange={event => updatePlatform(activePlatform, {legenda: event.target.value})}
          className={cn(
            'mt-5 min-h-[260px] w-full rounded-[24px] border bg-[var(--bg-primary)] px-5 py-4 text-sm leading-7 text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-primary)]/30',
            charLimit && charCount > charLimit ? 'border-red-300' : 'border-[var(--border-color)]'
          )}
          placeholder={`Copy para ${activePlatform}`}
        />

        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {hashtagSuggestion ? (
              <button
                type="button"
                onClick={() => {
                  if (!currentPlatform.legenda.includes(hashtagSuggestion.split(' ')[0] || '')) {
                    updatePlatform(activePlatform, {
                      legenda: `${currentPlatform.legenda}\n\n${hashtagSuggestion}`.trim(),
                    });
                  }
                }}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-primary)]"
              >
                <Plus className="h-3.5 w-3.5" />
                Hashtags do pilar
              </button>
            ) : null}
          </div>

          {charLimit ? (
            <span className={cn('text-[11px] font-black', charCount > charLimit ? 'text-red-500' : 'text-[var(--text-secondary)]')}>
              {charCount}/{charLimit}
            </span>
          ) : null}
        </div>
      </section>

      <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm md:p-7">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
          <Image className="h-4 w-4" />
          Assets e observacoes
        </div>
        <textarea
          value={draft.notes ?? ''}
          onChange={event => onChange({notes: event.target.value})}
          className="mt-4 min-h-[140px] w-full rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-primary)] px-5 py-4 text-sm leading-7 text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--text-primary)]/30"
          placeholder="Links de assets, instrucoes de edicao, thumb, cortes e observacoes de producao"
        />
      </section>
    </div>
  );
}
