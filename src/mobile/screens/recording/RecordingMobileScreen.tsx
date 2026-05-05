import { useMemo, useState } from 'react';
import { Clapperboard, Layers3, Plus, SearchCheck, Tags, Video } from 'lucide-react';
import type { Content, Pilar, RecordingBlock, Serie } from '../../../lib/database';
import { MobileEmptyState } from '../../components/MobileEmptyState';
import { MobileFilterSheet } from '../../components/MobileFilterSheet';
import { MobileListCard } from '../../components/MobileListCard';
import { MobileSearchBar } from '../../components/MobileSearchBar';
import { MobileSegmentTabs } from '../../components/MobileSegmentTabs';
import {
  normalizeRecordingTags,
  resolveRecordingContextSummary,
} from '../../../features/recording/lib/recordingWorkflow';
import { getEntityTagStyle } from '../../../lib/utils';

interface RecordingMobileScreenProps {
  readyContents: Content[];
  recordingBlocks: RecordingBlock[];
  allContents: Content[];
  pilares: Pilar[];
  series: Serie[];
  availableTags: string[];
  onCreateBlock: (payload: { name: string; contentIds: string[]; tagsText: string }) => void;
  onOpenBlock: (blockId: string) => void;
  onOpenContent: (contentId: string) => void;
}

type RecordingMobileTab = 'queue' | 'blocks';

