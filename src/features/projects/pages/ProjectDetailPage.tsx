import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Briefcase,
  CalendarDays,
  Check,
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
  type AgendaItem,
  type Content,
  type Projeto,
} from '../../../lib/database';
import { cn } from '../../../lib/utils';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { Section } from '../../../components/ui/Section';
import { Surface } from '../../../components/ui/Surface';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { ProjectDetailMobileScreen } from '../../../mobile/screens/projects/ProjectDetailMobileScreen';
import type { ProjectDetailEditFields } from '../../../mobile/screens/projects/ProjectDetailMobileScreen';
import { PostingTimeSuggestions } from '../../settings/components/PostingTimeSuggestions';
import { getPostingTimes } from '../../settings/lib/postingTimes';
import { generateUUID } from '../../../utils/uuid';

const PROJECT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#ec4899', '#f43f5e', '#78716c',
];

const TIPO_AGENDA: AgendaItem['tipo'][] = ['Reunião', 'Entrega', 'Publicação', 'Outro'];

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
    <Surface variant="outlined" padding="lg">
      <Section title={title} description={eyebrow} action={action}>
        {children}
      </Section>
    </Surface>
  );
}

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const postingTimes = getPostingTimes(state.preferences);

  const projeto = state.projetos.find(p => p.id === id);

  const [editNome, setEditNome] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editDriveUrl, setEditDriveUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const [agendaTitle, setAgendaTitle] = useState('');
  const [agendaDate, setAgendaDate] = useState('');
  const [agendaTime, setAgendaTime] = useState('');
  const [agendaTipo, setAgendaTipo] = useState<AgendaItem['tipo']>('Reunião');
  const [showAgendaForm, setShowAgendaForm] = useState(false);

  if (!projeto) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-secondary)]">
        <div className="stack-lg text-center">
          <p className="text-sm font-semibold opacity-30">Projeto nao encontrado</p>
          <button onClick={() => navigate('/projetos')} className="text-xs font-semibold underline opacity-50">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const agendaItems = [...state.agendaItems]
    .filter(item => item.projetoId === projeto.id)
    .sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`));
  const projetoContents = state.contents.filter(content => projeto.contentIds.includes(content.id));
  const disponiveisParaVincular = state.contents.filter(content => !projeto.contentIds.includes(content.id));
  const proximoEvento = agendaItems[0] ?? null;

  const startEditing = () => {
    setEditNome(projeto.nome);
    setEditBrand(projeto.brand || '');
    setEditValue(projeto.value?.toString() || '');
    setEditNotes(projeto.notes || '');
    setEditColor(projeto.color || '#78716c');
    setEditDriveUrl(projeto.driveUrl || '');
    setIsEditing(true);
  };

  const saveEdit = () => {
    dispatch({
      type: 'UPDATE_PROJETO',
      payload: {
        ...projeto,
        nome: editNome.trim() || projeto.nome,
        brand: editBrand.trim() || null,
        color: editColor || null,
        value: editValue ? parseFloat(editValue) : null,
        driveUrl: editDriveUrl.trim() || null,
        notes: editNotes.trim() || null,
        updatedAt: new Date().toISOString(),
      },
    });
    setIsEditing(false);
  };

  const handleDeleteProjeto = () => {
    if (!window.confirm(`Remover o projeto "${projeto.nome}"?`)) return;
    dispatch({ type: 'DELETE_PROJETO', payload: projeto.id });
    navigate('/projetos');
  };

  const handleCopyShareLink = () => {
    if (!projeto.shareToken) return;
    const url = `${window.location.origin}/share/${projeto.shareToken}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  };

  const vincularContent = (contentId: string) => {
    if (projeto.contentIds.includes(contentId)) return;
    const selectedContent = state.contents.find(content => content.id === contentId);
    if (!selectedContent) return;
    dispatch({
      type: 'UPDATE_PROJETO',
      payload: { ...projeto, contentIds: [...projeto.contentIds, contentId], updatedAt: new Date().toISOString() },
    });
    dispatch({
      type: 'UPDATE_CONTENT',
      payload: { ...selectedContent, updatedAt: new Date().toISOString() } satisfies Content,
    });
  };

  const handleAddAgenda = () => {
    if (!agendaTitle.trim() || !agendaDate) return;
    const item: AgendaItem = {
      id: generateUUID(),
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

  const handleEditFieldChange = <K extends keyof ProjectDetailEditFields>(
    key: K,
    value: ProjectDetailEditFields[K]
  ) => {
    switch (key) {
      case 'nome': setEditNome(value as string); break;
      case 'brand': setEditBrand(value as string); break;
      case 'value': setEditValue(value as string); break;
      case 'notes': setEditNotes(value as string); break;
      case 'color': setEditColor(value as string); break;
    }
  };

  const editFields: ProjectDetailEditFields = {
    nome: editNome,
    brand: editBrand,
    value: editValue,
    notes: editNotes,
    color: editColor,
  };

  if (isMobile) {
    return (
      <div className="min-h-full bg-[var(--bg-primary)]">
        <ProjectDetailMobileScreen
          projeto={projeto}
          agendaItems={agendaItems}
          projetoContents={projetoContents}
          disponiveisParaVincular={disponiveisParaVincular}
          proximoEvento={proximoEvento}
          postingTimes={postingTimes}
          isEditing={isEditing}
          editFields={editFields}
          onEditFieldChange={handleEditFieldChange}
          onStartEditing={startEditing}
          onSaveEdit={saveEdit}
          onCancelEdit={() => setIsEditing(false)}
          onDeleteProjeto={handleDeleteProjeto}
          showAgendaForm={showAgendaForm}
          agendaTitle={agendaTitle}
          agendaDate={agendaDate}
          agendaTime={agendaTime}
          agendaTipo={agendaTipo}
          onAgendaTitleChange={setAgendaTitle}
          onAgendaDateChange={setAgendaDate}
          onAgendaTimeChange={setAgendaTime}
          onAgendaTipoChange={setAgendaTipo}
          onOpenAgendaForm={() => setShowAgendaForm(true)}
          onCloseAgendaForm={() => setShowAgendaForm(false)}
          onAddAgenda={handleAddAgenda}
          onDeleteAgendaItem={itemId => dispatch({ type: 'DELETE_AGENDA_ITEM', payload: itemId })}
          onVincularContent={vincularContent}
          onOpenContent={contentId => navigate(`/conteudos/${contentId}`)}
          onCreateContent={() => navigate('/conteudos')}
        />
      </div>
    );
  }

  const summaryCards = [
    { label: 'Eventos', value: `${agendaItems.length}`, helper: proximoEvento ? `Próximo: ${formatDate(proximoEvento.date)}` : 'Sem eventos' },
    { label: 'Conteúdos', value: `${projetoContents.length}`, helper: disponiveisParaVincular.length > 0 ? `${disponiveisParaVincular.length} disponíveis` : 'Todos vinculados' },
    { label: 'Valor', value: projeto.value ? projeto.value.toLocaleString('pt-BR', { style: 'currency', currency: projeto.currency || 'BRL' }) : '--', helper: projeto.brand || 'Sem marca' },
  ];

  return (
    <PageLayout
      variant="settings"
      contentStack="dense"
      header={
        <DesktopPageHeader
          section="Projetos"
          title={projeto.nome}
          meta={projeto.brand || undefined}
          icon={Briefcase}
          backLabel="Projetos"
          backTo="/projetos"
        />
      }
    >
      <div className="grid grid-metrics md:grid-cols-3">
        {summaryCards.map(card => (
          <Surface key={card.label} variant="outlined" padding="md">
            <p className="text-xs font-semibold opacity-40">{card.label}</p>
            <p className="mt-3 text-xl font-semibold text-[var(--text-primary)]">{card.value}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{card.helper}</p>
          </Surface>
        ))}
      </div>

      <div className="grid gap-[var(--space-xl)] xl:grid-cols-[1.2fr_0.8fr]">
        <div className="stack-lg">
          {/* Eventos */}
          <SectionCard
            eyebrow="Calendário"
            title="Eventos"
            action={
              !showAgendaForm ? (
                <button
                  type="button"
                  onClick={() => setShowAgendaForm(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] opacity-70 transition-opacity hover:opacity-100"
                >
                  <CalendarDays className="h-4 w-4" />
                  Novo evento
                </button>
              ) : null
            }
          >
            <div className="stack-md">
              {showAgendaForm && (
                <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                  <div className="stack-md">
                    <input
                      autoFocus
                      value={agendaTitle}
                      onChange={event => setAgendaTitle(event.target.value)}
                      placeholder="Título do evento"
                      className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
                    />
                    <div className="grid gap-3 md:grid-cols-3">
                      <input
                        type="date"
                        value={agendaDate}
                        onChange={event => setAgendaDate(event.target.value)}
                        className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none"
                      />
                      <div className="stack-xs">
                        <input
                          type="time"
                          value={agendaTime}
                          onChange={event => setAgendaTime(event.target.value)}
                          className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-xs text-[var(--text-primary)] focus:outline-none"
                        />
                        <PostingTimeSuggestions
                          date={agendaDate}
                          selectedTime={agendaTime}
                          postingTimes={postingTimes}
                          onSelect={setAgendaTime}
                        />
                      </div>
                      <select
                        value={agendaTipo}
                        onChange={event => setAgendaTipo(event.target.value as AgendaItem['tipo'])}
                        className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-xs font-semibold uppercase text-[var(--text-primary)] focus:outline-none"
                      >
                        {TIPO_AGENDA.map(tipo => (
                          <option key={tipo} value={tipo}>{tipo}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={handleAddAgenda} className="rounded-xl bg-[var(--text-primary)] px-6 py-3 text-xs font-semibold text-[var(--bg-primary)] transition-opacity hover:opacity-90">
                        Adicionar evento
                      </button>
                      <button type="button" onClick={() => setShowAgendaForm(false)} className="rounded-xl border border-[var(--border-color)] px-6 py-3 text-xs font-semibold opacity-60 transition-opacity hover:opacity-100">
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {agendaItems.length === 0 && !showAgendaForm && (
                <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-color)] px-6 py-8 text-center">
                  <p className="text-sm font-semibold opacity-30">Nenhum evento ainda</p>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">Crie reunioes, entregas e publicacoes. Tudo aparece no calendario.</p>
                </div>
              )}

              {agendaItems.map(item => (
                <div key={item.id} className="flex items-center gap-4 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-card)] bg-[var(--bg-primary)] text-[var(--text-primary)]">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
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

          {/* Conteudos */}
          <SectionCard
            eyebrow="Conteúdo"
            title="Conteudos vinculados"
            action={
              <button
                type="button"
                onClick={() => navigate('/conteudos')}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--text-primary)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--bg-primary)] transition-opacity hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Criar conteudo
              </button>
            }
          >
            <div className="stack-lg">
              {disponiveisParaVincular.length > 0 && (
                <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] opacity-40">Vincular existente</p>
                  <select
                    defaultValue=""
                    onChange={event => {
                      if (!event.target.value) return;
                      vincularContent(event.target.value);
                      event.target.value = '';
                    }}
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-xs font-bold text-[var(--text-primary)] focus:outline-none"
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
                <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-color)] px-6 py-8 text-center">
                  <p className="text-sm font-semibold opacity-30">Nenhum conteudo vinculado</p>
                </div>
              ) : (
                <div className="stack-md">
                  {projetoContents.map(content => (
                    <div key={content.id} className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] bg-[var(--bg-primary)] text-[var(--text-primary)]">
                          <ClipboardList className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{content.title || '(sem titulo)'}</p>
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">{content.status}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/conteudos/${content.id}`)}
                          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-3 py-2 text-xs font-semibold opacity-70 transition-opacity hover:opacity-100"
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

        {/* Sidebar: Resumo + Edit */}
        <div className="stack-lg">
          <SectionCard
            eyebrow="Contexto"
            title="Resumo do projeto"
            action={
              !isEditing ? (
                <button
                  type="button"
                  onClick={startEditing}
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] opacity-70 transition-opacity hover:opacity-100"
                >
                  <Pencil className="h-4 w-4" />
                  Editar
                </button>
              ) : null
            }
          >
            {!isEditing ? (
              <div className="stack-lg">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Marca', value: projeto.brand || '--' },
                    {
                      label: 'Valor',
                      value: projeto.value
                        ? projeto.value.toLocaleString('pt-BR', { style: 'currency', currency: projeto.currency || 'BRL' })
                        : '--',
                    },
                  ].map(item => (
                    <div key={item.label} className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] opacity-40">{item.label}</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Cor */}
                <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4">
                  <div className="h-8 w-8 rounded-full shrink-0" style={{ backgroundColor: projeto.color || '#78716c' }} />
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] opacity-40">Cor</p>
                </div>

                {projeto.notes ? (
                  <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] opacity-40">Notas</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">{projeto.notes}</p>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleDeleteProjeto}
                  className="w-full rounded-xl border border-red-500/30 px-6 py-3 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10"
                >
                  Excluir projeto
                </button>
              </div>
            ) : (
              <div className="stack-lg">
                <input
                  value={editNome}
                  onChange={event => setEditNome(event.target.value)}
                  placeholder="Nome"
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] focus:outline-none"
                />
                <input
                  value={editBrand}
                  onChange={event => setEditBrand(event.target.value)}
                  placeholder="Marca"
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
                />
                <input
                  type="number"
                  value={editValue}
                  onChange={event => setEditValue(event.target.value)}
                  placeholder="Valor (R$)"
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-xs text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
                />
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] opacity-40">Cor do projeto</p>
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
                <input
                  value={editDriveUrl}
                  onChange={event => setEditDriveUrl(event.target.value)}
                  placeholder="Link da pasta no Drive (https://...)"
                  type="url"
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
                />
                <textarea
                  value={editNotes}
                  onChange={event => setEditNotes(event.target.value)}
                  placeholder="Notas do projeto"
                  rows={4}
                  className="w-full resize-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:opacity-30 focus:outline-none"
                />
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={saveEdit} className="rounded-xl bg-[var(--text-primary)] px-6 py-3 text-xs font-semibold text-[var(--bg-primary)] transition-opacity hover:opacity-90">
                    Salvar
                  </button>
                  <button type="button" onClick={() => setIsEditing(false)} className="rounded-xl border border-[var(--border-color)] px-6 py-3 text-xs font-semibold opacity-60 transition-opacity hover:opacity-100">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </PageLayout>
  );
}
