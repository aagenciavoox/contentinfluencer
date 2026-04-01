import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Plus, Edit2, Trash2, X, Check, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Pilar } from '../../types';
import { generateUUID } from '../../utils/uuid';

const PRESET_CORES = [
  '#F5C543', '#4A90D9', '#E8A0BF', '#D44C47',
  '#448361', '#9065B0', '#2EAADC', '#D9730D',
  '#F5F0E4', '#37352F',
];

function PilarForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Partial<Pilar>;
  onSave: (p: Pilar) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Pilar>({
    id: initial.id || generateUUID(),
    nome: initial.nome || '',
    descricao: initial.descricao || '',
    cor: initial.cor || '#F5C543',
    hashtagsInstagram: initial.hashtagsInstagram || '',
    hashtagsTikTok: initial.hashtagsTikTok || '',
    hashtagsYouTube: initial.hashtagsYouTube || '',
    templateLegenda: initial.templateLegenda || '',
    ativo: initial.ativo ?? true,
  });

  return (
    <div className="bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)] p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-40 block mb-1.5">Nome *</label>
          <input
            type="text"
            value={form.nome}
            onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
            placeholder="Ex: Humor"
            className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30"
          />
        </div>
        <div>
          <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-40 block mb-1.5">Descrição</label>
          <input
            type="text"
            value={form.descricao}
            onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
            placeholder="Em que conteúdos aparece?"
            className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30"
          />
        </div>
      </div>

      {/* Cor */}
      <div>
        <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-40 block mb-2">Cor</label>
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
        <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-40 block">Hashtag Combos</label>
        {['Instagram', 'TikTok', 'YouTube'].map(plat => {
          const key = `hashtags${plat}` as keyof Pilar;
          return (
            <div key={plat} className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-[var(--text-primary)] opacity-50 w-20 shrink-0">{plat}</span>
              <input
                type="text"
                value={form[key] as string}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                placeholder="#hashtag1 #hashtag2 ..."
                className="flex-1 text-xs bg-[var(--bg-hover)] border-none rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30"
              />
            </div>
          );
        })}
      </div>

      {/* Template de Legenda */}
      <div>
        <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-primary)] opacity-40 block mb-1.5">Template de Legenda</label>
        <textarea
          value={form.templateLegenda}
          onChange={e => setForm(p => ({ ...p, templateLegenda: e.target.value }))}
          rows={4}
          placeholder="Gancho: [...]&#10;&#10;Corpo: [...]&#10;&#10;CTA: [...]"
          className="w-full text-xs bg-[var(--bg-hover)] border-none rounded-xl px-3 py-2 text-[var(--text-primary)] resize-none placeholder:opacity-30"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-[var(--text-primary)] border border-[var(--border-strong)] opacity-60 hover:opacity-100 transition-all"
        >
          Cancelar
        </button>
        <button
          onClick={() => form.nome.trim() && onSave(form)}
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
    if (window.confirm('Excluir este pilar?')) {
      dispatch({ type: 'DELETE_PILAR', payload: id });
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-12">
        <div className="flex items-center gap-4 mb-10">
          <button onClick={() => navigate('/settings')} className="p-2 hover:bg-[var(--bg-hover)] rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)] opacity-50" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-black text-[var(--text-primary)]">Pilares Editoriais</h1>
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

        <div className="space-y-4">
          {state.pilares.map(pilar => (
            <div key={pilar.id}>
              {editandoId === pilar.id ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <PilarForm
                    initial={pilar}
                    onSave={handleSave}
                    onCancel={() => setEditandoId(null)}
                  />
                </motion.div>
              ) : (
                <div
                  className={`flex items-center gap-4 px-5 py-4 bg-[var(--bg-primary)] border rounded-2xl transition-all ${
                    pilar.ativo ? 'border-[var(--border-color)]' : 'border-[var(--border-color)] opacity-40'
                  }`}
                >
                  {/* Cor */}
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: pilar.cor }} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-[var(--text-primary)]">{pilar.nome}</p>
                    {pilar.descricao && (
                      <p className="text-xs text-[var(--text-secondary)] opacity-50 truncate">{pilar.descricao}</p>
                    )}
                    {pilar.hashtagsInstagram && (
                      <p className="text-[10px] text-[var(--accent-blue)] opacity-60 mt-0.5 truncate">
                        IG: {pilar.hashtagsInstagram}
                      </p>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleToggleAtivo(pilar)} title={pilar.ativo ? 'Desativar' : 'Ativar'}>
                      {pilar.ativo
                        ? <ToggleRight className="w-5 h-5 text-[var(--accent-green)]" />
                        : <ToggleLeft className="w-5 h-5 text-[var(--text-primary)] opacity-30" />
                      }
                    </button>
                    <button onClick={() => setEditandoId(pilar.id)} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-lg transition-colors">
                      <Edit2 className="w-3.5 h-3.5 text-[var(--text-primary)] opacity-40" />
                    </button>
                    <button onClick={() => handleDelete(pilar.id)} className="p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-red-500 opacity-40 hover:opacity-100" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
