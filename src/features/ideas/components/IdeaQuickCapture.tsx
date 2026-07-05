import { useState } from 'react';
import { ChevronDown, CornerDownLeft } from 'lucide-react';
import type { AppState } from '../../../app/providers/appState';
import { getActivePilares } from '../../settings/lib/activePilares';
import { cn } from '../../../lib/utils';

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
}

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
}: IdeaQuickCaptureProps) {
  const [metaOpen, setMetaOpen] = useState(false);

  const consumindo = state.bibliotecaItems.filter((item) =>
    ['Consumindo', 'Lendo', 'Assistindo'].includes(item.status)
  );

  const hasMeta = Boolean(selectedPilarId || selectedSeries || selectedBibliotecaId);
  const canSave = title.trim().length > 0 || notes.trim().length > 0;

  const handleNotesKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (canSave) onSave();
    }
  };

  return (
    <div className="editorial-surface rounded-[var(--radius-input)] p-2.5 shadow-[var(--shadow-soft)] transition-all focus-within:border-[var(--accent-blue)] focus-within:ring-1 focus-within:ring-[var(--accent-blue)]/20">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 stack-sm">
          <input
            autoFocus
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Título da ideia"
            className="w-full border-none bg-transparent p-0 text-sm font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:ring-0"
          />
          <textarea
            value={notes}
            onChange={(event) => onNotesChange(event.target.value)}
            onKeyDown={handleNotesKeyDown}
            rows={2}
            placeholder="Observações — Enter para salvar, Shift+Enter para nova linha"
            className="min-h-[3rem] max-h-32 w-full resize-none border-none bg-transparent p-0 t-body leading-relaxed text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:ring-0 custom-scrollbar"
          />
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          title="Salvar (Enter)"
          className={cn(
            'mt-0.5 flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition-all',
            canSave
              ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90'
              : 'cursor-not-allowed bg-[var(--bg-hover)] text-[var(--text-tertiary)] opacity-50'
          )}
        >
          <CornerDownLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Salvar</span>
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-[var(--border-color)] pt-2">
        <button
          type="button"
          onClick={() => setMetaOpen((open) => !open)}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2 py-1 t-label t-label-uppercase font-semibold transition-colors',
            metaOpen || hasMeta
              ? 'text-[var(--accent-blue)]'
              : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
          )}
        >
          <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', metaOpen && 'rotate-180')} />
          Classificar
          {hasMeta && !metaOpen ? (
            <span className="ml-1 rounded-full bg-[var(--accent-blue)]/15 px-1.5 py-0.5 text-xs text-[var(--accent-blue)]">
              ·
            </span>
          ) : null}
        </button>
        <span className="text-xs text-[var(--text-tertiary)]">
          <kbd className="rounded border border-[var(--border-color)] bg-[var(--bg-hover)] px-1 py-0.5 font-mono text-xs">↵</kbd>
          {' '}salvar
        </span>
      </div>

      {metaOpen ? (
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            value={selectedPilarId}
            onChange={(event) => onSelectedPilarIdChange(event.target.value)}
            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-hover)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)]/20"
          >
            <option value="">Pilar</option>
            {getActivePilares(state.pilares).map((pilar) => (
              <option key={pilar.id} value={pilar.id}>
                {pilar.nome}
              </option>
            ))}
          </select>
          <select
            value={selectedSeries}
            onChange={(event) => onSelectedSeriesChange(event.target.value)}
            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-hover)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)]/20"
          >
            <option value="">Série</option>
            {state.series.map((serie) => (
              <option key={serie.id} value={serie.id}>
                {serie.name}
              </option>
            ))}
          </select>
          {consumindo.length > 0 ? (
            <select
              value={selectedBibliotecaId}
              onChange={(event) => onSelectedBibliotecaIdChange(event.target.value)}
              className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-hover)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] focus:border-[var(--accent-blue)] focus:ring-1 focus:ring-[var(--accent-blue)]/20"
            >
              <option value="">Origem</option>
              {consumindo.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.titulo.slice(0, 40)}
                </option>
              ))}
            </select>
          ) : (
            <div className="hidden sm:block" />
          )}
        </div>
      ) : null}
    </div>
  );
}
