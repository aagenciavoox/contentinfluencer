import {useEffect, useMemo, useRef, useState} from 'react';
import {Reorder, useDragControls} from 'motion/react';
import {ArrowDown, ArrowUp, CheckCircle2, FileText, GripVertical, Plus, Video, X} from 'lucide-react';
import {TagSelect} from '../../../components/ui/TagSelect';
import {AppButton} from '../../../components/ui/AppButton';
import {EmptyState} from '../../../components/ui/EmptyState';
import {SelectField} from '../../../components/ui/SelectField';
import {Surface} from '../../../components/ui/Surface';
import {Text} from '../../../components/ui/Text';
import {ToggleRow} from '../../../components/ui/ToggleSwitch';
import type {Content, RecordingBlock, RecordingBlockContent} from '../../../lib/database';
import {cn, tintedTextColor} from '../../../lib/utils';
import {
  addBlockContent,
  getOrderedBlockContents,
  getRecordingBlockTags,
  isBlockContentComplete,
  isRecordingBlockTeleprompterEnabled,
  normalizeBlockContentsOrder,
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
  /**
   * `stack` é o celular: Configurações em cima e Roteiros embaixo, como hoje.
   * `columns` é o desktop a partir de lg: Roteiros à esquerda e Configurações
   * à direita (368px, 16px entre elas). Abaixo de lg, `columns` empilha com
   * Roteiros primeiro. A página do celular passa `stack` de propósito.
   */
  layout?: 'columns' | 'stack';
  className?: string;
}

type OrderedEntry = {item: RecordingBlockContent; content: Content};

const fieldLabelClass = 'block t-body-strong text-[var(--text-primary)]';

// Mesmo vermelho de "Limpar toda a lixeira": ação que tira algo, sem confirmar.
const removeButtonClass =
  'border-[color-mix(in_srgb,var(--danger),transparent_55%)] text-[var(--danger)] hover:border-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger),transparent_90%)]';

