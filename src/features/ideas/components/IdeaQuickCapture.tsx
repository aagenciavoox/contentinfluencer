import { useEffect, useRef, useState } from 'react';
import { BookOpen, CornerDownLeft, PencilLine, Plus, X } from 'lucide-react';
import type { AppState } from '../../../app/providers/appState';
import { AppButton } from '../../../components/ui/AppButton';
import { getActivePilares } from '../../settings/lib/activePilares';
import { cn, getEntityTagStyle } from '../../../lib/utils';

interface IdeaQuickCaptureProps {
  title: string;
  notes: string;
  selectedPilarId: string;
  selectedSeries: string;
  selectedBibliotecaId: string;
  state: AppState;
  onTitleChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSelectedPilarIdChange: (value: string) => void;
  onSelectedSeriesChange: (value: string) => void;
  onSelectedBibliotecaIdChange: (value: string) => void;
  onSave: () => void;
  variant?: 'compact' | 'default';
  autoFocus?: boolean;
}

type MetaField = 'pilar' | 'serie' | 'origem';

const fieldClassName =
  'w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--accent-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]/20';

export function IdeaQuickCapture({
  title,
  notes,
  selectedPilarId,
  selectedSeries,
  selectedBibliotecaId,
  state,
  onTitleChange,
  onNotesChange,
  onSelectedPilarIdChange,
  onSelectedSeriesChange,
  onSelectedBibliotecaIdChange,
  onSave,
  variant = 'compact',
  autoFocus = true,
}: IdeaQuickCaptureProps) {
  const [expanded, setExpanded] = useState(variant === 'default');
  const [openMeta, setOpenMeta] = useState<MetaField | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const consumindo = state.bibliotecaItems.filter((item) =>
    ['Consumindo', 'Lendo', 'Assistindo'].includes(item.status),
  );

  const canSave = title.trim().length > 0 || notes.trim().length > 0;
  const isCompact = variant === 'compact';

  const selectedPilar = state.pilares.find((pilar) => pilar.id === selectedPilarId) ?? null;
  const selectedSerie = state.series.find((serie) => serie.id === selectedSeries) ?? null;
  const selectedOrigem =
    state.bibliotecaItems.find((item) => item.id === selectedBibliotecaId) ?? null;

  useEffect(() => {
    if (!openMeta) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpenMeta(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [openMeta]);

  const handleNotesKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSave) onSave();
    }
  };

  const handleTitleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (canSave) onSave();
    }
  };

  const expandCapture = () => {
    if (isCompact) setExpanded(true);
  };

  const renderMetaChip = (
    field: MetaField,
    label: string,
    valueLabel: string | null,
    chipStyle?: React.CSSProperties,
    filledIcon?: React.ReactNode,
  ) => {
    const isOpen = openMeta === field;
    const filled = Boolean(valueLabel);

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpenMeta(isOpen ? null : field)}
          className={cn(
            'inline-flex max-w-full items-center gap-1 rounded-[var(--radius-pill)] border px-2 py-1 text-xs font-medium transition-colors',
            filled
              ? 'border-transparent'
              : 'border-dashed border-[var(--border-color)] text-[var(--text-tertiary)] hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)]',
          )}
          style={filled ? chipStyle : undefined}
        >
          {filled ? (
            <>
              {filledIcon}
              <span className="truncate">{valueLabel}</span>
              <button
                type="button"
                aria-label={`Remover ${label}`}
                onClick={(event) => {
                  event.stopPropagation();
                  if (field === 'pilar') onSelectedPilarIdChange('');
                  if (field === 'serie') onSelectedSeriesChange('');
                  if (field === 'origem') onSelectedBibliotecaIdChange('');
                  setOpenMeta(null);
                }}
                className="rounded p-0.5 opacity-60 transition hover:opacity-100"
              >
                <X className="h-3 w-3 shrink-0" />
              </button>
            </>
          ) : (
            <>
              <Plus className="h-3 w-3 shrink-0" />
              <span>{label}</span>
            </>
          )}
        </button>

        {isOpen ? (
          <div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] p-1 shadow-[var(--shadow-soft)]">
            <select
              autoFocus
              value={
                field === 'pilar'
                  ? selectedPilarId
                  : field === 'serie'
                    ? selectedSeries
                    : selectedBibliotecaId
              }
              onChange={(event) => {
                const value = event.target.value;
                if (field === 'pilar') onSelectedPilarIdChange(value);
                if (field === 'serie') onSelectedSeriesChange(value);
                if (field === 'origem') onSelectedBibliotecaIdChange(value);
                setOpenMeta(null);
              }}
              className="w-full rounded-md border border-[var(--border-color)] bg-[var(--bg-hover)] px-2 py-1.5 text-xs font-medium text-[var(--text-primary)] focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)]/20"
            >
              <option value="">{label}</option>
              {field === 'pilar'
                ? getActivePilares(state.pilares).map((pilar) => (
                    <option key={pilar.id} value={pilar.id}>
                      {pilar.nome}
                    </option>
                  ))
                : null}
              {field === 'serie'
                ? state.series.map((serie) => (
                    <option key={serie.id} value={serie.id}>
                      {serie.name}
                    </option>
                  ))
                : null}
              {field === 'origem'
                ? consumindo.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.titulo.slice(0, 40)}
                    </option>
                  ))
                : null}
            </select>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="stack-sm rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--surface-editorial)] p-2.5 shadow-[var(--shadow-soft)]"
    >
      <div className="flex items-center gap-2">
        <div className="group relative min-w-0 flex-1">
          <PencilLine
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)] transition-colors group-focus-within:text-[var(--accent-blue)]"
            aria-hidden="true"
          />
          <input
            autoFocus={autoFocus}
            value={title}
            onChange={(event) => {
              onTitleChange(event.target.value);
              expandCapture();
            }}
            onFocus={expandCapture}
            onKeyDown={handleTitleKeyDown}
            placeholder="Título da ideia"
            aria-label="Título da ideia"
            className={cn(
              fieldClassName,
              'h-10 py-0 pl-9 pr-3 text-sm font-semibold placeholder:font-normal',
            )}
          />
        </div>
        {isCompact && !expanded ? (
          <button
            type="button"
            onClick={expandCapture}
            className="shrink-0 rounded-md px-2 py-1.5 text-xs font-medium text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--accent-blue)]"
          >
            Observações
          </button>
        ) : null}
      </div>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          expanded ? 'max-h-36 opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <textarea
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          onKeyDown={handleNotesKeyDown}
          rows={2}
          placeholder="Observações — Enter salva, Shift+Enter nova linha"
          aria-label="Observações da ideia"
          className={cn(
            fieldClassName,
            'min-h-[4.5rem] max-h-28 resize-none bg-[var(--bg-hover)] px-3 py-2 text-sm leading-relaxed custom-scrollbar',
          )}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-color)] pt-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {renderMetaChip(
            'pilar',
            'Pilar',
            selectedPilar?.nome ?? null,
            getEntityTagStyle(selectedPilar?.cor),
          )}
          {renderMetaChip(
            'serie',
            'Série',
            selectedSerie?.name ?? null,
            getEntityTagStyle(selectedSerie?.cor),
          )}
          {consumindo.length > 0
            ? renderMetaChip(
                'origem',
                'Origem',
                selectedOrigem?.titulo.slice(0, 28) ?? null,
                undefined,
                <BookOpen className="h-3 w-3 shrink-0 text-[var(--accent-orange)]" />,
              )
            : null}
        </div>

        <AppButton
          type="button"
          variant="primary"
          size="sm"
          onClick={onSave}
          disabled={!canSave}
          leftIcon={<CornerDownLeft className="h-3.5 w-3.5" />}
          className="shrink-0"
        >
          Salvar
        </AppButton>
      </div>
    </div>
  );
}
