import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, FilePlus2, FileText, Lightbulb, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Text } from '../../../components/ui/Text';
import { SeriesForm } from '../../../features/settings/pages/SeriesSettingsPage';
import { SeriesCreateContentForm } from '../../../features/settings/components/series-detail/SeriesCreateContentForm';
import { SeriesStatsRow } from '../../../features/settings/components/series-detail/SeriesStatsRow';
import { SeriesContentListRow } from '../../../features/settings/components/series-detail/SeriesContentListRow';
import {
  computeSeriesContentStats,
  type SeriesContentTab,
} from '../../../features/settings/lib/computeSeriesContentStats';
import {
  filterAndSortSeriesListItems,
  seriesListItemId,
  seriesListItemPreviewText,
  seriesListItemTitle,
  seriesListItemWordCount,
  type SeriesListItem,
} from '../../../features/settings/lib/seriesContentListUtils';
import type { Content, Idea, Pilar, Serie } from '../../../lib/database';
import { htmlToReadableText } from '../../../lib/utils';
import { MobilePillButton } from '../../components/MobilePillButton';
import { MobileSectionHeader } from '../../components/MobileSectionHeader';
import { MobileSegmentTabs } from '../../components/MobileSegmentTabs';
import { CONTENT_STATUS } from '../../../features/contents/lib/contentPipeline';

type SeriesDrawerMode = 'roteiro' | 'ideia' | null;

interface SeriesDetailMobileScreenProps {
  serie: Serie;
  pilares: Pilar[];
  platformNames: string[];
  linkedContents: Content[];
  linkedInboxIdeas?: Idea[];
  contents?: Content[];
  onSaveSerie: (serie: Serie) => void;
  onToggleActive: (serie: Serie) => void;
  onCreateBulkContents: (contents: Content[]) => Promise<void>;
}

