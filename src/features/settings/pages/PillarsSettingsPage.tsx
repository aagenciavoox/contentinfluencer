import {useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {motion} from 'motion/react';
import {Edit2, Palette, Plus, ToggleLeft, ToggleRight, Trash2} from 'lucide-react';
import {ConfirmModal} from '../../../components/feedback/modals/ConfirmModal';
import {SidePanel} from '../../../components/layout/SidePanel';
import {AppButton} from '../../../components/ui/AppButton';
import {useAppContext} from '../../../context/AppContext';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {PillarsMobileScreen} from '../../../mobile/screens/settings/PillarsMobileScreen';
import {Pilar} from '../../../lib/database';
import {cn} from '../../../lib/utils';
import {PilarForm} from '../components/PilarForm';

export function PillarsSettingsPage() {
  const {state, dispatch} = useAppContext();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [panelMode, setPanelMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{message: string; onConfirm: () => void} | null>(null);

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
      dispatch({type: 'UPDATE_PILAR', payload: pilar});
    } else {
      dispatch({type: 'ADD_PILAR', payload: pilar});
    }

    closePanel();
  };

  const handleToggleActive = (pilar: Pilar) => {
    dispatch({type: 'UPDATE_PILAR', payload: {...pilar, ativo: !pilar.ativo}});
  };

  const handleDelete = (id: string) => {
    setConfirm({
      message: 'Excluir este pilar?',
      onConfirm: () => dispatch({type: 'DELETE_PILAR', payload: id}),
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
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <div className="desktop-header-frame">
        <DesktopPageHeader
          section="Configuracoes"
          title="Pilares editoriais"
          icon={Palette}
          backLabel="Configuracoes"
          backTo="/configuracoes"
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
        />
      </div>

      <div className="desktop-content-frame">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {state.pilares.map(pilar => {
            const volume = state.contents.filter(c => c.pilarId === pilar.id).length;
            return (
            <motion.div
              key={pilar.id}
              role="button"
              tabIndex={0}
              initial={{opacity: 0, y: 8}}
              animate={{opacity: 1, y: 0}}
              onClick={() => {
                setEditingId(pilar.id);
                setPanelMode('edit');
              }}
              onKeyDown={event => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                setEditingId(pilar.id);
                setPanelMode('edit');
              }}
              className={cn(
                'ds-card relative flex min-h-[128px] flex-col bg-[var(--bg-primary)] p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md',
                !pilar.ativo && 'opacity-55'
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <span className="h-3 w-3 rounded-full" style={{backgroundColor: pilar.cor}} />
                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    handleToggleActive(pilar);
                  }}
                  title={pilar.ativo ? 'Desativar' : 'Ativar'}
                >
                  {pilar.ativo ? (
                    <ToggleRight className="h-5 w-5 text-[var(--accent-green)]" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-[var(--text-tertiary)]" />
                  )}
                </button>
              </div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{pilar.nome}</h3>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                {pilar.descricao || 'Sem descricao'}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="status-pill text-[10px]">{pilar.plataformas.length} plataformas</span>
                <span className="status-pill text-[10px]">{pilar.ativo ? 'Ativo' : 'Inativo'}</span>
                <span className="status-pill text-[10px]">{volume} conteudos</span>
              </div>
              <div className="mt-auto flex items-center justify-between pt-3">
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--text-tertiary)]">
                  <Edit2 className="h-3 w-3" />
                  Editar
                </span>
                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    handleDelete(pilar.id);
                  }}
                  className="rounded-[var(--radius-input)] p-1.5 hover:bg-[var(--accent-pink)]/10"
                >
                  <Trash2 className="h-3.5 w-3.5 text-[var(--accent-pink)]" />
                </button>
              </div>
            </motion.div>
            );
          })}
        </div>
      </div>

      <SidePanel
        open={panelMode !== null}
        title={panelMode === 'edit' ? 'Editar pilar' : 'Novo pilar'}
        headerContent={
          <div className="flex items-center gap-3">
            <span
              className="h-10 w-10 shrink-0 rounded-[var(--radius-card)] border border-[var(--border-color)]"
              style={{backgroundColor: editingPilar?.cor || '#F5C543'}}
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
    </div>
  );
}
