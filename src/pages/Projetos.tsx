import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Handshake, ChevronRight, Calendar, DollarSign } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import type { Projeto } from '../lib/database';
import { cn } from '../lib/utils';

type TipoFilter = 'todos' | 'campanha' | 'publi' | 'producao' | 'outro';
type StatusFilter = 'todos' | 'pendente' | 'em_andamento' | 'concluído';

function calcularStatus(projeto: Projeto): 'pendente' | 'em_andamento' | 'concluído' {
  if (projeto.etapas.length === 0) return 'pendente';
  const todas = projeto.etapas.length;
  const concluidas = projeto.etapas.filter(e => e.status === 'concluída').length;
  if (concluidas === todas) return 'concluído';
  if (projeto.etapas.some(e => e.status === 'em_andamento')) return 'em_andamento';
  return 'pendente';
}

const TIPO_LABELS: Record<string, string> = {
  campanha: 'Campanha',
  publi: 'Publi',
  producao: 'Produção',
  outro: 'Outro',
};

const STATUS_COLORS: Record<string, string> = {
  pendente: 'text-zinc-400 bg-zinc-800',
  em_andamento: 'text-yellow-400 bg-yellow-400/10',
  concluído: 'text-green-400 bg-green-400/10',
};

export function Projetos() {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tipoFilter, setTipoFilter] = useState<TipoFilter>('todos');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [showForm, setShowForm] = useState(false);

  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<Projeto['tipo']>('campanha');
  const [dataFim, setDataFim] = useState('');
  const [brand, setBrand] = useState('');
  const [value, setValue] = useState('');

  const projetos = state.projetos
    .filter(p => {
      if (tipoFilter !== 'todos' && p.tipo !== tipoFilter) return false;
      if (statusFilter !== 'todos' && calcularStatus(p) !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (!a.dataFim && !b.dataFim) return 0;
      if (!a.dataFim) return 1;
      if (!b.dataFim) return -1;
      return a.dataFim.localeCompare(b.dataFim);
    });

  const handleCreate = () => {
    if (!nome.trim()) return;
    const projeto: Projeto = {
      id: crypto.randomUUID(),
      userId: user?.id || '',
      nome: nome.trim(),
      tipo,
      status: 'pendente',
      dataInicio: null,
      dataFim: dataFim || null,
      metaConteudos: null,
      bibliotecaItemId: null,
      brand: tipo === 'publi' ? brand.trim() || null : null,
      brandColor: null,
      value: value ? parseFloat(value) : null,
      currency: 'BRL',
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      etapas: [],
      contentIds: [],
    };
    dispatch({ type: 'ADD_PROJETO', payload: projeto });
    setNome('');
    setTipo('campanha');
    setDataFim('');
    setBrand('');
    setValue('');
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <div className="content-narrow mx-auto px-6 md:px-12 py-10 md:py-16">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-[0.4em] mb-2 italic">
              Gestão
            </p>
            <h1 className="text-4xl md:text-5xl font-black text-[var(--text-primary)] leading-none tracking-tight flex items-center gap-4">
              <Handshake className="w-10 h-10 opacity-20" />
              Projetos
            </h1>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity shrink-0 mt-2"
          >
            <Plus className="w-4 h-4" />
            Novo projeto
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['todos', 'campanha', 'publi', 'producao', 'outro'] as TipoFilter[]).map(t => (
            <button
              key={t}
              onClick={() => setTipoFilter(t)}
              className={cn(
                'px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border',
                tipoFilter === t
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-transparent'
                  : 'border-[var(--border-color)] text-[var(--text-secondary)] opacity-60 hover:opacity-100'
              )}
            >
              {t === 'todos' ? 'Todos' : TIPO_LABELS[t]}
            </button>
          ))}
          <div className="w-px bg-[var(--border-color)] mx-1" />
          {(['todos', 'pendente', 'em_andamento', 'concluído'] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border',
                statusFilter === s
                  ? 'bg-[var(--text-primary)] text-[var(--bg-primary)] border-transparent'
                  : 'border-[var(--border-color)] text-[var(--text-secondary)] opacity-60 hover:opacity-100'
              )}
            >
              {s === 'todos' ? 'Todos' : s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Form novo projeto */}
        {showForm && (
          <div className="mb-6 p-6 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Novo Projeto</p>
            <input
              autoFocus
              value={nome}
              onChange={e => setNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Nome do projeto"
              className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none focus:border-[var(--text-primary)]/40"
            />
            <div className="flex flex-wrap gap-3">
              <select
                value={tipo}
                onChange={e => setTipo(e.target.value as Projeto['tipo'])}
                className="flex-1 min-w-[120px] px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[11px] font-black uppercase tracking-widest text-[var(--text-primary)] focus:outline-none"
              >
                <option value="campanha">Campanha</option>
                <option value="publi">Publi</option>
                <option value="producao">Produção</option>
                <option value="outro">Outro</option>
              </select>
              <input
                type="date"
                value={dataFim}
                onChange={e => setDataFim(e.target.value)}
                className="flex-1 min-w-[140px] px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[11px] font-black text-[var(--text-primary)] focus:outline-none"
              />
              <input
                value={value}
                onChange={e => setValue(e.target.value)}
                type="number"
                placeholder="Valor (R$)"
                className="flex-1 min-w-[100px] px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[11px] font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
              />
            </div>
            {tipo === 'publi' && (
              <input
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder="Nome da marca"
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none focus:border-[var(--text-primary)]/40"
              />
            )}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleCreate}
                disabled={!nome.trim()}
                className="px-6 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-30"
              >
                Criar
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-6 py-2.5 border border-[var(--border-color)] rounded-xl text-[11px] font-black uppercase tracking-widest opacity-50 hover:opacity-80 transition-opacity"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        {projetos.length === 0 ? (
          <div className="text-center py-24 space-y-4">
            <Handshake className="w-12 h-12 mx-auto opacity-10" />
            <p className="text-sm font-black uppercase tracking-widest opacity-30">Nenhum projeto ainda</p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-2xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Criar projeto
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {projetos.map(projeto => {
              const status = calcularStatus(projeto);
              return (
                <button
                  key={projeto.id}
                  onClick={() => navigate(`/projetos/${projeto.id}`)}
                  className="w-full flex items-center gap-5 px-6 py-5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl hover:border-[var(--text-primary)]/30 hover:shadow-sm transition-all text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                      <p className="text-sm font-black text-[var(--text-primary)] truncate">{projeto.nome}</p>
                      <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-[var(--bg-hover)] opacity-60">
                        {TIPO_LABELS[projeto.tipo]}
                      </span>
                      <span className={cn('text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full', STATUS_COLORS[status])}>
                        {status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      {projeto.tipo === 'publi' && projeto.brand && (
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] opacity-60">
                          {projeto.brand}
                        </span>
                      )}
                      {projeto.dataFim && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-secondary)] opacity-50">
                          <Calendar className="w-3 h-3" />
                          {new Date(projeto.dataFim).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                      {projeto.value && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-secondary)] opacity-50">
                          <DollarSign className="w-3 h-3" />
                          {projeto.value.toLocaleString('pt-BR', { style: 'currency', currency: projeto.currency || 'BRL' })}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-20 group-hover:opacity-50 transition-opacity shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
