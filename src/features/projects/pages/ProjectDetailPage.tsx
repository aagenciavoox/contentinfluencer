import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Briefcase,
  CalendarDays,
  Check,
  ChevronUp,
  ChevronDown,
  ClipboardList,
  Link2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import {
  normalizeProjetoTipo,
  type AgendaItem,
  type Content,
  type Projeto,
  type ProjetoEtapa,
} from '../../../lib/database';
import { cn } from '../../../lib/utils';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';

const STATUS_CONCLUIDA = 'conclu\u00edda' as ProjetoEtapa['status'];
const TIPO_REUNIAO = 'Reuni\u00e3o' as AgendaItem['tipo'];
const TIPO_PUBLICACAO = 'Publica\u00e7\u00e3o' as AgendaItem['tipo'];

const STATUS_ETAPA: ProjetoEtapa['status'][] = ['pendente', 'em_andamento', STATUS_CONCLUIDA];
const STATUS_LABELS: Record<ProjetoEtapa['status'], string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  [STATUS_CONCLUIDA]: 'Concluida',
};
const STATUS_COLORS: Record<ProjetoEtapa['status'], string> = {
  pendente: 'bg-zinc-800 text-zinc-400',
  em_andamento: 'bg-yellow-400/10 text-yellow-400',
  [STATUS_CONCLUIDA]: 'bg-green-400/10 text-green-400',
};
const TIPO_AGENDA: AgendaItem['tipo'][] = [TIPO_REUNIAO, 'Entrega', TIPO_PUBLICACAO, 'Outro'];

const PROJECT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#ec4899', '#f43f5e', '#78716c',
];

function formatDate(value: string | null) {
  if (!value) return '--';
  return new Date(value).toLocaleDateString('pt-BR');
}

