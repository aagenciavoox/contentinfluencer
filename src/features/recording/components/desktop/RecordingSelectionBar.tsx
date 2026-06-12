import {Plus, X} from 'lucide-react';
import {TagSelect} from '../../../../components/ui/TagSelect';
import {cn} from '../../../../lib/utils';

interface RecordingSelectionBarProps {
  selectedCount: number;
  blockName: string;
  blockTags: string[];
  availableTags: string[];
  showBlockForm: boolean;
  canCreate: boolean;
  onBlockNameChange: (value: string) => void;
  onBlockTagsChange: (tags: string[]) => void;
  onShowForm: () => void;
  onHideForm: () => void;
  onCreate: () => void;
  onClearSelection: () => void;
}

export function RecordingSelectionBar({
  selectedCount,
  blockName,
  blockTags,
  availableTags,
  showBlockForm,
  canCreate,
  onBlockNameChange,
  onBlockTagsChange,
  onShowForm,
  onHideForm,
  onCreate,
  onClearSelection,
}: RecordingSelectionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 px-4 md:px-8">
      <div className="pointer-events-auto mx-auto max-w-3xl">
        {showBlockForm ? (
          <div className="space-y-3 rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Novo bloco · {selectedCount} selecionados
              </p>
              <button
                type="button"
                onClick={onHideForm}
                className="rounded-full p-2 text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
                aria-label="Fechar formulario"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <input
              autoFocus
              value={blockName}
              onChange={event => onBlockNameChange(event.target.value)}
              onKeyDown={event => event.key === 'Enter' && canCreate && onCreate()}
              placeholder="Nome do bloco"
              className="w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)]"
            />

            <TagSelect
              label="Marcadores de gravacao"
              hint="Opcional — look, cenario ou props."
              values={blockTags}
              onChange={onBlockTagsChange}
              options={availableTags.map(tag => ({value: tag, label: tag}))}
              creatable
              placeholder="Ex: roupa preta, estante"
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onCreate}
                disabled={!canCreate}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-input)] bg-[var(--text-primary)] px-5 py-3 text-sm font-semibold text-[var(--bg-primary)] disabled:opacity-30 sm:flex-none"
              >
                Criar bloco
              </button>
              <button
                type="button"
                onClick={onClearSelection}
                className="rounded-[var(--radius-input)] border border-[var(--border-color)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {selectedCount} {selectedCount === 1 ? 'roteiro selecionado' : 'roteiros selecionados'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onClearSelection}
                className={cn(
                  'rounded-[var(--radius-input)] border border-[var(--border-color)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                )}
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={onShowForm}
                className="inline-flex items-center gap-2 rounded-[var(--radius-input)] bg-[var(--text-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--bg-primary)]"
              >
                <Plus className="h-4 w-4" />
                Criar bloco
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
