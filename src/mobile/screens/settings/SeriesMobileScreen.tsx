import { useState } from 'react';
import { ChevronRight, Layers, Plus } from 'lucide-react';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { Text } from '../../../components/ui/Text';
import type { Content, Serie } from '../../../lib/database';
import { EmptyState } from '../../../components/ui/EmptyState';
import { SeriesForm } from '../../../features/settings/pages/SeriesSettingsPage';
import { MobileListCard } from '../../components/MobileListCard';
import { MobilePillButton } from '../../components/MobilePillButton';
import { MobileSectionHeader } from '../../components/MobileSectionHeader';

interface SeriesMobileScreenProps {
  series: Serie[];
  roteiroCountBySerie: Map<string, number>;
  platformNames: string[];
  contents: Content[];
  onSave: (serie: Serie) => void;
  onToggle: (serie: Serie) => void;
  onDelete: (serieId: string) => void;
  onOpen: (serieId: string) => void;
}

export function SeriesMobileScreen({
  series,
  roteiroCountBySerie,
  platformNames,
  contents,
  onSave,
  onToggle,
  onDelete,
  onOpen,
}: SeriesMobileScreenProps) {
  const [panelMode, setPanelMode] = useState<'create' | 'edit' | null>(null);
  const [editingSerie, setEditingSerie] = useState<Serie | null>(null);

  const closePanel = () => {
    setPanelMode(null);
    setEditingSerie(null);
  };

  const handleSave = (serie: Serie) => {
    onSave(serie);
    closePanel();
  };

  const activeCount = series.filter(serie => serie.ativa).length;

  return (
    <div className="stack-xl">
      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <MobileSectionHeader
          icon={Layers}
          tone="purple"
          title="Séries"
          description={
            series.length === 0
              ? 'Quadros recorrentes com identidade e roteiros vinculados.'
              : `${activeCount} ativa${activeCount === 1 ? '' : 's'} · ${series.length} no total`
          }
        />

        <AppButton
          variant="primary"
          fullWidth
          onClick={() => {
            setEditingSerie(null);
            setPanelMode('create');
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Nova série
        </AppButton>
      </section>

      <section className="stack-md">
        {series.length === 0 ? (
          <EmptyState
            compact
            title="Nenhuma série criada"
            description="Adicione a primeira série recorrente para estruturar o calendário editorial."
            icon={<Layers className="h-8 w-8" />}
          />
        ) : (
          series.map(serie => {
            const roteiroCount = roteiroCountBySerie.get(serie.id) || 0;
            const serieColor = serie.cor || '#6366f1';

            return (
              <MobileListCard
                key={serie.id}
                title={serie.name}
                description={
                  serie.estruturaRoteiro
                    ? serie.estruturaRoteiro.slice(0, 120) + (serie.estruturaRoteiro.length > 120 ? '…' : '')
                    : serie.bordao
                      ? `“${serie.bordao}”`
                      : 'Toque para criar roteiros e ver detalhes.'
                }
                onClick={() => onOpen(serie.id)}
                meta={
                  <>
                    <span
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-[var(--text-primary)]"
                      style={{ backgroundColor: `${serieColor}22` }}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: serieColor }} />
                      {serie.frequenciaRecomendada || 'Sob demanda'}
                    </span>
                    <Badge variant="neutral">{roteiroCount} roteiro{roteiroCount === 1 ? '' : 's'}</Badge>
                    {serie.bordao ? (
                      <Badge variant="tag" className="text-[var(--accent-purple)]">
                        {serie.bordao}
                      </Badge>
                    ) : null}
                  </>
                }
                trailing={
                  <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[var(--text-tertiary)]" />
                }
                status={
                  <div className="flex flex-wrap items-center gap-2">
                    <MobilePillButton
                      tone={serie.ativa ? 'success' : 'muted'}
                      onClick={event => {
                        event.stopPropagation();
                        onToggle(serie);
                      }}
                    >
                      {serie.ativa ? 'Ativa' : 'Inativa'}
                    </MobilePillButton>
                    <MobilePillButton
                      tone="muted"
                      onClick={event => {
                        event.stopPropagation();
                        setEditingSerie(serie);
                        setPanelMode('edit');
                      }}
                    >
                      Editar
                    </MobilePillButton>
                    <MobilePillButton
                      tone="danger"
                      onClick={event => {
                        event.stopPropagation();
                        onDelete(serie.id);
                      }}
                    >
                      Excluir
                    </MobilePillButton>
                  </div>
                }
              />
            );
          })
        )}
      </section>

      <BottomSheetModal
        open={panelMode !== null}
        onClose={closePanel}
        desktopMaxW="max-w-xl"
        zIndex="z-[110]"
      >
        <div className="flex h-full flex-col bg-[var(--bg-primary)]">
          <div className="border-b border-[var(--border-color)] px-6 py-4">
            <div className="flex items-center gap-3">
              <span
                className="h-10 w-10 shrink-0 rounded-[var(--radius-card)] border border-[var(--border-color)]"
                style={{ backgroundColor: editingSerie?.cor || '#6366f1' }}
              />
              <div className="min-w-0">
                <Text variant="sectionTitle" truncate>
                  {panelMode === 'edit' ? editingSerie?.name : 'Nova série'}
                </Text>
                <Text variant="meta" className="text-[var(--text-secondary)]">
                  Identidade, estrutura e hashtags
                </Text>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <SeriesForm
              key={editingSerie?.id || 'new'}
              initial={editingSerie ?? {}}
              onSave={handleSave}
              onCancel={closePanel}
              platformNames={platformNames}
              contents={contents}
            />
          </div>
        </div>
      </BottomSheetModal>
    </div>
  );
}
