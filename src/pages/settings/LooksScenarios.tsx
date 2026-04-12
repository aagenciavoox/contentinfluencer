import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Edit2, ToggleLeft, ToggleRight, Check, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { Look, Cenario } from '../../types';
import { generateUUID } from '../../utils/uuid';

type EditingLook = Omit<Look, 'id'> & { id?: string };
type EditingCenario = Omit<Cenario, 'id'> & { id?: string };

export function LooksSettings() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();

  const [editLookId, setEditLookId] = useState<string | null>(null);
  const [editCenarioId, setEditCenarioId] = useState<string | null>(null);
  const [criandoLook, setCriandoLook] = useState(false);
  const [criandoCenario, setCriandoCenario] = useState(false);

  const [lookForm, setLookForm] = useState<EditingLook>({
    numero: (state.looks.length > 0 ? Math.max(...state.looks.map(l => l.numero)) + 1 : 1),
    descricao: '',
    ativo: true,
  });

  const [cenarioForm, setCenarioForm] = useState<EditingCenario>({
    nome: '',
    descricao: '',
    tempoSetupMinutos: 5,
    ativo: true,
  });

  const saveLook = (form: EditingLook) => {
    if (!form.id) {
      dispatch({ type: 'ADD_LOOK', payload: { ...form, id: generateUUID() } as Look });
    } else {
      dispatch({ type: 'UPDATE_LOOK', payload: form as Look });
    }
    setCriandoLook(false);
    setEditLookId(null);
    setLookForm({ numero: Math.max(...state.looks.map(l => l.numero), 0) + 2, descricao: '', ativo: true });
  };

  const saveCenario = (form: EditingCenario) => {
    if (!form.id) {
      dispatch({ type: 'ADD_CENARIO', payload: { ...form, id: generateUUID() } as Cenario });
    } else {
      dispatch({ type: 'UPDATE_CENARIO', payload: form as Cenario });
    }
    setCriandoCenario(false);
    setEditCenarioId(null);
    setCenarioForm({ nome: '', descricao: '', tempoSetupMinutos: 5, ativo: true });
  };

  const activeLooks = state.looks.sort((a, b) => a.numero - b.numero);
  const activeCenarios = state.cenarios;

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <div className="content-narrow mx-auto px-6 md:px-12 py-10 md:py-16">
        <div className="flex items-center gap-4 mb-10">
          <button onClick={() => navigate('/settings')} className="p-2 hover:bg-[var(--bg-hover)] rounded-xl">
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)] opacity-50" />
          </button>
          <h1 className="t-display">Looks & Cenários</h1>
        </div>

        {/* LOOKS */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="t-label">
              Looks ({activeLooks.length})
            </h2>
            <button
              onClick={() => {
                setCriandoLook(true);
                setLookForm({ numero: Math.max(...state.looks.map(l => l.numero), 0) + 1, descricao: '', ativo: true });
              }}
              className="flex items-center gap-1.5 t-label px-3 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl hover:scale-[1.02] transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Look
            </button>
          </div>

          {criandoLook && (
            <div className="mb-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-5 space-y-3">
              <div className="flex gap-3">
                <div>
                  <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] block mb-1">Nº</label>
                  <input
                    type="number"
                    value={lookForm.numero}
                    onChange={e => setLookForm(p => ({ ...p, numero: parseInt(e.target.value) || 1 }))}
                    className="w-16 text-sm bg-[var(--bg-hover)] border-none rounded-lg px-2 py-2 text-[var(--text-primary)]"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] block mb-1">Descrição</label>
                  <input
                    type="text"
                    value={lookForm.descricao}
                    onChange={e => setLookForm(p => ({ ...p, descricao: e.target.value }))}
                    placeholder="Ex: Blusa bege, cabelo preso"
                    className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30"
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] block mb-1">Cenário Associado</label>
                <select
                  value={lookForm.cenarioAssociadoId || ''}
                  onChange={e => setLookForm(p => ({ ...p, cenarioAssociadoId: e.target.value || undefined }))}
                  className="text-sm bg-[var(--bg-hover)] border-none rounded-lg px-3 py-2 text-[var(--text-primary)]"
                >
                  <option value="">—</option>
                  {activeCenarios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCriandoLook(false)} className="flex-1 py-2 rounded-xl text-xs font-black border border-[var(--border-strong)] opacity-60 hover:opacity-100 transition-all">Cancelar</button>
                <button onClick={() => saveLook(lookForm)} className="flex-1 py-2 rounded-xl text-xs font-black bg-[var(--text-primary)] text-[var(--bg-primary)] hover:scale-[1.02] transition-all">Salvar</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {activeLooks.length === 0 ? (
              <p className="text-xs text-[var(--text-tertiary)] text-center py-8 font-bold">Nenhum look cadastrado ainda</p>
            ) : activeLooks.map(look => {
              const cenario = look.cenarioAssociadoId ? state.cenarios.find(c => c.id === look.cenarioAssociadoId) : null;
              return (
                <div key={look.id} className={`flex items-center gap-4 px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl ${!look.ativo ? 'opacity-40' : ''}`}>
                  {editLookId === look.id ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        defaultValue={look.descricao}
                        onBlur={e => dispatch({ type: 'UPDATE_LOOK', payload: { ...look, descricao: e.target.value } })}
                        className="flex-1 text-sm bg-[var(--bg-hover)] border-none rounded-lg px-3 py-1.5"
                        autoFocus
                      />
                      <button onClick={() => setEditLookId(null)} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-lg">
                        <Check className="w-4 h-4 text-[var(--accent-green)]" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="text-xs font-black text-[var(--text-tertiary)] w-12 shrink-0">Look {look.numero}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{look.descricao || '—'}</p>
                        {cenario && <p className="text-[10px] text-[var(--text-secondary)] opacity-50">{cenario.nome}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => dispatch({ type: 'UPDATE_LOOK', payload: { ...look, ativo: !look.ativo } })}>
                          {look.ativo
                            ? <ToggleRight className="w-5 h-5 text-[var(--accent-green)]" />
                            : <ToggleLeft className="w-5 h-5 text-[var(--text-tertiary)]" />
                          }
                        </button>
                        <button onClick={() => setEditLookId(look.id)} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-lg">
                          <Edit2 className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                        </button>
                        <button onClick={() => dispatch({ type: 'DELETE_LOOK', payload: look.id })} className="p-1.5 hover:bg-[var(--accent-pink)]/10 rounded-lg">
                          <Trash2 className="w-3.5 h-3.5 text-[var(--accent-pink)] opacity-40 hover:opacity-100" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* CENÁRIOS */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="t-label">
              Cenários ({activeCenarios.length})
            </h2>
            <button
              onClick={() => setCriandoCenario(true)}
              className="flex items-center gap-1.5 t-label px-3 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl hover:scale-[1.02] transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Cenário
            </button>
          </div>

          {criandoCenario && (
            <div className="mb-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="t-label block mb-1">Nome *</label>
                  <input
                    type="text"
                    value={cenarioForm.nome}
                    onChange={e => setCenarioForm(p => ({ ...p, nome: e.target.value }))}
                    placeholder="Ex: Mesa com livros"
                    className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30"
                  />
                </div>
                <div>
                  <label className="t-label block mb-1">Setup (min)</label>
                  <input
                    type="number"
                    value={cenarioForm.tempoSetupMinutos}
                    onChange={e => setCenarioForm(p => ({ ...p, tempoSetupMinutos: parseInt(e.target.value) || 0 }))}
                    className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-lg px-3 py-2 text-[var(--text-primary)]"
                  />
                </div>
              </div>
              <div>
                <label className="t-label block mb-1">Descrição</label>
                <input
                  type="text"
                  value={cenarioForm.descricao}
                  onChange={e => setCenarioForm(p => ({ ...p, descricao: e.target.value }))}
                  placeholder="Onde fica, como montar..."
                  className="w-full text-sm bg-[var(--bg-hover)] border-none rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:opacity-30"
                />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCriandoCenario(false)} className="flex-1 py-2 rounded-xl text-xs font-black border border-[var(--border-strong)] opacity-60 hover:opacity-100 transition-all">Cancelar</button>
                <button
                  onClick={() => cenarioForm.nome.trim() && saveCenario(cenarioForm)}
                  disabled={!cenarioForm.nome.trim()}
                  className="flex-1 py-2 rounded-xl text-xs font-black bg-[var(--text-primary)] text-[var(--bg-primary)] disabled:opacity-40 hover:scale-[1.02] transition-all"
                >Salvar</button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {activeCenarios.length === 0 ? (
              <p className="text-xs text-[var(--text-tertiary)] text-center py-8 font-bold">Nenhum cenário cadastrado ainda</p>
            ) : activeCenarios.map(cenario => (
              <div key={cenario.id} className={`flex items-center gap-4 px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl ${!cenario.ativo ? 'opacity-40' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--text-primary)]">{cenario.nome}</p>
                  <p className="text-[10px] text-[var(--text-secondary)] opacity-50">
                    {cenario.descricao}{cenario.descricao && ' · '}{cenario.tempoSetupMinutos}min de setup
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => dispatch({ type: 'UPDATE_CENARIO', payload: { ...cenario, ativo: !cenario.ativo } })}>
                    {cenario.ativo
                      ? <ToggleRight className="w-5 h-5 text-[var(--accent-green)]" />
                      : <ToggleLeft className="w-5 h-5 text-[var(--text-tertiary)]" />
                    }
                  </button>
                  <button onClick={() => dispatch({ type: 'DELETE_CENARIO', payload: cenario.id })} className="p-1.5 hover:bg-[var(--accent-pink)]/10 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5 text-[var(--accent-pink)] opacity-40 hover:opacity-100" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
