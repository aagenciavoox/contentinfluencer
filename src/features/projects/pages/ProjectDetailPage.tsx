import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Briefcase,
  CalendarDays,
  ClipboardList,
  Link2,
  Plus,
  Trash2,
} from 'lucide-react';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import {
  normalizeProjetoTipo,
  type AgendaItem,
  type Content,
} from '../../../lib/database';
import { cn } from '../../../lib/utils';
import { buildDetailBackState } from '../../../lib/navigation/detailBack';
import { CONFIRM, type ConfirmState } from '../../../lib/uiCopy';
import { ConfirmModal } from '../../../components/feedback/modals/ConfirmModal';
import { DesktopPageHeader } from '../../../layouts/page/DesktopPageHeader';
import { PageLayout } from '../../../layouts/page/PageLayout';
import { Section } from '../../../components/ui/Section';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { MoreMenu } from '../../../components/ui/MoreMenu';
import { Surface } from '../../../components/ui/Surface';
import { TagSelect } from '../../../components/ui/TagSelect';
import { Text } from '../../../components/ui/Text';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { ProjectDetailMobileScreen } from '../../../mobile/screens/projects/ProjectDetailMobileScreen';
import type { ProjectDetailEditFields } from '../../../mobile/screens/projects/ProjectDetailMobileScreen';
import { PostingTimeSuggestions } from '../../settings/components/PostingTimeSuggestions';
import { getPostingTimes } from '../../settings/lib/postingTimes';
import { generateUUID } from '../../../utils/uuid';
import { FuncaoDoRoteiro } from '../components/FuncaoDoRoteiro';
import { ProjetoEventoFields } from '../components/ProjetoEventoFields';
import {
  aplicarFuncaoNoEvento,
  avisoDiasInvalido,
  avisoDiasParaSalvar,
  isProjetoEvento,
  rotuloAvisoDias,
  rotuloProjetoTipo,
  type EscolhaFuncaoEvento,
  type ProjetoTipoFormulario,
} from '../lib/evento';
import { PROJECT_STATUS_LABEL } from './ProjectsPage';

const PROJECT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#ec4899', '#f43f5e', '#78716c',
];

const TIPO_AGENDA: AgendaItem['tipo'][] = ['Reunião', 'Entrega', 'Publicação', 'Outro'];

function localTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function formatDate(value: string | null) {
  if (!value) return '--';
  const [year, month, day] = value.split('-');
  if (year && month && day) return `${day}/${month}/${year}`;
  return new Date(value).toLocaleDateString('pt-BR');
}

function formatDayMonth(value: string) {
  const [, month, day] = value.split('-');
  if (month && day) return `${day}/${month}`;
  return formatDate(value);
}

function resolveEventHighlight(agendaItems: AgendaItem[]) {
  const today = localTodayKey();
  const proximoEvento = agendaItems.find(item => item.date >= today) ?? null;
  const ultimoEvento = [...agendaItems].reverse().find(item => item.date < today) ?? null;
  return { proximoEvento, ultimoEvento };
}

