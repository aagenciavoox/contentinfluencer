import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Users, Target, MessageSquare, Ban, ShieldAlert, Plus, X, Trash2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

export function DNAVozSettings() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [editData, setEditData] = useState(state.dnaVoz);
  const [newInput, setNewInput] = useState<{ field: string; value: string }>({ field: '', value: '' });

  const handleSave = () => {
    dispatch({ type: 'UPDATE_DNA_VOZ', payload: editData });
  };

  const handleAddItem = (field: 'naoFaco' | 'alertas' | 'pilares') => {
    if (!newInput.value.trim()) return;
    setEditData(p => ({ ...p, [field]: [...p[field], newInput.value] }));
    setNewInput({ field: '', value: '' });
  };

  const removeItem = (field: 'naoFaco' | 'alertas' | 'pilares', index: number) => {
    setEditData(p => ({ ...p, [field]: p[field].filter((_, i) => i !== index) }));
  };

  const isDirty = JSON.stringify(editData) !== JSON.stringify(state.dnaVoz);

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-10 md:py-16">
        <div className="flex items-center gap-4 mb-10">
          <button onClick={() => navigate('/settings')} className="p-2 hover:bg-[var(--bg-hover)] rounded-xl">
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)] opacity-50" />
          </button>
          <div className="flex-1">
            <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight">DNA da Voz</h1>
            <p className="text-xs text-[var(--text-secondary)] opacity-50 mt-1">
              Identidade editorial, tom e limites do seu conteúdo
            </p>
          </div>
          {isDirty && (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-[var(--accent-green)] text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-sm"
            >
              Salvar
            </button>
          )}
        </div>

        <div className="space-y-10">
          {/* Promessa Central */}
          <section className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4 text-[var(--text-primary)] opacity-40">
              <Zap className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-widest font-bold">Promessa Central</span>
            </div>
            <textarea
              value={editData.promessaCentral}
              onChange={e => setEditData(p => ({ ...p, promessaCentral: e.target.value }))}
              placeholder="O que você entrega para quem te segue?"
              className="w-full min-h-[80px] text-sm text-[var(--text-primary)] bg-[var(--bg-hover)] border-none rounded-xl p-4 focus:ring-0 resize-none placeholder:opacity-30"
            />
          </section>

          {/* Público */}
          <section className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4 text-[var(--text-primary)] opacity-40">
              <Users className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-widest font-bold">Público</span>
            </div>
            <textarea
              value={editData.publico}
              onChange={e => setEditData(p => ({ ...p, publico: e.target.value }))}
              placeholder="Para quem você cria? Ex: 'Leitoras de 20-35 anos apaixonadas por Fantasy e Dark Romance, que querem falar de livros com humor e sem vergonha.'"
              className="w-full min-h-[80px] text-sm text-[var(--text-primary)] bg-[var(--bg-hover)] border-none rounded-xl p-4 focus:ring-0 resize-none placeholder:opacity-30"
            />
          </section>

          {/* Valores & Pilares */}
          <section className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[var(--text-primary)] opacity-40">
                <Target className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-widest font-bold">Valores & Pilares</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Novo..."
                  className="text-[10px] py-1 px-3 border-none w-24 bg-[var(--bg-hover)] rounded-lg text-[var(--text-primary)] placeholder:opacity-30"
                  value={newInput.field === 'pilares' ? newInput.value : ''}
                  onChange={e => setNewInput({ field: 'pilares', value: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleAddItem('pilares')}
                />
                <button
                  onClick={() => handleAddItem('pilares')}
                  className="p-1.5 hover:bg-[var(--bg-hover)] rounded-full transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[var(--text-primary)] opacity-40" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {editData.pilares.map((p, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="px-3 py-1 text-xs rounded-full bg-[var(--text-primary)] text-[var(--bg-secondary)] font-bold">
                    {p}
                  </span>
                  <button
                    onClick={() => removeItem('pilares', i)}
                    className="text-[var(--text-primary)] opacity-30 hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {editData.pilares.length === 0 && (
                <p className="text-xs text-[var(--text-primary)] opacity-25 italic">Nenhum pilar adicionado ainda.</p>
              )}
            </div>
          </section>

          {/* Tom de Voz */}
          <section className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4 text-[var(--text-primary)] opacity-40">
              <MessageSquare className="w-4 h-4" />
              <span className="text-[10px] uppercase tracking-widest font-bold">Tom de Voz</span>
            </div>
            <textarea
              value={editData.tom}
              onChange={e => setEditData(p => ({ ...p, tom: e.target.value }))}
              placeholder="Como você fala? Ex: 'Direto, sem floreio, mas com calor humano. Jamais didático ou professoral.'"
              className="w-full min-h-[100px] text-sm text-[var(--text-primary)] bg-[var(--bg-hover)] border-none rounded-xl p-4 focus:ring-0 resize-none placeholder:opacity-30"
            />
          </section>

          {/* O que não faço */}
          <section className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[var(--text-primary)] opacity-40">
                <Ban className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-widest font-bold">O que não faço</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Novo proibido..."
                  className="text-[10px] py-1 px-3 border-none w-32 bg-[var(--bg-hover)] rounded-lg text-[var(--text-primary)] placeholder:opacity-30"
                  value={newInput.field === 'naoFaco' ? newInput.value : ''}
                  onChange={e => setNewInput({ field: 'naoFaco', value: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleAddItem('naoFaco')}
                />
                <button
                  onClick={() => handleAddItem('naoFaco')}
                  className="p-1.5 hover:bg-[var(--bg-hover)] rounded-full transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[var(--text-primary)] opacity-40" />
                </button>
              </div>
            </div>
            <ul className="space-y-3">
              {editData.naoFaco.map((item, i) => (
                <li key={i} className="flex items-start justify-between group">
                  <div className="flex items-start gap-3 text-sm text-[var(--text-primary)] opacity-80">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-pink)] mt-1.5 shrink-0" />
                    {item}
                  </div>
                  <button
                    onClick={() => removeItem('naoFaco', i)}
                    className="p-1 text-[var(--accent-pink)] opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
              {editData.naoFaco.length === 0 && (
                <p className="text-xs text-[var(--text-primary)] opacity-25 italic">Nenhum item adicionado ainda.</p>
              )}
            </ul>
          </section>

          {/* Alertas de Desvio */}
          <section className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-[var(--text-primary)] opacity-40">
                <ShieldAlert className="w-4 h-4" />
                <span className="text-[10px] uppercase tracking-widest font-bold">Alertas de Desvio</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Novo alerta..."
                  className="text-[10px] py-1 px-3 border-none w-32 bg-[var(--bg-hover)] rounded-lg text-[var(--text-primary)] placeholder:opacity-30"
                  value={newInput.field === 'alertas' ? newInput.value : ''}
                  onChange={e => setNewInput({ field: 'alertas', value: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleAddItem('alertas')}
                />
                <button
                  onClick={() => handleAddItem('alertas')}
                  className="p-1.5 hover:bg-[var(--bg-hover)] rounded-full transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[var(--text-primary)] opacity-40" />
                </button>
              </div>
            </div>
            <div className="space-y-3">
              {editData.alertas.map((alerta, i) => (
                <div key={i} className="relative group">
                  <div className="p-4 bg-[var(--accent-orange)]/5 border border-[var(--accent-orange)]/10 rounded-xl">
                    <p className="text-xs text-[var(--accent-orange)] leading-relaxed italic pr-6">"{alerta}"</p>
                  </div>
                  <button
                    onClick={() => removeItem('alertas', i)}
                    className="absolute top-2 right-2 p-1 text-[var(--accent-orange)] opacity-0 group-hover:opacity-100 hover:bg-[var(--accent-orange)]/10 rounded-full transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {editData.alertas.length === 0 && (
                <p className="text-xs text-[var(--text-primary)] opacity-25 italic">Nenhum alerta adicionado ainda.</p>
              )}
            </div>
          </section>

          {isDirty && (
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-[var(--accent-green)] text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-sm"
              >
                Salvar Alterações
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