export function SeriesDetailMobileScreen({
  serie,
  pilares,
  platformNames,
  linkedContents,
  linkedInboxIdeas = [],
  contents,
  onSaveSerie,
  onToggleActive,
  onCreateBulkContents,
}: SeriesDetailMobileScreenProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SeriesContentTab>('roteiros');
  const [previewItem, setPreviewItem] = useState<SeriesListItem | null>(null);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [drawerMode, setDrawerMode] = useState<SeriesDrawerMode>(null);

  const serieColor = serie.cor || '#6366f1';

  const stats = useMemo(
    () => computeSeriesContentStats(linkedContents, linkedInboxIdeas),
    [linkedContents, linkedInboxIdeas],
  );

  const tabCounts = useMemo(
    () => ({
      roteiros: stats.roteiros,
      ideias: stats.ideias,
      total: stats.total + stats.inboxIdeas,
    }),
    [stats],
  );

  const listTotalCount = useMemo(() => {
    if (activeTab === 'roteiros') return stats.roteiros;
    if (activeTab === 'ideias') return stats.ideias;
    return stats.total + stats.inboxIdeas;
  }, [activeTab, stats]);

  const filteredItems = useMemo(
    () =>
      filterAndSortSeriesListItems(linkedContents, linkedInboxIdeas, {
        tab: activeTab,
        search: '',
        status: 'Todos',
        sort: 'updatedAt:desc',
      }),
    [activeTab, linkedContents, linkedInboxIdeas],
  );

  useEffect(() => {
    if (!previewItem) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewItem(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewItem]);

  const openCreateSheet = (mode: 'roteiro' | 'ideia') => {
    setDrawerMode(mode);
  };

  const closeCreateSheet = () => {
    setDrawerMode(null);
  };

  return (
    <div className="stack-xl">
      <section
        className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-sm"
        style={{ borderTopColor: serieColor, borderTopWidth: 4 }}
      >
        <div className="stack-md p-4">
          <MobileSectionHeader
            icon={FileText}
            tone="purple"
            title={serie.name}
            description={
              serie.bordao
                ? `“${serie.bordao}”`
                : serie.notes?.trim() || undefined
            }
            action={
              <button
                type="button"
                onClick={() => setShowEditSheet(true)}
                aria-label="Editar identidade da série"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <Pencil className="h-4 w-4" />
              </button>
            }
          />
          {serie.bordao && serie.notes?.trim() ? (
            <Text variant="secondary" className="line-clamp-3">
              {serie.notes}
            </Text>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral">{serie.frequenciaRecomendada || 'Sob demanda'}</Badge>
            <Badge variant="neutral">
              {linkedContents.length} vinculado{linkedContents.length === 1 ? '' : 's'}
            </Badge>
            <MobilePillButton
              tone={serie.ativa ? 'success' : 'muted'}
              onClick={() => onToggleActive(serie)}
            >
              {serie.ativa ? 'Ativa' : 'Inativa'}
            </MobilePillButton>
          </div>
        </div>
      </section>

      <div className="-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="min-w-max">
          <SeriesStatsRow stats={stats} />
        </div>
      </div>

      <div className="grid-metrics">
        <AppButton
          variant="secondary"
          fullWidth
          onClick={() => openCreateSheet('ideia')}
          leftIcon={<Lightbulb className="h-4 w-4" />}
        >
          Nova ideia
        </AppButton>
        <AppButton
          variant="primary"
          fullWidth
          onClick={() => openCreateSheet('roteiro')}
          leftIcon={<FilePlus2 className="h-4 w-4" />}
        >
          Novo roteiro
        </AppButton>
      </div>

      <MobileSegmentTabs
        tabs={[
          { value: 'roteiros', label: 'Roteiros', count: tabCounts.roteiros },
          { value: 'ideias', label: 'Ideias', count: tabCounts.ideias },
          { value: 'todos', label: 'Todos', count: tabCounts.total },
        ]}
        value={activeTab}
        onChange={value => setActiveTab(value as SeriesContentTab)}
      />

      <section className="stack-md">
        {filteredItems.length === 0 ? (
          <EmptyState
            compact
            title="Nenhum conteúdo encontrado"
            description={
              activeTab === 'ideias'
                ? 'Crie a primeira ideia com o botão acima.'
                : activeTab === 'roteiros'
                  ? 'Crie o primeiro roteiro com o botão acima.'
                  : 'Crie roteiros ou ideias para esta série.'
            }
            icon={<FileText className="h-8 w-8" />}
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 px-1">
              <Text variant="label" className="text-[var(--text-tertiary)]">
                {filteredItems.length} de {listTotalCount}
              </Text>
              <button
                type="button"
                onClick={() => navigate('/conteudos')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-secondary)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                Roteiros
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="stack-sm">
              {filteredItems.map(item => (
                <SeriesContentListRow
                  key={seriesListItemId(item)}
                  item={item}
                  onClick={() => setPreviewItem(item)}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <BottomSheetModal
        open={previewItem !== null}
        onClose={() => setPreviewItem(null)}
        desktopMaxW="max-w-xl"
        zIndex="z-[110]"
      >
        {previewItem ? (
          <div className="flex h-full flex-col bg-[var(--bg-primary)]">
            <div className="h-1 w-full shrink-0" style={{ backgroundColor: serieColor }} />
            <div className="border-b border-[var(--border-color)] px-6 py-4">
              <Text variant="itemTitle" truncate>
                {seriesListItemTitle(previewItem)}
              </Text>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge
                  variant={previewItem.kind === 'inbox-idea' ? 'neutral' : 'status'}
                  status={previewItem.kind === 'content' ? previewItem.data.status : undefined}
                >
                  {previewItem.kind === 'inbox-idea' ? 'Caixa de ideias' : previewItem.data.status}
                </Badge>
                <Badge variant="neutral">{seriesListItemWordCount(previewItem)} palavras</Badge>
              </div>
            </div>

            <div className="flex-1 stack-xl overflow-y-auto px-6 py-4">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                  <Text variant="label" className="text-[var(--text-tertiary)]">
                    {previewItem.kind === 'inbox-idea' ||
                    (previewItem.kind === 'content' && previewItem.data.status === CONTENT_STATUS.IDEIA)
                      ? 'Ideia'
                      : 'Roteiro'}
                  </Text>
                </div>
                {seriesListItemPreviewText(previewItem) ? (
                  <Text variant="body" className="whitespace-pre-wrap text-[var(--text-secondary)]">
                    {seriesListItemPreviewText(previewItem)}
                  </Text>
                ) : (
                  <Text variant="body" className="italic text-[var(--text-tertiary)]">
                    {previewItem.kind === 'inbox-idea' ||
                    (previewItem.kind === 'content' && previewItem.data.status === CONTENT_STATUS.IDEIA)
                      ? 'Esta ideia ainda não tem descrição.'
                      : 'Este roteiro ainda não tem texto.'}
                  </Text>
                )}
              </div>

              {previewItem.kind === 'content' &&
              previewItem.data.plataformas.some(platformItem => platformItem.legenda?.trim()) ? (
                <div>
                  <Text variant="label" className="mb-2 text-[var(--text-tertiary)]">
                    Legenda
                  </Text>
                  {previewItem.data.plataformas
                    .filter(platformItem => platformItem.legenda?.trim())
                    .map(platformItem => (
                      <div
                        key={platformItem.platformId}
                        className="mb-2 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"
                      >
                        <Text variant="label" className="text-[var(--text-tertiary)]">
                          {platformItem.platformId}
                        </Text>
                        <Text variant="body" className="mt-1 whitespace-pre-wrap text-[var(--text-secondary)]">
                          {htmlToReadableText(platformItem.legenda)}
                        </Text>
                      </div>
                    ))}
                </div>
              ) : null}
            </div>

            <div className="border-t border-[var(--border-color)] px-6 py-4 pb-safe">
              <AppButton
                variant="primary"
                fullWidth
                onClick={() => {
                  if (previewItem.kind === 'inbox-idea') {
                    navigate('/ideias');
                    return;
                  }
                  navigate(`/conteudos/${previewItem.data.id}`);
                }}
                leftIcon={<ArrowUpRight className="h-4 w-4" />}
              >
                {previewItem.kind === 'inbox-idea' ? 'Abrir na caixa de ideias' : 'Abrir'}
              </AppButton>
            </div>
          </div>
        ) : null}
      </BottomSheetModal>

      <BottomSheetModal
        open={drawerMode !== null}
        onClose={closeCreateSheet}
        desktopMaxW="max-w-xl"
        zIndex="z-[110]"
      >
        {drawerMode ? (
          <div className="flex h-full flex-col bg-[var(--bg-primary)]">
            <div className="h-1 w-full shrink-0" style={{ backgroundColor: serieColor }} />
            <div className="border-b border-[var(--border-color)] px-6 py-4">
              <Text variant="sectionTitle">
                {drawerMode === 'ideia' ? 'Nova ideia' : 'Novo roteiro'}
              </Text>
              <Text variant="meta" className="mt-1 text-[var(--text-tertiary)]">
                {serie.name}
              </Text>
            </div>
            <div className="flex-1 overflow-y-auto p-6 pb-safe">
              <SeriesCreateContentForm
                key={drawerMode}
                serie={serie}
                pilares={pilares}
                platformNames={platformNames}
                mode={drawerMode}
                variant="compact"
                onCreate={onCreateBulkContents}
                onSuccess={() => closeCreateSheet()}
              />
            </div>
          </div>
        ) : null}
      </BottomSheetModal>

      <BottomSheetModal
        open={showEditSheet}
        onClose={() => setShowEditSheet(false)}
        desktopMaxW="max-w-xl"
        zIndex="z-[110]"
      >
        <div className="flex h-full flex-col bg-[var(--bg-primary)]">
          <div className="border-b border-[var(--border-color)] px-6 py-4">
            <div className="flex items-center gap-3">
              <span
                className="h-10 w-10 shrink-0 rounded-[var(--radius-card)] border border-[var(--border-color)]"
                style={{ backgroundColor: serieColor }}
              />
              <div className="min-w-0">
                <Text variant="sectionTitle" truncate>
                  {serie.name}
                </Text>
                <Text variant="meta" className="text-[var(--text-secondary)]">
                  Editar identidade da série
                </Text>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 pb-safe">
            <SeriesForm
              key={serie.id}
              initial={serie}
              onSave={saved => {
                onSaveSerie(saved);
                setShowEditSheet(false);
              }}
              onCancel={() => setShowEditSheet(false)}
              platformNames={platformNames}
              contents={contents ?? linkedContents}
            />
          </div>
        </div>
      </BottomSheetModal>
    </div>
  );
}
