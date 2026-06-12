import { useMemo, useState } from 'react';
import { Palette, Plus } from 'lucide-react';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { SidePanel } from '../../../components/layout/SidePanel';
import { AppButton } from '../../../components/ui/AppButton';
import { useAppContext } from '../../../context/AppContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { PillarsMobileScreen } from '../../../mobile/screens/settings/PillarsMobileScreen';
import { Pilar } from '../../../lib/database';
import { PilarForm } from '../components/PilarForm';
import { SettingsPageScaffold } from '../../../components/settings/SettingsPageScaffold';
import { SettingsGridCard, SETTINGS_ENTITY_GRID_CLASS } from '../../../components/settings/SettingsGridCard';

export function PillarsSettingsPage() {
  const { state, dispatch } = useAppContext();
  const isMobile = useIsMobile();
  const [panelMode, setPanelMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const editingPilar = useMemo(
    () => state.pilares.find(pilar => pilar.id === editingId) ?? null,
    [editingId, state.pilares]
  );

  const closePanel = () => {
    setEditingId(null);
    setPanelMode(null);
  };

  const handleSave = (pilar: Pilar) => {
    const exists = state.pilares.find(item => item.id === pilar.id);
    if (exists) {
      dispatch({ type: 'UPDATE_PILAR', payload: pilar });
    } else {
      dispatch({ type: 'ADD_PILAR', payload: pilar });
    }
    closePanel();
  };

  const handleToggleActive = (pilar: Pilar) => {
    dispatch({ type: 'UPDATE_PILAR', payload: { ...pilar, ativo: !pilar.ativo } });
  };

  const handleDelete = (id: string) => {
    setConfirm({
      message: 'Remover este pilar?',
      onConfirm: () => dispatch({ type: 'DELETE_PILAR', payload: id }),
    });
  };

  if (isMobile) {
    return (
      <>
        <div className="min-h-full bg-[var(--bg-primary)]">
          <PillarsMobileScreen
            pilares={state.pilares}
            onSave={handleSave}
            onToggle={handleToggleActive}
            onDelete={(pilarId) => handleDelete(pilarId)}
          />
        </div>
        <ConfirmModal
          open={!!confirm}
          message={confirm?.message || ''}
          onConfirm={() => {
            confirm?.onConfirm();
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      </>
    );
  }

  return (
    <SettingsPageScaffold
      compact
      title="Pilares editoriais"
      icon={Palette}
      actions={
        <AppButton
          onClick={() => {
            setEditingId(null);
            setPanelMode('create');
          }}
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Novo
        </AppButton>
      }
    >
      <div className={SETTINGS_ENTITY_GRID_CLASS}>
        {state.pilares.map(pilar => {
          const volume = state.contents.filter(c => c.pilarId === pilar.id).length;
          return (
            <SettingsGridCard
              key={pilar.id}
              title={pilar.nome}
              description={pilar.descricao || 'Sem descrição definida'}
              color={pilar.cor}
              active={pilar.ativo}
              dimmed={!pilar.ativo}
              onToggle={() => handleToggleActive(pilar)}
              onEdit={() => {
                setEditingId(pilar.id);
                setPanelMode('edit');
              }}
              onDelete={() => handleDelete(pilar.id)}
              badges={
                <>
                  <span className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-medium text-[var(--text-tertiary)]">
                    {volume} conteúdos
                  </span>
                  <span className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-medium text-[var(--text-tertiary)]">
                    {pilar.plataformas.length} redes
                  </span>
                </>
              }
            />
          );
        })}
      </div>

      <SidePanel
        open={panelMode !== null}
        title={panelMode === 'edit' ? 'Editar pilar' : 'Novo pilar'}
        headerContent={
          <div className="flex items-center gap-3">
            <span
              className="h-10 w-10 shrink-0 rounded-[var(--radius-card)] border border-[var(--border-color)]"
              style={{ backgroundColor: editingPilar?.cor || '#F5C543' }}
            />
            <p className="truncate text-base font-semibold text-[var(--text-primary)]">
              {editingPilar?.nome || 'Novo pilar editorial'}
            </p>
          </div>
        }
        onClose={closePanel}
      >
        <PilarForm initial={editingPilar ?? {}} onSave={handleSave} onCancel={closePanel} />
      </SidePanel>

      <ConfirmModal
        open={!!confirm}
        message={confirm?.message || ''}
        onConfirm={() => {
          confirm?.onConfirm();
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </SettingsPageScaffold>
  );
}
