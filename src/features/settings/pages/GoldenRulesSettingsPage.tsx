import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {
  Info,
  Plus,
  ShieldAlert,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from 'lucide-react';
import {startOfWeek} from 'date-fns';
import {useAppContext} from '../../../context/AppContext';
import {ConfirmModal} from '../../../components/feedback/modals/ConfirmModal';
import {useIsMobile} from '../../../hooks/useIsMobile';
import {validateWeeklyContent} from '../../../utils/goldenRules';
import {DesktopPageHeader} from '../../../layouts/page/DesktopPageHeader';
import {GoldenRulesMobileScreen} from '../../../mobile/screens/settings/GoldenRulesMobileScreen';
import {generateUUID} from '../../../utils/uuid';
import {GoldenRule} from '../../../lib/database';

const CONDITION_OPTIONS: GoldenRule['condicao'][] = ['recomendado', 'impedir'];
const PERIOD_OPTIONS: GoldenRule['periodo'][] = ['semana', 'quinzena', 'mensal'];
const TYPE_OPTIONS: GoldenRule['tipo'][] = ['pilar', 'série', 'formato', 'publi', 'plataforma'];

const CONDITION_LABEL: Record<GoldenRule['condicao'], string> = {
  recomendado: 'Recomendado',
  impedir: 'Impedir agendamento',
};

const ICON_BY_CONDITION: Record<GoldenRule['condicao'], React.ElementType> = {
  impedir: ShieldAlert,
  recomendado: Info,
};

const STYLE_BY_CONDITION: Record<string, string> = {
  impedir: 'text-[var(--accent-pink)] bg-[var(--accent-pink)]/5',
  recomendado: 'text-[var(--accent-orange)] bg-[var(--accent-orange)]/5',
};

export function GoldenRulesSettingsPage() {
  const {state, dispatch} = useAppContext();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirm, setConfirm] = useState<{message: string; onConfirm: () => void} | null>(null);
  const [draft, setDraft] = useState({
    titulo: '',
    descricao: '',
    cor: '',
    tipo: 'publi' as GoldenRule['tipo'],
    condicao: 'recomendado' as GoldenRule['condicao'],
    periodo: 'semana' as GoldenRule['periodo'],
    minimo: '',
    maximo: '',
  });

  const weekStart = startOfWeek(new Date(), {weekStartsOn: 1});
  const violations = validateWeeklyContent(state.contents, weekStart, state.pilares, state.goldenRules);

  const toggleRegra = (id: string, ativa: boolean) => {
    const regra = state.goldenRules.find(rule => rule.id === id);
    if (!regra) return;
    dispatch({type: 'UPDATE_GOLDEN_RULE', payload: {...regra, ativa}});
  };

  const handleAddRule = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!draft.titulo.trim()) return;

    dispatch({
      type: 'ADD_GOLDEN_RULE',
      payload: {
        id: generateUUID(),
        userId: '',
        titulo: draft.titulo.trim(),
        descricao: draft.descricao.trim() || draft.titulo.trim(),
        cor: draft.cor || null,
        tipo: draft.tipo,
        condicao: draft.condicao,
        periodo: draft.periodo,
        valor: Number(draft.maximo || draft.minimo || 0),
        minimo: draft.minimo ? Number(draft.minimo) : null,
        maximo: draft.maximo ? Number(draft.maximo) : null,
        ativa: true,
        createdAt: new Date().toISOString(),
      },
    });

    setDraft({
      titulo: '',
      descricao: '',
      cor: '',
      tipo: 'publi',
      condicao: 'recomendado',
      periodo: 'semana',
      minimo: '',
      maximo: '',
    });
    setShowAddForm(false);
  };

  const handleDeleteRule = (id: string) => {
    setConfirm({
      message: 'Excluir esta regra permanentemente?',
      onConfirm: () => dispatch({type: 'DELETE_GOLDEN_RULE', payload: id}),
    });
  };

  if (isMobile) {
    return (
      <>
        <div className="min-h-full bg-[var(--bg-primary)]">
          <GoldenRulesMobileScreen
            rules={state.goldenRules}
            violations={violations}
            draft={draft}
            onDraftChange={setDraft}
            onCreate={handleAddRule}
            onToggle={rule => toggleRegra(rule.id, !rule.ativa)}
            onDelete={handleDeleteRule}
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
      <header className="desktop-header-sticky transition-colors duration-300">
        <div className="desktop-header-frame">
          <DesktopPageHeader
            section="Configurações"
            title="Regras de Ouro"
            icon={ShieldCheck}
            backLabel="Configurações"
            backTo="/configuracoes"
            actions={
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="t-button t-button-uppercase flex items-center gap-2 rounded-xl bg-[var(--text-primary)] px-4 py-2.5 text-[var(--bg-primary)] shadow-lg transition-all hover:scale-105"
              >
                <Plus className="h-4 w-4" /> Nova Regra
              </button>
            }
          />
        </div>
      </header>

      <div className="desktop-content-frame">
        {showAddForm && (
          <div className="mb-10 animate-in fade-in slide-in-from-top-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6 shadow-xl">
            <h3 className="mb-4 text-sm font-black uppercase tracking-widest text-[var(--text-secondary)]">
              Configurar Nova Regra
            </h3>
            <form onSubmit={handleAddRule} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
                    Título
                  </label>
                  <input
                    type="text"
                    value={draft.titulo}
                    onChange={event => setDraft(prev => ({...prev, titulo: event.target.value}))}
                    placeholder="Ex: Limite de hashtags por plataforma"
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
                    Tipo
                  </label>
                  <select
                    value={draft.tipo}
                    onChange={event => setDraft(prev => ({...prev, tipo: event.target.value as GoldenRule['tipo']}))}
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                  >
                    {TYPE_OPTIONS.map(tipo => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
                    Cor
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={draft.cor || '#6366f1'}
                      onChange={event => setDraft(prev => ({...prev, cor: event.target.value}))}
                      className="h-11 w-16 cursor-pointer rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1"
                    />
                    <span className="text-sm font-bold text-[var(--text-tertiary)]">
                      {draft.cor || 'Sem cor'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
                  Descrição
                </label>
                <input
                  type="text"
                  value={draft.descricao}
                  onChange={event => setDraft(prev => ({...prev, descricao: event.target.value}))}
                  placeholder="Contexto e orientação da regra"
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
                    Condição
                  </label>
                  <select
                    value={draft.condicao}
                    onChange={event =>
                      setDraft(prev => ({...prev, condicao: event.target.value as GoldenRule['condicao']}))
                    }
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                  >
                    {CONDITION_OPTIONS.map(option => (
                      <option key={option} value={option}>
                        {CONDITION_LABEL[option]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
                    Período
                  </label>
                  <select
                    value={draft.periodo}
                    onChange={event =>
                      setDraft(prev => ({...prev, periodo: event.target.value as GoldenRule['periodo']}))
                    }
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                  >
                    {PERIOD_OPTIONS.map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
                    Mínimo
                  </label>
                  <input
                    type="number"
                    value={draft.minimo}
                    onChange={event => setDraft(prev => ({...prev, minimo: event.target.value}))}
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
                    Máximo
                  </label>
                  <input
                    type="number"
                    value={draft.maximo}
                    onChange={event => setDraft(prev => ({...prev, maximo: event.target.value}))}
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={!draft.titulo.trim()}
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
                  <span className="w-20 shrink-0 text-[10px] font-black text-[var(--accent-orange)]">
                    {violation.ruleId}
                  </span>
                  <p className="text-xs text-orange-700">{violation.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {state.goldenRules.map(rule => {
            const Icon = ICON_BY_CONDITION[rule.condicao] || Info;
            const matchingViolations = violations.filter(item => item.ruleId === rule.id);

            return (
              <div
                key={rule.id}
                className={`flex items-start gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-5 py-4 ${
                  !rule.ativa ? 'opacity-40' : ''
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                    rule.cor ? '' : STYLE_BY_CONDITION[rule.condicao] || STYLE_BY_CONDITION.recomendado
                  }`}
                  style={rule.cor ? {backgroundColor: `${rule.cor}18`, color: rule.cor} : undefined}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-[var(--text-primary)]">
                      {rule.titulo || rule.descricao}
                    </span>
                    <span className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                      {rule.tipo}
                    </span>
                    <span className="rounded-full bg-[var(--bg-hover)] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">
                      {rule.periodo}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${
                        STYLE_BY_CONDITION[rule.condicao] || STYLE_BY_CONDITION.recomendado
                      }`}
                    >
                      {CONDITION_LABEL[rule.condicao]}
                    </span>
                    {matchingViolations.length > 0 && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[9px] font-black text-orange-700">
                        {matchingViolations.length} violação{matchingViolations.length > 1 ? 'ões' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-[var(--text-secondary)] opacity-80">{rule.descricao}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)] opacity-60">
                    min {rule.minimo ?? '—'} · max {rule.maximo ?? '—'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className="p-1 text-[var(--accent-pink)] opacity-20 transition-opacity hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => toggleRegra(rule.id, !rule.ativa)}>
                    {rule.ativa ? (
                      <ToggleRight className="h-6 w-6 text-[var(--accent-green)]" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-[var(--text-tertiary)]" />
                    )}
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
        onConfirm={() => {
          confirm?.onConfirm();
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
