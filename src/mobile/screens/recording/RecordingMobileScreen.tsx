import { useMemo, useState } from 'react';
import { BookOpenText, Check, Clapperboard, ExternalLink, Layers3, Plus, SearchCheck, Tags, Video } from 'lucide-react';
import type { Content, Pilar, RecordingBlock, Serie } from '../../../lib/database';
import { EmptyState } from '../../../components/ui/EmptyState';
import { EMPTY } from '../../../lib/uiCopy';
import { MobileFilterSheet } from '../../components/MobileFilterSheet';
import { MobileListCard } from '../../components/MobileListCard';
import { MobileSearchBar } from '../../components/MobileSearchBar';
import { MobileSegmentTabs } from '../../components/MobileSegmentTabs';
import { MobileSectionHeader } from '../../components/MobileSectionHeader';
import {getRecordingBlockProgress, normalizeRecordingTags, resolveRecordingContextSummary} from '../../../features/recording/lib/recordingWorkflow';
import { TagSelect } from '../../../components/ui/TagSelect';
import { AppButton } from '../../../components/ui/AppButton';
import { cn, getEntityTagStyle } from '../../../lib/utils';
import { getScriptWordCount } from '../../../features/contents/lib/contentCardMeta';
import { isContentBodyLoaded } from '../../../features/contents/lib/contentBody';

interface RecordingMobileScreenProps {
  readyContents: Content[];
  recordingBlocks: RecordingBlock[];
  allContents: Content[];
  pilares: Pilar[];
  series: Serie[];
  availableTags: string[];
  activeTab: RecordingMobileTab;
  onTabChange: (tab: RecordingMobileTab) => void;
  onCreateBlock: (payload: { name: string; contentIds: string[]; tagsText: string }) => Promise<void> | void;
  onAddToExistingBlock: (payload: { blockId: string; contentIds: string[] }) => Promise<void> | void;
  onOpenBlock: (blockId: string) => void;
  onOpenContent: (contentId: string) => void;
  onReadContent: (contentId: string) => void;
}

type RecordingMobileTab = 'queue' | 'blocks';

