import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronUp, ChevronDown, Trash2, Plus, Check, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import type { Projeto, ProjetoEtapa, AgendaItem } from '../lib/database';
import { cn } from '../lib/utils';

type Aba = 'visao-geral' | 'etapas' | 'conteudos' | 'agenda';

const STATUS_ETAPA: ProjetoEtapa['status'][] = ['pendente', 'em_andamento', 'concluída'];
const STATUS_LABELS: Record<ProjetoEtapa['status'], string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluída: 'Concluída',
};
const STATUS_COLORS: Record<ProjetoEtapa['status'], string> = {
  pendente: 'bg-zinc-800 text-zinc-400',
  em_andamento: 'bg-yellow-400/10 text-yellow-400',
  concluída: 'bg-green-400/10 text-green-400',
};

const TIPO_AGENDA: AgendaItem['tipo'][] = ['Reunião', 'Entrega', 'Publicação', 'Outro'];

export function ProjetoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const projeto = state.projetos.find(p => p.id === id);
  const [aba, setAba] = useState<Aba>('visao-geral');

  // Visão Geral — edição inline
  const [editNome, setEditNome] = useState('');
  const [editTipo, setEditTipo] = useState<Projeto['tipo']>('campanha');
  const [editBrand, setEditBrand] = useState('');
  const [editDataInicio, setEditDataInicio] = useState('');
  const [editDataFim, setEditDataFim] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Etapas
  const [novaEtapaNome, setNovaEtapaNome] = useState('');
  const [novaEtapaPrazo, setNovaEtapaPrazo] = useState('');
  const [showEtapaForm, setShowEtapaForm] = useState(false);

  // Agenda
  const [agendaTitle, setAgendaTitle] = useState('');
  const [agendaDate, setAgendaDate] = useState('');
  const [agendaTime, setAgendaTime] = useState('');
  const [agendaTipo, setAgendaTipo] = useState<AgendaItem['tipo']>('Reunião');
  const [showAgendaForm, setShowAgendaForm] = useState(false);

  if (!projeto) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-sm font-black uppercase tracking-widest opacity-30">Projeto não encontrado</p>
          <button onClick={() => navigate('/projetos')} className="text-[11px] font-black uppercase tracking-widest underline opacity-50">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const startEditing = () => {
    setEditNome(projeto.nome);
    setEditTipo(projeto.tipo);
    setEditBrand(projeto.brand || '');
    setEditDataInicio(projeto.dataInicio || '');
    setEditDataFim(projeto.dataFim || '');
    setEditValue(projeto.value?.toString() || '');
    setEditNotes(projeto.notes || '');
    setIsEditing(true);
  };

  const saveEdit = () => {
    dispatch({
      type: 'UPDATE_PROJETO',
      payload: {
        ...projeto,
        nome: editNome.trim() || projeto.nome,
        tipo: editTipo,
        brand: editTipo === 'publi' ? editBrand.trim() || null : null,
        dataInicio: editDataInicio || null,
        dataFim: editDataFim || null,
        value: editValue ? parseFloat(editValue) : null,
        notes: editNotes.trim() || null,
        updatedAt: new Date().toISOString(),
      },
    });
    setIsEditing(false);
  };

  const handleDeleteProjeto = () => {
    if (!window.confirm(`Excluir o projeto "${projeto.nome}"?`)) return;
    dispatch({ type: 'DELETE_PROJETO', payload: projeto.id });
    navigate('/projetos');
  };

  const handleAddEtapa = () => {
    if (!novaEtapaNome.trim()) return;
    const etapa: ProjetoEtapa = {
      id: crypto.randomUUID(),
      projetoId: projeto.id,
      nome: novaEtapaNome.trim(),
      ordem: projeto.etapas.length,
      status: 'pendente',
      dataPrazo: novaEtapaPrazo || null,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_PROJETO_ETAPA', payload: { projetoId: projeto.id, etapa } });
    setNovaEtapaNome('');
    setNovaEtapaPrazo('');
    setShowEtapaForm(false);
  };

  const nextStatus = (current: ProjetoEtapa['status']): ProjetoEtapa['status'] => {
    const idx = STATUS_ETAPA.indexOf(current);
    return STATUS_ETAPA[(idx + 1) % STATUS_ETAPA.length];
  };

  const toggleEtapaStatus = (etapa: ProjetoEtapa) => {
    dispatch({
      type: 'UPDATE_PROJETO_ETAPA',
      payload: { projetoId: projeto.id, etapa: { ...etapa, status: nextStatus(etapa.status) } },
    });
  };

  const moveEtapa = (etapa: ProjetoEtapa, dir: -1 | 1) => {
    const sorted = [...projeto.etapas].sort((a, b) => a.ordem - b.ordem);
    const idx = sorted.findIndex(e => e.id === etapa.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    dispatch({ type: 'UPDATE_PROJETO_ETAPA', payload: { projetoId: projeto.id, etapa: { ...etapa, ordem: sorted[swapIdx].ordem } } });
    dispatch({ type: 'UPDATE_PROJETO_ETAPA', payload: { projetoId: projeto.id, etapa: { ...sorted[swapIdx], ordem: etapa.ordem } } });
  };

  const deleteEtapa = (etapaId: string) => {
    dispatch({ type: 'DELETE_PROJETO_ETAPA', payload: { projetoId: projeto.id, etapaId } });
  };

  const projetoContents = state.contents.filter(c => (c as any).projetoId === projeto.id);
  const disponiveisParaVincular = state.contents.filter(c => !(c as any).projetoId);

  const vincularContent = (contentId: string) => {
    const content = state.contents.find(c => c.id === contentId);
    if (!content) return;
    dispatch({ type: 'UPDATE_CONTENT', payload: { ...content, updatedAt: new Date().toISOString() } } as any);
  };

  const agendaItems = state.agendaItems.filter(a => a.projetoId === projeto.id);

  const handleAddAgenda = () => {
    if (!agendaTitle.trim() || !agendaDate) return;
    const item: AgendaItem = {
      id: crypto.randomUUID(),
      userId: user?.id || '',
      title: agendaTitle.trim(),
      date: agendaDate,
      time: agendaTime || null,
      tipo: agendaTipo,
      projetoId: projeto.id,
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_AGENDA_ITEM', payload: item });
    setAgendaTitle('');
    setAgendaDate('');
    setAgendaTime('');
    setShowAgendaForm(false);
  };

  const abas: { key: Aba; label: string }[] = [
    { key: 'visao-geral', label: 'Visão Geral' },
    { key: 'etapas', label: `Etapas${projeto.etapas.length > 0 ? ` (${projeto.etapas.length})` : ''}` },
    { key: 'conteudos', label: `Conteúdos${projetoContents.length > 0 ? ` (${projetoContents.length})` : ''}` },
    { key: 'agenda', label: `Agenda${agendaItems.length > 0 ? ` (${agendaItems.length})` : ''}` },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <div className="content-narrow mx-auto px-6 md:px-12 py-10 md:py-16">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/projetos')}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-80 transition-opacity mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Projetos
          </button>
          <h1 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] leading-none tracking-tight">
            {projeto.nome}
          </h1>
          <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-2">
            {projeto.tipo} {projeto.brand ? `· ${projeto.brand}` : ''}
          </p>
        </div>

        {/* Abas */}
        <div className="flex gap-1 mb-8 border-b border-[var(--border-color)] overflow-x-auto">
          {abas.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setAba(key)}
              className={cn(
                'px-5 py-3 text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-b-2 -mb-px',
                aba === key
                  ? 'border-[var(--text-primary)] text-[var(--text-primary)]'
                  : 'border-transparent opacity-40 hover:opacity-70'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ABA 1 — Visão Geral */}
        {aba === 'visao-geral' && (
          <div className="space-y-4">
            {!isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Tipo', value: projeto.tipo },
                    { label: 'Início', value: projeto.dataInicio ? new Date(projeto.dataInicio).toLocaleDateString('pt-BR') : '—' },
                    { label: 'Prazo', value: projeto.dataFim ? new Date(projeto.dataFim).toLocaleDateString('pt-BR') : '—' },
                    ...(projeto.tipo === 'publi' ? [{ label: 'Marca', value: projeto.brand || '—' }] : []),
                    { label: 'Valor', value: projeto.value ? projeto.value.toLocaleString('pt-BR', { style: 'currency', currency: projeto.currency || 'BRL' }) : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-5 py-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl">
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">{label}</p>
                      <p className="text-sm font-black text-[var(--text-primary)] capitalize">{value}</p>
                    </div>
                  ))}
                </div>
                {projeto.notes && (
                  <div className="px-5 py-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-2">Notas</p>
                    <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{projeto.notes}</p>
                  </div>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={startEditing}
                    className="px-6 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity"
                  >
                    Editar
                  </button>
                  <button
                    onClick={handleDeleteProjeto}
                    className="px-6 py-2.5 border border-red-500/30 text-red-400 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-colors"
                  >
                    Excluir projeto
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-6 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl">
                <input
                  value={editNome}
                  onChange={e => setEditNome(e.target.value)}
                  placeholder="Nome"
                  className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                />
                <div className="flex flex-wrap gap-3">
                  <select
                    value={editTipo}
                    onChange={e => setEditTipo(e.target.value as Projeto['tipo'])}
                    className="flex-1 min-w-[120px] px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[11px] font-black uppercase text-[var(--text-primary)] focus:outline-none"
                  >
                    <option value="campanha">Campanha</option>
                    <option value="publi">Publi</option>
                    <option value="producao">Produção</option>
                    <option value="outro">Outro</option>
                  </select>
                  <input type="date" value={editDataInicio} onChange={e => setEditDataInicio(e.target.value)} className="flex-1 min-w-[140px] px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[11px] text-[var(--text-primary)] focus:outline-none" />
                  <input type="date" value={editDataFim} onChange={e => setEditDataFim(e.target.value)} className="flex-1 min-w-[140px] px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[11px] text-[var(--text-primary)] focus:outline-none" />
                  <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} placeholder="Valor (R$)" className="flex-1 min-w-[100px] px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[11px] text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none" />
                </div>
                {editTipo === 'publi' && (
                  <input value={editBrand} onChange={e => setEditBrand(e.target.value)} placeholder="Marca" className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none" />
                )}
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Notas..."
                  rows={3}
                  className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none resize-none"
                />
                <div className="flex gap-3">
                  <button onClick={saveEdit} className="px-6 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl text-[11px] font-black uppercase tracking-widest hover:opacity-90">Salvar</button>
                  <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 border border-[var(--border-color)] rounded-xl text-[11px] font-black uppercase tracking-widest opacity-50 hover:opacity-80">Cancelar</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA 2 — Etapas */}
        {aba === 'etapas' && (
          <div className="space-y-3">
            {[...projeto.etapas].sort((a, b) => a.ordem - b.ordem).map((etapa, idx, arr) => (
              <div key={etapa.id} className="flex items-center gap-3 px-5 py-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveEtapa(etapa, -1)} disabled={idx === 0} className="p-0.5 opacity-30 hover:opacity-80 disabled:opacity-10 transition-opacity">
                    <ChevronUp className="w-3 h-3" />
                  </button>
                  <button onClick={() => moveEtapa(etapa, 1)} disabled={idx === arr.length - 1} className="p-0.5 opacity-30 hover:opacity-80 disabled:opacity-10 transition-opacity">
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-[var(--text-primary)]">{etapa.nome}</p>
                  {etapa.dataPrazo && (
                    <p className="text-[10px] font-bold opacity-40 mt-0.5">{new Date(etapa.dataPrazo).toLocaleDateString('pt-BR')}</p>
                  )}
                </div>
                <button
                  onClick={() => toggleEtapaStatus(etapa)}
                  className={cn('px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all', STATUS_COLORS[etapa.status])}
                >
                  {STATUS_LABELS[etapa.status]}
                </button>
                <button onClick={() => deleteEtapa(etapa.id)} className="p-2 opacity-20 hover:opacity-60 hover:text-red-400 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {showEtapaForm ? (
              <div className="flex flex-wrap gap-3 p-5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl">
                <input
                  autoFocus
                  value={novaEtapaNome}
                  onChange={e => setNovaEtapaNome(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddEtapa()}
                  placeholder="Nome da etapa"
                  className="flex-1 min-w-[160px] px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
                />
                <input type="date" value={novaEtapaPrazo} onChange={e => setNovaEtapaPrazo(e.target.value)} className="px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[11px] text-[var(--text-primary)] focus:outline-none" />
                <button onClick={handleAddEtapa} className="p-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl hover:opacity-90">
                  <Check className="w-4 h-4" />
                </button>
                <button onClick={() => setShowEtapaForm(false)} className="p-2.5 border border-[var(--border-color)] rounded-xl opacity-50 hover:opacity-80">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowEtapaForm(true)}
                className="w-full flex items-center justify-center gap-2 px-5 py-4 border border-dashed border-[var(--border-color)] rounded-2xl text-[11px] font-black uppercase tracking-widest opacity-40 hover:opacity-70 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Adicionar etapa
              </button>
            )}
          </div>
        )}

        {/* ABA 3 — Conteúdos */}
        {aba === 'conteudos' && (
          <div className="space-y-3">
            {projetoContents.length === 0 && (
              <p className="text-center text-sm opacity-30 py-8 font-black uppercase tracking-widest">Nenhum conteúdo vinculado</p>
            )}
            {projetoContents.map(c => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-[var(--text-primary)] truncate">{c.title || '(sem título)'}</p>
                  <p className="text-[10px] font-bold opacity-40 mt-0.5">{c.status}</p>
                </div>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              {disponiveisParaVincular.length > 0 && (
                <select
                  defaultValue=""
                  onChange={e => { if (e.target.value) vincularContent(e.target.value); }}
                  className="flex-1 px-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl text-[11px] font-bold text-[var(--text-primary)] focus:outline-none"
                >
                  <option value="">Vincular conteúdo existente...</option>
                  {disponiveisParaVincular.map(c => (
                    <option key={c.id} value={c.id}>{c.title || '(sem título)'}</option>
                  ))}
                </select>
              )}
              <button
                onClick={() => navigate('/conteudos')}
                className="px-5 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 whitespace-nowrap"
              >
                Criar novo
              </button>
            </div>
          </div>
        )}

        {/* ABA 4 — Agenda */}
        {aba === 'agenda' && (
          <div className="space-y-3">
            {agendaItems.length === 0 && (
              <p className="text-center text-sm opacity-30 py-8 font-black uppercase tracking-widest">Nenhum evento na agenda</p>
            )}
            {agendaItems.map(item => (
              <div key={item.id} className="flex items-center gap-4 px-5 py-4 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-[var(--text-primary)]">{item.title}</p>
                  <p className="text-[10px] font-bold opacity-40 mt-0.5">
                    {new Date(item.date).toLocaleDateString('pt-BR')} {item.time ? `· ${item.time}` : ''} · {item.tipo}
                  </p>
                </div>
                <button
                  onClick={() => dispatch({ type: 'DELETE_AGENDA_ITEM', payload: item.id })}
                  className="p-2 opacity-20 hover:opacity-60 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            {showAgendaForm ? (
              <div className="p-5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl space-y-3">
                <input
                  autoFocus
                  value={agendaTitle}
                  onChange={e => setAgendaTitle(e.target.value)}
                  placeholder="Título do evento"
                  className="w-full px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
                />
                <div className="flex flex-wrap gap-3">
                  <input type="date" value={agendaDate} onChange={e => setAgendaDate(e.target.value)} className="flex-1 min-w-[140px] px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[11px] text-[var(--text-primary)] focus:outline-none" />
                  <input type="time" value={agendaTime} onChange={e => setAgendaTime(e.target.value)} className="flex-1 min-w-[120px] px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[11px] text-[var(--text-primary)] focus:outline-none" />
                  <select
                    value={agendaTipo}
                    onChange={e => setAgendaTipo(e.target.value as AgendaItem['tipo'])}
                    className="flex-1 min-w-[120px] px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-[11px] font-black uppercase text-[var(--text-primary)] focus:outline-none"
                  >
                    {TIPO_AGENDA.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleAddAgenda} className="px-6 py-2.5 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-xl text-[11px] font-black uppercase tracking-widest hover:opacity-90">Adicionar</button>
                  <button onClick={() => setShowAgendaForm(false)} className="px-6 py-2.5 border border-[var(--border-color)] rounded-xl text-[11px] font-black uppercase tracking-widest opacity-50 hover:opacity-80">Cancelar</button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowAgendaForm(true)}
                className="w-full flex items-center justify-center gap-2 px-5 py-4 border border-dashed border-[var(--border-color)] rounded-2xl text-[11px] font-black uppercase tracking-widest opacity-40 hover:opacity-70 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Adicionar evento
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
