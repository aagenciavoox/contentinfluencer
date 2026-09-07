import { useMemo, useState } from 'react';
import { BookOpenText, Check, Clapperboard, ExternalLink, Layers3, Plus, SearchCheck, Tags, Video } from 'lucide-react';
import type { Content, Pilar, RecordingBlock, Serie } from '../../../lib/database';
import { EmptyState } from '../../../components/ui/EmptyState';
import { EMPTY } from '../../../lib/uiCopy';
import { MobileFilterSheet } from '../../components/MobileFilterSheet';
import { MobileListCard } from '../../components/MobileListCard';
import { MobileSearchBar } from '../../components/MobileSearchBar';
import { MobileSegmentTabs } from '../../components/MobileSegmentTabs';
import {getRecordingBlockProgress, normalizeRecordingTags, resolveRecordingContextSummary} from '../../../features/recording/lib/recordingWorkflow';
import { TagSelect } from '../../../components/ui/TagSelect';
import { AppButton } from '../../../components/ui/AppButton';
import { cn, getEntityTagStyle } from '../../../lib/utils';
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
          { value: 'queue', label: 'Sem bloco', count: readyContents.length },
          { value: 'blocks', label: 'Blocos', count: recordingBlocks.length },
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

                  return (
                    <MobileListCard
                      key={content.id}
                      onClick={() => toggleSelect(content.id)}
                      className={selected ? 'ring-1 ring-[var(--text-primary)]' : undefined}
                      status={
                        <span className="inline-flex rounded-md bg-[var(--bg-hover)] px-1.5 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                          {selected ? 'Selecionado' : 'Roteiro'}
                        </span>
                      }
                      title={content.title || 'Conteudo sem titulo'}
                      description={statusLabel}
                      trailing={
                        <div className="flex items-center gap-1">
                          {bodyStatus === 'error' && onRetryHydration ? (
                            <AppButton
                              variant="ghost"
                              size="xs"
                              onClick={event => {
                                event.stopPropagation();
                                onRetryHydration(content.id);
                              }}
                              className="border-[var(--border-color)]"
                            >
                              Tentar
                            </AppButton>
                          ) : null}
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
                              className="rounded-md border px-1.5 py-0.5 text-xs font-semibold"
                              style={getEntityTagStyle(pilar?.cor)}
                            >
                              {pilarName}
                            </span>
                          ) : null}
                          {seriesName ? (
                            <span
                              className="rounded-md border px-1.5 py-0.5 text-xs font-semibold"
                              style={getEntityTagStyle(serie?.cor)}
                            >
                              {seriesName}
                            </span>
                          ) : null}
                          {recordingTags.slice(0, 2).map((tag) => (
                            <span
                              key={`${content.id}-${tag}`}
                              className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-orange)]/10 px-1.5 py-0.5 text-xs font-semibold text-[var(--accent-orange)]"
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
              <div className="stack-md rounded-[var(--radius-card-mobile)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
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
              <div className="stack-sm">
                {blockSummaries.map(({ block, total, progress, first, ready }) => (
                  <MobileListCard
                    key={block.id}
                    onClick={() => onOpenBlock(block.id)}
                    status={
                      <span className="inline-flex rounded-md bg-[var(--bg-hover)] px-1.5 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
                        {ready === 0 ? 'Finalizado' : 'Bloco'}
                      </span>
                    }
                    title={block.name}
                    description={first?.title || 'Sem roteiro inicial'}
                    meta={
                      <>
                        <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-blue)]/10 px-1.5 py-0.5 text-xs font-semibold text-[var(--accent-blue)]">
                          <Clapperboard className="h-3 w-3" />
                          {total} videos
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-green)]/10 px-1.5 py-0.5 text-xs font-semibold text-[var(--accent-green)]">
                          <Layers3 className="h-3 w-3" />
                          {progress}%
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-[var(--bg-hover)] px-1.5 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
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

        <label className="block stack-sm">
          <span className="t-label text-[var(--text-tertiary)]">Energia</span>
          <select value={energiaFilter} onChange={(event) => setEnergiaFilter(event.target.value)}>
            <option value="all">Todas</option>
            <option value="baixa">Baixa</option>
            <option value="média">Média</option>
            <option value="alta">Alta</option>
          </select>
        </label>

        <label className="block stack-sm">
          <span className="t-label text-[var(--text-tertiary)]">Ordenacao</span>
          <select value={sortValue} onChange={(event) => setSortValue(event.target.value)}>
            <option value="recentes">Mais recentes</option>
            <option value="titulo:asc">Título A-Z</option>
            <option value="pilar:asc">Pilar A-Z</option>
            <option value="energia:desc">Energia alta</option>
          </select>
        </label>

        <AppButton
          variant="primary"
          fullWidth
          onClick={() => {
            setPilarFilter('all');
            setSeriesFilter('all');
            setTagFilter('all');
            setEnergiaFilter('all');
            setSortValue('recentes');
            setIsFilterSheetOpen(false);
          }}
        >
          Limpar filtros
        </AppButton>
      </MobileFilterSheet>
    </div>
  );
}
