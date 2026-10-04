import { useState } from 'react';
import {
  CalendarDays,
  ClipboardList,
  Link2,
  Plus,
  Trash2,
} from 'lucide-react';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { AppButton } from '../../../components/ui/AppButton';
import { Badge } from '../../../components/ui/Badge';
import { MoreMenu } from '../../../components/ui/MoreMenu';
import { TagSelect } from '../../../components/ui/TagSelect';
import { Text } from '../../../components/ui/Text';
import type { AgendaItem, Content, Projeto } from '../../../lib/database';
import { cn } from '../../../lib/utils';
import { PostingTimeSuggestions } from '../../../features/settings/components/PostingTimeSuggestions';
import type { PostingTimesSettings } from '../../../features/settings/lib/postingTimes';
import { EmptyState } from '../../../components/ui/EmptyState';
import { PROJECT_STATUS_LABEL } from '../../../features/projects/pages/ProjectsPage';
import { MobileListCard } from '../../components/MobileListCard';
import { MobileSegmentTabs } from '../../components/MobileSegmentTabs';

type ProjectDetailTab = 'eventos' | 'conteudos';

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

export interface ProjectDetailEditFields {
  nome: string;
  brand: string;
  value: string;
  notes: string;
  color: string;
  driveUrl: string;
}

export interface ProjectDetailMobileScreenProps {
  projeto: Projeto;
  agendaItems: AgendaItem[];
  projetoContents: Content[];
  disponiveisParaVincular: Content[];
  postingTimes: PostingTimesSettings;
  isEditing: boolean;
  editFields: ProjectDetailEditFields;
  onEditFieldChange: <K extends keyof ProjectDetailEditFields>(key: K, value: ProjectDetailEditFields[K]) => void;
  onStartEditing: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDeleteProjeto: () => void;
  showAgendaForm: boolean;
  agendaTitle: string;
  agendaDate: string;
  agendaTime: string;
  agendaTipo: AgendaItem['tipo'];
  onAgendaTitleChange: (value: string) => void;
  onAgendaDateChange: (value: string) => void;
  onAgendaTimeChange: (value: string) => void;
  onAgendaTipoChange: (value: AgendaItem['tipo']) => void;
  onOpenAgendaForm: () => void;
  onCloseAgendaForm: () => void;
  onAddAgenda: () => void;
  onDeleteAgendaItem: (itemId: string) => void;
  onVincularContent: (contentId: string) => void;
  onOpenContent: (contentId: string) => void;
  onCreateContent: () => void;
}

