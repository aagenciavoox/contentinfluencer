import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, ShieldCheck, ShieldAlert, Info, ToggleLeft, ToggleRight, Plus } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { validateWeeklyContent } from '../../utils/goldenRules';
import { startOfWeek } from 'date-fns';
import { DesktopPageHeader } from '../../components/layout/DesktopPageHeader';
import { useIsMobile } from '../../hooks/useIsMobile';
import { generateUUID } from '../../utils/uuid';

const TIPO_ICON = {
  max: ShieldAlert,
  recomendado: Info,
  min: ShieldCheck,
};

const TIPO_COR: Record<string, string> = {
  max: 'text-[var(--accent-pink)] bg-[var(--accent-pink)]/5',
  recomendado: 'text-[var(--accent-orange)] bg-[var(--accent-orange)]/5',
  min: 'text-[var(--accent-blue)] bg-[var(--accent-blue)]/5',
};

export function RegrasDeOuro() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRuleDesc, setNewRuleDesc] = useState('');
  const [newRuleType, setNewRuleType] = useState<'max' | 'recomendado' | 'min'>('recomendado');
  const [confirm, setConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const violations = validateWeeklyContent(state.contents, weekStart, state.pilares);

  const toggleRegra = (id: string, ativa: boolean) => {
    const regra = state.goldenRules.find(r => r.id === id);
    if (!regra) return;
    dispatch({ type: 'UPDATE_GOLDEN_RULE', payload: { ...regra, ativa } });
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleDesc.trim()) return;

    dispatch({
      type: 'ADD_GOLDEN_RULE',
      payload: {
        id: generateUUID(),
        userId: '',
        descricao: newRuleDesc,
        tipo: 'formato' as const,
        condicao: newRuleType,
        periodo: 'semana',
        valor: 1,
        ativa: true,
        createdAt: new Date().toISOString(),
      },
    });
    setNewRuleDesc('');
    setShowAddForm(false);
  };

  const handleDeleteRule = (id: string) => {
    setConfirm({ message: 'Excluir esta regra permanentemente?', onConfirm: () => dispatch({ type: 'DELETE_GOLDEN_RULE', payload: id }) });
  };

  const regras = state.goldenRules;

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <header className="desktop-header-sticky transition-colors duration-300">
        <div className="desktop-header-frame">
        <DesktopPageHeader
          section="Configurações"
          title="Regras de Ouro"
          subtitle="Aplique validações editoriais para proteger consistência, cadência e distribuição."
          icon={ShieldCheck}
          backLabel="Configurações"
          onBack={() => navigate('/configuracoes')}
          actions={(
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="t-button t-button-uppercase flex items-center gap-2 rounded-xl bg-[var(--text-primary)] px-4 py-2.5 text-[var(--bg-primary)] shadow-lg transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" /> Nova Regra
            </button>
          )}
        />
        </div>
      </header>

      <div className="desktop-content-frame">
        {showAddForm && (
          <div className="mb-10 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6 shadow-xl animate-in fade-in slide-in-from-top-4">
            <h3 className="t-section-title mb-4 text-[var(--text-secondary)]">Configurar Nova Regra</h3>
            <form onSubmit={handleAddRule} className="space-y-4">
              <div>
                <label className="mb-2 block t-label text-[var(--text-tertiary)] opacity-60">Descrição/Instrução</label>
                <input
                  type="text"
                  value={newRuleDesc}
                  onChange={(e) => setNewRuleDesc(e.target.value)}
                  placeholder="Ex: Não postar mais de 3 Reels por semana"
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-2 block t-label text-[var(--text-tertiary)] opacity-60">Condição</label>
                {isMobile ? (
                  <select
                    value={newRuleType}
                    onChange={(e) => setNewRuleType(e.target.value as 'max' | 'recomendado' | 'min')}
                    className="filter-select t-label w-full"
                  >
                    <option value="min">Mínimo</option>
                    <option value="recomendado">Recomendado</option>
                    <option value="max">Máximo</option>
                  </select>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {(['min', 'recomendado', 'max'] as const).map((tipo) => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => setNewRuleType(tipo)}
                        className={`t-button t-button-uppercase rounded-xl border-2 py-3 transition-all ${newRuleType === tipo ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]' : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]'}`}
                      >
                        {tipo}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!newRuleDesc.trim()}
                  className="flex-1 rounded-xl bg-[var(--accent-blue)] py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:opacity-90 disabled:opacity-20"
                >
                  Salvar Regra
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-xl border border-[var(--border-color)] px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] transition-all hover:bg-[var(--bg-hover)]"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {violations.length > 0 && (
          <div className="mb-8 rounded-2xl border border-orange-200 bg-orange-50 p-5">
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-orange-700">
              {violations.length} violação{violations.length > 1 ? 'ões' : ''} esta semana
            </p>
            <div className="space-y-2">
              {violations.map((violation, index) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="w-12 shrink-0 text-[10px] font-black text-[var(--accent-orange)]">{violation.ruleId}</span>
                  <p className="text-xs text-orange-700">{violation.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {regras.map((regra) => {
            const Icon = TIPO_ICON[regra.condicao as keyof typeof TIPO_ICON] || Info;
            const violacoes = violations.filter(v => v.ruleId === regra.id);
            return (
              <div
                key={regra.id}
                className={`flex items-start gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-5 py-4 ${!regra.ativa ? 'opacity-40' : ''}`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${TIPO_COR[regra.condicao] || TIPO_COR.recomendado}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2">
                    <span className="text-[10px] font-black text-[var(--text-tertiary)]">{regra.id}</span>
                    {violacoes.length > 0 && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-black text-orange-700">
                        {violacoes.length} violação{violacoes.length > 1 ? 'ões' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-[var(--text-primary)]">{regra.descricao}</p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <button
                    onClick={() => handleDeleteRule(regra.id)}
                    className="p-1 text-[var(--accent-pink)] opacity-20 transition-opacity hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => toggleRegra(regra.id, !regra.ativa)}>
                    {regra.ativa
                      ? <ToggleRight className="h-6 w-6 text-[var(--accent-green)]" />
                      : <ToggleLeft className="h-6 w-6 text-[var(--text-tertiary)]" />}
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
