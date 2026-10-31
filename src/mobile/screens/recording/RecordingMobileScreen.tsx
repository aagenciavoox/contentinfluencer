import { useMemo, useState } from 'react';
import { BookOpenText, Check, Clapperboard, ExternalLink, Layers3, Plus, SearchCheck, Tags, Video } from 'lucide-react';
import type { Content, Pilar, RecordingBlock, Serie } from '../../../lib/database';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SkeletonList } from '../../../components/ui/Skeleton';
import { EMPTY } from '../../../lib/uiCopy';
import { MobileFilterSelect, MobileFilterSheet } from '../../components/MobileFilterSheet';
import { Badge } from '../../../components/ui/Badge';
import { SegmentTabs } from '../../../components/ui/SegmentTabs';
import { MobileListCard } from '../../components/MobileListCard';
import { MobileSearchBar } from '../../components/MobileSearchBar';
import { MobileSegmentTabs } from '../../components/MobileSegmentTabs';
import {getRecordingBlockProgress, normalizeRecordingTags, recordingTagChipStyle, resolveRecordingContextSummary} from '../../../features/recording/lib/recordingWorkflow';
import { TagSelect } from '../../../components/ui/TagSelect';
import { AppButton } from '../../../components/ui/AppButton';
import { Text } from '../../../components/ui/Text';
import { TextCount } from '../../../components/ui/TextCount';
import { cn, getEntityTagStyle, htmlToReadableText } from '../../../lib/utils';
import { contentReadableBody } from '../../../features/contents/lib/carouselSlides';
import { getScriptWordCount } from '../../../features/contents/lib/contentCardMeta';
import {
  resolveScriptBodyStatus,
  scriptBodyStatusLabel,
} from '../../../features/contents/lib/contentBody';

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
  isHydrating?: (id: string) => boolean;
  hasHydrationError?: (id: string) => boolean;
  onRetryHydration?: (id: string) => void;
  /** Sem isto as abas mostram 0 enquanto o domínio ainda carrega. */
  countsReady?: boolean;
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
  isHydrating = () => false,
  hasHydrationError = () => false,
  onRetryHydration,
  countsReady = true,
}: RecordingMobileScreenProps) {
  const [search, setSearch] = useState('');
  const [pilarFilter, setPilarFilter] = useState('all');
  const [seriesFilter, setSeriesFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [energiaFilter, setEnergiaFilter] = useState('all');
  const [sortValue, setSortValue] = useState('recentes');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [blockName, setBlockName] = useState('');
  const [blockTags, setBlockTags] = useState<string[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [blockMode, setBlockMode] = useState<'novo' | 'existente'>('novo');
  const [targetBlockId, setTargetBlockId] = useState('');
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const orderedQueueContents = useMemo(() => {
    const energyRank: Record<string, number> = { alta: 3, média: 2, baixa: 1 };

    return [...readyContents].sort((left, right) => {
      switch (sortValue) {
        case 'titulo:asc':
          return (left.title || '').localeCompare(right.title || '', 'pt-BR');
        case 'pilar:asc': {
          const leftPilar = pilares.find((item) => item.id === left.pilarId)?.nome || '';
          const rightPilar = pilares.find((item) => item.id === right.pilarId)?.nome || '';
          return leftPilar.localeCompare(rightPilar, 'pt-BR');
        }
        case 'energia:desc':
          return (energyRank[right.energiaNecessaria ?? ''] ?? 0) - (energyRank[left.energiaNecessaria ?? ''] ?? 0);
        case 'recentes':
        default:
          return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      }
    });
  }, [pilares, readyContents, sortValue]);

  const filteredQueue = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orderedQueueContents
      .filter((content) => (pilarFilter === 'all' ? true : content.pilarId === pilarFilter))
      .filter((content) => (seriesFilter === 'all' ? true : content.seriesId === seriesFilter))
      .filter((content) =>
        tagFilter === 'all' ? true : normalizeRecordingTags(content.tags || []).includes(tagFilter)
      )
      .filter((content) =>
        energiaFilter === 'all' ? true : content.energiaNecessaria === energiaFilter
      )
      .filter((content) => {
        if (!normalizedSearch) return true;
        const pilarName = pilares.find((item) => item.id === content.pilarId)?.nome || '';
        const seriesName = series.find((item) => item.id === content.seriesId)?.name || '';
        const recordingTags = normalizeRecordingTags(content.tags || []).join(' ');
        return [content.title, pilarName, seriesName, recordingTags].join(' ').toLowerCase().includes(normalizedSearch);
      });
  }, [energiaFilter, orderedQueueContents, pilares, pilarFilter, search, series, seriesFilter, tagFilter]);

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

  const hasActiveFilters =
    Boolean(search.trim())
    || pilarFilter !== 'all'
    || seriesFilter !== 'all'
    || tagFilter !== 'all'
    || energiaFilter !== 'all';
  const clearFilters = () => {
    setPilarFilter('all');
    setSeriesFilter('all');
    setTagFilter('all');
    setEnergiaFilter('all');
  };
  const cancelBlockForm = () => {
    setShowCreateForm(false);
    setBlockTags([]);
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
    <div className="stack-md">
      <MobileSegmentTabs
        rounded="tight"
        tabs={[
          { value: 'queue', label: 'Sem bloco', count: countsReady ? readyContents.length : undefined },
          { value: 'blocks', label: 'Blocos', count: countsReady ? recordingBlocks.length : undefined },
        ]}
        value={activeTab}
        onChange={(value) => onTabChange(value)}
      />

      <section className="stack-md">
        {activeTab === 'queue' ? (
          <>
            <MobileSearchBar
              value={search}
              onChange={setSearch}
              placeholder="Buscar roteiro, pilar ou série"
              onFilterClick={() => setIsFilterSheetOpen(true)}
              filterLabel="Abrir filtros da gravação"
            />

            {!countsReady ? (
              // Sem os blocos, roteiros que já estão num bloco apareceriam aqui como "sem bloco".
              <SkeletonList count={3} />
            ) : filteredQueue.length === 0 ? (
              hasActiveFilters ? (
                <EmptyState compact
                  title="Nenhum roteiro com esse filtro"
                  description="Nada com essa busca ou filtro."
                  action={
                    <AppButton
                      variant="secondary"
                      onClick={() => {
                        setSearch('');
                        clearFilters();
                      }}
                    >
                      Limpar busca e filtros
                    </AppButton>
                  }
                  icon={<SearchCheck className="h-8 w-8" />}
                />
              ) : (
                <EmptyState compact
                  title={EMPTY.roteirosSemBloco.title}
                  description={EMPTY.roteirosSemBloco.description}
                  icon={<SearchCheck className="h-8 w-8" />}
                />
              )
            ) : (
              <div className="stack-sm">
                {filteredQueue.map((content) => {
                  const pilar = pilares.find((item) => item.id === content.pilarId) || null;
                  const serie = series.find((item) => item.id === content.seriesId) || null;
                  const pilarName = pilar?.nome;
                  const seriesName = serie?.name;
                  const selected = selectedIds.has(content.id);
                  const recordingTags = normalizeRecordingTags(content.tags || []);
                  const scriptWordCount = getScriptWordCount(content);
                  const bodyStatus = resolveScriptBodyStatus(content, {
                    hydrating: isHydrating(content.id),
                    error: hasHydrationError(content.id),
                  });
                  const statusLabel = scriptBodyStatusLabel(bodyStatus, scriptWordCount);
                  const showWordCount = bodyStatus === 'ready' && scriptWordCount > 0;

                  return (
                    <div key={content.id} className="stack-sm">
                    <MobileListCard
                      onClick={() => toggleSelect(content.id)}
                      selected={selected}
                      actionLabel={`Selecionar ${content.title || 'roteiro sem título'}`}
                      className={selected ? 'ring-1 ring-[var(--text-primary)]' : undefined}
                      status={<Badge variant="neutral">{selected ? 'Selecionado' : 'Roteiro'}</Badge>}
                      title={content.title || 'Roteiro sem título'}
                      description={showWordCount ? undefined : statusLabel}
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
                            className="h-11 w-11 border-[var(--border-color)]"
                            aria-label="Abrir modo leitura"
                          />
                          <AppButton
                            variant="ghost"
                            size="xs"
                            iconOnly
                            leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
                            onClick={event => {
                              event.stopPropagation();
                              onOpenContent(content.id);
                            }}
                            className="h-11 w-11 border-[var(--border-color)]"
                            aria-label="Abrir detalhes do roteiro"
                          />
                        </div>
                      }
                      meta={
                        <>
                          {showWordCount ? (
                            <div className="basis-full">
                              <TextCount
                                value={contentReadableBody(content) || htmlToReadableText(content.notes || '')}
                                mode="words"
                              />
                            </div>
                          ) : null}
                          {pilarName ? (
                            <Text variant="label" as="span"
                              className="rounded-[var(--radius-sm)] border px-1.5 py-0.5 text-inherit"
                              style={getEntityTagStyle(pilar?.cor)}
                            >
                              {pilarName}
                            </Text>
                          ) : null}
                          {seriesName ? (
                            <Text variant="label" as="span"
                              className="rounded-[var(--radius-sm)] border px-1.5 py-0.5 text-inherit"
                              style={getEntityTagStyle(serie?.cor)}
                            >
                              {seriesName}
                            </Text>
                          ) : null}
                          {recordingTags.slice(0, 2).map((tag) => (
                            <Text variant="label" as="span"
                              key={`${content.id}-${tag}`}
                              className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-inherit"
                              style={recordingTagChipStyle}
                            >
                              <Tags className="h-3 w-3" />
                              {tag}
                            </Text>
                          ))}
                        </>
                      }
                    />
                    {bodyStatus === 'error' && onRetryHydration ? (
                      <AppButton
                        variant="ghost"
                        size="xs"
                        onClick={() => onRetryHydration(content.id)}
                        className="self-start border-[var(--border-color)]"
                      >
                        Tentar novamente
                      </AppButton>
                    ) : null}
                    </div>
                  );
                })}
              </div>
            )}

            {selectedIds.size > 0 ? (
              <div className="stack-md rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                {showCreateForm ? (
                  <>
                    {recordingBlocks.length > 0 ? (
                      <SegmentTabs<'novo' | 'existente'>
                        ariaLabel="Onde guardar os roteiros"
                        options={[
                          { id: 'novo', label: 'Novo bloco' },
                          { id: 'existente', label: 'Bloco existente' },
                        ]}
                        value={blockMode}
                        onChange={setBlockMode}
                      />
                    ) : null}

                    {blockMode === 'novo' ? (
                      <>
                        <input
                          autoFocus
                          aria-label="Nome do bloco"
                          value={blockName}
                          onChange={(event) => setBlockName(event.target.value)}
                          placeholder={`Nome do bloco (${selectedIds.size} ${selectedIds.size === 1 ? 'selecionado' : 'selecionados'})`}
                          className="w-full"
                        />
                        <TagSelect
                          label="Marcadores de gravação"
                          hint="Selecione ou crie marcadores para organizar o bloco."
                          values={blockTags}
                          onChange={setBlockTags}
                          options={availableTags.map(tag => ({ value: tag, label: tag }))}
                          creatable
                          placeholder="Ex.: roupa preta, estante, caneca"
                        />
                        <div className="flex gap-3">
                          <AppButton variant="primary" onClick={handleCreate} disabled={!blockName.trim()} className="flex-1">
                            Criar bloco
                          </AppButton>
                          <AppButton variant="secondary" onClick={cancelBlockForm} className="flex-1">
                            Cancelar
                          </AppButton>
                        </div>
                      </>
                    ) : (
                      <>
                        <Text variant="label" as="p" id="recording-existing-block-label" className="text-[var(--text-tertiary)]">Escolher bloco existente</Text>
                        <div className="grid max-h-48 gap-2 overflow-y-auto" role="group" aria-labelledby="recording-existing-block-label">
                          {recordingBlocks.map(block => (
                            <button
                              key={block.id}
                              type="button"
                              onClick={() => setTargetBlockId(block.id)}
                              aria-pressed={targetBlockId === block.id}
                              className={cn(
                                'flex min-h-11 items-center justify-between rounded-[var(--radius-input)] border px-4 py-3 text-left t-body focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
                                targetBlockId === block.id
                                  ? 'border-[var(--text-primary)] bg-[var(--text-primary)]/5 text-[var(--text-primary)]'
                                  : 'border-[var(--border-color)] text-[var(--text-primary)]'
                              )}
                            >
                              <span className="truncate">{block.name}</span>
                              <Text variant="meta" as="span" className="ml-2 flex shrink-0 items-center gap-2 text-[var(--text-tertiary)]">
                                {block.contents.length} {block.contents.length === 1 ? 'roteiro' : 'roteiros'}
                                {targetBlockId === block.id ? <Check className="h-4 w-4 text-[var(--text-primary)]" /> : null}
                              </Text>
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
                          <AppButton variant="secondary" onClick={cancelBlockForm} className="flex-1">
                            Cancelar
                          </AppButton>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <AppButton variant="primary" fullWidth onClick={() => setShowCreateForm(true)} leftIcon={<Plus className="h-4 w-4" />}>
                    {recordingBlocks.length > 0
                      ? `Criar ou adicionar ao bloco (${selectedIds.size})`
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
              <div className="stack-sm">
                {blockSummaries.map(({ block, total, progress, first, ready }) => (
                  <MobileListCard
                    key={block.id}
                    onClick={() => onOpenBlock(block.id)}
                    status={
                      <Badge variant="neutral">{total === 0 ? 'Vazio' : ready === 0 ? 'Gravado' : 'Bloco'}</Badge>
                    }
                    title={block.name}
                    description={first?.title || 'Sem roteiro inicial'}
                    meta={
                      <>
                        <Badge variant="neutral">
                          <Clapperboard className="mr-1 h-3 w-3" aria-hidden />
                          {total} {total === 1 ? 'roteiro' : 'roteiros'}
                        </Badge>
                        <Badge variant="neutral">
                          <Layers3 className="mr-1 h-3 w-3" aria-hidden />
                          {progress}% gravado
                        </Badge>
                        <Badge variant="neutral">
                          <Tags className="mr-1 h-3 w-3" aria-hidden />
                          {resolveRecordingContextSummary({ block, content: first })}
                        </Badge>
                      </>
                    }
                    trailing={<Video className="h-4 w-4 text-[var(--text-tertiary)]" aria-hidden />}
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
        onClear={() => {
          clearFilters();
          setSortValue('recentes');
          setIsFilterSheetOpen(false);
        }}
      >
        <MobileFilterSelect
          label="Pilar"
          value={pilarFilter}
          onChange={setPilarFilter}
          options={[{ value: 'all', label: 'Todos' }, ...pilares.map(pilar => ({ value: pilar.id, label: pilar.nome }))]}
        />
        <MobileFilterSelect
          label="Série"
          value={seriesFilter}
          onChange={setSeriesFilter}
          options={[{ value: 'all', label: 'Todas' }, ...series.map(serie => ({ value: serie.id, label: serie.name }))]}
        />
        <MobileFilterSelect
          label="Marcador"
          value={tagFilter}
          onChange={setTagFilter}
          options={[{ value: 'all', label: 'Todos' }, ...availableTags.map(tag => ({ value: tag, label: tag }))]}
        />
        <MobileFilterSelect
          label="Energia"
          value={energiaFilter}
          onChange={setEnergiaFilter}
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'baixa', label: 'Baixa' },
            { value: 'média', label: 'Média' },
            { value: 'alta', label: 'Alta' },
          ]}
        />
        <MobileFilterSelect
          label="Ordenação"
          value={sortValue}
          onChange={setSortValue}
          options={[
            { value: 'recentes', label: 'Mais recentes' },
            { value: 'titulo:asc', label: 'Título A–Z' },
            { value: 'pilar:asc', label: 'Pilar A–Z' },
            { value: 'energia:desc', label: 'Energia alta' },
          ]}
        />
      </MobileFilterSheet>
    </div>
  );
}
