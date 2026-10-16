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
import { Dialog } from '../../../components/overlays/Dialog';
import { ProjectDetailMobileScreen } from '../../../mobile/screens/projects/ProjectDetailMobileScreen';
import type { ProjectDetailEditFields } from '../../../mobile/screens/projects/ProjectDetailMobileScreen';
import { getPostingTimesForPlatform } from '../../settings/lib/postingTimes';
import { AgendaEventoDialog } from '../components/AgendaEventoDialog';
import { FuncaoDoRoteiro } from '../components/FuncaoDoRoteiro';
import { ProjetoCorPicker } from '../components/ProjetoCorPicker';
import { ProjetoEventoFields } from '../components/ProjetoEventoFields';
import { ProjectMonthCalendar } from '../components/ProjectMonthCalendar';
import { entregaDoProjeto } from '../lib/entrega';
import { getGentleExperienceSettings } from '../../settings/lib/gentleExperience';
import {
  aplicarFuncaoNoEvento,
  avisoDiasInvalido,
  avisoDiasParaSalvar,
  isProjetoEvento,
  isProjetoPubli,
  rotuloAvisoDias,
  rotuloProjetoTipo,
  tipoDoFormulario,
  tiposPersonalizadosUsados,
  type EscolhaFuncaoEvento,
  type ProjetoTipoFormulario,
} from '../lib/evento';
import type { ProjetoLivro } from '../../../lib/database';
import { PROJECT_STATUS_LABEL } from './ProjectsPage';