function eventHighlightLabel(agendaItems: AgendaItem[]) {
  const { proximoEvento, ultimoEvento } = resolveEventHighlight(agendaItems);
  if (proximoEvento) return `Próximo: ${formatDate(proximoEvento.date)}`;
  if (ultimoEvento) return `Último: ${formatDayMonth(ultimoEvento.date)}`;
  return 'Sem eventos';
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
  const location = useLocation();
  const detailBackState = buildDetailBackState(`${location.pathname}${location.search}`);
  const isMobile = useIsMobile();
  const postingTimes = getPostingTimes(state.preferences);

  const projeto = state.projetos.find(p => p.id === id);

  const [editNome, setEditNome] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editDriveUrl, setEditDriveUrl] = useState('');
  const [editTipo, setEditTipo] = useState<ProjetoTipoFormulario>('publi');
  const [editAvisoDias, setEditAvisoDias] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const [agendaTitle, setAgendaTitle] = useState('');
  const [agendaDate, setAgendaDate] = useState('');
  const [agendaTime, setAgendaTime] = useState('');
  const [agendaTipo, setAgendaTipo] = useState<AgendaItem['tipo']>('Reunião');
  const [showAgendaForm, setShowAgendaForm] = useState(false);

  if (!projeto) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-secondary)]">
        <div className="stack-lg text-center">
          <Text variant="bodyStrong">Projeto não encontrado</Text>
          <AppButton variant="secondary" onClick={() => navigate('/projetos')}>
            Voltar aos projetos
          </AppButton>
        </div>
      </div>
    );
  }

  const agendaItems = [...state.agendaItems]
    .filter(item => item.projetoId === projeto.id)
    .sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`));
  const projetoContents = state.contents.filter(content => projeto.contentIds.includes(content.id));
  const disponiveisParaVincular = state.contents.filter(content => !projeto.contentIds.includes(content.id));
  const evento = isProjetoEvento(normalizeProjetoTipo(projeto.tipo));
  const statusLabel = PROJECT_STATUS_LABEL[projeto.status] ?? projeto.status;
  const projectColor = projeto.color || '#78716c';
  const formattedValue = projeto.value
    ? projeto.value.toLocaleString('pt-BR', { style: 'currency', currency: projeto.currency || 'BRL' })
    : '--';

  const startEditing = () => {
    setEditNome(projeto.nome);
    setEditBrand(projeto.brand || '');
    setEditValue(projeto.value?.toString() || '');
    setEditNotes(projeto.notes || '');
    setEditColor(projeto.color || '#78716c');
    setEditDriveUrl(projeto.driveUrl || '');
    const tipoNormalizado = normalizeProjetoTipo(projeto.tipo);
    setEditTipo(tipoNormalizado === 'producao' || tipoNormalizado === 'evento' || tipoNormalizado === 'outro' ? tipoNormalizado : 'publi');
    setEditAvisoDias(projeto.avisoDias == null ? '' : String(projeto.avisoDias));
    setIsEditing(true);
  };

  const saveEdit = () => {
    const aviso = avisoDiasParaSalvar(editTipo, editAvisoDias);
    if (aviso === 'invalid') return;
    dispatch({
      type: 'UPDATE_PROJETO',
      payload: {
        ...projeto,
        nome: editNome.trim() || projeto.nome,
        tipo: editTipo,
        avisoDias: aviso,
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
    setConfirm({
      ...CONFIRM.excluirProjeto(projeto.nome),
      onConfirm: () => {
        dispatch({ type: 'DELETE_PROJETO', payload: projeto.id });
        navigate('/projetos');
      },
    });
  };

  const confirmModal = (
    <ConfirmModal
      open={!!confirm}
      message={confirm?.message || ''}
      confirmLabel={confirm?.confirmLabel}
      cancelLabel={confirm?.cancelLabel}
      onConfirm={() => {
        confirm?.onConfirm();
        setConfirm(null);
      }}
      onCancel={() => setConfirm(null)}
    />
  );

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
      case 'driveUrl': setEditDriveUrl(value as string); break;
      case 'tipo': setEditTipo(value as ProjetoTipoFormulario); break;
      case 'avisoDias': setEditAvisoDias(value as string); break;
    }
  };

  const escolherFuncao = (contentId: string, escolha: EscolhaFuncaoEvento) => {
    const content = state.contents.find(item => item.id === contentId);
    if (!content) return;
    const next = aplicarFuncaoNoEvento(content, escolha);
    if (next === content) return;
    dispatch({
      type: 'UPDATE_CONTENT',
      payload: { ...next, updatedAt: new Date().toISOString() },
    });
  };

  const editFields: ProjectDetailEditFields = {
    nome: editNome,
    brand: editBrand,
    value: editValue,
    notes: editNotes,
    color: editColor,
    driveUrl: editDriveUrl,
    tipo: editTipo,
    avisoDias: editAvisoDias,
  };

  if (isMobile) {
    return (
      <div className="min-h-full bg-[var(--bg-primary)]">
        <ProjectDetailMobileScreen
          projeto={projeto}
          agendaItems={agendaItems}
          projetoContents={projetoContents}
          disponiveisParaVincular={disponiveisParaVincular}
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
          onOpenContent={contentId => navigate(`/conteudos/${contentId}`, detailBackState)}
          onCreateContent={() => navigate('/criacao?compose=script')}
          series={state.series}
          onEscolherFuncao={escolherFuncao}
        />
        {confirmModal}
      </div>
    );
  }

  const summaryCards = [
    { label: 'Eventos', value: `${agendaItems.length}`, helper: eventHighlightLabel(agendaItems) },
    {
      label: 'Roteiros',
      value: `${projetoContents.length}`,
      helper: disponiveisParaVincular.length > 0 ? `${disponiveisParaVincular.length} disponíveis` : 'Todos vinculados',
    },
    { label: 'Valor', value: formattedValue, helper: '' },
  ];

  return (
    <>
    <PageLayout
      contentStack="dense"
      header={
        <DesktopPageHeader
          section="Produção"
          title={projeto.nome}
          titleContent={(
            <div className="min-w-0">
              <Text variant="pageTitle" className="truncate">{projeto.nome}</Text>
              <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2">
                {projeto.brand ? (
                  <Text variant="label">{projeto.brand}</Text>
                ) : null}
                <Badge variant="neutral">{rotuloProjetoTipo(projeto.tipo)}</Badge>
                {projeto.status ? (
                  <Badge variant="neutral">{statusLabel}</Badge>
                ) : null}
              </div>
            </div>
          )}
          icon={Briefcase}
          backLabel="Projetos"
          backTo="/projetos"
          rowAlign="center"
          actions={
            <>
              <MoreMenu
                label="Mais opções do projeto"
                items={[
                  { id: 'edit', label: 'Editar', onClick: startEditing },
                  { id: 'delete', label: 'Excluir', onClick: handleDeleteProjeto, tone: 'danger' },
                ]}
              />
              <AppButton
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setShowAgendaForm(true)}
              >
                Novo evento
              </AppButton>
            </>
          }
        />
      }
    >
      <div className="grid-metrics-3">
        {summaryCards.map(card => (
          <Surface key={card.label} variant="outlined" padding="md">
            <Text variant="label">{card.label}</Text>
            <Text variant="sectionTitle" as="p" className="mt-3">{card.value}</Text>
            {card.helper ? (
              <Text variant="meta" className="mt-1 block">{card.helper}</Text>
            ) : null}
          </Surface>
        ))}
      </div>

      <div className="grid gap-[var(--space-xl)] xl:grid-cols-[1.2fr_0.8fr]">
        <div className="stack-lg">
          <SectionCard
            eyebrow="Calendário"
            title="Eventos"
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
                      className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
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
                      <TagSelect
                        label="Tipo"
                        values={[agendaTipo]}
                        onChange={values => setAgendaTipo((values[0] ?? 'Reunião') as AgendaItem['tipo'])}
                        options={TIPO_AGENDA.map(tipo => ({value: tipo, label: tipo}))}
                        maxSelections={1}
                      />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <AppButton variant="secondary" onClick={handleAddAgenda}>
                        Adicionar evento
                      </AppButton>
                      <AppButton variant="secondary" onClick={() => setShowAgendaForm(false)}>
                        Cancelar
                      </AppButton>
                    </div>
                  </div>
                </div>
              )}

              {agendaItems.length === 0 && !showAgendaForm && (
                <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-color)] px-6 py-8 text-center">
                  <Text variant="bodyStrong">Nenhum evento ainda</Text>
                  <Text variant="secondary" className="mt-2">
                    Crie reuniões, entregas e publicações. Tudo aparece no calendário.
                  </Text>
                </div>
              )}

              {agendaItems.map(item => (
                <div key={item.id} className="flex items-center gap-4 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-card)] bg-[var(--bg-primary)] text-[var(--text-primary)]">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Text variant="itemTitle" as="p">{item.title}</Text>
                    <Text variant="meta" className="mt-1 block">
                      {formatDate(item.date)}{item.time ? ` · ${item.time}` : ''} · {item.tipo}
                    </Text>
                  </div>
                  <AppButton
                    type="button"
                    variant="ghost"
                    iconOnly
                    aria-label={`Remover evento ${item.title}`}
                    onClick={() => dispatch({ type: 'DELETE_AGENDA_ITEM', payload: item.id })}
                    leftIcon={<Trash2 className="h-4 w-4" />}
                  >
                    Remover
                  </AppButton>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Criação"
            title="Roteiros vinculados"
            action={
              <AppButton
                variant="secondary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => navigate('/criacao?compose=script')}
              >
                Criar roteiro
              </AppButton>
            }
          >
            <div className="stack-lg">
              {disponiveisParaVincular.length > 0 && (
                <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                  <TagSelect
                    label="Vincular existente"
                    values={[]}
                    onChange={values => {
                      const contentId = values[0];
                      if (contentId) vincularContent(contentId);
                    }}
                    options={disponiveisParaVincular.map(content => ({
                      value: content.id,
                      label: content.title || '(sem título)',
                    }))}
                    maxSelections={1}
                    placeholder="Escolha um roteiro para vincular…"
                  />
                </div>
              )}

              {projetoContents.length === 0 ? (
                <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-color)] px-6 py-8 text-center">
                  <Text variant="bodyStrong">Nenhum roteiro vinculado</Text>
                  {evento ? (
                    <Text variant="secondary" className="mt-2">
                      Cada roteiro deste evento fica com a própria função.
                    </Text>
                  ) : null}
                </div>
              ) : (
                <div className="stack-md">
                  {evento ? (
                    <Text variant="secondary">Cada roteiro deste evento tem a própria função.</Text>
                  ) : null}
                  {projetoContents.map(content => (
                    <div key={content.id} className="stack-md rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] bg-[var(--bg-primary)] text-[var(--text-primary)]">
                          <ClipboardList className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Text variant="itemTitle" as="p" truncate>{content.title || '(sem título)'}</Text>
                          <Text variant="meta" className="mt-1 block">{content.status}</Text>
                        </div>
                        <AppButton
                          variant="secondary"
                          size="sm"
                          leftIcon={<Link2 className="h-3.5 w-3.5" />}
                          onClick={() => navigate(`/conteudos/${content.id}`, detailBackState)}
                        >
                          Abrir
                        </AppButton>
                      </div>
                      {evento ? (
                        <FuncaoDoRoteiro
                          contentId={content.id}
                          content={content}
                          serie={state.series.find(serie => serie.id === content.seriesId) ?? null}
                          onChange={escolha => escolherFuncao(content.id, escolha)}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="stack-lg">
          <SectionCard
            eyebrow="Contexto"
            title="Resumo do projeto"
          >
            {!isEditing ? (
              <div className="stack-lg">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Tipo', value: rotuloProjetoTipo(projeto.tipo) },
                    { label: 'Marca', value: projeto.brand || '--' },
                    { label: 'Valor', value: formattedValue },
                    ...(evento ? [{ label: 'Aviso', value: rotuloAvisoDias(projeto.avisoDias) }] : []),
                  ].map(item => (
                    <div key={item.label} className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4">
                      <Text variant="label">{item.label}</Text>
                      <Text variant="bodyStrong" className="mt-2">{item.value}</Text>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4">
                  <span
                    aria-hidden
                    className="h-8 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: projectColor }}
                  />
                  <Text variant="label">Cor</Text>
                </div>

                {projeto.notes ? (
                  <div className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4">
                    <Text variant="label">Notas</Text>
                    <Text variant="secondary" className="mt-3 whitespace-pre-wrap">{projeto.notes}</Text>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="stack-lg">
                <input
                  value={editNome}
                  onChange={event => setEditNome(event.target.value)}
                  placeholder="Nome"
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
                />
                <ProjetoEventoFields
                  tipo={editTipo}
                  avisoDias={editAvisoDias}
                  onTipoChange={setEditTipo}
                  onAvisoDiasChange={setEditAvisoDias}
                  inputClassName="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
                />
                <input
                  value={editBrand}
                  onChange={event => setEditBrand(event.target.value)}
                  placeholder="Marca"
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
                />
                <input
                  type="number"
                  value={editValue}
                  onChange={event => setEditValue(event.target.value)}
                  placeholder="Valor (R$)"
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
                />
                <div>
                  <Text variant="label" className="mb-2 block">Cor do projeto</Text>
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
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
                />
                <textarea
                  value={editNotes}
                  onChange={event => setEditNotes(event.target.value)}
                  placeholder="Notas do projeto"
                  rows={4}
                  className="w-full resize-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
                />
                <div className="flex flex-wrap gap-3">
                  <AppButton variant="secondary" onClick={saveEdit} disabled={avisoDiasInvalido(editTipo, editAvisoDias)}>
                    Salvar
                  </AppButton>
                  <AppButton variant="secondary" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </AppButton>
                </div>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </PageLayout>
    {confirmModal}
    </>
  );
}
