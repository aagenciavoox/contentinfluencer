import { useRef, useState } from 'react';
import { BookOpen, CornerDownLeft, PencilLine, Plus, X } from 'lucide-react';
import type { AppState } from '../../../app/providers/appState';
import { AppButton } from '../../../components/ui/AppButton';
import { SelectMenu } from '../../../components/ui/SelectMenu';
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
  'w-full rounded-[var(--radius-input)] border border-[var(--border-input)] bg-[var(--bg-elevated)] text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-tertiary)] hover:border-[var(--border-strong)] focus:border-[var(--accent-blue)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-blue)]/20';

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
    const filled = Boolean(valueLabel);
    const value =
      field === 'pilar' ? selectedPilarId : field === 'serie' ? selectedSeries : selectedBibliotecaId;
    const handleSelect = (next: string) => {
      if (field === 'pilar') onSelectedPilarIdChange(next);
      if (field === 'serie') onSelectedSeriesChange(next);
      if (field === 'origem') onSelectedBibliotecaIdChange(next);
    };
    const options =
      field === 'pilar'
        ? getActivePilares(state.pilares).map((pilar) => ({ value: pilar.id, label: pilar.nome }))
        : field === 'serie'
          ? state.series.map((serie) => ({ value: serie.id, label: serie.name }))
          : consumindo.map((item) => ({ value: item.id, label: item.titulo.slice(0, 40) }));

    return (
      <div className="relative">
        {filled ? (
          // Botão dentro de botão não é HTML válido e o X ficava com 16px. Agora são dois botões
          // lado a lado dentro do mesmo chip; no toque, os dois têm 44px de altura.
          <div
            className="inline-flex min-h-11 max-w-full items-center rounded-[var(--radius-pill)] border border-transparent text-xs font-medium md:min-h-0"
            style={chipStyle}
          >
            {/* Toque abre a lista do design system (folha no celular) direto no chip. */}
            <SelectMenu
              value={value}
              onChange={handleSelect}
              options={options}
              ariaLabel={label}
              triggerClassName="inline-flex min-h-11 min-w-0 items-center gap-1 rounded-l-[var(--radius-pill)] py-1 pl-2 pr-1 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] md:min-h-0"
            >
              {filledIcon}
              <span className="truncate">{valueLabel}</span>
            </SelectMenu>
            <button
              type="button"
              aria-label={`Remover ${label}`}
              onClick={() => {
                if (field === 'pilar') onSelectedPilarIdChange('');
                if (field === 'serie') onSelectedSeriesChange('');
                if (field === 'origem') onSelectedBibliotecaIdChange('');
              }}
              className="inline-flex min-h-11 min-w-9 shrink-0 items-center justify-center rounded-r-[var(--radius-pill)] pr-1 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] md:min-h-0 md:min-w-0 md:p-0.5"
            >
              <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </button>
          </div>
        ) : (
          <SelectMenu
            value={value}
            onChange={handleSelect}
            options={options}
            ariaLabel={label}
            triggerClassName="inline-flex min-h-11 max-w-full items-center gap-1 rounded-[var(--radius-pill)] border border-dashed border-[var(--border-color)] px-2 py-1 text-xs font-medium text-[var(--text-tertiary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] md:min-h-0"
          >
            <Plus className="h-3 w-3 shrink-0" aria-hidden />
            <span>{label}</span>
          </SelectMenu>
        )}

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
            className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-2.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] md:min-h-8"
          >
            + Observações
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
          // Compacto vive em telas com outra ação principal (Hoje).
          variant={isCompact ? 'secondary' : 'primary'}
          size="sm"
          onClick={onSave}
          disabled={!canSave}
          disabledReason="Escreva um título para salvar a ideia."
          leftIcon={<CornerDownLeft className="h-3.5 w-3.5" />}
          className="shrink-0"
        >
          Salvar
        </AppButton>
      </div>
    </div>
  );
}
