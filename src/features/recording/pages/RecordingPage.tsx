import {useEffect, useRef, useState, type ReactNode} from 'react';
import {useLocation, useNavigate, useSearchParams} from 'react-router-dom';
import {Layers3, Video} from 'lucide-react';
import {useAppContext} from '../../../context/AppContext';
import {useAuth} from '../../../context/AuthContext';
import {useIsMobile} from '../../../hooks/useIsMobile';
import type {RecordingBlock, RecordingBlockContent} from '../../../lib/database';
import {fetchContentsByIds} from '../../../lib/database';
import {buildContentDetailRoute} from '../../contents/lib/contentDetailRoute';
import {buildDetailBackState} from '../../../lib/navigation/detailBack';
import {isContentBodyLoaded, upsertContent} from '../../contents/lib/contentBody';
import {getRecordingQueueContents} from '../../contents/lib/contentWorkflow';
import {cn} from '../../../lib/utils';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {PageLayout} from '../../../layouts/page/PageLayout';
import {RecordingMobileScreen} from '../../../mobile/screens/recording/RecordingMobileScreen';
import {RecordingQueueGrid} from '../components/desktop/RecordingQueueGrid';
import {RecordingQueueTab} from '../components/desktop/RecordingQueueTab';
import {RecordingSelectionBar} from '../components/desktop/RecordingSelectionBar';
import {RecordingScriptReader} from '../components/RecordingScriptReader';
import {FilterBar} from '../../../components/ui/FilterBar';
import {Text} from '../../../components/ui/Text';
import {
  buildMarkStandaloneContentRecordedTransition,
  normalizeRecordingTags,
} from '../lib/recordingWorkflow';
import {generateUUID} from '../../../utils/uuid';

type RecordingPageTab = 'queue' | 'blocks';

function resolveRecordingTab(tab: string | null): RecordingPageTab {
  return tab === 'blocks' ? 'blocks' : 'queue';
}

