import {Check, Plus, X} from 'lucide-react';
import {useState} from 'react';
import {TagSelect} from '../../../../components/ui/TagSelect';
import {cn} from '../../../../lib/utils';
import type {RecordingBlock} from '../../../../lib/database';

interface RecordingSelectionBarProps {
  selectedCount: number;
  blockName: string;
  blockTags: string[];
  availableTags: string[];
  existingBlocks: RecordingBlock[];
  showBlockForm: boolean;
  canCreate: boolean;
  onBlockNameChange: (value: string) => void;
  onBlockTagsChange: (tags: string[]) => void;
  onShowForm: () => void;
  onHideForm: () => void;
  onCreate: () => void;
  onAddToBlock: (blockId: string) => void;
  onClearSelection: () => void;
}

export function RecordingSelectionBar({
  selectedCount,
  blockName,
  blockTags,
  availableTags,
  existingBlocks,
  showBlockForm,
  canCreate,
  onBlockNameChange,
  onBlockTagsChange,
  onShowForm,
  onHideForm,
  onCreate,
  onAddToBlock,
  onClearSelection,
}: RecordingSelectionBarProps) {
  const [blockMode, setBlockMode] = useState<'novo' | 'existente'>('novo');
  const [targetBlockId, setTargetBlockId] = useState('');

  const handleHide = () => {
    setBlockMode('novo');
    setTargetBlockId('');
    onHideForm();
  };

  if (selectedCount === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 px-4 md:px-8">
      <div className="pointer-events-auto mx-auto max-w-3xl">
        {showBlockForm ? (
          <div className="stack-md rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {selectedCount} {selectedCount === 1 ? 'roteiro selecionado' : 'roteiros selecionados'}
              </p>
              <button
                type="button"
                onClick={handleHide}
                className="rounded-full p-2 text-[var(--text-tertiary)] hover:bg-[var(--bg-hover)]"
                aria-label="Fechar formulario"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {existingBlocks.length > 0 && (
              <div className="flex rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] p-0.5 w-fit">
                {(['novo', 'existente'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setBlockMode(mode)}
                    className={cn(
                      'rounded-lg px-4 py-1.5 text-xs font-semibold transition-all',
                      blockMode === mode
                        ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    )}
                  >
                    {mode === 'novo' ? 'Novo bloco' : 'Bloco existente'}
                  </button>
                ))}
              </div>
            )}

            {blockMode === 'novo' ? (
              <div className="stack-md">
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
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-input)] bg-[var(--text-primary)] px-6 py-3 text-sm font-semibold text-[var(--bg-primary)] disabled:opacity-30 sm:flex-none"
                  >
                    <Plus className="h-4 w-4" />
                    Criar bloco
                  </button>
                  <button
                    type="button"
                    onClick={handleHide}
                    className="rounded-[var(--radius-input)] border border-[var(--border-color)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="stack-md">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-[var(--text-secondary)]">Escolher bloco existente</p>
                  <div className="grid gap-2 max-h-48 overflow-y-auto">
                    {existingBlocks.map(block => (
                      <button
                        key={block.id}
                        type="button"
                        onClick={() => setTargetBlockId(block.id)}
                        className={cn(
                          'flex items-center justify-between rounded-[var(--radius-input)] border px-4 py-3 text-left text-sm transition-colors',
                          targetBlockId === block.id
                            ? 'border-[var(--text-primary)] bg-[var(--text-primary)]/5 font-semibold text-[var(--text-primary)]'
                            : 'border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                        )}
                      >
                        <span className="truncate">{block.name}</span>
                        <span className="ml-2 shrink-0 text-xs text-[var(--text-tertiary)]">
                          {block.contents.length} roteiro{block.contents.length !== 1 ? 's' : ''}
                        </span>
                        {targetBlockId === block.id && <Check className="ml-2 h-4 w-4 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => { onAddToBlock(targetBlockId); setTargetBlockId(''); }}
                    disabled={!targetBlockId}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-input)] bg-[var(--text-primary)] px-6 py-3 text-sm font-semibold text-[var(--bg-primary)] disabled:opacity-30 sm:flex-none"
                  >
                    <Check className="h-4 w-4" />
                    Adicionar ao bloco
                  </button>
                  <button
                    type="button"
                    onClick={handleHide}
                    className="rounded-[var(--radius-input)] border border-[var(--border-color)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {selectedCount} {selectedCount === 1 ? 'roteiro selecionado' : 'roteiros selecionados'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onClearSelection}
                className="rounded-[var(--radius-input)] border border-[var(--border-color)] px-4 py-2.5 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={onShowForm}
                className="inline-flex items-center gap-2 rounded-[var(--radius-input)] bg-[var(--text-primary)] px-6 py-2.5 text-sm font-semibold text-[var(--bg-primary)]"
              >
                <Plus className="h-4 w-4" />
                {existingBlocks.length > 0 ? 'Criar / adicionar ao bloco' : 'Criar bloco'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