export function RecordingBlockEditor({
  block,
  blockContents,
  queueContents,
  availableTags,
  onUpdateBlock,
  onUpdateContents,
  layout = 'stack',
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
      .filter((entry): entry is OrderedEntry => entry !== null);
  }, [block, blockContents]);

  // Ordem local enquanto arrasta: só grava ao soltar, não a cada troca de lugar.
  const orderedIdsKey = orderedEntries.map(entry => entry.content.id).join('|');
  const [dragOrder, setDragOrder] = useState<string[]>(() => orderedEntries.map(entry => entry.content.id));
  const dragOrderRef = useRef(dragOrder);

  useEffect(() => {
    const ids = orderedIdsKey ? orderedIdsKey.split('|') : [];
    dragOrderRef.current = ids;
    setDragOrder(ids);
  }, [orderedIdsKey]);

  const entryById = useMemo(
    () => new Map(orderedEntries.map(entry => [entry.content.id, entry])),
    [orderedEntries]
  );
  const visibleEntries = dragOrder
    .map(id => entryById.get(id))
    .filter((entry): entry is OrderedEntry => entry !== undefined);

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

  const handleDragReorder = (nextOrder: string[]) => {
    dragOrderRef.current = nextOrder;
    setDragOrder(nextOrder);
  };

  const handleDragEnd = () => {
    const nextOrder = dragOrderRef.current;
    if (nextOrder.join('|') === orderedIdsKey) return;
    const currentItems = getOrderedBlockContents(block);
    const itemById = new Map(currentItems.map(item => [item.contentId, item]));
    const reordered = nextOrder
      .map(id => itemById.get(id))
      .filter((item): item is RecordingBlockContent => item !== undefined);
    // Itens cujo roteiro ainda não carregou não aparecem na lista: ficam no fim, sem sumir do bloco.
    const hidden = currentItems.filter(item => !nextOrder.includes(item.contentId));
    onUpdateContents(normalizeBlockContentsOrder([...reordered, ...hidden]));
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
  const nameFieldId = `recording-block-name-${block.id}`;
  const queueFieldId = `recording-block-queue-${block.id}`;
  const columns = layout === 'columns';

  const settingsCard = (
      <Surface padding="none" className={cn('p-4 md:p-8', columns && 'min-w-0')}>
        <div className="stack-lg">
          <Text variant="sectionTitle">Configurações do bloco</Text>

          <div className={cn(
            'grid gap-4',
            columns ? undefined : 'md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] md:gap-6',
          )}>
            <div className="stack-sm">
              <label htmlFor={nameFieldId} className={fieldLabelClass}>
                Nome do bloco
              </label>
              <input
                id={nameFieldId}
                type="text"
                value={name}
                onChange={event => setName(event.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={event => {
                  if (event.key === 'Enter') event.currentTarget.blur();
                }}
                className="w-full"
                placeholder="Ex.: Sessão da tarde"
              />
            </div>

            <ToggleRow
              id={`recording-block-teleprompter-${block.id}`}
              enabled={teleprompterEnabled}
              onToggle={handleTeleprompterToggle}
              title="Rolagem automática"
              className="rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] py-2 pl-3 pr-2 transition-colors hover:border-[var(--border-strong)]"
            >
              <span className="flex items-center gap-3">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-input)] bg-[var(--bg-hover)] text-[var(--text-primary)]"
                  aria-hidden
                >
                  <FileText className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block t-body-strong text-[var(--text-primary)]">Rolagem automática</span>
                  <span className="block t-secondary text-[var(--text-secondary)]">
                    {teleprompterEnabled ? 'Ativada' : 'Desativada'}
                  </span>
                </span>
              </span>
            </ToggleRow>
          </div>

          <TagSelect
            id={`recording-block-tags-${block.id}`}
            label="Marcadores de gravação"
            hint="Local, cenário ou objetos usados neste bloco."
            values={tags}
            onChange={handleTagsChange}
            options={availableTags.map(tag => ({value: tag, label: tag}))}
            creatable
            placeholder="Ex.: roupa preta, estante, caneca"
            controlClassName="min-h-[var(--control-height-mobile)] md:min-h-12"
          />
        </div>
      </Surface>
  );

  const scriptsCard = (
      <Surface padding="none" className={cn('p-4 md:p-8', columns && 'min-w-0')}>
        <div className="stack-lg">
          <div className="stack-xs">
            <div className={cn('flex items-center gap-3', columns && 'min-w-0 flex-nowrap')}>
              <Text variant="sectionTitle" className={cn(columns && 'min-w-0 truncate')}>Roteiros do bloco</Text>
              <Text variant="secondary" as="span"
                className={cn(
                  'inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--bg-hover)] px-2 text-[var(--text-secondary)]',
                  columns && 'shrink-0',
                )}
                aria-label={`${orderedEntries.length} ${orderedEntries.length === 1 ? 'roteiro' : 'roteiros'}`}
              >
                {orderedEntries.length}
              </Text>
            </div>
            <Text variant="body" as="p" className="text-[var(--text-secondary)]">Defina a ordem de gravação.</Text>
          </div>

          {visibleEntries.length === 0 ? (
            columns ? (
              <EmptyState
                compact
                className="shadow-none"
                icon={<Video className="h-8 w-8" aria-hidden />}
                title="Nenhum roteiro neste bloco."
                description="Adicione um roteiro pronto logo abaixo."
              />
            ) : (
              <div className="rounded-[var(--radius-input)] border border-dashed border-[var(--border-color)] px-4 py-8 text-center">
                <Text variant="bodyStrong" as="p" className="text-[var(--text-secondary)]">Nenhum roteiro neste bloco.</Text>
                <Text variant="secondary" as="p" className="mt-1 text-[var(--text-tertiary)]">Adicione um roteiro pronto logo abaixo.</Text>
              </div>
            )
          ) : (
            <Reorder.Group
              as="ol"
              axis="y"
              values={dragOrder}
              onReorder={handleDragReorder}
              className="stack-sm"
            >
              {visibleEntries.map(({item, content}, index) => (
                <BlockScriptRow
                  key={content.id}
                  content={content}
                  position={index + 1}
                  completed={isBlockContentComplete(item, content)}
                  isFirst={index === 0}
                  isLast={index === visibleEntries.length - 1}
                  onMoveUp={() => handleMove(index, -1)}
                  onMoveDown={() => handleMove(index, 1)}
                  onRemove={() => handleRemove(content.id)}
                  onDragEnd={handleDragEnd}
                  layout={layout}
                />
              ))}
            </Reorder.Group>
          )}

          <div className={cn(
            'stack-md',
            columns ? 'surface-separator pt-4' : 'border-t border-[var(--border-color)] pt-6',
          )}>
            <div className="stack-xs">
              <label htmlFor={queueFieldId} className={fieldLabelClass}>
                Adicionar roteiro
              </label>
              <Text variant="body" as="p" className="text-[var(--text-secondary)]">
                {addableQueueContents.length === 0
                  ? 'Nenhum roteiro pronto fora de um bloco no momento.'
                  : 'Roteiros prontos que ainda não estão em um bloco.'}
              </Text>
            </div>

            {addableQueueContents.length > 0 ? (
              <div className={cn('flex flex-col gap-3', columns ? 'lg:flex-row' : 'sm:flex-row')}>
                <SelectField
                  id={queueFieldId}
                  block
                  value={selectedQueueId}
                  onChange={setSelectedQueueId}
                  options={[
                    {value: '', label: 'Selecione um roteiro pronto'},
                    ...addableQueueContents.map(content => ({
                      value: content.id,
                      label: content.title || 'Roteiro sem título',
                    })),
                  ]}
                  className="min-w-0 flex-1 md:min-h-12"
                />
                <AppButton
                  variant="secondary"
                  leftIcon={<Plus className="h-4 w-4" />}
                  disabled={!selectedQueueId}
                  onClick={handleAddFromQueue}
                  className={cn('md:h-12', columns && 'shrink-0')}
                >
                  Adicionar ao bloco
                </AppButton>
              </div>
            ) : null}
          </div>
        </div>
      </Surface>
  );

  if (columns) {
    return (
      <div className={cn('grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_368px]', className)}>
        <div className="order-1 min-w-0 lg:col-start-1 lg:row-start-1">{scriptsCard}</div>
        <div className="order-2 min-w-0 lg:col-start-2 lg:row-start-1">{settingsCard}</div>
      </div>
    );
  }

  return (
    <div className={cn('stack-xl', className)}>
      {settingsCard}
      {scriptsCard}
    </div>
  );
}