export function RecordingPage() {
  const {state, dispatch} = useAppContext();
  const {user} = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();

  const [activeTab, setActiveTab] = useState<RecordingPageTab>(() => resolveRecordingTab(searchParams.get('tab')));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [blockName, setBlockName] = useState('');
  const [showBlockForm, setShowBlockForm] = useState(false);

  const [filterPilar, setFilterPilar] = useState('');
  const [filterSerie, setFilterSerie] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterEnergia, setFilterEnergia] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortValue, setSortValue] = useState('recentes');
  const [blockTags, setBlockTags] = useState<string[]>([]);
  const [readerContentId, setReaderContentId] = useState<string | null>(null);
  const [readerLoading, setReaderLoading] = useState(false);
  const [readerLoadError, setReaderLoadError] = useState<string | null>(null);
  const contentsRef = useRef(state.contents);
  contentsRef.current = state.contents;

  const openContentDetail = (contentId: string) =>
    navigate(
      buildContentDetailRoute(contentId, 'gravacao'),
      buildDetailBackState(`${location.pathname}${location.search}`),
    );
  const readerContent = state.contents.find(content => content.id === readerContentId) ?? null;

  const openScriptReader = (contentId: string) => {
    const content = state.contents.find(candidate => candidate.id === contentId);
    setReaderLoadError(null);
    setReaderLoading(Boolean(content && !isContentBodyLoaded(content)));
    setReaderContentId(contentId);
  };

  const closeScriptReader = () => {
    setReaderContentId(null);
    setReaderLoading(false);
    setReaderLoadError(null);
  };

  useEffect(() => {
    if (!readerContentId || !readerContent) return;

    if (isContentBodyLoaded(readerContent)) {
      setReaderLoading(false);
      setReaderLoadError(null);
      return;
    }

    if (!user) {
      setReaderLoading(false);
      setReaderLoadError('Entre novamente para buscar o texto salvo.');
      return;
    }

    let cancelled = false;
    setReaderLoading(true);
    setReaderLoadError(null);

    void fetchContentsByIds(user.id, [readerContentId])
      .then(async fetched => {
        if (cancelled) return;
        const item = fetched[0];
        if (!item) {
          setReaderLoadError('O roteiro não foi encontrado no banco de dados.');
          return;
        }
        await dispatch({
          type: 'SET_DATA',
          payload: {contents: upsertContent(contentsRef.current, item)},
        });
      })
      .catch(() => {
        if (!cancelled) {
          setReaderLoadError('Verifique sua conexão e tente abrir o roteiro novamente.');
        }
      })
      .finally(() => {
        if (!cancelled) setReaderLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, readerContent, readerContentId, user]);

  const handleMarkStandaloneRecorded = async (contentId: string) => {
    const content = state.contents.find(candidate => candidate.id === contentId);
    if (!content) return;
    await dispatch({
      type: 'UPDATE_CONTENT',
      payload: buildMarkStandaloneContentRecordedTransition(content),
    });
    closeScriptReader();
  };

  useEffect(() => {
    const nextTab = resolveRecordingTab(searchParams.get('tab'));
    setActiveTab(previous => (previous === nextTab ? previous : nextTab));
  }, [searchParams]);

  useEffect(() => {
    const seriesId = searchParams.get('seriesId');
    if (seriesId) setFilterSerie(seriesId);
  }, [searchParams]);

  const handleTabChange = (tab: RecordingPageTab) => {
    setActiveTab(tab);
    setSearchParams(previous => {
      const next = new URLSearchParams(previous);
      if (tab === 'blocks') next.set('tab', 'blocks');
      else next.delete('tab');
      return next;
    }, {replace: true});
  };

  const queueContents = getRecordingQueueContents(state.contents, state.recordingBlocks);

  const availableRecordingTags = Array.from(
    new Set(
      queueContents.flatMap(content => normalizeRecordingTags(content.tags || []))
    )
  ).sort((left, right) => left.localeCompare(right, 'pt-BR'));

  const prontos = [...queueContents]
    .filter(content => {
      if (filterPilar && content.pilarId !== filterPilar) return false;
      if (filterSerie && content.seriesId !== filterSerie) return false;
      if (filterTag && !normalizeRecordingTags(content.tags || []).includes(filterTag)) return false;
      if (filterEnergia && content.energiaNecessaria !== filterEnergia) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const haystacks = [
          content.title,
          state.pilares.find(pilar => pilar.id === content.pilarId)?.nome ?? '',
          state.series.find(serie => serie.id === content.seriesId)?.name ?? '',
          ...(content.tags || []),
        ];
        if (!haystacks.some(value => value.toLowerCase().includes(term))) return false;
      }
      return true;
    })
    .sort((left, right) => {
      switch (sortValue) {
        case 'titulo:asc':
          return (left.title || '').localeCompare(right.title || '', 'pt-BR');
        case 'pilar:asc': {
          const leftPilar = state.pilares.find(pilar => pilar.id === left.pilarId)?.nome ?? '';
          const rightPilar = state.pilares.find(pilar => pilar.id === right.pilarId)?.nome ?? '';
          return leftPilar.localeCompare(rightPilar, 'pt-BR');
        }
        case 'energia:desc': {
          const energyRank: Record<string, number> = {alta: 3, média: 2, baixa: 1};
          return (energyRank[right.energiaNecessaria ?? ''] ?? 0) - (energyRank[left.energiaNecessaria ?? ''] ?? 0);
        }
        case 'recentes':
        default:
          return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
      }
    });

  const toggleSelect = (id: string) => {
    setSelectedIds(previous => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const allSelected = prontos.length > 0 && prontos.every(content => selectedIds.has(content.id));
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(prontos.map(content => content.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setBlockName('');
    setBlockTags([]);
    setShowBlockForm(false);
  };

  const addContentsToExistingBlock = async (blockId: string, contentIds: string[]) => {
    if (!blockId || contentIds.length === 0) return;

    const existingBlock = state.recordingBlocks.find(b => b.id === blockId);
    if (!existingBlock) return;

    const existingContentIds = new Set(existingBlock.contents.map(c => c.contentId));
    const newContentIds = contentIds.filter(id => !existingContentIds.has(id));
    if (newContentIds.length === 0) return;

    const merged = [
      ...existingBlock.contents,
      ...newContentIds.map((contentId, i) => {
        const content = state.contents.find(item => item.id === contentId);
        return {
          blockId,
          contentId,
          ordem: existingBlock.contents.length + i,
          gravado: Boolean(content?.recordedAt),
        };
      }),
    ];

    await dispatch({type: 'UPDATE_BLOCK_CONTENTS', payload: {blockId, contents: merged}});
  };

  const handleAddToExistingBlock = async (blockId: string) => {
    if (!blockId || selectedIds.size === 0) return;

    const orderedIds = prontos.filter(content => selectedIds.has(content.id)).map(content => content.id);
    await addContentsToExistingBlock(blockId, orderedIds);

    handleClearSelection();
    navigate(`/gravacao/${blockId}?tab=blocks`);
  };

  const handleCriarBloco = async () => {
    if (!blockName.trim() || selectedIds.size === 0) return;

    const orderedSelectedContents = prontos.filter(content => selectedIds.has(content.id));
    const manualTags = blockTags.map(tag => tag.trim()).filter(Boolean);
    const recordingTags = normalizeRecordingTags(
      manualTags.length > 0 ? manualTags : orderedSelectedContents.flatMap(content => content.tags || [])
    );

    const block: RecordingBlock = {
      id: generateUUID(),
      userId: user?.id || '',
      name: blockName.trim(),
      lookLabel: null,
      cenarioLabel: null,
      metadata: {
        recordingTags,
        sourceContentIds: orderedSelectedContents.map(content => content.id),
      },
      createdAt: new Date().toISOString(),
      contents: [],
    };

    const blockContents: RecordingBlockContent[] = orderedSelectedContents.map((content, index) => ({
      blockId: block.id,
      contentId: content.id,
      ordem: index,
      gravado: false,
    }));

    await dispatch({type: 'ADD_RECORDING_BLOCK', payload: block});
    await dispatch({type: 'UPDATE_BLOCK_CONTENTS', payload: {blockId: block.id, contents: blockContents}});

    handleClearSelection();
    handleTabChange('blocks');
  };

  const handleCreateBlockFromMobile = async ({
    name,
    contentIds,
    tagsText,
  }: {
    name: string;
    contentIds: string[];
    tagsText: string;
  }) => {
    if (!name.trim() || contentIds.length === 0) return;

    const orderedSelectedContents = contentIds
      .map(contentId => state.contents.find(content => content.id === contentId) || null)
      .filter((content): content is (typeof state.contents)[number] => content !== null);
    const manualTags = tagsText.split(/[,\n]/).map(tag => tag.trim()).filter(Boolean);
    const recordingTags = normalizeRecordingTags(
      manualTags.length > 0 ? manualTags : orderedSelectedContents.flatMap(content => content.tags || [])
    );

    const block: RecordingBlock = {
      id: generateUUID(),
      userId: user?.id || '',
      name: name.trim(),
      lookLabel: null,
      cenarioLabel: null,
      metadata: {
        recordingTags,
        sourceContentIds: contentIds,
      },
      createdAt: new Date().toISOString(),
      contents: [],
    };

    const blockContents: RecordingBlockContent[] = contentIds.map((contentId, index) => ({
      blockId: block.id,
      contentId,
      ordem: index,
      gravado: false,
    }));

    await dispatch({type: 'ADD_RECORDING_BLOCK', payload: block});
    await dispatch({type: 'UPDATE_BLOCK_CONTENTS', payload: {blockId: block.id, contents: blockContents}});
  };

  if (isMobile) {
    return (
      <>
        <div className="min-h-full bg-[var(--bg-primary)]">
          <RecordingMobileScreen
          readyContents={queueContents}
          recordingBlocks={state.recordingBlocks}
          allContents={state.contents}
          pilares={state.pilares}
          series={state.series}
          availableTags={availableRecordingTags}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onCreateBlock={handleCreateBlockFromMobile}
          onAddToExistingBlock={async ({blockId, contentIds}) => {
            await addContentsToExistingBlock(blockId, contentIds);
          }}
          onOpenBlock={(blockId) => navigate(`/gravacao/${blockId}?tab=blocks`)}
          onOpenContent={(contentId) => openContentDetail(contentId)}
          onReadContent={openScriptReader}
          />
        </div>
        {readerContent ? (
          <RecordingScriptReader
            content={readerContent}
            loading={readerLoading}
            loadError={readerLoadError}
            onClose={closeScriptReader}
            onMarkRecorded={handleMarkStandaloneRecorded}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <PageLayout
      header={
        <DesktopPageHeader
          section="Produção"
          title="Gravação"
          icon={Video}
          className="mb-0"
        />
      }
    >
        <div
          role="tablist"
          aria-label="Areas de gravacao"
          className="grid grid-cols-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] p-0.5 md:max-w-md"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'queue'}
            onClick={() => handleTabChange('queue')}
            className={cn(
              't-label rounded-lg px-3 py-2 text-center transition-all md:px-6 md:py-2.5',
              activeTab === 'queue'
                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] italic'
            )}
          >
            Sem bloco
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'blocks'}
            onClick={() => handleTabChange('blocks')}
            className={cn(
              't-label rounded-lg px-3 py-2 text-center transition-all md:px-6 md:py-2.5',
              activeTab === 'blocks'
                ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] italic'
            )}
          >
            Blocos
          </button>
        </div>

        {activeTab === 'queue' ? (
          <section className={cn('stack-xl', selectedIds.size > 0 && 'pb-28')}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:max-w-2xl">
              <StatCard label="Sem bloco" value={String(prontos.length)} />
              <StatCard label="Selecionados" value={String(selectedIds.size)} />
              <StatCard label="Blocos montados" value={String(state.recordingBlocks.length)} className="col-span-2 md:col-span-1" />
            </div>

            <FilterBar
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Buscar por roteiro, pilar, serie ou marcador"
              filters={[
                {
                  id: 'pilar',
                  label: 'Pilar',
                  value: filterPilar,
                  onChange: setFilterPilar,
                  options: [
                    {label: 'Pilar', value: ''},
                    ...state.pilares.map(pilar => ({label: pilar.nome, value: pilar.id})),
                  ],
                },
                {
                  id: 'serie',
                  label: 'Série',
                  value: filterSerie,
                  onChange: setFilterSerie,
                  options: [
                    {label: 'Série', value: ''},
                    ...state.series.map(serie => ({label: serie.name, value: serie.id})),
                  ],
                },
                {
                  id: 'tag',
                  label: 'Marcador',
                  value: filterTag,
                  onChange: setFilterTag,
                  options: [
                    {label: 'Marcador', value: ''},
                    ...availableRecordingTags.map(tag => ({label: tag, value: tag})),
                  ],
                },
                {
                  id: 'energia',
                  label: 'Energia',
                  value: filterEnergia,
                  onChange: setFilterEnergia,
                  options: [
                    {label: 'Energia', value: ''},
                    {label: 'Baixa', value: 'baixa'},
                    {label: 'Média', value: 'média'},
                    {label: 'Alta', value: 'alta'},
                  ],
                },
              ]}
              sortValue={sortValue}
              onSortChange={setSortValue}
              sortOptions={[
                {label: 'Recentes', value: 'recentes'},
                {label: 'Título A-Z', value: 'titulo:asc'},
                {label: 'Pilar A-Z', value: 'pilar:asc'},
                {label: 'Energia alta', value: 'energia:desc'},
              ]}
            />

            <div className="space-y-1">
              <Text variant="sectionTitle">Grade de roteiros prontos</Text>
              <p className="text-sm text-[var(--text-secondary)]">
                Clique no card para selecionar. Use o icone de link para abrir o detalhe sem sair da selecao.
              </p>
            </div>

            <RecordingQueueGrid
              contents={prontos}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onSelectAll={handleSelectAll}
              onClearSelection={handleClearSelection}
              onOpen={openContentDetail}
              onRead={openScriptReader}
            />

            <RecordingSelectionBar
              selectedCount={selectedIds.size}
              blockName={blockName}
              blockTags={blockTags}
              availableTags={availableRecordingTags}
              existingBlocks={state.recordingBlocks}
              showBlockForm={showBlockForm}
              canCreate={Boolean(blockName.trim())}
              onBlockNameChange={setBlockName}
              onBlockTagsChange={setBlockTags}
              onShowForm={() => setShowBlockForm(true)}
              onHideForm={() => {
                setShowBlockForm(false);
                setBlockTags([]);
              }}
              onCreate={handleCriarBloco}
              onAddToBlock={handleAddToExistingBlock}
              onClearSelection={handleClearSelection}
            />
          </section>
        ) : (
          <section className="stack-xl">
            <div className="grid grid-cols-2 gap-3 md:max-w-md">
              <StatCard label="Blocos" value={String(state.recordingBlocks.length)} icon={<Layers3 className="h-4 w-4" />} />
              <StatCard
                label="Roteiros sem bloco"
                value={String(queueContents.length)}
                icon={<Video className="h-4 w-4" />}
              />
            </div>

            <div className="space-y-1">
              <Text variant="sectionTitle">Blocos de gravação</Text>
              <p className="text-sm text-[var(--text-secondary)]">
                Gerencie os blocos montados e acompanhe o progresso de gravação.
              </p>
            </div>

            <RecordingQueueTab />
          </section>
        )}
      </PageLayout>
      {readerContent ? (
        <RecordingScriptReader
          content={readerContent}
          loading={readerLoading}
          loadError={readerLoadError}
          onClose={closeScriptReader}
          onMarkRecorded={handleMarkStandaloneRecorded}
        />
      ) : null}
    </>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  className?: string;
}

function StatCard({label, value, icon, className}: StatCardProps) {
  return (
    <div className={cn('rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4', className)}>
      <div className="flex items-center gap-2">
        {icon ? <span className="text-[var(--text-secondary)]">{icon}</span> : null}
        <p className="text-xs font-medium text-[var(--text-secondary)]">{label}</p>
      </div>
      <p className="mt-1 text-2xl font-bold tabular-nums text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
