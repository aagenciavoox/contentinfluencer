import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, ArrowLeft, ShieldCheck, ShieldAlert, Info, ToggleLeft, ToggleRight, Plus } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { ConfirmModal } from '../../components/ConfirmModal';
import { GOLDEN_RULES } from '../../constants';
import { validateWeeklyContent } from '../../utils/goldenRules';
import { startOfWeek } from 'date-fns';

const TIPO_ICON = {
  error: ShieldAlert,
  warning: ShieldAlert,
  info: Info,
};

const TIPO_COR: Record<string, string> = {
  error: 'text-[var(--accent-pink)] bg-[var(--accent-pink)]/5',
  warning: 'text-[var(--accent-orange)] bg-[var(--accent-orange)]/5',
  info: 'text-[var(--accent-blue)] bg-[var(--accent-blue)]/5',
};

export function RegrasDeOuro() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newRuleType, setNewRuleType] = useState<'error' | 'warning' | 'info'>('info');
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const violations = validateWeeklyContent(state.contents, weekStart, state.pilares);

  const toggleRegra = (id: string, ativa: boolean) => {
    const regras = state.goldenRules || GOLDEN_RULES;
    dispatch({
      type: 'UPDATE_GOLDEN_RULES',
      payload: (regras as any).map((r: any) => r.id === id ? { ...r, ativa } : r),
    });
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleDesc.trim()) return;

    const newRule = {
      id: `USR-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      descricao: newRuleDesc,
      tipo: newRuleType,
      ativa: true,
    };

    dispatch({ type: 'ADD_GOLDEN_RULE', payload: newRule });
    setNewRuleDesc('');
    setShowAddForm(false);
  };

  const handleDeleteRule = (id: string) => {
    setConfirm({ message: 'Excluir esta regra permanentemente?', onConfirm: () => dispatch({ type: 'DELETE_GOLDEN_RULE', payload: id }) });
  };

  const regras = state.goldenRules || GOLDEN_RULES;

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-10 md:py-16">
        <div className="flex items-center gap-4 mb-10">
          <button onClick={() => navigate('/settings')} className="p-2 hover:bg-[var(--bg-hover)] rounded-xl">
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)] opacity-50" />
          </button>
          <div className="flex-1">
            <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight">Regras de Ouro</h1>
            <p className="text-xs text-[var(--text-secondary)] opacity-50 mt-1">
              Validações editoriais aplicadas automaticamente na grade
            </p>
          </div>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 bg-[var(--text-primary)] text-[var(--bg-primary)] px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
          >
            <Plus className="w-4 h-4" /> Nova Regra
          </button>
        </div>

        {/* Form para nova regra */}
        {showAddForm && (
          <div className="mb-10 p-6 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl shadow-xl animate-in fade-in slide-in-from-top-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-4">Configurar Nova Regra</h3>
            <form onSubmit={handleAddRule} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] mb-2 opacity-60">Descrição/Instrução</label>
                <input 
                  type="text"
                  value={newRuleDesc}
                  onChange={(e) => setNewRuleDesc(e.target.value)}
                  placeholder="Ex: Não postar mais de 3 Reels por semana"
                  className="w-full"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] mb-2 opacity-60">Severidade</label>
                <div className="grid grid-cols-3 gap-3">
                  {['info', 'warning', 'error'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewRuleType(t as any)}
                      className={`py-3 text-[10px] font-black uppercase tracking-widest rounded-xl border-2 transition-all ${newRuleType === t ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-[var(--text-primary)]' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)]'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="submit"
                  disabled={!newRuleDesc.trim()}
                  className="flex-1 bg-[var(--accent-blue)] text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-20"
                >
                  Salvar Regra
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-3 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[var(--bg-hover)] transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Violações da semana atual */}
        {violations.length > 0 && (
          <div className="mb-8 bg-orange-50 border border-orange-200 rounded-2xl p-5">
            <p className="text-xs font-black uppercase tracking-widest text-orange-700 mb-3">
              {violations.length} violação{violations.length > 1 ? 'ões' : ''} esta semana
            </p>
            <div className="space-y-2">
              {violations.map((v, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-[10px] font-black text-[var(--accent-orange)] w-12 shrink-0">{v.ruleId}</span>
                  <p className="text-xs text-orange-700">{v.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista das regras */}
        <div className="space-y-3">
          {regras.map((regra: any) => {
            const Icon = TIPO_ICON[regra.tipo as keyof typeof TIPO_ICON];
            const violacoes = violations.filter(v => v.ruleId === regra.id);
            return (
              <div
                key={regra.id}
                className={`flex items-start gap-4 px-5 py-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl ${!regra.ativa ? 'opacity-40' : ''}`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${TIPO_COR[regra.tipo]}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black text-[var(--text-primary)] opacity-30">{regra.id}</span>
                    {violacoes.length > 0 && (
                      <span className="text-[9px] font-black bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                        {violacoes.length} violação{violacoes.length > 1 ? 'ões' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{regra.descricao}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {!regra.id.startsWith('RG-') && (
                    <button
                      onClick={() => handleDeleteRule(regra.id)}
                      className="p-1 text-[var(--accent-pink)] opacity-20 hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => toggleRegra(regra.id, !regra.ativa)}
                  >
                    {regra.ativa
                      ? <ToggleRight className="w-6 h-6 text-[var(--accent-green)]" />
                      : <ToggleLeft className="w-6 h-6 text-[var(--text-primary)] opacity-30" />
                    }
                  </button>
                </div>
              </div>
            );
          })}
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