type EventoDialogState =
  | null
  | { mode: 'create'; date: string }
  | { mode: 'edit'; item: AgendaItem };

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
  informative = false,
}: {
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  /** Só leitura: sem borda, para não parecer clicável. */
  informative?: boolean;
}) {
  return (
    <Surface variant={informative ? 'info' : 'outlined'} padding="lg">
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
  const postingTimes = getPostingTimesForPlatform(state.postingTimeEntries, null);

  const projeto = state.projetos.find(p => p.id === id);

  const [editNome, setEditNome] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editDriveUrl, setEditDriveUrl] = useState('');
  const [editTipo, setEditTipo] = useState<ProjetoTipoFormulario>('publi');
  const [editTipoPersonalizado, setEditTipoPersonalizado] = useState('');
  const [editAvisoDias, setEditAvisoDias] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [eventoDialog, setEventoDialog] = useState<EventoDialogState>(null);

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
    setEditTipo(tipoDoFormulario(normalizeProjetoTipo(projeto.tipo)));
    setEditTipoPersonalizado(projeto.tipoPersonalizado || '');
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
        tipoPersonalizado: editTipo === 'outro' ? (editTipoPersonalizado.trim() || null) : null,
        avisoDias: aviso,
        brand: editBrand.trim() || null,
        color: editColor || null,
        value: isProjetoPubli(editTipo) ? (editValue ? parseFloat(editValue) : null) : projeto.value,
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

  const salvarEvento = (item: AgendaItem, livroNovo?: ProjetoLivro) => {
    const existe = state.agendaItems.some(atual => atual.id === item.id);
    dispatch({
      type: existe ? 'UPDATE_AGENDA_ITEM' : 'ADD_AGENDA_ITEM',
      payload: {...item, userId: user?.id || item.userId, projetoId: projeto.id},
      livroNovo,
    });
    setEventoDialog(null);
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
      case 'tipoPersonalizado': setEditTipoPersonalizado(value as string); break;
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
    tipoPersonalizado: editTipoPersonalizado,
    avisoDias: editAvisoDias,
  };

  const eventoDialogNode = (
    <Dialog open={eventoDialog != null} onClose={() => setEventoDialog(null)} desktopMaxW="max-w-xl" ariaLabel="Evento do projeto">
      {eventoDialog ? (
        <AgendaEventoDialog
          key={eventoDialog.mode === 'edit' ? eventoDialog.item.id : `novo-${eventoDialog.date}`}
          item={eventoDialog.mode === 'edit' ? eventoDialog.item : null}
          projetos={state.projetos}
          bibliotecaItems={state.bibliotecaItems}
          projetoIdFixo={projeto.id}
          dataInicial={eventoDialog.mode === 'create' ? eventoDialog.date : undefined}
          onClose={() => setEventoDialog(null)}
          onSave={salvarEvento}
          onDelete={evento => {
            dispatch({type: 'DELETE_AGENDA_ITEM', payload: evento.id});
            setEventoDialog(null);
          }}
        />
      ) : null}
    </Dialog>
  );

  if (isMobile) {
    return (
      <div className="min-h-full bg-[var(--bg-primary)]">
        <ProjectDetailMobileScreen
          projeto={projeto}
          agendaItems={agendaItems}
          projetoContents={projetoContents}
          disponiveisParaVincular={disponiveisParaVincular}
          isEditing={isEditing}
          editFields={editFields}
          onEditFieldChange={handleEditFieldChange}
          onStartEditing={startEditing}
          onSaveEdit={saveEdit}
          onCancelEdit={() => setIsEditing(false)}
          onDeleteProjeto={handleDeleteProjeto}
          onCreateEvent={date => setEventoDialog({mode: 'create', date})}
          onOpenEvent={item => setEventoDialog({mode: 'edit', item})}
          tiposSalvos={tiposPersonalizadosUsados(state.projetos)}
          onVincularContent={vincularContent}
          onOpenContent={contentId => navigate(`/conteudos/${contentId}`, detailBackState)}
          onCreateContent={() => navigate('/criacao?compose=script')}
          series={state.series}
          onEscolherFuncao={escolherFuncao}
        />
        {eventoDialogNode}
        {confirmModal}
      </div>
    );
  }

  // Valor fica só no resumo; aqui entra a data que importa, com aviso quando passou.
  const entrega = entregaDoProjeto(projeto, agendaItems, localTodayKey());
  const destacarPrazos = getGentleExperienceSettings(state.preferences).realDeadlineHighlights;
  const summaryCards = [
    {
      label: entrega?.tipo === 'passou' ? 'Data combinada passou' : 'Próxima entrega',
      value: entrega ? formatDayMonth(entrega.data) : '--',
      helper: entrega ? entrega.titulo : 'Sem datas no projeto',
      alert: entrega?.tipo === 'passou' && destacarPrazos,
    },
    { label: 'Eventos', value: `${agendaItems.length}`, helper: eventHighlightLabel(agendaItems), alert: false },
    {
      label: 'Roteiros',
      value: `${projetoContents.length}`,
      helper: disponiveisParaVincular.length > 0 ? `${disponiveisParaVincular.length} disponíveis` : 'Todos vinculados',
      alert: false,
    },
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
                <Badge variant="neutral">{rotuloProjetoTipo(projeto.tipo, projeto.tipoPersonalizado)}</Badge>
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
                onClick={() => setEventoDialog({mode: 'create', date: localTodayKey()})}
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
          <Surface
            key={card.label}
            variant="info"
            padding="md"
            className={card.alert ? 'border-[var(--danger)]' : undefined}
          >
            <Text variant="label" className={card.alert ? 'font-semibold text-[var(--text-primary)]' : undefined}>
              {card.label}
            </Text>
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
            title="Eventos do projeto"
          >
            <ProjectMonthCalendar
              eventos={agendaItems}
              livros={projeto.livros ?? []}
              cor={projeto.color}
              onCreate={date => setEventoDialog({mode: 'create', date})}
              onOpen={item => setEventoDialog({mode: 'edit', item})}
            />
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
            informative={!isEditing}
          >
            {!isEditing ? (
              <div className="stack-lg">
                {/* Lista simples em vez de cards dentro do card. A cor é ajuste, fica só na edição. */}
                <dl className="stack-sm">
                  {[
                    { label: 'Tipo', value: rotuloProjetoTipo(projeto.tipo, projeto.tipoPersonalizado) },
                    { label: 'Marca ou parceiro', value: projeto.brand || '--' },
                    ...(isProjetoPubli(projeto.tipo) ? [{ label: 'Valor', value: formattedValue }] : []),
                    ...(evento ? [{ label: 'Aviso', value: rotuloAvisoDias(projeto.avisoDias) }] : []),
                  ].map(item => (
                    <div key={item.label} className="flex items-baseline justify-between gap-4 border-b border-[var(--border-subtle)] pb-2 last:border-b-0 last:pb-0">
                      <dt><Text variant="label" as="span">{item.label}</Text></dt>
                      <dd><Text variant="bodyStrong" as="span">{item.value}</Text></dd>
                    </div>
                  ))}
                </dl>

                {projeto.notes ? (
                  <div>
                    <Text variant="label">Notas</Text>
                    <Text variant="secondary" className="mt-2 whitespace-pre-wrap">{projeto.notes}</Text>
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
                  tipoPersonalizado={editTipoPersonalizado}
                  tiposSalvos={tiposPersonalizadosUsados(state.projetos)}
                  incluirProducao={editTipo === 'producao' || projeto.tipo === 'producao'}
                  onTipoChange={setEditTipo}
                  onAvisoDiasChange={setEditAvisoDias}
                  onTipoPersonalizadoChange={setEditTipoPersonalizado}
                  inputClassName="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
                />
                <input
                  value={editBrand}
                  onChange={event => setEditBrand(event.target.value)}
                  placeholder="Marca ou parceiro"
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
                />
                {isProjetoPubli(editTipo) ? (
                  <input
                    type="number"
                    value={editValue}
                    onChange={event => setEditValue(event.target.value)}
                    placeholder="Valor (R$)"
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
                  />
                ) : null}
                <ProjetoCorPicker value={editColor} onChange={setEditColor} />
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
    {eventoDialogNode}
    {confirmModal}
    </>
  );
}
