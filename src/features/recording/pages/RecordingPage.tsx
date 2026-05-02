import {useEffect, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {Eye, Plus, Video} from 'lucide-react';
import {useAppContext} from '../../../context/AppContext';
import {useAuth} from '../../../context/AuthContext';
import {useIsMobile} from '../../../hooks/useIsMobile';
import type {RecordingBlock, RecordingBlockContent} from '../../../lib/database';
import {getRecordingQueueContents} from '../../contents/lib/contentWorkflow';
import {cn, getEntityTagStyle} from '../../../lib/utils';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {RecordingMobileScreen} from '../../../mobile/screens/recording/RecordingMobileScreen';
import {RecordingQueueTab} from '../components/desktop/RecordingQueueTab';
import {FilterBar} from '../../../components/ui/FilterBar';
import {normalizeRecordingTags} from '../lib/recordingWorkflow';
import {ScriptPreviewModal} from '../../contents/components/modals/ScriptPreviewModal';
import type {Content} from '../../../lib/database';

type RecordingPageTab = 'queue' | 'blocks';

function resolveRecordingTab(tab: string | null): RecordingPageTab {
  return tab === 'blocks' ? 'blocks' : 'queue';
}

export function RecordingPage() {
  const {state, dispatch} = useAppContext();
  const {user} = useAuth();
  const navigate = useNavigate();
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
  const [blockTagsInput, setBlockTagsInput] = useState('');
  const [previewContent, setPreviewContent] = useState<Content | null>(null);

  useEffect(() => {
    const nextTab = resolveRecordingTab(searchParams.get('tab'));
    setActiveTab(previous => (previous === nextTab ? previous : nextTab));
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

  const availableRecordingTags = Array.from(
    new Set(
      getRecordingQueueContents(state.contents).flatMap(content => normalizeRecordingTags(content.tags || []))
    )
  ).sort((left, right) => left.localeCompare(right, 'pt-BR'));

  const prontos = [...getRecordingQueueContents(state.contents)]
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

  const handleCriarBloco = () => {
    if (!blockName.trim() || selectedIds.size === 0) return;

    const orderedSelectedContents = prontos.filter(content => selectedIds.has(content.id));
    const manualTags = blockTagsInput.split(/[,\n]/).map(tag => tag.trim()).filter(Boolean);
    const recordingTags = normalizeRecordingTags(
      manualTags.length > 0 ? manualTags : orderedSelectedContents.flatMap(content => content.tags || [])
    );

    const block: RecordingBlock = {
      id: crypto.randomUUID(),
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

    const blockContents: RecordingBlockContent[] = Array.from(selectedIds).map((contentId, index) => ({
      blockId: block.id,
      contentId,
      ordem: index,
      gravado: false,
    }));

    dispatch({type: 'ADD_RECORDING_BLOCK', payload: block});
    dispatch({type: 'UPDATE_BLOCK_CONTENTS', payload: {blockId: block.id, contents: blockContents}});

    setSelectedIds(new Set());
    setBlockName('');
    setBlockTagsInput('');
    setShowBlockForm(false);
    handleTabChange('blocks');
  };

  const getPilarNome = (pilarId: string | null) =>
    state.pilares.find(pilar => pilar.id === pilarId)?.nome || '';

  const getPilar = (pilarId: string | null) =>
    state.pilares.find(pilar => pilar.id === pilarId) || null;

  const getSerie = (serieId: string | null) =>
    state.series.find(serie => serie.id === serieId) || null;

  const handleCreateBlockFromMobile = ({
    name,
    contentIds,
    tagsText,
  }: {
    name: string;
    contentIds: string[];
    tagsText: string;
  }) => {
    if (!name.trim() || contentIds.length === 0) return;

    const orderedSelectedContents = state.contents.filter(content => contentIds.includes(content.id));
    const manualTags = tagsText.split(/[,\n]/).map(tag => tag.trim()).filter(Boolean);
    const recordingTags = normalizeRecordingTags(
      manualTags.length > 0 ? manualTags : orderedSelectedContents.flatMap(content => content.tags || [])
    );

    const block: RecordingBlock = {
      id: crypto.randomUUID(),
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

    dispatch({type: 'ADD_RECORDING_BLOCK', payload: block});
    dispatch({type: 'UPDATE_BLOCK_CONTENTS', payload: {blockId: block.id, contents: blockContents}});
  };

  if (isMobile) {
    return (
      <div className="min-h-full bg-[var(--bg-primary)]">
        <RecordingMobileScreen
          readyContents={getRecordingQueueContents(state.contents)}
          recordingBlocks={state.recordingBlocks}
          allContents={state.contents}
          pilares={state.pilares}
          series={state.series}
          availableTags={availableRecordingTags}
          onCreateBlock={handleCreateBlockFromMobile}
          onOpenBlock={(blockId) => navigate(`/gravacao/${blockId}?tab=blocks`)}
          onPreviewScript={setPreviewContent}
        />

        {previewContent && (
          <ScriptPreviewModal
            content={state.contents.find(content => content.id === previewContent.id) || previewContent}
            onClose={() => setPreviewContent(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <header className="desktop-header-sticky transition-colors duration-300">
        <div className="desktop-header-frame">
          <DesktopPageHeader
            section="Produção"
            title="Gravação"
            subtitle="Monte blocos e execute a fila dos roteiros que já estão prontos para gravar."
            icon={Video}
            className="mb-0"
          />
        </div>
      </header>

      <div className="desktop-content-frame space-y-8">
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
            Para Gravar
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
          <section className="space-y-6">
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

            <div className="space-y-2">
              <h2 className="text-[11px] font-black uppercase tracking-widest opacity-40">
                Videos prontos para gravar
                {prontos.length > 0 && <span className="ml-2 opacity-70">({prontos.length})</span>}
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Selecione os roteiros finalizados e monte um bloco. Quando criar, ele aparece na aba `Blocos`.
              </p>
            </div>

            {prontos.length === 0 ? (
              <div className="py-12 text-center">
                <Video className="mx-auto mb-3 h-10 w-10 opacity-10" />
                <p className="text-sm font-black uppercase tracking-widest opacity-30">
                  Nenhum conteudo pronto para gravar
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {prontos.map(content => (
                  <div
                    key={content.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleSelect(content.id)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggleSelect(content.id);
                      }
                    }}
                    className={cn(
                      'flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all',
                      selectedIds.has(content.id)
                        ? 'border-[var(--text-primary)] bg-[var(--bg-hover)]'
                        : 'border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[var(--text-primary)]/30'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all',
                        selectedIds.has(content.id)
                          ? 'border-[var(--text-primary)] bg-[var(--text-primary)]'
                          : 'border-[var(--border-color)]'
                      )}
                    >
                      {selectedIds.has(content.id) && (
                        <div className="h-2 w-2 rounded-sm bg-[var(--bg-primary)]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-[var(--text-primary)]">
                        {content.title || '(sem titulo)'}
                      </p>
                      <div className="mt-0.5 flex flex-wrap gap-3">
                        {content.pilarId && (
                          <span
                            className="rounded-full border px-2 py-0.5 text-[10px] font-bold"
                            style={getEntityTagStyle(getPilar(content.pilarId)?.cor)}
                          >
                            {getPilarNome(content.pilarId)}
                          </span>
                        )}
                        {content.seriesId && getSerie(content.seriesId)?.name && (
                          <span
                            className="rounded-full border px-2 py-0.5 text-[10px] font-bold"
                            style={getEntityTagStyle(getSerie(content.seriesId)?.cor)}
                          >
                            {getSerie(content.seriesId)?.name}
                          </span>
                        )}
                        {content.energiaNecessaria && (
                          <span className="text-[10px] font-bold capitalize opacity-40">
                            {`⚡ ${content.energiaNecessaria}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={event => {
                        event.stopPropagation();
                        setPreviewContent(content);
                      }}
                      className="rounded-full bg-[var(--bg-hover)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)]"
                      aria-label="Visualizar roteiro"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {selectedIds.size > 0 && (
              <div className="mt-4">
                {showBlockForm ? (
                  <div className="flex gap-3">
                    <input
                      autoFocus
                      value={blockName}
                      onChange={event => setBlockName(event.target.value)}
                      onKeyDown={event => event.key === 'Enter' && handleCriarBloco()}
                      placeholder={`Nome do bloco (${selectedIds.size} selecionados)`}
                      className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none focus:border-[var(--text-primary)]/40"
                    />
                    <input
                      value={blockTagsInput}
                      onChange={event => setBlockTagsInput(event.target.value)}
                      placeholder="Marcadores: roupa preta, estante, caneca"
                      className="flex-[1.2] rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none focus:border-[var(--text-primary)]/40"
                    />
                    <button
                      onClick={handleCriarBloco}
                      disabled={!blockName.trim()}
                      className="rounded-xl bg-[var(--text-primary)] px-6 py-3 text-[11px] font-black uppercase tracking-widest text-[var(--bg-primary)] hover:opacity-90 disabled:opacity-30"
                    >
                      Criar
                    </button>
                    <button
                      onClick={() => {
                        setShowBlockForm(false);
                        setBlockTagsInput('');
                      }}
                      className="rounded-xl border border-[var(--border-color)] px-4 py-3 text-[11px] font-black uppercase tracking-widest opacity-50 hover:opacity-80"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowBlockForm(true)}
                    className="flex items-center gap-2 rounded-2xl bg-[var(--text-primary)] px-6 py-3 text-[11px] font-black uppercase tracking-widest text-[var(--bg-primary)] transition-opacity hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" />
                    {`Criar bloco (${selectedIds.size})`}
                  </button>
                )}
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-4">
            <div>
              <h2 className="text-[11px] font-black uppercase tracking-widest opacity-40">
                Blocos de gravacao
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Aqui ficam os blocos montados para revisar lineup, validar os roteiros e iniciar o modo explosao.
              </p>
            </div>

            <RecordingQueueTab />
          </section>
        )}
      </div>

      {previewContent && (
        <ScriptPreviewModal
          content={state.contents.find(content => content.id === previewContent.id) || previewContent}
          onClose={() => setPreviewContent(null)}
        />
      )}
    </div>
  );
}


