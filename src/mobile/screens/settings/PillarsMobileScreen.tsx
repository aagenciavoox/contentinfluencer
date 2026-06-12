import { useState } from 'react';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import type { Pilar } from '../../../lib/database';
import { MobileEmptyState } from '../../components/MobileEmptyState';
import { MobileListCard } from '../../components/MobileListCard';
import { MobilePillButton } from '../../components/MobilePillButton';
import { PilarForm } from '../../../features/settings/components/PilarForm';
import { Palette, Plus } from 'lucide-react';

interface PillarsMobileScreenProps {
  pilares: Pilar[];
  onSave: (pilar: Pilar) => void;
  onToggle: (pilar: Pilar) => void;
  onDelete: (pilarId: string) => void;
}

export function PillarsMobileScreen({
  pilares,
  onSave,
  onToggle,
  onDelete,
}: PillarsMobileScreenProps) {
  const [panelMode, setPanelMode] = useState<'create' | 'edit' | null>(null);
  const [editingPilar, setEditingPilar] = useState<Pilar | null>(null);

  const closePanel = () => {
    setPanelMode(null);
    setEditingPilar(null);
  };

  const handleSave = (pilar: Pilar) => {
    onSave(pilar);
    closePanel();
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-[var(--radius-input)] bg-[var(--accent-orange)]/12 p-3 text-[var(--accent-orange)]">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <p className="ds-h3 text-[var(--text-primary)]">Pilares editoriais</p>
            <p className="ds-body text-[var(--text-secondary)]">Nome, distribuicao e hashtags por plataforma.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingPilar(null);
            setPanelMode('create');
          }}
          className="button-primary w-full"
        >
          <Plus className="h-4 w-4" />
          Novo pilar
        </button>
      </section>

      <section className="space-y-3">
        {pilares.length === 0 ? (
          <MobileEmptyState
            title="Nenhum pilar cadastrado"
            description="Adicione o primeiro pilar para organizar os temas editoriais."
            icon={<Palette className="h-8 w-8" />}
          />
        ) : (
          pilares.map(pilar => (
            <MobileListCard
              key={pilar.id}
              title={pilar.nome}
              description={pilar.descricao || 'Sem descricao ainda.'}
              onClick={() => {
                setEditingPilar(pilar);
                setPanelMode('edit');
              }}
              meta={
                <>
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-[var(--text-primary)]"
                    style={{ backgroundColor: `${pilar.cor}22` }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: pilar.cor }} />
                    Cor
                  </span>
                  <span className="rounded-full bg-[var(--bg-hover)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                    {pilar.plataformas.length} plataformas
                  </span>
                </>
              }
              trailing={
                <MobilePillButton
                  tone="danger"
                  onClick={event => {
                    event.stopPropagation();
                    onDelete(pilar.id);
                  }}
                >
                  Excluir
                </MobilePillButton>
              }
              status={
                <MobilePillButton
                  tone={pilar.ativo ? 'success' : 'muted'}
                  onClick={event => {
                    event.stopPropagation();
                    onToggle(pilar);
                  }}
                >
                  {pilar.ativo ? 'Ativo' : 'Inativo'}
                </MobilePillButton>
              }
            />
          ))
        )}
      </section>

      <BottomSheetModal
        open={panelMode !== null}
        onClose={closePanel}
        desktopMaxW="max-w-xl"
        zIndex="z-[110]"
      >
        <div className="flex h-full flex-col bg-[var(--bg-primary)]">
          <div className="border-b border-[var(--border-color)] px-5 py-4">
            <div className="flex items-center gap-3">
              <span
                className="h-10 w-10 shrink-0 rounded-[var(--radius-card)] border border-[var(--border-color)]"
                style={{ backgroundColor: editingPilar?.cor || '#F5C543' }}
              />
              <div className="min-w-0">
                <p className="ds-h3 truncate text-[var(--text-primary)]">
                  {panelMode === 'edit' ? editingPilar?.nome : 'Novo pilar'}
                </p>
                <p className="ds-meta text-[var(--text-secondary)]">
                  Identidade, distribuicao e hashtags
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            <PilarForm
              key={editingPilar?.id || 'new'}
              initial={editingPilar ?? {}}
              onSave={handleSave}
              onCancel={closePanel}
            />
          </div>
        </div>
      </BottomSheetModal>
    </div>
  );
}