export function RecordingMobileScreen({
  readyContents,
  recordingBlocks,
  allContents,
  pilares,
  series,
  availableTags,
  onCreateBlock,
  onOpenBlock,
  onOpenContent,
}: RecordingMobileScreenProps) {
  const [activeTab, setActiveTab] = useState<RecordingMobileTab>('blocks');
  const [search, setSearch] = useState('');
  const [pilarFilter, setPilarFilter] = useState('all');
  const [seriesFilter, setSeriesFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [blockName, setBlockName] = useState('');
  const [blockTagsText, setBlockTagsText] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const filteredQueue = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return readyContents
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
      })
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }, [pilares, pilarFilter, readyContents, search, series, seriesFilter, tagFilter]);

  const blockSummaries = useMemo(
    () =>
      recordingBlocks.map((block) => {
        const contents = block.contents
          .map((item) => allContents.find((content) => content.id === item.contentId) || null)
          .filter((content): content is Content => content !== null);
        const total = contents.length;
        const ready = contents.filter((content) => content.status === 'Pronto para Gravar').length;
        const completed = total - ready;
        const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
        const first = contents[0] || null;

        return { block, contents, total, ready, completed, progress, first };
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

  const handleCreate = () => {
    const orderedIds = filteredQueue.filter((content) => selectedIds.has(content.id)).map((content) => content.id);
    if (!blockName.trim() || orderedIds.length === 0) return;
    onCreateBlock({ name: blockName.trim(), contentIds: orderedIds, tagsText: blockTagsText });
    setSelectedIds(new Set());
    setBlockName('');
    setBlockTagsText('');
    setShowCreateForm(false);
    setActiveTab('blocks');
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-2xl bg-[var(--accent-orange)]/12 p-3 text-[var(--accent-orange)]">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <p className="t-section-title text-[var(--text-primary)]">Gravacao</p>
            <p className="t-secondary">Gerencie blocos e use a fila sem bloco quando precisar montar uma nova sessao.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <p className="t-label text-[var(--text-tertiary)]">Sem bloco</p>
            <p className="mt-1 text-xl font-black text-[var(--text-primary)]">{readyContents.length}</p>
          </div>
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <p className="t-label text-[var(--text-tertiary)]">Blocos</p>
            <p className="mt-1 text-xl font-black text-[var(--text-primary)]">{recordingBlocks.length}</p>
          </div>
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <p className="t-label text-[var(--text-tertiary)]">Marcados</p>
            <p className="mt-1 text-xl font-black text-[var(--text-primary)]">{selectedIds.size}</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <MobileSegmentTabs
          tabs={[
            { value: 'queue', label: 'Sem bloco', count: readyContents.length },
            { value: 'blocks', label: 'Blocos', count: recordingBlocks.length },
          ]}
          value={activeTab}
          onChange={(value) => setActiveTab(value)}
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
              <MobileEmptyState
                title="Nada sem bloco"
                description="Ajuste os filtros ou finalize mais roteiros para montar um novo bloco."
                icon={<SearchCheck className="h-8 w-8" />}
              />
            ) : (
              <div className="space-y-3">
                {filteredQueue.map((content) => {
                  const pilar = pilares.find((item) => item.id === content.pilarId) || null;
                  const serie = series.find((item) => item.id === content.seriesId) || null;
                  const pilarName = pilar?.nome;
                  const seriesName = serie?.name;
                  const selected = selectedIds.has(content.id);
                  const recordingTags = normalizeRecordingTags(content.tags || []);

                  return (
                    <MobileListCard
                      key={content.id}
                      onClick={() => onOpenContent(content.id)}
                      eyebrow={selected ? 'Selecionado' : 'Sem bloco'}
                      title={content.title || 'Conteudo sem titulo'}
                      description={content.notes || 'Sem observacoes adicionais'}
                      meta={
                        <>
                          {pilarName ? (
                            <span
                              className="rounded-full border px-3 py-1 text-[11px] font-semibold"
                              style={getEntityTagStyle(pilar?.cor)}
                            >
                              {pilarName}
                            </span>
                          ) : null}
                          {seriesName ? (
                            <span
                              className="rounded-full border px-3 py-1 text-[11px] font-semibold"
                              style={getEntityTagStyle(serie?.cor)}
                            >
                              {seriesName}
                            </span>
                          ) : null}
                          {recordingTags.map((tag) => (
                            <span
                              key={`${content.id}-${tag}`}
                              className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-orange)]/10 px-3 py-1 text-[11px] font-semibold text-[var(--accent-orange)]"
                            >
                              <Tags className="h-3 w-3" />
                              {tag}
                            </span>
                          ))}
                        </>
                      }
                      trailing={
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleSelect(content.id);
                            }}
                            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                              selected
                                ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                                : 'border-[var(--border-color)] bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                            }`}
                            aria-label={selected ? 'Remover da selecao' : 'Selecionar para bloco'}
                          >
                            <div className="h-2 w-2 rounded-sm bg-current" />
                          </button>
                          <span className="rounded-full bg-[var(--bg-hover)] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-secondary)]">
                            Detalhe
                          </span>
                        </div>
                      }
                    />
                  );
                })}
              </div>
            )}

            {selectedIds.size > 0 ? (
              <div className="space-y-3 rounded-[1.5rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
                {showCreateForm ? (
                  <>
                    <input
                      autoFocus
                      value={blockName}
                      onChange={(event) => setBlockName(event.target.value)}
                      placeholder={`Nome do bloco (${selectedIds.size} selecionados)`}
                      className="w-full"
                    />
                    <textarea
                      value={blockTagsText}
                      onChange={(event) => setBlockTagsText(event.target.value)}
                      placeholder="Marcadores de gravacao separados por virgula"
                      className="min-h-[96px] w-full resize-none"
                    />
                    <div className="flex gap-3">
                      <button type="button" onClick={handleCreate} disabled={!blockName.trim()} className="button-primary flex-1 disabled:opacity-40">
                        Criar bloco
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateForm(false);
                          setBlockTagsText('');
                        }}
                        className="flex-1 rounded-[1.25rem] border border-[var(--border-color)] py-3 text-xs font-black uppercase tracking-widest text-[var(--text-secondary)]"
                      >
                        Cancelar
                      </button>
                    </div>
                  </>
                ) : (
                  <button type="button" onClick={() => setShowCreateForm(true)} className="button-primary w-full">
                    <Plus className="h-4 w-4" />
                    {`Criar bloco (${selectedIds.size})`}
                  </button>
                )}
              </div>
            ) : null}
          </>
        ) : (
          <>
            {blockSummaries.length === 0 ? (
              <MobileEmptyState
                title="Nenhum bloco montado"
                description="Selecione roteiros prontos e crie o primeiro bloco para abrir a execucao."
                icon={<Layers3 className="h-8 w-8" />}
              />
            ) : (
              <div className="space-y-3">
                {blockSummaries.map(({ block, total, progress, first, ready }) => (
                  <MobileListCard
                    key={block.id}
                    onClick={() => onOpenBlock(block.id)}
                    eyebrow={ready === 0 ? 'Finalizado' : 'Aguardando camera'}
                    title={block.name}
                    description={first?.title || 'Sem roteiro inicial'}
                    meta={
                      <>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-blue)]/10 px-3 py-1 text-[11px] font-semibold text-[var(--accent-blue)]">
                          <Clapperboard className="h-3 w-3" />
                          {total} videos
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-green)]/10 px-3 py-1 text-[11px] font-semibold text-[var(--accent-green)]">
                          <Layers3 className="h-3 w-3" />
                          {progress}% pronto
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-hover)] px-3 py-1 text-[11px] font-semibold text-[var(--text-secondary)]">
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
        title="Filtrar fila"
        onClose={() => setIsFilterSheetOpen(false)}
      >
        <label className="block space-y-2">
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

        <label className="block space-y-2">
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

        <label className="block space-y-2">
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

        <button
          type="button"
          onClick={() => {
            setPilarFilter('all');
            setSeriesFilter('all');
            setTagFilter('all');
            setIsFilterSheetOpen(false);
          }}
          className="button-primary w-full"
        >
          Limpar filtros
        </button>
      </MobileFilterSheet>
    </div>
  );
}
