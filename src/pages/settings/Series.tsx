import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import type { Serie } from '../../lib/database';
import { cn } from '../../lib/utils';

const FREQUENCIAS = ['Semanal', 'Quinzenal', 'Mensal', 'Sob demanda'] as const;

export function SeriesSettings() {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form nova série
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('#6366f1');
  const [frequencia, setFrequencia] = useState<string>('Semanal');
  const [estruturaRoteiro, setEstruturaRoteiro] = useState('');
  const [bordao, setBordao] = useState('');

  const handleCreate = () => {
    if (!nome.trim()) return;
    const serie: Serie = {
      id: crypto.randomUUID(),
      userId: user?.id || '',
      name: nome.trim(),
      template: '',
      notes: '',
      slotPadrao: null,
      formatoVisualPadrao: null,
      estruturaRoteiro: estruturaRoteiro.trim() || null,
      bordao: bordao.trim() || null,
      cor: cor,
      ativa: true,
      frequenciaRecomendada: frequencia,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pilarIds: [],
      plataformas: [],
    };
    dispatch({ type: 'ADD_SERIE', payload: serie });
    setNome('');
    setCor('#6366f1');
    setFrequencia('Semanal');
    setEstruturaRoteiro('');
    setBordao('');
    setShowForm(false);
  };

  const toggleAtiva = (serie: Serie) => {
    dispatch({ type: 'UPDATE_SERIE', payload: { ...serie, ativa: !serie.ativa, updatedAt: new Date().toISOString() } });
  };

  const deleteSerie = (id: string) => {
    if (!window.confirm('Excluir esta série?')) return;
    dispatch({ type: 'DELETE_SERIE', payload: id });
  };

  const updateField = (serie: Serie, field: keyof Serie, value: any) => {
    dispatch({ type: 'UPDATE_SERIE', payload: { ...serie, [field]: value, updatedAt: new Date().toISOString() } });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <div className="content-narrow mx-auto px-6 md:px-12 py-10 md:py-16">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/configuracoes')}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-80 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Configurações
          </button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.4em] mb-2 italic">
                Configurações
              </p>
              <h1 className="text-4xl font-black text-[var(--text-primary)] leading-none tracking-tight flex items-center gap-3">
                <Layers className="w-9 h-9 opacity-20" />
                Séries
              </h1>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-5 py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 shrink-0 mt-2"
            >
              <Plus className="w-4 h-4" />
              Nova série
            </button>
          </div>
        </div>

        {/* Form nova série */}
        {showForm && (
          <div className="mb-6 p-6 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Nova Série</p>
            <div className="flex gap-3">
              <input
                autoFocus
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Nome da série"
                className="flex-1 px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
              />
              <input
                type="color"
                value={cor}
                onChange={e => setCor(e.target.value)}
                className="w-12 h-12 rounded-xl border border-[var(--border-color)] cursor-pointer bg-transparent"
                title="Cor da série"
              />
            </div>
            <select
              value={frequencia}
              onChange={e => setFrequencia(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[11px] font-black uppercase text-[var(--text-primary)] focus:outline-none"
            >
              {FREQUENCIAS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
            <input
              value={estruturaRoteiro}
              onChange={e => setEstruturaRoteiro(e.target.value)}
              placeholder="Estrutura do roteiro (opcional)"
              className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
            />
            <input
              value={bordao}
              onChange={e => setBordao(e.target.value)}
              placeholder="Bordão (opcional)"
              className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
            />
            <div className="flex gap-3">
              <button onClick={handleCreate} disabled={!nome.trim()} className="px-6 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-30">Criar</button>
              <button onClick={() => setShowForm(false)} className="px-6 py-2.5 border border-[var(--border-color)] rounded-xl text-[11px] font-black uppercase tracking-widest opacity-50 hover:opacity-80">Cancelar</button>
            </div>
          </div>
        )}

        {/* Lista */}
        {state.series.length === 0 ? (
          <div className="text-center py-16">
            <Layers className="w-10 h-10 mx-auto opacity-10 mb-3" />
            <p className="text-sm font-black uppercase tracking-widest opacity-30">Nenhuma série criada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {state.series.map(serie => {
              const isOpen = expandedId === serie.id;
              return (
                <div key={serie.id} className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-4 px-5 py-4">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: serie.cor || '#6366f1' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-[var(--text-primary)] truncate">{serie.name}</p>
                      <p className="text-[10px] font-bold opacity-40 mt-0.5">{serie.frequenciaRecomendada || 'Sem frequência'}</p>
                    </div>
                    <button
                      onClick={() => toggleAtiva(serie)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all',
                        serie.ativa ? 'bg-green-400/10 text-green-400' : 'bg-zinc-800 text-zinc-500'
                      )}
                    >
                      {serie.ativa ? 'Ativa' : 'Inativa'}
                    </button>
                    <button
                      onClick={() => setExpandedId(isOpen ? null : serie.id)}
                      className="p-2 opacity-30 hover:opacity-80 transition-opacity"
                    >
                      {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => deleteSerie(serie.id)}
                      className="p-2 opacity-20 hover:opacity-60 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {isOpen && (
                    <div className="border-t border-[var(--border-color)] px-5 py-4 space-y-3">
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Nome</p>
                          <input
                            defaultValue={serie.name}
                            onBlur={e => updateField(serie, 'name', e.target.value.trim() || serie.name)}
                            className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                          />
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Cor</p>
                          <input
                            type="color"
                            defaultValue={serie.cor || '#6366f1'}
                            onBlur={e => updateField(serie, 'cor', e.target.value)}
                            className="w-10 h-9 rounded-lg border border-[var(--border-color)] cursor-pointer bg-transparent"
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Frequência</p>
                        <select
                          defaultValue={serie.frequenciaRecomendada || 'Semanal'}
                          onBlur={e => updateField(serie, 'frequenciaRecomendada', e.target.value)}
                          className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-[11px] font-black uppercase text-[var(--text-primary)] focus:outline-none"
                        >
                          {FREQUENCIAS.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Estrutura do roteiro</p>
                        <textarea
                          defaultValue={serie.estruturaRoteiro || ''}
                          onBlur={e => updateField(serie, 'estruturaRoteiro', e.target.value.trim() || null)}
                          rows={2}
                          className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none resize-none"
                        />
                      </div>
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Bordão</p>
                        <input
                          defaultValue={serie.bordao || ''}
                          onBlur={e => updateField(serie, 'bordao', e.target.value.trim() || null)}
                          className="w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
