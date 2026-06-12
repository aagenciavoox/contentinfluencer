import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus2, Layers, Plus } from 'lucide-react';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { SidePanel } from '../../../components/layout/SidePanel';
import { AppButton } from '../../../components/ui/AppButton';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { SeriesMobileScreen } from '../../../mobile/screens/settings/SeriesMobileScreen';
import type { Serie } from '../../../lib/database';
import { SettingsPageScaffold } from '../../../components/settings/SettingsPageScaffold';
import { SettingsGridCard, SETTINGS_ENTITY_GRID_CLASS } from '../../../components/settings/SettingsGridCard';
import { generateUUID } from '../../../utils/uuid';

const FREQUENCIAS = ['Semanal', 'Quinzenal', 'Mensal', 'Sob demanda'] as const;

function SeriesForm({
  initial,
  onSave,
  onCancel,
  platformNames,
}: {
  initial: Partial<Serie>;
  onSave: (serie: Serie) => void;
  onCancel: () => void;
  platformNames: string[];
}) {
  const [form, setForm] = useState<Serie>(() => ({
    id: initial.id || generateUUID(),
    userId: initial.userId || '',
    name: initial.name || '',
    template: initial.template || '',
    notes: initial.notes || '',
    slotPadrao: initial.slotPadrao || null,
    formatoVisualPadrao: initial.formatoVisualPadrao || null,
    estruturaRoteiro: initial.estruturaRoteiro || null,
    bordao: initial.bordao || null,
    cor: initial.cor || '#6366f1',
    ativa: initial.ativa ?? true,
    frequenciaRecomendada: initial.frequenciaRecomendada || 'Semanal',
    createdAt: initial.createdAt || new Date().toISOString(),
    updatedAt: initial.updatedAt || new Date().toISOString(),
    pilarIds: initial.pilarIds || [],
    plataformas: initial.plataformas || [],
  }));

  const updatePlatformHashtags = (platformId: string, hashtags: string) => {
    const current = [...form.plataformas];
    const index = current.findIndex(item => item.platformId === platformId);

    if (!hashtags.trim()) {
      if (index >= 0) current.splice(index, 1);
    } else if (index >= 0) {
      current[index] = { ...current[index], hashtags: hashtags.trim() };
    } else {
      current.push({ serieId: form.id, platformId, hashtags: hashtags.trim() });
    }

    setForm(previous => ({ ...previous, plataformas: current }));
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, updatedAt: new Date().toISOString() });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">Nome *</label>
          <input
            type="text"
            value={form.name}
            onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))}
            placeholder="Nome da série"
            className="w-full h-11 rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-4 py-2 text-sm font-bold text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--border-strong)]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">Frequência</label>
          <select
            value={form.frequenciaRecomendada || 'Semanal'}
            onChange={event =>
              setForm(previous => ({ ...previous, frequenciaRecomendada: event.target.value }))
            }
            className="w-full h-11 rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-4 text-sm font-bold text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--border-strong)]"
          >
            {FREQUENCIAS.map(item => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">Bordão</label>
          <input
            type="text"
            value={form.bordao || ''}
            onChange={event => setForm(previous => ({ ...previous, bordao: event.target.value || null }))}
            placeholder="Ex: vamos destrinchar isso"
            className="w-full h-11 rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-4 py-2 text-sm font-bold text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--border-strong)]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">Cor</label>
          <input
            type="color"
            value={form.cor || '#6366f1'}
            onChange={event => setForm(previous => ({ ...previous, cor: event.target.value }))}
            className="h-11 w-16 cursor-pointer rounded-xl border border-[var(--border-color)] bg-transparent p-1"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-60">Estrutura do roteiro</label>
        <textarea
          rows={6}
          value={form.estruturaRoteiro || ''}
          onChange={event =>
            setForm(previous => ({ ...previous, estruturaRoteiro: event.target.value || null }))
          }
          placeholder="Estrutura base para roteiros desta série..."
          className="w-full resize-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] p-4 text-sm font-medium leading-relaxed text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--border-strong)]"
        />
      </div>

      <div className="space-y-4 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
        <p className="text-xs font-semibold  text-[var(--text-tertiary)] opacity-70">
          Hashtags por plataforma
        </p>
        <div className="space-y-3">
          {platformNames.map(platform => (
            <div key={platform} className="grid grid-cols-[100px_1fr] items-center gap-4">
              <span className="text-xs font-semibold  text-[var(--text-secondary)] opacity-60">
                {platform}
              </span>
              <input
                type="text"
                value={form.plataformas.find(item => item.platformId === platform)?.hashtags || ''}
                onChange={event => updatePlatformHashtags(platform, event.target.value)}
                placeholder="#hashtag1 #hashtag2"
                className="h-10 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 text-xs font-bold text-[var(--text-primary)] focus:ring-1 focus:ring-[var(--border-strong)]"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4">
        <AppButton onClick={onCancel} variant="secondary">
          Cancelar
        </AppButton>
        <AppButton onClick={handleSave} disabled={!form.name.trim()} variant="primary">
          Salvar
        </AppButton>
      </div>
    </div>
  );
}

export function SeriesSettingsPage() {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [panelMode, setPanelMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const editingSerie = useMemo(
    () => state.series.find(serie => serie.id === editingId) ?? null,
    [editingId, state.series]
  );

  const closePanel = () => {
    setEditingId(null);
    setPanelMode(null);
  };

  const handleSave = (serie: Serie) => {
    const payload = { ...serie, userId: serie.userId || user?.id || '' };
    const exists = state.series.find(item => item.id === payload.id);

    if (exists) {
      dispatch({ type: 'UPDATE_SERIE', payload });
    } else {
      dispatch({ type: 'ADD_SERIE', payload });
    }

    closePanel();
  };

  const handleToggleActive = (serie: Serie) => {
    dispatch({
      type: 'UPDATE_SERIE',
      payload: { ...serie, ativa: !serie.ativa, updatedAt: new Date().toISOString() },
    });
  };

  const handleDelete = (id: string) => {
    setConfirm({
      message: 'Remover esta serie?',
      onConfirm: () => dispatch({ type: 'DELETE_SERIE', payload: id }),
    });
  };

  const platformNames = state.platforms.filter(platform => platform.ativo).map(platform => platform.nome);

  const openBulkPage = (serieId: string) => {
    navigate(`/configuracoes/series/${serieId}/roteiros`);
  };

  if (isMobile) {
    return (
      <>
        <div className="min-h-full bg-[var(--bg-primary)]">
          <SeriesMobileScreen
            series={state.series}
            onSave={handleSave}
            onToggle={handleToggleActive}
            onDelete={(serieId) => handleDelete(serieId)}
            onBulkCreate={openBulkPage}
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
      title="Séries"
      icon={Layers}
      actions={
        <AppButton
          onClick={() => {
            setEditingId(null);
            setPanelMode('create');
          }}
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Nova série
        </AppButton>
      }
    >
      <div className={SETTINGS_ENTITY_GRID_CLASS}>
        {state.series.length === 0 ? (
          <div className="col-span-full py-10 text-center">
            <Layers className="mx-auto mb-2 h-8 w-8 opacity-10" />
            <p className="text-sm font-medium opacity-40">Nenhuma série criada</p>
          </div>
        ) : (
          state.series.map(serie => (
            <SettingsGridCard
              key={serie.id}
              title={serie.name}
              description={serie.estruturaRoteiro || 'Sem estrutura de roteiro definida.'}
              color={serie.cor || '#6366f1'}
              active={serie.ativa}
              dimmed={!serie.ativa}
              onToggle={() => handleToggleActive(serie)}
              onEdit={() => {
                setEditingId(serie.id);
                setPanelMode('edit');
              }}
              onDelete={() => handleDelete(serie.id)}
              footer={
                <>
                  <button
                    type="button"
                    onClick={() => openBulkPage(serie.id)}
                    className="inline-flex items-center gap-1 rounded-[var(--radius-input)] px-2 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  >
                    <FilePlus2 className="h-3 w-3" />
                    Roteiros
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(serie.id);
                        setPanelMode('edit');
                      }}
                      className="rounded-[var(--radius-input)] px-2 py-1 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(serie.id)}
                      className="rounded-[var(--radius-input)] px-2 py-1 text-xs font-medium text-[var(--accent-pink)] transition-colors hover:bg-[var(--accent-pink)]/10"
                    >
                      Excluir
                    </button>
                  </div>
                </>
              }
              badges={
                <>
                  <span className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-medium text-[var(--text-tertiary)]">
                    {serie.frequenciaRecomendada || 'Sob demanda'}
                  </span>
                  <span className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-xs font-medium text-[var(--text-tertiary)]">
                    {serie.plataformas.length} redes
                  </span>
                </>
              }
            />
          ))
        )}
      </div>

      <SidePanel
        open={panelMode === 'create' || panelMode === 'edit'}
        title={panelMode === 'edit' ? 'Editar série' : 'Nova série'}
        headerContent={
          <div className="flex items-center gap-3">
            <span
              className="h-10 w-10 shrink-0 rounded-[var(--radius-card)] border border-[var(--border-color)]"
              style={{ backgroundColor: editingSerie?.cor || '#6366f1' }}
            />
            <p className="truncate text-base font-semibold text-[var(--text-primary)]">
              {editingSerie?.name || 'Nova série recorrente'}
            </p>
          </div>
        }
        onClose={closePanel}
      >
        <SeriesForm
          initial={editingSerie ?? {}}
          onSave={handleSave}
          onCancel={closePanel}
          platformNames={platformNames}
        />
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