function SectionCard({
  title,
  eyebrow,
  action,
  children,
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-primary)] p-5 md:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          {eyebrow && <p className="mb-2 text-[9px] font-black uppercase tracking-[0.35em] opacity-40">{eyebrow}</p>}
          <h2 className="text-base font-black uppercase tracking-[0.18em] text-[var(--text-primary)]">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const projeto = state.projetos.find(p => p.id === id);
  const projetoTipoNormalizado = projeto ? normalizeProjetoTipo(projeto.tipo) : 'publi';

  const [editNome, setEditNome] = useState('');
  const [editTipo, setEditTipo] = useState<Projeto['tipo']>('publi');
  const [editBrand, setEditBrand] = useState('');
  const [editDataInicio, setEditDataInicio] = useState('');
  const [editDataFim, setEditDataFim] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editColor, setEditColor] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [novaEtapaNome, setNovaEtapaNome] = useState('');
  const [novaEtapaPrazo, setNovaEtapaPrazo] = useState('');
  const [showEtapaForm, setShowEtapaForm] = useState(false);

  const [agendaTitle, setAgendaTitle] = useState('');
  const [agendaDate, setAgendaDate] = useState('');
  const [agendaTime, setAgendaTime] = useState('');
  const [agendaTipo, setAgendaTipo] = useState<AgendaItem['tipo']>(TIPO_REUNIAO);
  const [showAgendaForm, setShowAgendaForm] = useState(false);

  if (!projeto) {
    return (
      <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-sm font-black uppercase tracking-widest opacity-30">Projeto nao encontrado</p>
          <button onClick={() => navigate('/projetos')} className="text-[11px] font-black uppercase tracking-widest underline opacity-50">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const sortedEtapas = [...projeto.etapas].sort((a, b) => a.ordem - b.ordem);
  const agendaItems = [...state.agendaItems]
    .filter(item => item.projetoId === projeto.id)
    .sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`));
  const projetoContents = state.contents.filter(content => projeto.contentIds.includes(content.id));
  const disponiveisParaVincular = state.contents.filter(content => !projeto.contentIds.includes(content.id));
  const etapasConcluidas = sortedEtapas.filter(etapa => etapa.status === STATUS_CONCLUIDA).length;

  const proximaEntrega = useMemo(() => {
    const candidates = [...sortedEtapas]
      .filter(etapa => etapa.dataPrazo && etapa.status !== STATUS_CONCLUIDA)
      .sort((a, b) => (a.dataPrazo || '').localeCompare(b.dataPrazo || ''));
    return candidates[0] ?? null;
  }, [sortedEtapas]);

  const proximoEvento = agendaItems[0] ?? null;

  const startEditing = () => {
    setEditNome(projeto.nome);
    setEditTipo(normalizeProjetoTipo(projeto.tipo));
    setEditBrand(projeto.brand || '');
    setEditDataInicio(projeto.dataInicio || '');
    setEditDataFim(projeto.dataFim || '');
    setEditValue(projeto.value?.toString() || '');
    setEditNotes(projeto.notes || '');
    setEditColor(projeto.color || '#78716c');
    setIsEditing(true);
  };

  const saveEdit = () => {
    dispatch({
      type: 'UPDATE_PROJETO',
      payload: {
        ...projeto,
        nome: editNome.trim() || projeto.nome,
        tipo: normalizeProjetoTipo(editTipo),
        brand: editTipo === 'publi' ? editBrand.trim() || null : null,
        color: editColor || null,
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
    const idx = sortedEtapas.findIndex(item => item.id === etapa.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sortedEtapas.length) return;

    dispatch({
      type: 'UPDATE_PROJETO_ETAPA',
      payload: { projetoId: projeto.id, etapa: { ...etapa, ordem: sortedEtapas[swapIdx].ordem } },
    });
    dispatch({
      type: 'UPDATE_PROJETO_ETAPA',
      payload: { projetoId: projeto.id, etapa: { ...sortedEtapas[swapIdx], ordem: etapa.ordem } },
    });
  };

  const deleteEtapa = (etapaId: string) => {
    dispatch({ type: 'DELETE_PROJETO_ETAPA', payload: { projetoId: projeto.id, etapaId } });
  };

  const vincularContent = (contentId: string) => {
    if (projeto.contentIds.includes(contentId)) return;
    const selectedContent = state.contents.find(content => content.id === contentId);
    if (!selectedContent) return;

    dispatch({
      type: 'UPDATE_PROJETO',
      payload: {
        ...projeto,
        contentIds: [...projeto.contentIds, contentId],
        updatedAt: new Date().toISOString(),
      },
    });

    dispatch({
      type: 'UPDATE_CONTENT',
      payload: {
        ...selectedContent,
        updatedAt: new Date().toISOString(),
      } satisfies Content,
    });
  };

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

  const summaryCards = [
    { label: 'Etapas', value: `${sortedEtapas.length}`, helper: `${etapasConcluidas} concluidas` },
    { label: 'Eventos', value: `${agendaItems.length}`, helper: proximoEvento ? formatDate(proximoEvento.date) : 'Sem agenda' },
    {
      label: 'Conteudos',
      value: `${projetoContents.length}`,
      helper: disponiveisParaVincular.length > 0 ? `${disponiveisParaVincular.length} disponiveis para vincular` : 'Todos vinculados',
    },
    {
      label: 'Prazo',
      value: projeto.dataFim ? formatDate(projeto.dataFim) : 'Sem prazo',
      helper: proximaEntrega ? `Proxima etapa: ${proximaEntrega.nome}` : 'Nenhuma entrega aberta',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)]">
      <div className="desktop-header-frame">
        <DesktopPageHeader
          section="Projetos"
          title={projeto.nome}
          subtitle="Tudo do projeto em uma unica tela: contexto, prazos, eventos e conteudos vinculados."
          meta={`${projetoTipoNormalizado}${projeto.brand ? ` · ${projeto.brand}` : ''}`}
          icon={Briefcase}
          backLabel="Projetos"
          onBack={() => navigate('/projetos')}
        />
      </div>

      <div className="desktop-content-frame space-y-6">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(card => (
            <div key={card.label} className="rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-primary)] px-5 py-4">
              <p className="text-[9px] font-black uppercase tracking-[0.35em] opacity-40">{card.label}</p>
              <p className="mt-3 text-xl font-black text-[var(--text-primary)]">{card.value}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{card.helper}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <SectionCard
              eyebrow="Operacao"
              title="Etapas do projeto"
              action={
                !showEtapaForm ? (
                  <button
                    type="button"
                    onClick={() => setShowEtapaForm(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] opacity-70 transition-opacity hover:opacity-100"
                  >
                    <Plus className="h-4 w-4" />
                    Nova etapa
                  </button>
                ) : null
              }
            >
              <div className="space-y-3">
                {sortedEtapas.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[var(--border-color)] px-5 py-8 text-center">
                    <p className="text-sm font-black uppercase tracking-widest opacity-30">Nenhuma etapa criada</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">Comece estruturando as entregas e checkpoints deste projeto.</p>
                  </div>
                )}

                {sortedEtapas.map((etapa, idx) => (
                  <div key={etapa.id} className="flex items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4">
                    <div className="flex flex-col gap-0.5">
                      <button type="button" onClick={() => moveEtapa(etapa, -1)} disabled={idx === 0} className="p-0.5 opacity-30 transition-opacity hover:opacity-80 disabled:opacity-10">
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button type="button" onClick={() => moveEtapa(etapa, 1)} disabled={idx === sortedEtapas.length - 1} className="p-0.5 opacity-30 transition-opacity hover:opacity-80 disabled:opacity-10">
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-[var(--text-primary)]">{etapa.nome}</p>
                      <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                        {etapa.dataPrazo ? `Prazo em ${formatDate(etapa.dataPrazo)}` : 'Sem prazo definido'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleEtapaStatus(etapa)}
                      className={cn('rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all', STATUS_COLORS[etapa.status])}
                    >
                      {STATUS_LABELS[etapa.status]}
                    </button>

                    <button type="button" onClick={() => deleteEtapa(etapa.id)} className="p-2 opacity-20 transition-all hover:text-red-400 hover:opacity-60">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {showEtapaForm && (
                  <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_180px_auto_auto]">
                      <input
                        autoFocus
                        value={novaEtapaNome}
                        onChange={event => setNovaEtapaNome(event.target.value)}
                        onKeyDown={event => event.key === 'Enter' && handleAddEtapa()}
                        placeholder="Nome da etapa"
                        className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
                      />
                      <input
                        type="date"
                        value={novaEtapaPrazo}
                        onChange={event => setNovaEtapaPrazo(event.target.value)}
                        className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-[11px] text-[var(--text-primary)] focus:outline-none"
                      />
                      <button type="button" onClick={handleAddEtapa} className="rounded-xl bg-[var(--text-primary)] px-4 py-3 text-[var(--bg-primary)] transition-opacity hover:opacity-90">
                        <Check className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setShowEtapaForm(false)} className="rounded-xl border border-[var(--border-color)] px-4 py-3 opacity-60 transition-opacity hover:opacity-100">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Agenda"
              title="Eventos e compromissos"
              action={
                !showAgendaForm ? (
                  <button
                    type="button"
                    onClick={() => setShowAgendaForm(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] opacity-70 transition-opacity hover:opacity-100"
                  >
                    <CalendarDays className="h-4 w-4" />
                    Novo evento
                  </button>
                ) : null
              }
            >
              <div className="space-y-3">
                {showAgendaForm && (
                  <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                    <div className="space-y-3">
                      <input
                        autoFocus
                        value={agendaTitle}
                        onChange={event => setAgendaTitle(event.target.value)}
                        placeholder="Titulo do evento"
                        className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
                      />
                      <div className="grid gap-3 md:grid-cols-3">
                        <input
                          type="date"
                          value={agendaDate}
                          onChange={event => setAgendaDate(event.target.value)}
                          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-[11px] text-[var(--text-primary)] focus:outline-none"
                        />
                        <input
                          type="time"
                          value={agendaTime}
                          onChange={event => setAgendaTime(event.target.value)}
                          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-[11px] text-[var(--text-primary)] focus:outline-none"
                        />
                        <select
                          value={agendaTipo}
                          onChange={event => setAgendaTipo(event.target.value as AgendaItem['tipo'])}
                          className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-[11px] font-black uppercase text-[var(--text-primary)] focus:outline-none"
                        >
                          {TIPO_AGENDA.map(tipo => (
                            <option key={tipo} value={tipo}>
                              {tipo}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={handleAddAgenda} className="rounded-xl bg-[var(--text-primary)] px-5 py-3 text-[11px] font-black uppercase tracking-widest text-[var(--bg-primary)] transition-opacity hover:opacity-90">
                          Adicionar evento
                        </button>
                        <button type="button" onClick={() => setShowAgendaForm(false)} className="rounded-xl border border-[var(--border-color)] px-5 py-3 text-[11px] font-black uppercase tracking-widest opacity-60 transition-opacity hover:opacity-100">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {agendaItems.length === 0 && !showAgendaForm && (
                  <div className="rounded-2xl border border-dashed border-[var(--border-color)] px-5 py-8 text-center">
                    <p className="text-sm font-black uppercase tracking-widest opacity-30">Nenhum evento cadastrado</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">Crie reunioes, entregas e publicacoes sem sair da tela do projeto.</p>
                  </div>
                )}

                {agendaItems.map(item => (
                  <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--bg-primary)] text-[var(--text-primary)]">
                      <CalendarDays className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-[var(--text-primary)]">{item.title}</p>
                      <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                        {formatDate(item.date)}{item.time ? ` · ${item.time}` : ''} · {item.tipo}
                      </p>
                    </div>
                    <button type="button" onClick={() => dispatch({ type: 'DELETE_AGENDA_ITEM', payload: item.id })} className="p-2 opacity-20 transition-all hover:text-red-400 hover:opacity-60">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard
              eyebrow="Contexto"
              title="Resumo do projeto"
              action={
                !isEditing ? (
                  <button
                    type="button"
                    onClick={startEditing}
                    className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] opacity-70 transition-opacity hover:opacity-100"
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </button>
                ) : null
              }
            >
              {!isEditing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Tipo', value: projetoTipoNormalizado },
                      { label: 'Marca', value: projeto.brand || '--' },
                      { label: 'Inicio', value: formatDate(projeto.dataInicio) },
                      { label: 'Prazo final', value: formatDate(projeto.dataFim) },
                      {
                        label: 'Valor',
                        value: projeto.value
                          ? projeto.value.toLocaleString('pt-BR', { style: 'currency', currency: projeto.currency || 'BRL' })
                          : '--',
                      },
                      { label: 'Meta de conteudos', value: projeto.metaConteudos ? String(projeto.metaConteudos) : '--' },
                    ].map(item => (
                      <div key={item.label} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4">
                        <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40">{item.label}</p>
                        <p className="mt-2 text-sm font-black capitalize text-[var(--text-primary)]">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40">Proximos sinais</p>
                    <div className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                      <p>{proximaEntrega ? `Proxima etapa: ${proximaEntrega.nome} ate ${formatDate(proximaEntrega.dataPrazo)}` : 'Nenhuma etapa pendente com prazo.'}</p>
                      <p>{proximoEvento ? `Proximo evento: ${proximoEvento.title} em ${formatDate(proximoEvento.date)}` : 'Nenhum evento futuro vinculado ao projeto.'}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4">
                    <p className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40">Notas</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">
                      {projeto.notes || 'Sem notas por enquanto.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleDeleteProjeto}
                    className="w-full rounded-xl border border-red-500/30 px-5 py-3 text-[11px] font-black uppercase tracking-widest text-red-400 transition-colors hover:bg-red-500/10"
                  >
                    Excluir projeto
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <input
                    value={editNome}
                    onChange={event => setEditNome(event.target.value)}
                    placeholder="Nome"
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <select
                      value={editTipo}
                      onChange={event => setEditTipo(event.target.value as Projeto['tipo'])}
                      className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-[11px] font-black uppercase text-[var(--text-primary)] focus:outline-none"
                    >
                      <option value="publi">Publi</option>
                      <option value="producao">Producao</option>
                      <option value="outro">Outro</option>
                    </select>
                    <input
                      type="number"
                      value={editValue}
                      onChange={event => setEditValue(event.target.value)}
                      placeholder="Valor (R$)"
                      className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-[11px] text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
                    />
                    <input
                      type="date"
                      value={editDataInicio}
                      onChange={event => setEditDataInicio(event.target.value)}
                      className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-[11px] text-[var(--text-primary)] focus:outline-none"
                    />
                    <input
                      type="date"
                      value={editDataFim}
                      onChange={event => setEditDataFim(event.target.value)}
                      className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-[11px] text-[var(--text-primary)] focus:outline-none"
                    />
                  </div>
                  {editTipo === 'publi' && (
                    <input
                      value={editBrand}
                      onChange={event => setEditBrand(event.target.value)}
                      placeholder="Marca"
                      className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
                    />
                  )}
                  <div>
                    <p className="mb-2 text-[9px] font-black uppercase tracking-[0.3em] opacity-40">Cor do projeto</p>
                    <div className="flex flex-wrap gap-2">
                      {PROJECT_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditColor(c)}
                          className={cn('h-7 w-7 rounded-full border-2 transition-all', editColor === c ? 'border-[var(--text-primary)] scale-110' : 'border-transparent opacity-50 hover:opacity-80')}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={editNotes}
                    onChange={event => setEditNotes(event.target.value)}
                    placeholder="Notas do projeto"
                    rows={4}
                    className="w-full resize-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={saveEdit} className="rounded-xl bg-[var(--text-primary)] px-5 py-3 text-[11px] font-black uppercase tracking-widest text-[var(--bg-primary)] transition-opacity hover:opacity-90">
                      Salvar
                    </button>
                    <button type="button" onClick={() => setIsEditing(false)} className="rounded-xl border border-[var(--border-color)] px-5 py-3 text-[11px] font-black uppercase tracking-widest opacity-60 transition-opacity hover:opacity-100">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard
              eyebrow="Conteudo"
              title="Conteudos vinculados"
              action={
                <button
                  type="button"
                  onClick={() => navigate('/conteudos')}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--text-primary)] px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-[var(--bg-primary)] transition-opacity hover:opacity-90"
                >
                  <Plus className="h-4 w-4" />
                  Criar conteudo
                </button>
              }
            >
              <div className="space-y-4">
                {disponiveisParaVincular.length > 0 && (
                  <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                    <p className="mb-3 text-[9px] font-black uppercase tracking-[0.3em] opacity-40">Vincular existente</p>
                    <select
                      defaultValue=""
                      onChange={event => {
                        if (!event.target.value) return;
                        vincularContent(event.target.value);
                        event.target.value = '';
                      }}
                      className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-[11px] font-bold text-[var(--text-primary)] focus:outline-none"
                    >
                      <option value="">Escolha um conteudo para vincular...</option>
                      {disponiveisParaVincular.map(content => (
                        <option key={content.id} value={content.id}>
                          {content.title || '(sem titulo)'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {projetoContents.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--border-color)] px-5 py-8 text-center">
                    <p className="text-sm font-black uppercase tracking-widest opacity-30">Nenhum conteudo vinculado</p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">Vincule ideias ja existentes ou crie novos conteudos para este projeto.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {projetoContents.map(content => (
                      <div key={content.id} className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--bg-primary)] text-[var(--text-primary)]">
                            <ClipboardList className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-[var(--text-primary)]">{content.title || '(sem titulo)'}</p>
                            <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{content.status}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {content.publishDate && (
                                <span className="rounded-full bg-[var(--bg-primary)] px-3 py-1 text-[10px] font-bold text-[var(--text-secondary)]">
                                  Publicacao: {formatDate(content.publishDate)}
                                </span>
                              )}
                              {content.recordingDate && (
                                <span className="rounded-full bg-[var(--bg-primary)] px-3 py-1 text-[10px] font-bold text-[var(--text-secondary)]">
                                  Gravacao: {formatDate(content.recordingDate)}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate('/conteudos')}
                            className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2 text-[10px] font-black uppercase tracking-widest opacity-70 transition-opacity hover:opacity-100"
                          >
                            <Link2 className="h-3.5 w-3.5" />
                            Abrir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