export function ProjectDetailMobileScreen({
  projeto,
  agendaItems,
  projetoContents,
  disponiveisParaVincular,
  postingTimes,
  isEditing,
  editFields,
  onEditFieldChange,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onDeleteProjeto,
  showAgendaForm,
  agendaTitle,
  agendaDate,
  agendaTime,
  agendaTipo,
  onAgendaTitleChange,
  onAgendaDateChange,
  onAgendaTimeChange,
  onAgendaTipoChange,
  onOpenAgendaForm,
  onCloseAgendaForm,
  onAddAgenda,
  onDeleteAgendaItem,
  onVincularContent,
  onOpenContent,
  onCreateContent,
}: ProjectDetailMobileScreenProps) {
  const [activeTab, setActiveTab] = useState<ProjectDetailTab>('eventos');
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState('');

  const { proximoEvento, ultimoEvento } = resolveEventHighlight(agendaItems);
  const statusLabel = PROJECT_STATUS_LABEL[projeto.status] ?? projeto.status;
  const formattedValue = projeto.value
    ? projeto.value.toLocaleString('pt-BR', { style: 'currency', currency: projeto.currency || 'BRL' })
    : '--';

  const tabAction = (() => {
    if (activeTab === 'eventos') {
      return (
        <AppButton variant="primary" fullWidth onClick={onOpenAgendaForm} leftIcon={<Plus className="h-4 w-4" />}>
          Novo evento
        </AppButton>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {disponiveisParaVincular.length > 0 ? (
          <AppButton variant="secondary" fullWidth onClick={() => setLinkSheetOpen(true)} leftIcon={<Link2 className="h-4 w-4" />}>
            Vincular existente
          </AppButton>
        ) : null}
        <AppButton variant="secondary" fullWidth onClick={onCreateContent} leftIcon={<Plus className="h-4 w-4" />}>
          Criar roteiro
        </AppButton>
      </div>
    );
  })();

  return (
    <div className="stack-lg pb-8">
      <section className="rounded-[var(--radius-card)] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
        <div className="mb-4 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <Text variant="sectionTitle" as="p" className="truncate">{projeto.nome}</Text>
            <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2">
              {projeto.brand ? (
                <Text variant="label">{projeto.brand}</Text>
              ) : null}
              {projeto.status ? (
                <Badge variant="neutral">{statusLabel}</Badge>
              ) : null}
            </div>
          </div>
          <MoreMenu
            label="Mais opções do projeto"
            triggerClassName="min-h-11 min-w-11"
            items={[
              { id: 'edit', label: 'Editar', onClick: onStartEditing },
              { id: 'delete', label: 'Excluir', onClick: onDeleteProjeto, tone: 'danger' },
            ]}
          />
        </div>

        <div className="grid-metrics-3">
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <Text variant="label">Eventos</Text>
            <Text variant="sectionTitle" as="p" className="mt-1 tabular-nums">{agendaItems.length}</Text>
          </div>
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <Text variant="label">Roteiros</Text>
            <Text variant="sectionTitle" as="p" className="mt-1 tabular-nums">{projetoContents.length}</Text>
          </div>
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <Text variant="label">Valor</Text>
            <Text variant="sectionTitle" as="p" className="mt-1 tabular-nums">{formattedValue}</Text>
          </div>
        </div>

        {proximoEvento ? (
          <Text variant="secondary" className="mt-3 rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            Próximo: {proximoEvento.title} em {formatDate(proximoEvento.date)}
          </Text>
        ) : ultimoEvento ? (
          <Text variant="secondary" className="mt-3 rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            Último: {formatDayMonth(ultimoEvento.date)}
          </Text>
        ) : null}
      </section>

      <MobileSegmentTabs
        rounded="tight"
        tabs={[
          { value: 'eventos', label: 'Eventos', count: agendaItems.length },
          { value: 'conteudos', label: 'Roteiros', count: projetoContents.length },
        ]}
        value={activeTab}
        onChange={value => setActiveTab(value as ProjectDetailTab)}
      />

      {activeTab === 'eventos' && (
        <section className="stack-md">
          {agendaItems.length === 0 ? (
            <EmptyState compact
              title="Nenhum evento ainda"
              description="Adicione reuniões, entregas e publicações. Tudo vai aparecer no calendário."
              action={tabAction}
              icon={<CalendarDays className="h-8 w-8" />}
            />
          ) : (
            <>
              {agendaItems.map(item => (
                <MobileListCard
                  key={item.id}
                  eyebrow={item.tipo}
                  title={item.title}
                  description={`${formatDate(item.date)}${item.time ? ` · ${item.time}` : ''}`}
                  trailing={
                    <AppButton
                      variant="ghost"
                      iconOnly
                      onClick={() => onDeleteAgendaItem(item.id)}
                      aria-label="Remover evento"
                      leftIcon={<Trash2 className="h-4 w-4" />}
                    >
                      Remover
                    </AppButton>
                  }
                />
              ))}
              {tabAction}
            </>
          )}
        </section>
      )}

      {activeTab === 'conteudos' && (
        <section className="stack-md">
          {projetoContents.length === 0 ? (
            <EmptyState compact
              title="Nenhum roteiro vinculado"
              description="Vincule ideias já existentes ou crie novos roteiros para este projeto."
              action={tabAction}
              icon={<ClipboardList className="h-8 w-8" />}
            />
          ) : (
            <>
              {projetoContents.map(content => (
                <MobileListCard
                  key={content.id}
                  title={content.title || '(sem título)'}
                  description={content.status}
                  meta={
                    <>
                      {content.publishDate ? (
                        <span className="rounded-full bg-[var(--bg-hover)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                          Publicação: {formatDate(content.publishDate)}
                        </span>
                      ) : null}
                      {content.recordingDate ? (
                        <span className="rounded-full bg-[var(--bg-hover)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                          Gravação: {formatDate(content.recordingDate)}
                        </span>
                      ) : null}
                    </>
                  }
                  trailing={
                    <AppButton
                      variant="secondary"
                      size="sm"
                      onClick={() => onOpenContent(content.id)}
                      leftIcon={<Link2 className="h-3.5 w-3.5" />}
                    >
                      Abrir
                    </AppButton>
                  }
                />
              ))}
              {tabAction}
            </>
          )}
        </section>
      )}

      <BottomSheetModal open={isEditing} onClose={onCancelEdit} desktopMaxW="max-w-xl" zIndex="z-[110]">
        <div className="border-b border-[var(--border-color)] px-4 py-3">
          <Text variant="sectionTitle">Editar projeto</Text>
        </div>
        <div className="stack-lg px-4 pb-safe">
          <input
            autoFocus
            value={editFields.nome}
            onChange={event => onEditFieldChange('nome', event.target.value)}
            placeholder="Nome"
            className="w-full"
          />
          <input
            value={editFields.brand}
            onChange={event => onEditFieldChange('brand', event.target.value)}
            placeholder="Marca"
            className="w-full"
          />
          <input
            type="number"
            value={editFields.value}
            onChange={event => onEditFieldChange('value', event.target.value)}
            placeholder="Valor (R$)"
            className="w-full"
          />
          <div>
            <Text variant="label" className="mb-2 block">Cor do projeto</Text>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => onEditFieldChange('color', color)}
                  className={cn(
                    'h-7 w-7 rounded-full border-2 transition-all',
                    editFields.color === color ? 'scale-110 border-[var(--text-primary)]' : 'border-transparent opacity-50 hover:opacity-80'
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Cor ${color}`}
                />
              ))}
            </div>
          </div>
          <textarea
            value={editFields.notes}
            onChange={event => onEditFieldChange('notes', event.target.value)}
            placeholder="Notas do projeto"
            rows={4}
            className="w-full resize-none"
          />
          <div className="grid grid-cols-1 gap-2">
            <AppButton variant="primary" onClick={onSaveEdit} className="min-h-11 w-full justify-center">
              Salvar
            </AppButton>
            <AppButton variant="secondary" onClick={onCancelEdit} className="min-h-11 w-full justify-center">
              Cancelar
            </AppButton>
          </div>
        </div>
      </BottomSheetModal>

      <BottomSheetModal open={showAgendaForm} onClose={onCloseAgendaForm} desktopMaxW="max-w-xl" zIndex="z-[110]">
        <div className="border-b border-[var(--border-color)] px-4 py-3">
          <Text variant="sectionTitle">Novo evento</Text>
        </div>
        <div className="stack-lg px-4 pb-safe">
          <input
            autoFocus
            value={agendaTitle}
            onChange={event => onAgendaTitleChange(event.target.value)}
            placeholder="Título do evento"
            className="w-full"
          />
          <label className="block space-y-1.5">
            <Text variant="label">Data</Text>
            <input
              type="date"
              value={agendaDate}
              onChange={event => onAgendaDateChange(event.target.value)}
              className="w-full"
            />
          </label>
          <label className="block space-y-1.5">
            <Text variant="label">Horário</Text>
            <input
              type="time"
              value={agendaTime}
              onChange={event => onAgendaTimeChange(event.target.value)}
              className="w-full"
            />
            <PostingTimeSuggestions
              date={agendaDate}
              selectedTime={agendaTime}
              postingTimes={postingTimes}
              onSelect={onAgendaTimeChange}
            />
          </label>
          <TagSelect
            label="Tipo"
            values={[agendaTipo]}
            onChange={values => onAgendaTipoChange((values[0] ?? 'Reunião') as AgendaItem['tipo'])}
            options={TIPO_AGENDA.map(tipo => ({value: tipo, label: tipo}))}
            maxSelections={1}
          />
          <AppButton variant="primary" onClick={onAddAgenda} className="min-h-11 w-full justify-center">
            Adicionar evento
          </AppButton>
        </div>
      </BottomSheetModal>

      <BottomSheetModal open={linkSheetOpen} onClose={() => setLinkSheetOpen(false)} desktopMaxW="max-w-xl" zIndex="z-[110]">
        <div className="border-b border-[var(--border-color)] px-4 py-3">
          <Text variant="sectionTitle">Vincular roteiro</Text>
        </div>
        <div className="stack-lg px-4 pb-safe">
          <TagSelect
            label="Vincular existente"
            values={selectedContentId ? [selectedContentId] : []}
            onChange={values => setSelectedContentId(values[0] ?? '')}
            options={disponiveisParaVincular.map(content => ({
              value: content.id,
              label: content.title || '(sem título)',
            }))}
            maxSelections={1}
            placeholder="Escolha um roteiro…"
          />
          <AppButton
            variant="primary"
            disabled={!selectedContentId}
            onClick={() => {
              if (!selectedContentId) return;
              onVincularContent(selectedContentId);
              setSelectedContentId('');
              setLinkSheetOpen(false);
            }}
            className="min-h-11 w-full justify-center"
          >
            Vincular
          </AppButton>
        </div>
      </BottomSheetModal>
    </div>
  );
}
