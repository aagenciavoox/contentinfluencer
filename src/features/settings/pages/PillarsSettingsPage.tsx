import {useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {motion} from 'motion/react';
import {Edit2, Palette, Plus, ToggleLeft, ToggleRight, Trash2} from 'lucide-react';
import {ConfirmModal} from '../../../components/feedback/modals/ConfirmModal';
import {SidePanel} from '../../../components/layout/SidePanel';
import {AppButton} from '../../../components/ui/AppButton';
import {useAppContext} from '../../../context/AppContext';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {Pilar} from '../../../lib/database';
import {generateUUID} from '../../../utils/uuid';

const PRESET_CORES = [
  '#F5C543',
  '#4A90D9',
  '#E8A0BF',
  '#D44C47',
  '#448361',
  '#9065B0',
  '#2EAADC',
  '#D9730D',
  '#F5F0E4',
  '#37352F',
];

const HASHTAG_PLATFORMS = ['Instagram', 'TikTok', 'YouTube'];

function PilarForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Partial<Pilar>;
  onSave: (p: Pilar) => void;
  onCancel: () => void;
}) {
  const id = initial.id || generateUUID();
  const [form, setForm] = useState<Omit<Pilar, 'plataformas' | 'createdAt' | 'updatedAt'>>({
    id,
    userId: initial.userId || '',
    nome: initial.nome || '',
    descricao: initial.descricao || '',
    cor: initial.cor || '#F5C543',
    ativo: initial.ativo ?? true,
  });
  const [hashtags, setHashtags] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    (initial.plataformas || []).forEach(platform => {
      map[platform.platformId] = platform.hashtags;
    });
    return map;
  });

  const handleSave = () => {
    if (!form.nome.trim()) return;

    onSave({
      ...form,
      plataformas: HASHTAG_PLATFORMS
        .filter(platform => hashtags[platform]?.trim())
        .map(platform => ({
          pilarId: id,
          platformId: platform,
          hashtags: hashtags[platform].trim(),
        })),
      createdAt: initial.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="t-label mb-1.5 block">Nome *</label>
          <input
            type="text"
            value={form.nome}
            onChange={event => setForm(prev => ({...prev, nome: event.target.value}))}
            placeholder="Ex: Humor"
            className="w-full"
          />
        </div>

        <div>
          <label className="t-label mb-1.5 block">Descricao</label>
          <input
            type="text"
            value={form.descricao}
            onChange={event => setForm(prev => ({...prev, descricao: event.target.value}))}
            placeholder="Em que conteudos aparece?"
            className="w-full"
          />
        </div>
      </div>

      <div>
        <label className="t-label mb-2 block">Cor</label>
        <div className="flex flex-wrap items-center gap-3">
          {PRESET_CORES.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => setForm(prev => ({...prev, cor: color}))}
              className={`h-7 w-7 rounded-full border-2 transition-all ${form.cor === color ? 'scale-110 border-[var(--text-primary)]' : 'border-transparent'}`}
              style={{backgroundColor: color}}
            />
          ))}

          <input
            type="color"
            value={form.cor}
            onChange={event => setForm(prev => ({...prev, cor: event.target.value}))}
            className="h-7 w-7 cursor-pointer rounded-full border-none"
            title="Cor personalizada"
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="block text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
          Hashtag combos
        </label>

        {HASHTAG_PLATFORMS.map(platform => (
          <div key={platform} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-[10px] font-bold text-[var(--text-primary)] opacity-50">
              {platform}
            </span>
            <input
              type="text"
              value={hashtags[platform] || ''}
              onChange={event => setHashtags(prev => ({...prev, [platform]: event.target.value}))}
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
        <AppButton onClick={handleSave} disabled={!form.nome.trim()} variant="primary">
          Salvar
        </AppButton>
      </div>
    </div>
  );
}

export function PillarsSettingsPage() {
  const {state, dispatch} = useAppContext();
  const navigate = useNavigate();
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

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <div className="desktop-header-frame">
        <DesktopPageHeader
          section="Configuracoes"
          title="Pilares editoriais"
          subtitle={`${state.pilares.length} pilares configurados`}
          icon={Palette}
          backLabel="Configuracoes"
          onBack={() => navigate('/configuracoes')}
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
        <div className="mb-6 rounded-3xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
            Grid com painel lateral
          </p>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
            Clique no card para abrir o painel lateral mantendo toda a colecao visivel.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {state.pilares.map(pilar => (
            <motion.button
              key={pilar.id}
              type="button"
              initial={{opacity: 0, y: 8}}
              animate={{opacity: 1, y: 0}}
              onClick={() => {
                setEditingId(pilar.id);
                setPanelMode('edit');
              }}
              className={`relative flex min-h-[220px] flex-col rounded-3xl border bg-[var(--bg-primary)] p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                pilar.ativo ? 'border-[var(--border-color)]' : 'border-[var(--border-color)] opacity-50'
              }`}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <span
                    className="mb-3 block h-4 w-4 rounded-full"
                    style={{backgroundColor: pilar.cor}}
                  />
                  <h3 className="text-lg font-black text-[var(--text-primary)]">{pilar.nome}</h3>
                </div>

                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    handleToggleActive(pilar);
                  }}
                  title={pilar.ativo ? 'Desativar' : 'Ativar'}
                >
                  {pilar.ativo ? (
                    <ToggleRight className="h-6 w-6 text-[var(--accent-green)]" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-[var(--text-tertiary)]" />
                  )}
                </button>
              </div>

              <p className="min-h-[48px] text-sm leading-6 text-[var(--text-secondary)]">
                {pilar.descricao || 'Sem descricao ainda.'}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-[var(--bg-hover)] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                  {pilar.plataformas.length} plataformas
                </span>
                <span className="rounded-full bg-[var(--bg-hover)] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                  {pilar.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="mt-auto flex items-center justify-between pt-6">
                <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">
                  <Edit2 className="h-3.5 w-3.5" />
                  Abrir painel
                </div>

                <button
                  type="button"
                  onClick={event => {
                    event.stopPropagation();
                    handleDelete(pilar.id);
                  }}
                  className="rounded-xl p-2 transition-colors hover:bg-[var(--accent-pink)]/10"
                >
                  <Trash2 className="h-4 w-4 text-[var(--accent-pink)] opacity-60 hover:opacity-100" />
                </button>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <SidePanel
        open={panelMode !== null}
        title={panelMode === 'edit' ? 'Editar pilar' : 'Novo pilar'}
        subtitle={
          panelMode === 'edit'
            ? 'Ajuste nome, cor e hashtags sem sair da grade.'
            : 'Crie um novo pilar editorial e deixe os combos de hashtags prontos.'
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