function BlockScriptRow({
  content,
  position,
  completed,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
  onDragEnd,
  layout,
}: {
  content: Content;
  position: number;
  completed: boolean;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onDragEnd: () => void;
  layout: 'columns' | 'stack';
}) {
  const dragControls = useDragControls();
  const title = content.title || 'Roteiro sem título';
  const columns = layout === 'columns';

  return (
    <Reorder.Item
      value={content.id}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragEnd}
      whileDrag={{boxShadow: 'var(--shadow-dropdown)'}}
      className={cn(
        'relative flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] py-3 pl-1 pr-3 sm:flex-nowrap',
        columns && 'min-w-0',
      )}
    >
      <button
        type="button"
        onPointerDown={event => {
          event.preventDefault();
          dragControls.start(event);
        }}
        className="flex h-11 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-[var(--radius-input)] text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] active:cursor-grabbing"
        aria-label={`Arrastar "${title}" para mudar a ordem`}
        tabIndex={-1}
      >
        <GripVertical className="h-5 w-5" aria-hidden />
      </button>

      <Text variant="bodyStrong" as="span"
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full',
          columns ? 'h-8 w-8' : 'h-11 w-11',
          columns && completed
            ? undefined
            : 'border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-primary)]',
        )}
        style={columns && completed ? {
          backgroundColor: 'color-mix(in srgb, var(--success) 18%, var(--bg-primary))',
          color: tintedTextColor('var(--success)'),
        } : undefined}
        aria-hidden
      >
        {position}
      </Text>

      <div className={cn('min-w-0 flex-1', columns && 'overflow-hidden')}>
        <Text variant="bodyStrong" as="p" className="line-clamp-2 text-[var(--text-primary)] sm:line-clamp-1">{title}</Text>
        <Text
          variant="secondary"
          as="p"
          className={cn(
            'flex items-center gap-1.5 text-[var(--text-secondary)]',
            columns && 'whitespace-nowrap',
          )}
        >
          {completed ? (
            <>
              <CheckCircle2
                className={cn('h-3.5 w-3.5', columns ? 'shrink-0' : 'text-[var(--success)]')}
                style={columns ? {color: tintedTextColor('var(--success)')} : undefined}
                aria-hidden
              />
              Gravado
            </>
          ) : (
            'Pronto para gravar'
          )}
        </Text>
      </div>

      <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
        <AppButton
          variant="secondary"
          iconOnly
          disabled={isFirst}
          onClick={onMoveUp}
          aria-label={`Subir "${title}" na ordem`}
        >
          <ArrowUp className="h-4 w-4" />
        </AppButton>
        <AppButton
          variant="secondary"
          iconOnly
          disabled={isLast}
          onClick={onMoveDown}
          aria-label={`Descer "${title}" na ordem`}
        >
          <ArrowDown className="h-4 w-4" />
        </AppButton>
        <AppButton
          variant="secondary"
          leftIcon={<X className="h-4 w-4" />}
          onClick={onRemove}
          aria-label={`Remover "${title}" do bloco`}
          className={removeButtonClass}
        >
          Remover
        </AppButton>
      </div>
    </Reorder.Item>
  );
}
