import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, Edit2, Trash2, X, Check, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { ConfirmModal } from '../../components/ConfirmModal';
import { Pilar } from '../../lib/database';
import { generateUUID } from '../../utils/uuid';

const PRESET_CORES = [
  '#F5C543', '#4A90D9', '#E8A0BF', '#D44C47',
  '#448361', '#9065B0', '#2EAADC', '#D9730D',
  '#F5F0E4', '#37352F',
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
    (initial.plataformas || []).forEach(p => { map[p.platformId] = p.hashtags; });
    return map;
  });

  const handleSave = () => {
    if (!form.nome.trim()) return;
    const plataformas = HASHTAG_PLATFORMS
      .filter(plat => hashtags[plat]?.trim())
      .map(plat => ({ pilarId: id, platformId: plat, hashtags: hashtags[plat].trim() }));
    onSave({
      ...form,
      plataformas,
      createdAt: initial.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="t-label block mb-1.5">Nome *</label>
          <input
            type="text"
            value={form.nome}
            onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
            placeholder="Ex: Humor"
            className="w-full"
          />
        </div>
        <div>
          <label className="t-label block mb-1.5">Descrição</label>
          <input
            type="text"
            value={form.descricao}
            onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
            placeholder="Em que conteúdos aparece?"
            className="w-full"
          />
        </div>
      </div>

      {/* Cor */}
      <div>
        <label className="t-label block mb-2">Cor</label>
        <div className="flex items-center gap-3 flex-wrap">
          {PRESET_CORES.map(c => (
            <button
              key={c}
              onClick={() => setForm(p => ({ ...p, cor: c }))}
              className={`w-7 h-7 rounded-full border-2 transition-all ${form.cor === c ? 'border-[var(--text-primary)] scale-110' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={form.cor}
            onChange={e => setForm(p => ({ ...p, cor: e.target.value }))}
            className="w-7 h-7 rounded-full border-none cursor-pointer"
            title="Cor personalizada"
          />
        </div>
      </div>

      {/* Hashtags */}
      <div className="space-y-3">
        <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] block">Hashtag Combos</label>
        {HASHTAG_PLATFORMS.map(plat => (
          <div key={plat} className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-[var(--text-primary)] opacity-50 w-20 shrink-0">{plat}</span>
            <input
              type="text"
              value={hashtags[plat] || ''}
              onChange={e => setHashtags(h => ({ ...h, [plat]: e.target.value }))}
              placeholder="#hashtag1 #hashtag2 ..."
              className="flex-1"
            />
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-[var(--text-primary)] border border-[var(--border-strong)] opacity-60 hover:opacity-100 transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={!form.nome.trim()}
          className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest bg-[var(--text-primary)] text-[var(--bg-primary)] disabled:opacity-40 hover:scale-[1.02] transition-all"
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

export function PilaresSettings() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const handleSave = (p: Pilar) => {
    const existe = state.pilares.find(x => x.id === p.id);
    if (existe) {
      dispatch({ type: 'UPDATE_PILAR', payload: p });
    } else {
      dispatch({ type: 'ADD_PILAR', payload: p });
    }
    setEditandoId(null);
    setCriando(false);
  };

  const handleToggleAtivo = (p: Pilar) => {
    dispatch({ type: 'UPDATE_PILAR', payload: { ...p, ativo: !p.ativo } });
  };

  const handleDelete = (id: string) => {
    setConfirm({ message: 'Excluir este pilar?', onConfirm: () => dispatch({ type: 'DELETE_PILAR', payload: id }) });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <div className="content-narrow mx-auto px-6 md:px-12 py-10 md:py-16">
        <div className="flex items-center gap-4 mb-10">
          <button onClick={() => navigate('/settings')} className="p-2 hover:bg-[var(--bg-hover)] rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)] opacity-50" />
          </button>
          <div className="flex-1">
            <h1 className="t-display">Pilares Editoriais</h1>
            <p className="text-xs text-[var(--text-secondary)] opacity-50 mt-1">{state.pilares.length} pilares configurados</p>
          </div>
          <button
            onClick={() => setCriando(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo
          </button>
        </div>

        <AnimatePresence>
          {criando && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-6">
              <PilarForm
                initial={{}}
                onSave={handleSave}
                onCancel={() => setCriando(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 md:grid-cols-1 gap-3 md:gap-4">
          {state.pilares.map(pilar => (
            <div key={pilar.id}>
              {editandoId === pilar.id ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-2 md:col-span-1">
                  <PilarForm
                    initial={pilar}
                    onSave={handleSave}
                    onCancel={() => setEditandoId(null)}
                  />
                </motion.div>
              ) : (
                <div
                  className={`flex flex-col md:flex-row md:items-center gap-3 md:gap-4 px-4 py-4 md:px-5 md:py-4 bg-[var(--bg-primary)] border rounded-2xl transition-all h-full ${
                    pilar.ativo ? 'border-[var(--border-color)]' : 'border-[var(--border-color)] opacity-40'
                  }`}
                >
                  <div className="flex items-center justify-between md:contents">
                    {/* Cor */}
                    <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full shrink-0" style={{ backgroundColor: pilar.cor }} />
                    
                    {/* Ações Mobile Top */}
                    <div className="flex md:hidden items-center gap-1 shrink-0">
                      <button onClick={() => handleToggleAtivo(pilar)}>
                        {pilar.ativo ? <ToggleRight className="w-4 h-4 text-[var(--accent-green)]" /> : <ToggleLeft className="w-4 h-4 text-[var(--text-tertiary)]" />}
                      </button>
                      <button onClick={() => setEditandoId(pilar.id)} className="p-1"><Edit2 className="w-3 h-3 text-[var(--text-tertiary)]" /></button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-black text-[var(--text-primary)] truncate uppercase md:normal-case">{pilar.nome}</p>
                    {pilar.plataformas?.length > 0 && (
                      <div className="mt-1">
                        <span className="text-[7px] md:text-[8px] font-black bg-[var(--accent-blue)]/10 text-[var(--accent-blue)] px-1.5 py-0.5 rounded-full border border-[var(--accent-blue)]/20 uppercase tracking-widest whitespace-nowrap">
                          {pilar.plataformas.length} plataforma{pilar.plataformas.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Ações Desktop */}
                  <div className="hidden md:flex items-center gap-2 shrink-0">
                    <button onClick={() => handleToggleAtivo(pilar)} title={pilar.ativo ? 'Desativar' : 'Ativar'}>
                      {pilar.ativo
                        ? <ToggleRight className="w-5 h-5 text-[var(--accent-green)]" />
                        : <ToggleLeft className="w-5 h-5 text-[var(--text-tertiary)]" />
                      }
                    </button>
                    <button onClick={() => setEditandoId(pilar.id)} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-lg transition-colors">
                      <Edit2 className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                    </button>
                    <button onClick={() => handleDelete(pilar.id)} className="p-1.5 hover:bg-[var(--accent-pink)]/10 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-[var(--accent-pink)] opacity-40 hover:opacity-100" />
                    </button>
                  </div>
                  
                  {/* Delete Mobile (Bottom right discreet) */}
                  <button onClick={() => handleDelete(pilar.id)} className="md:hidden absolute bottom-2 right-2 p-1 opacity-20 hover:opacity-100">
                    <Trash2 className="w-3 h-3 text-[var(--accent-pink)]" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <ConfirmModal
        open={!!confirm}
        message={confirm?.message || ''}
        onConfirm={() => { confirm?.onConfirm(); setConfirm(null); }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
