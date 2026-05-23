import {useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {motion} from 'motion/react';
import {Layers, Plus, ToggleLeft, ToggleRight, Trash2} from 'lucide-react';
import {ConfirmModal} from '../../../components/feedback/modals/ConfirmModal';
import {SidePanel} from '../../../components/layout/SidePanel';
import {AppButton} from '../../../components/ui/AppButton';
import {useAppContext} from '../../../context/AppContext';
import {useAuth} from '../../../context/AuthContext';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {SeriesMobileScreen} from '../../../mobile/screens/settings/SeriesMobileScreen';
import type {Serie} from '../../../lib/database';

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
    id: initial.id || crypto.randomUUID(),
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
      current[index] = {...current[index], hashtags: hashtags.trim()};
    } else {
      current.push({serieId: form.id, platformId, hashtags: hashtags.trim()});
    }

    setForm(previous => ({...previous, plataformas: current}));
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({...form, updatedAt: new Date().toISOString()});
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="t-label mb-1.5 block">Nome *</label>
          <input
            type="text"
            value={form.name}
            onChange={event => setForm(previous => ({...previous, name: event.target.value}))}
            placeholder="Nome da serie"
            className="w-full"
          />
        </div>

        <div>
          <label className="t-label mb-1.5 block">Frequencia</label>
          <select
            value={form.frequenciaRecomendada || 'Semanal'}
            onChange={event =>
              setForm(previous => ({...previous, frequenciaRecomendada: event.target.value}))
            }
            className="w-full"
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
        <div>
          <label className="t-label mb-1.5 block">Bordao</label>
          <input
            type="text"
            value={form.bordao || ''}
            onChange={event => setForm(previous => ({...previous, bordao: event.target.value || null}))}
            placeholder="Ex: vamos destrinchar isso"
            className="w-full"
          />
        </div>

        <div>
          <label className="t-label mb-1.5 block">Cor</label>
          <input
            type="color"
            value={form.cor || '#6366f1'}
            onChange={event => setForm(previous => ({...previous, cor: event.target.value}))}
            className="h-11 w-16 cursor-pointer rounded-xl border border-[var(--border-color)] bg-transparent"
          />
        </div>
      </div>

      <div>
        <label className="t-label mb-1.5 block">Estrutura do roteiro</label>
        <textarea
          rows={5}
          value={form.estruturaRoteiro || ''}
          onChange={event =>
            setForm(previous => ({...previous, estruturaRoteiro: event.target.value || null}))
          }
          placeholder="Estrutura base para reaproveitar no modal de conteudo"
          className="w-full resize-none"
        />
      </div>

      <div className="space-y-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
        <p className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
          Hashtags por plataforma
        </p>
        {platformNames.map(platform => (
          <div key={platform} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-[10px] font-bold text-[var(--text-primary)] opacity-60">
              {platform}
            </span>
            <input
              type="text"
              value={form.plataformas.find(item => item.platformId === platform)?.hashtags || ''}
              onChange={event => updatePlatformHashtags(platform, event.target.value)}
              placeholder="#hashtag1 #hashtag2"
              className="flex-1"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
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
  const {state, dispatch} = useAppContext();
  const {user} = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [panelMode, setPanelMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{message: string; onConfirm: () => void} | null>(null);

  const editingSerie = useMemo(
    () => state.series.find(serie => serie.id === editingId) ?? null,
    [editingId, state.series]
  );

  const closePanel = () => {
    setEditingId(null);
    setPanelMode(null);
  };

  const handleSave = (serie: Serie) => {
    const payload = {...serie, userId: serie.userId || user?.id || ''};
    const exists = state.series.find(item => item.id === payload.id);

    if (exists) {
      dispatch({type: 'UPDATE_SERIE', payload});
    } else {
      dispatch({type: 'ADD_SERIE', payload});
    }

    closePanel();
  };

  const handleToggleActive = (serie: Serie) => {
    dispatch({
      type: 'UPDATE_SERIE',
      payload: {...serie, ativa: !serie.ativa, updatedAt: new Date().toISOString()},
    });
  };

  const handleDelete = (id: string) => {
    setConfirm({
      message: 'Excluir esta serie?',
      onConfirm: () => dispatch({type: 'DELETE_SERIE', payload: id}),
    });
  };

  const platformNames = state.platforms.filter(platform => platform.ativo).map(platform => platform.nome);

  if (isMobile) {
    return (
      <>
        <div className="min-h-full bg-[var(--bg-primary)]">
          <SeriesMobileScreen
            series={state.series}
            onSave={handleSave}
            onToggle={handleToggleActive}
            onDelete={(serieId) => handleDelete(serieId)}
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
          title="Series"
          icon={Layers}
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
              Nova serie
            </AppButton>
          }
        />
      </div>

      <div className="desktop-content-frame">
        <div className="mb-6 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
            Grid com painel lateral
          </p>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
            Clique na serie para editar identidade, roteiro-base e hashtags sem trocar de tela.
          </p>
        </div>

        {state.series.length === 0 ? (
          <div className="py-16 text-center">
            <Layers className="mx-auto mb-3 h-10 w-10 opacity-10" />
            <p className="text-sm font-black uppercase tracking-widest opacity-30">Nenhuma serie criada</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {state.series.map(serie => (
              <motion.button
                key={serie.id}
                type="button"
                initial={{opacity: 0, y: 8}}
                animate={{opacity: 1, y: 0}}
                onClick={() => {
                  setEditingId(serie.id);
                  setPanelMode('edit');
                }}
                className={`relative flex min-h-[240px] flex-col rounded-3xl border bg-[var(--bg-primary)] p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                  serie.ativa ? 'border-[var(--border-color)]' : 'border-[var(--border-color)] opacity-50'
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <span
                      className="mb-3 block h-4 w-4 rounded-full"
                      style={{backgroundColor: serie.cor || '#6366f1'}}
                    />
                    <h3 className="text-lg font-black text-[var(--text-primary)]">{serie.name}</h3>
                  </div>

                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation();
                      handleToggleActive(serie);
                    }}
                    title={serie.ativa ? 'Desativar' : 'Ativar'}
                  >
                    {serie.ativa ? (
                      <ToggleRight className="h-6 w-6 text-[var(--accent-green)]" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-[var(--text-tertiary)]" />
                    )}
                  </button>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-[var(--text-secondary)]">
                    {serie.frequenciaRecomendada || 'Sem frequencia definida'}
                  </p>
                  <p className="line-clamp-4 text-sm leading-6 text-[var(--text-secondary)]">
                    {serie.estruturaRoteiro || 'Sem estrutura de roteiro ainda.'}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[var(--bg-hover)] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                    {serie.bordao || 'Sem bordao'}
                  </span>
                  <span className="rounded-full bg-[var(--bg-hover)] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                    {serie.plataformas.length} plataformas
                  </span>
                </div>

                <div className="mt-auto flex items-center justify-between pt-6">
                  <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">
                    <Layers className="h-3.5 w-3.5" />
                    Abrir painel
                  </div>

                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation();
                      handleDelete(serie.id);
                    }}
                    className="rounded-xl p-2 transition-colors hover:bg-[var(--accent-pink)]/10"
                  >
                    <Trash2 className="h-4 w-4 text-[var(--accent-pink)] opacity-60 hover:opacity-100" />
                  </button>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      <SidePanel
        open={panelMode !== null}
        title={panelMode === 'edit' ? 'Editar serie' : 'Nova serie'}
        subtitle={
          panelMode === 'edit'
            ? 'Ajuste identidade e estrutura sem sair da grade.'
            : 'Crie uma nova serie recorrente com roteiro-base e hashtags.'
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
    </div>
  );
}
