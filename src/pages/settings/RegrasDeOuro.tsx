import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, ShieldAlert, Info, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { GOLDEN_RULES } from '../../constants';
import { validateWeeklyContent } from '../../utils/goldenRules';
import { startOfWeek } from 'date-fns';

const TIPO_ICON = {
  error: ShieldAlert,
  warning: ShieldAlert,
  info: Info,
};

const TIPO_COR: Record<string, string> = {
  error: 'text-red-500 bg-red-50',
  warning: 'text-orange-500 bg-orange-50',
  info: 'text-blue-500 bg-blue-50',
};

export function RegrasDeOuro() {
  const { state, dispatch } = useAppContext();
  const navigate = useNavigate();

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const violations = validateWeeklyContent(state.contents, weekStart);

  const toggleRegra = (id: string, ativa: boolean) => {
    const regras = state.goldenRules || GOLDEN_RULES;
    dispatch({
      type: 'UPDATE_GOLDEN_RULES' as any,
      payload: regras.map((r: any) => r.id === id ? { ...r, ativa } : r),
    });
  };

  const regras = (state as any).goldenRules || GOLDEN_RULES;

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <div className="max-w-3xl mx-auto px-6 md:px-12 py-12">
        <div className="flex items-center gap-4 mb-10">
          <button onClick={() => navigate('/settings')} className="p-2 hover:bg-[var(--bg-hover)] rounded-xl">
            <ArrowLeft className="w-5 h-5 text-[var(--text-primary)] opacity-50" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-black text-[var(--text-primary)]">Regras de Ouro</h1>
            <p className="text-xs text-[var(--text-secondary)] opacity-50 mt-1">
              Validações editoriais aplicadas automaticamente na grade
            </p>
          </div>
        </div>

        {/* Violações da semana atual */}
        {violations.length > 0 && (
          <div className="mb-8 bg-orange-50 border border-orange-200 rounded-2xl p-5">
            <p className="text-xs font-black uppercase tracking-widest text-orange-700 mb-3">
              {violations.length} violação{violations.length > 1 ? 'ões' : ''} esta semana
            </p>
            <div className="space-y-2">
              {violations.map((v, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-[10px] font-black text-orange-500 w-12 shrink-0">{v.ruleId}</span>
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
                <button
                  onClick={() => toggleRegra(regra.id, !regra.ativa)}
                  className="shrink-0"
                >
                  {regra.ativa
                    ? <ToggleRight className="w-6 h-6 text-[var(--accent-green)]" />
                    : <ToggleLeft className="w-6 h-6 text-[var(--text-primary)] opacity-30" />
                  }
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
