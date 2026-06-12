import {useEffect, useMemo, useState} from 'react';
import {ArrowDown, ArrowUp, Mic, Plus, X} from 'lucide-react';
import {TagSelect} from '../../../components/ui/TagSelect';
import {AppButton} from '../../../components/ui/AppButton';
import type {Content, RecordingBlock, RecordingBlockContent} from '../../../lib/database';
import {cn} from '../../../lib/utils';
import {
  addBlockContent,
  getOrderedBlockContents,
  getRecordingBlockTags,
  isBlockContentComplete,
  isRecordingBlockTeleprompterEnabled,
  removeBlockContent,
  reorderBlockContents,
  withRecordingBlockTags,
} from '../lib/recordingWorkflow';

interface RecordingBlockEditorProps {
  block: RecordingBlock;
  blockContents: Content[];
  queueContents: Content[];
  availableTags: string[];
  onUpdateBlock: (block: RecordingBlock) => void;
  onUpdateContents: (contents: RecordingBlockContent[]) => void;
  className?: string;
}

export function RecordingBlockEditor({
  block,
  blockContents,
  queueContents,
  availableTags,
  onUpdateBlock,
  onUpdateContents,
  className,
}: RecordingBlockEditorProps) {
  const [name, setName] = useState(block.name);
  const [tags, setTags] = useState<string[]>(() => getRecordingBlockTags(block));
  const [selectedQueueId, setSelectedQueueId] = useState('');

  useEffect(() => {
    setName(block.name);
    setTags(getRecordingBlockTags(block));
  }, [block.id, block.name, block.metadata]);

  const orderedEntries = useMemo(() => {
    const ordered = getOrderedBlockContents(block);

    return ordered
      .map(item => {
        const content = blockContents.find(candidate => candidate.id === item.contentId) ?? null;
        if (!content) return null;
        return {item, content};
      })
      .filter((entry): entry is {item: RecordingBlockContent; content: Content} => entry !== null);
  }, [block, blockContents]);

  const addableQueueContents = useMemo(
    () => queueContents.filter(content => !block.contents.some(item => item.contentId === content.id)),
    [block.contents, queueContents]
  );

  const persistBlockMeta = (nextName: string, nextTags: string[]) => {
    onUpdateBlock(withRecordingBlockTags({...block, name: nextName.trim() || block.name}, nextTags));
  };

  const handleNameBlur = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === block.name) {
      setName(block.name);
      return;
    }
    persistBlockMeta(trimmed, tags);
  };

  const handleTagsChange = (nextTags: string[]) => {
    setTags(nextTags);
    persistBlockMeta(name.trim() || block.name, nextTags);
  };

  const handleTeleprompterToggle = () => {
    onUpdateBlock({
      ...block,
      metadata: {
        ...(block.metadata || {}),
        teleprompterEnabled: !isRecordingBlockTeleprompterEnabled(block),
      },
    });
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= orderedEntries.length) return;
    onUpdateContents(reorderBlockContents(getOrderedBlockContents(block), index, targetIndex));
  };

  const handleRemove = (contentId: string) => {
    onUpdateContents(removeBlockContent(getOrderedBlockContents(block), contentId));
  };

  const handleAddFromQueue = () => {
    const content = addableQueueContents.find(item => item.id === selectedQueueId);
    if (!content) return;
    onUpdateContents(addBlockContent(getOrderedBlockContents(block), block.id, content));
    setSelectedQueueId('');
  };

  const teleprompterEnabled = isRecordingBlockTeleprompterEnabled(block);

  return (
    <div className={cn('space-y-5', className)}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            Nome do bloco
          </span>
          <input
            value={name}
            onChange={event => setName(event.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={event => {
              if (event.key === 'Enter') event.currentTarget.blur();
            }}
            className="w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--border-strong)]"
            placeholder="Ex: Sessao da tarde"
          />
        </label>

        <div className="rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                Teleprompter
              </p>
              <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                {teleprompterEnabled ? 'Ativado' : 'Leitura estatica'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleTeleprompterToggle}
              className={cn(
                'inline-flex items-center gap-2 rounded-[var(--radius-card-mobile)] border px-4 py-2 text-xs font-semibold transition-colors',
                teleprompterEnabled
                  ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                  : 'border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)]'
              )}
            >
              <Mic className="h-4 w-4" />
              {teleprompterEnabled ? 'Desativar' : 'Ativar'}
            </button>
          </div>
        </div>
      </div>

      <TagSelect
        label="Marcadores de gravacao"
        hint="Organize look, cenario ou props deste bloco."
        values={tags}
        onChange={handleTagsChange}
        options={availableTags.map(tag => ({value: tag, label: tag}))}
        creatable
        placeholder="Ex: roupa preta, estante, caneca"
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              Roteiros do bloco
            </p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Reordene, remova ou adicione conteudos prontos sem bloco.
            </p>
          </div>
          <span className="rounded-full bg-[var(--bg-hover)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
            {orderedEntries.length} itens
          </span>
        </div>

        {orderedEntries.length === 0 ? (
          <div className="rounded-[var(--radius-card-mobile)] border border-dashed border-[var(--border-color)] px-4 py-8 text-center">
            <p className="text-sm font-semibold text-[var(--text-secondary)]">Nenhum roteiro neste bloco.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orderedEntries.map(({item, content}, index) => {
              const completed = isBlockContentComplete(item, content);

              return (
                <div
                  key={content.id}
                  className={cn(
                    'flex items-center gap-3 rounded-[var(--radius-card-mobile)] border px-4 py-3',
                    completed
                      ? 'border-emerald-500/20 bg-emerald-500/8'
                      : 'border-[var(--border-color)] bg-[var(--bg-primary)]'
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-hover)] text-xs font-semibold text-[var(--text-primary)]">
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                      {content.title || 'Conteudo sem titulo'}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {completed ? 'Gravado' : 'Pronto para camera'}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, -1)}
                      className="rounded-full border border-[var(--border-color)] p-2 disabled:opacity-30"
                      aria-label="Subir na ordem"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === orderedEntries.length - 1}
                      onClick={() => handleMove(index, 1)}
                      className="rounded-full border border-[var(--border-color)] p-2 disabled:opacity-30"
                      aria-label="Descer na ordem"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(content.id)}
                      className="rounded-full border border-[var(--border-color)] p-2 text-[var(--accent-pink)]"
                      aria-label="Remover do bloco"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          Adicionar roteiro
        </p>
        {addableQueueContents.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            Nenhum conteudo sem bloco disponivel no momento.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedQueueId}
              onChange={event => setSelectedQueueId(event.target.value)}
              className="min-h-11 flex-1 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 text-sm font-semibold text-[var(--text-primary)] outline-none"
            >
              <option value="">Selecione um roteiro pronto</option>
              {addableQueueContents.map(content => (
                <option key={content.id} value={content.id}>
                  {content.title || 'Conteudo sem titulo'}
                </option>
              ))}
            </select>
            <AppButton
              variant="secondary"
              leftIcon={<Plus className="h-4 w-4" />}
              disabled={!selectedQueueId}
              onClick={handleAddFromQueue}
            >
              Adicionar
            </AppButton>
          </div>
        )}
      </section>
    </div>
  );
}