export function RecordingMobileScreen({
  readyContents,
  recordingBlocks,
  allContents,
  pilares,
  series,
  availableTags,
  activeTab,
  onTabChange,
  onCreateBlock,
  onAddToExistingBlock,
  onOpenBlock,
  onOpenContent,
  onReadContent,
}: RecordingMobileScreenProps) {
  const [search, setSearch] = useState('');
  const [pilarFilter, setPilarFilter] = useState('all');
  const [seriesFilter, setSeriesFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [blockName, setBlockName] = useState('');
  const [blockTags, setBlockTags] = useState<string[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [blockMode, setBlockMode] = useState<'novo' | 'existente'>('novo');
  const [targetBlockId, setTargetBlockId] = useState('');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const orderedQueueContents = useMemo(
    () => [...readyContents].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
    [readyContents]
  );

  const filteredQueue = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orderedQueueContents
      .filter((content) => (pilarFilter === 'all' ? true : content.pilarId === pilarFilter))
      .filter((content) => (seriesFilter === 'all' ? true : content.seriesId === seriesFilter))
      .filter((content) =>
        tagFilter === 'all' ? true : normalizeRecordingTags(content.tags || []).includes(tagFilter)
      )
      .filter((content) => {
        if (!normalizedSearch) return true;
        const pilarName = pilares.find((item) => item.id === content.pilarId)?.nome || '';
        const seriesName = series.find((item) => item.id === content.seriesId)?.name || '';
        const recordingTags = normalizeRecordingTags(content.tags || []).join(' ');
        return [content.title, pilarName, seriesName, recordingTags].join(' ').toLowerCase().includes(normalizedSearch);
      });
  }, [orderedQueueContents, pilares, pilarFilter, search, series, seriesFilter, tagFilter]);

  const blockSummaries = useMemo(
    () =>
      recordingBlocks.map((block) => {
        const contents = [...block.contents]
          .sort((left, right) => left.ordem - right.ordem)
          .map((item) => allContents.find((content) => content.id === item.contentId) || null)
          .filter((content): content is Content => content !== null);
        const progress = getRecordingBlockProgress(block, contents);
        const first = contents[0] || null;

        return {
          block,
          contents,
          total: progress.totalCount,
          ready: progress.readyCount,
          completed: progress.completedCount,
          progress: progress.progressPercentage,
          first,
        };
      }),
    [allContents, recordingBlocks]
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedQueueIds = () =>
    orderedQueueContents.filter((content) => selectedIds.has(content.id)).map((content) => content.id);

  const resetSelectionForm = () => {
    setSelectedIds(new Set());
    setBlockName('');
    setBlockTags([]);
    setShowCreateForm(false);
    setBlockMode('novo');
    setTargetBlockId('');
  };

  const handleCreate = async () => {
    const orderedIds = selectedQueueIds();
    if (!blockName.trim() || orderedIds.length === 0) return;
    await onCreateBlock({ name: blockName.trim(), contentIds: orderedIds, tagsText: blockTags.join(', ') });
    resetSelectionForm();
    onTabChange('blocks');
  };

  const handleAddToExisting = async () => {
    const orderedIds = selectedQueueIds();
    if (!targetBlockId || orderedIds.length === 0) return;
    const blockId = targetBlockId;
    await onAddToExistingBlock({ blockId, contentIds: orderedIds });
    resetSelectionForm();
    onOpenBlock(blockId);
  };

  return (
    <div className="stack-xl">
      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <MobileSectionHeader
          icon={Video}
          tone="orange"
          title="Gravacao"
          description="Guarde blocos e itens soltos para montar uma sessao quando fizer sentido."
        />

        <div className="grid-metrics-3">
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <p className="t-label text-[var(--text-tertiary)]">Sem bloco</p>
            <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{readyContents.length}</p>
          </div>
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <p className="t-label text-[var(--text-tertiary)]">Blocos</p>
            <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{recordingBlocks.length}</p>
          </div>
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <p className="t-label text-[var(--text-tertiary)]">Marcados</p>
            <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{selectedIds.size}</p>
          </div>
        </div>
      </section>

      <section className="stack-lg">
        <MobileSegmentTabs
          tabs={[
            { value: 'queue', label: 'Sem bloco', count: readyContents.length },
            { value: 'blocks', label: 'Blocos', count: recordingBlocks.length },
          ]}
          value={activeTab}
          onChange={(value) => onTabChange(value)}
        />

        {activeTab === 'queue' ? (
          <>
            <MobileSearchBar
              value={search}
              onChange={setSearch}
              placeholder="Buscar roteiro, pilar ou serie"
              onFilterClick={() => setIsFilterSheetOpen(true)}
            />

            {filteredQueue.length === 0 ? (
              <EmptyState compact
                title={EMPTY.roteirosSemBloco.title}
                description={EMPTY.roteirosSemBloco.description}
                icon={<SearchCheck className="h-8 w-8" />}
              />
            ) : (
              <div className="stack-md">
                {filteredQueue.map((content) => {
                  const pilar = pilares.find((item) => item.id === content.pilarId) || null;
                  const serie = series.find((item) => item.id === content.seriesId) || null;
                  const pilarName = pilar?.nome;
                  const seriesName = serie?.name;
                  const selected = selectedIds.has(content.id);
                  const recordingTags = normalizeRecordingTags(content.tags || []);
                  const bodyLoaded = isContentBodyLoaded(content);
                  const scriptWordCount = getScriptWordCount(content);

                  return (
                    <MobileListCard
                      key={content.id}
                      onClick={() => toggleSelect(content.id)}
                      className={selected ? 'ring-1 ring-[var(--text-primary)]' : undefined}
                      eyebrow={selected ? 'Selecionado' : 'Sem bloco'}
                      title={content.title || 'Conteudo sem titulo'}
                      description={
                        !bodyLoaded
                          ? 'Carregando roteiro...'
                          : scriptWordCount > 0
                            ? `${scriptWordCount} palavras no roteiro`
                            : 'Sem roteiro escrito'
                      }
                      trailing={
                        <div className="flex items-center gap-1">
                          <AppButton
                            variant="ghost"
                            size="xs"
                            iconOnly
                            leftIcon={<BookOpenText className="h-3.5 w-3.5" />}
                            onClick={event => {
                              event.stopPropagation();
                              onReadContent(content.id);
                            }}
                            className="border-[var(--border-color)]"
                            aria-label="Abrir modo leitura"
                          />
                          <button
                            type="button"
                            onClick={event => {
                              event.stopPropagation();
                              onOpenContent(content.id);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-input)] border border-[var(--border-color)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                            aria-label="Abrir detalhe do conteudo"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      }
                      meta={
                        <>
                          {pilarName ? (
                            <span
                              className="rounded-full border px-3 py-1 text-xs font-semibold"
                              style={getEntityTagStyle(pilar?.cor)}
                            >
                              {pilarName}
                            </span>
                          ) : null}
                          {seriesName ? (
                            <span
                              className="rounded-full border px-3 py-1 text-xs font-semibold"
                              style={getEntityTagStyle(serie?.cor)}
                            >
                              {seriesName}
                            </span>
                          ) : null}
                          {recordingTags.map((tag) => (
                            <span
                              key={`${content.id}-${tag}`}
                              className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-orange)]/10 px-3 py-1 text-xs font-semibold text-[var(--accent-orange)]"
                            >
                              <Tags className="h-3 w-3" />
                              {tag}
                            </span>
                          ))}
                        </>
                      }
                    />
                  );
                })}
              </div>
            )}

            {selectedIds.size > 0 ? (
              <div className="stack-md rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
                {showCreateForm ? (
                  <>
                    {recordingBlocks.length > 0 ? (
                      <div className="flex w-fit rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] p-0.5">
                        {(['novo', 'existente'] as const).map(mode => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setBlockMode(mode)}
                            className={cn(
                              'rounded-lg px-4 py-1.5 text-xs font-semibold transition-all',
                              blockMode === mode
                                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                                : 'text-[var(--text-secondary)]'
                            )}
                          >
                            {mode === 'novo' ? 'Novo bloco' : 'Bloco existente'}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    {blockMode === 'novo' ? (
                      <>
                        <input
                          autoFocus
                          value={blockName}
                          onChange={(event) => setBlockName(event.target.value)}
                          placeholder={`Nome do bloco (${selectedIds.size} selecionados)`}
                          className="w-full"
                        />
                        <TagSelect
                          label="Marcadores de gravacao"
                          hint="Selecione ou crie marcadores para organizar o bloco."
                          values={blockTags}
                          onChange={setBlockTags}
                          options={availableTags.map(tag => ({ value: tag, label: tag }))}
                          creatable
                          placeholder="Ex: roupa preta, estante, caneca"
                        />
                        <div className="flex gap-3">
                          <AppButton variant="primary" onClick={handleCreate} disabled={!blockName.trim()} className="flex-1">
                            Criar bloco
                          </AppButton>
                          <button
                            type="button"
                            onClick={() => {
                              setShowCreateForm(false);
                              setBlockTags([]);
                              setBlockMode('novo');
                              setTargetBlockId('');
                            }}
                            className="flex-1 rounded-[var(--radius-md)] border border-[var(--border-color)] py-3 text-xs font-semibold  text-[var(--text-secondary)]"
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-semibold text-[var(--text-tertiary)]">Escolher bloco existente</p>
                        <div className="grid max-h-48 gap-2 overflow-y-auto">
                          {recordingBlocks.map(block => (
                            <button
                              key={block.id}
                              type="button"
                              onClick={() => setTargetBlockId(block.id)}
                              className={cn(
                                'flex min-h-11 items-center justify-between rounded-[var(--radius-input)] border px-4 py-3 text-left text-sm',
                                targetBlockId === block.id
                                  ? 'border-[var(--text-primary)] bg-[var(--text-primary)]/5 font-semibold text-[var(--text-primary)]'
                                  : 'border-[var(--border-color)] text-[var(--text-primary)]'
                              )}
                            >
                              <span className="truncate">{block.name}</span>
                              <span className="ml-2 flex shrink-0 items-center gap-2 text-xs text-[var(--text-tertiary)]">
                                {block.contents.length} roteiro{block.contents.length !== 1 ? 's' : ''}
                                {targetBlockId === block.id ? <Check className="h-4 w-4 text-[var(--text-primary)]" /> : null}
                              </span>
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-3">
                          <AppButton
                            variant="primary"
                            onClick={() => void handleAddToExisting()}
                            disabled={!targetBlockId}
                            className="flex-1"
                          >
                            Adicionar ao bloco
                          </AppButton>
                          <button
                            type="button"
                            onClick={() => {
                              setShowCreateForm(false);
                              setBlockTags([]);
                              setBlockMode('novo');
                              setTargetBlockId('');
                            }}
                            className="flex-1 rounded-[var(--radius-md)] border border-[var(--border-color)] py-3 text-xs font-semibold  text-[var(--text-secondary)]"
                          >
                            Cancelar
                          </button>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <AppButton variant="primary" fullWidth onClick={() => setShowCreateForm(true)} leftIcon={<Plus className="h-4 w-4" />}>
                    {recordingBlocks.length > 0
                      ? `Criar / adicionar ao bloco (${selectedIds.size})`
                      : `Criar bloco (${selectedIds.size})`}
                  </AppButton>
                )}
              </div>
            ) : null}
          </>
        ) : (
          <>
            {blockSummaries.length === 0 ? (
              <EmptyState compact
                title={EMPTY.blocos.title}
                description={EMPTY.blocos.description}
                icon={<Layers3 className="h-8 w-8" />}
              />
            ) : (
              <div className="stack-md">
                {blockSummaries.map(({ block, total, progress, first, ready }) => (
                  <MobileListCard
                    key={block.id}
                    onClick={() => onOpenBlock(block.id)}
                    eyebrow={ready === 0 ? 'Finalizado' : 'Aguardando camera'}
                    title={block.name}
                    description={first?.title || 'Sem roteiro inicial'}
                    meta={
                      <>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-blue)]/10 px-3 py-1 text-xs font-semibold text-[var(--accent-blue)]">
                          <Clapperboard className="h-3 w-3" />
                          {total} videos
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-green)]/10 px-3 py-1 text-xs font-semibold text-[var(--accent-green)]">
                          <Layers3 className="h-3 w-3" />
                          {progress}% pronto
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-hover)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                          <Tags className="h-3 w-3" />
                          {resolveRecordingContextSummary({ block, content: first })}
                        </span>
                      </>
                    }
                    trailing={<Video className="h-4 w-4 text-[var(--text-tertiary)]" />}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <MobileFilterSheet
        open={isFilterSheetOpen}
        title="Filtrar itens"
        onClose={() => setIsFilterSheetOpen(false)}
      >
        <label className="block stack-sm">
          <span className="t-label text-[var(--text-tertiary)]">Pilar</span>
          <select value={pilarFilter} onChange={(event) => setPilarFilter(event.target.value)}>
            <option value="all">Todos</option>
            {pilares.map((pilar) => (
              <option key={pilar.id} value={pilar.id}>
                {pilar.nome}
              </option>
            ))}
          </select>
        </label>

        <label className="block stack-sm">
          <span className="t-label text-[var(--text-tertiary)]">Serie</span>
          <select value={seriesFilter} onChange={(event) => setSeriesFilter(event.target.value)}>
            <option value="all">Todas</option>
            {series.map((serie) => (
              <option key={serie.id} value={serie.id}>
                {serie.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block stack-sm">
          <span className="t-label text-[var(--text-tertiary)]">Marcador</span>
          <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
            <option value="all">Todos</option>
            {availableTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>

        <AppButton
          variant="primary"
          fullWidth
          onClick={() => {
            setPilarFilter('all');
            setSeriesFilter('all');
            setTagFilter('all');
            setIsFilterSheetOpen(false);
          }}
        >
          Limpar filtros
        </AppButton>
      </MobileFilterSheet>
    </div>
  );
}
