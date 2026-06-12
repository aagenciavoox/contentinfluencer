import {useEffect, useMemo, useRef, useState} from 'react';
import {Check, Eraser, Sparkles} from 'lucide-react';
import {AppButton} from '../../../components/ui/AppButton';
import {DEFAULT_PLATFORMS, VISUAL_FORMATS} from '../../../constants';
import type {Content, ContentPlataforma, Pilar, Serie} from '../../../lib/database';
import {htmlToReadableText} from '../../../lib/utils';
import {generateUUID} from '../../../utils/uuid';
import {createContentDraft} from '../../contents/lib/createContentDraft';
import {CONTENT_STATUS} from '../../contents/lib/contentPipeline';

type DraftStatus = typeof CONTENT_STATUS.ROTEIRO | typeof CONTENT_STATUS.PRONTO_PARA_GRAVAR;

type ComposerDefaults = {
  pilarId: string;
  formatoVisual: string;
  platformId: string;
  status: DraftStatus;
};

interface SeriesBulkComposerProps {
  serie: Serie;
  pilares: Pilar[];
  platformNames: string[];
  onCreate: (contents: Content[]) => Promise<void>;
}

function wordCount(value: string) {
  return htmlToReadableText(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function buildPlatformRecord(contentId: string, platformId: string, caption: string): ContentPlataforma {
  return {
    id: '',
    contentId,
    platformId,
    legenda: caption.trim(),
    hashtags: '',
    publishDate: null,
    publishTime: null,
    publishDateEnabled: false,
  };
}

export function SeriesBulkComposer({
  serie,
  pilares,
  platformNames,
  onCreate,
}: SeriesBulkComposerProps) {
  const availablePlatforms = platformNames.length > 0 ? platformNames : DEFAULT_PLATFORMS;
  const [defaults, setDefaults] = useState<ComposerDefaults>({
    pilarId: serie.pilarIds[0] || '',
    formatoVisual: serie.formatoVisualPadrao || '',
    platformId: serie.plataformas[0]?.platformId || availablePlatforms[0] || DEFAULT_PLATFORMS[0],
    status: CONTENT_STATUS.ROTEIRO,
  });
  const [title, setTitle] = useState('');
  const [script, setScript] = useState('');
  const [includeCaption, setIncludeCaption] = useState(false);
  const [caption, setCaption] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const scriptTextareaRef = useRef<HTMLTextAreaElement>(null);

  const words = useMemo(() => wordCount(script), [script]);
  const selectedPillar = pilares.find(pilar => pilar.id === defaults.pilarId) || null;
  const canSave = Boolean(title.trim() && script.trim()) && !isSaving;

  useEffect(() => {
    const textarea = scriptTextareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [script]);

  const handleSave = async () => {
    if (!title.trim() || !script.trim()) {
      setError('Preencha titulo e texto do roteiro.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const contentId = generateUUID();
      const trimmedCaption = includeCaption ? caption.trim() : '';

      const content = createContentDraft({
        id: contentId,
        title: title.trim(),
        status: defaults.status,
        seriesId: serie.id,
        pilarId: defaults.pilarId || null,
        formatoVisual: defaults.formatoVisual || serie.formatoVisualPadrao || null,
        slotType: serie.slotPadrao as Content['slotType'],
        script: script.trim(),
        notes: null,
        plataformas:
          trimmedCaption && defaults.platformId
            ? [buildPlatformRecord(contentId, defaults.platformId, trimmedCaption)]
            : [],
      });

      await onCreate([content]);
      // Mantem a bancada livre: o roteiro criado aparece na lista de vinculados abaixo.
      setTitle('');
      setScript('');
      setCaption('');
      titleInputRef.current?.focus();
    } catch (err) {
      console.error('[SeriesBulkComposer] create failed:', err);
      setError('Nao foi possivel criar o roteiro. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (canSave) void handleSave();
    }
  };

  return (
    <div className="flex flex-col gap-5" onKeyDown={handleKeyDown}>
      <section
        className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)]"
        style={{borderTopColor: serie.cor || undefined, borderTopWidth: 4}}
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-3">
            <span
              className="h-10 w-10 shrink-0 rounded-[var(--radius-card)] border border-black/10"
              style={{backgroundColor: serie.cor || '#6366f1'}}
            />
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-[var(--text-primary)]">{serie.name}</p>
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                Escreva, salve e o roteiro entra direto na lista abaixo.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <ContextChip label={selectedPillar?.nome || 'Sem pilar'} />
            <ContextChip label={defaults.formatoVisual || serie.formatoVisualPadrao || 'Sem formato'} />
            <ContextChip label={defaults.platformId || 'Sem plataforma'} />
            <ContextChip label={defaults.status} />
            {words > 0 ? <ContextChip label={`${words} palavras`} /> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 md:grid-cols-4">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[var(--text-tertiary)]">Pilar</span>
          <select
            value={defaults.pilarId}
            onChange={event => setDefaults(previous => ({...previous, pilarId: event.target.value}))}
            className="filter-select w-full"
          >
            <option value="">Sem pilar</option>
            {pilares.map(pilar => (
              <option key={pilar.id} value={pilar.id}>
                {pilar.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[var(--text-tertiary)]">Formato</span>
          <select
            value={defaults.formatoVisual}
            onChange={event => setDefaults(previous => ({...previous, formatoVisual: event.target.value}))}
            className="filter-select w-full"
          >
            <option value="">Sem formato</option>
            {VISUAL_FORMATS.map(format => (
              <option key={format} value={format}>
                {format}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[var(--text-tertiary)]">Legenda</span>
          <select
            value={defaults.platformId}
            onChange={event => setDefaults(previous => ({...previous, platformId: event.target.value}))}
            className="filter-select w-full"
          >
            {availablePlatforms.map(platform => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[var(--text-tertiary)]">Status</span>
          <select
            value={defaults.status}
            onChange={event =>
              setDefaults(previous => ({...previous, status: event.target.value as DraftStatus}))
            }
            className="filter-select w-full"
          >
            <option value={CONTENT_STATUS.ROTEIRO}>Roteiro</option>
            <option value={CONTENT_STATUS.PRONTO_PARA_GRAVAR}>Pronto para Gravar</option>
          </select>
        </label>
      </section>

      {error ? (
        <p className="rounded-[var(--radius-card)] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      <>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[var(--text-tertiary)]">Titulo</span>
          <input
            ref={titleInputRef}
            value={title}
            onChange={event => {
              setTitle(event.target.value);
              setError(null);
            }}
            placeholder="Titulo do roteiro"
            className="w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2.5 text-sm font-semibold text-[var(--text-primary)]"
          />
        </label>

        <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="series-bulk-script"
              className="text-xs font-semibold text-[var(--text-tertiary)]"
            >
              Texto do roteiro
            </label>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[var(--bg-primary)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                {words} palavras
              </span>
              {script ? (
                <button
                  type="button"
                  onClick={() => {
                    setScript('');
                    setError(null);
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-tertiary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                  title="Limpar roteiro"
                  aria-label="Limpar roteiro"
                >
                  <Eraser className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>

          <textarea
            id="series-bulk-script"
            ref={scriptTextareaRef}
            value={script}
            onChange={event => {
              setScript(event.target.value);
              setError(null);
            }}
            onDragOver={event => event.preventDefault()}
            onDrop={event => {
              event.preventDefault();
              const text = event.dataTransfer.getData('text/plain');
              if (text) {
                setScript(text);
                setError(null);
              }
            }}
            placeholder="Escreva ou cole o roteiro..."
            rows={1}
            spellCheck
            className="mx-auto block min-h-[720px] w-full max-w-[820px] resize-none overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-8 py-10 text-base leading-8 text-[var(--text-primary)] shadow-sm outline-none placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-strong)] sm:px-12 sm:py-14"
          />
        </div>

        <section className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-5 shadow-sm">
          <label className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3">
            <span>
              <span className="block text-sm font-semibold text-[var(--text-primary)]">Incluir legenda</span>
              <span className="block text-xs text-[var(--text-secondary)]">
                Salva a copy em {defaults.platformId || 'uma plataforma'} junto deste roteiro.
              </span>
            </span>
            <input
              type="checkbox"
              checked={includeCaption}
              onChange={event => setIncludeCaption(event.target.checked)}
              className="h-5 w-5"
            />
          </label>

        {includeCaption ? (
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-[var(--text-tertiary)]">Legenda</span>
            <textarea
              value={caption}
              onChange={event => setCaption(event.target.value)}
              onDragOver={event => event.preventDefault()}
              onDrop={event => {
                event.preventDefault();
                const text = event.dataTransfer.getData('text/plain');
                if (text) setCaption(text);
              }}
              placeholder="Clique, cole ou solte a legenda aqui..."
              rows={5}
              className="min-h-[130px] w-full resize-y rounded-[var(--radius-card)] border border-dashed border-[var(--border-strong)] bg-[var(--bg-secondary)] px-4 py-3 text-sm leading-6 text-[var(--text-primary)]"
            />
          </label>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-[var(--text-tertiary)]">
            <kbd className="rounded border border-[var(--border-color)] bg-[var(--bg-hover)] px-1 py-0.5 font-mono text-xs">
              Ctrl
            </kbd>
            {' + '}
            <kbd className="rounded border border-[var(--border-color)] bg-[var(--bg-hover)] px-1 py-0.5 font-mono text-xs">
              ↵
            </kbd>
            {' '}salvar
          </span>
          <AppButton
            variant="primary"
            onClick={() => void handleSave()}
            disabled={!canSave}
            leftIcon={isSaving ? <Sparkles className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          >
            {isSaving ? 'Salvando...' : 'Salvar roteiro'}
          </AppButton>
        </div>
      </section>
      </>
    </div>
  );
}

function ContextChip({label}: {label: string}) {
  return (
    <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
      {label}
    </span>
  );
}
