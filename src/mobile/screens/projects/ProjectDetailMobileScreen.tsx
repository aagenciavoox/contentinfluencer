import { useState } from 'react';
import {
  CalendarDays,
  ClipboardList,
  Link2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { AppButton } from '../../../components/ui/AppButton';
import type { AgendaItem, Content, Projeto } from '../../../lib/database';
import { cn } from '../../../lib/utils';
import { PostingTimeSuggestions } from '../../../features/settings/components/PostingTimeSuggestions';
import type { PostingTimesSettings } from '../../../features/settings/lib/postingTimes';
import { MobileEmptyState } from '../../components/MobileEmptyState';
import { MobileListCard } from '../../components/MobileListCard';
import { MobileSegmentTabs } from '../../components/MobileSegmentTabs';

type ProjectDetailTab = 'eventos' | 'conteudos';

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

export interface ProjectDetailEditFields {
  nome: string;
  brand: string;
  value: string;
  notes: string;
  color: string;
}

export interface ProjectDetailMobileScreenProps {
  projeto: Projeto;
  agendaItems: AgendaItem[];
  projetoContents: Content[];
  disponiveisParaVincular: Content[];
  proximoEvento: AgendaItem | null;
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
  proximoEvento,
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

  const projectColor = projeto.color || '#78716c';

  const tabAction = (() => {
    if (activeTab === 'eventos') {
      return (
        <button type="button" onClick={onOpenAgendaForm} className="button-primary w-full">
          <Plus className="h-4 w-4" />
          Novo evento
        </button>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {disponiveisParaVincular.length > 0 ? (
          <button type="button" onClick={() => setLinkSheetOpen(true)} className="button-primary w-full">
            <Link2 className="h-4 w-4" />
            Vincular existente
          </button>
        ) : null}
        <button type="button" onClick={onCreateContent} className="button-primary w-full">
          <Plus className="h-4 w-4" />
          Criar conteudo
        </button>
      </div>
    );
  })();

  return (
    <div className="space-y-5 pb-8">
      {/* Header do projeto */}
      <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <div
            className="mt-0.5 h-11 w-11 shrink-0 rounded-[var(--radius-card-mobile)]"
            style={{ backgroundColor: projectColor }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-[var(--text-primary)]">{projeto.nome}</p>
            {projeto.brand ? (
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{projeto.brand}</p>
            ) : null}
            {projeto.value ? (
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                {projeto.value.toLocaleString('pt-BR', { style: 'currency', currency: projeto.currency || 'BRL' })}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onStartEditing}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-card)] border border-[var(--border-color)] text-[var(--text-secondary)]"
            aria-label="Editar projeto"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <p className="t-label text-[var(--text-tertiary)]">Eventos</p>
            <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{agendaItems.length}</p>
          </div>
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <p className="t-label text-[var(--text-tertiary)]">Conteúdos</p>
            <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{projetoContents.length}</p>
          </div>
        </div>

        {proximoEvento ? (
          <div className="mt-3 rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3 text-xs text-[var(--text-secondary)]">
            Próximo: {proximoEvento.title} em {formatDate(proximoEvento.date)}
          </div>
        ) : null}
      </section>

      <MobileSegmentTabs
        rounded="tight"
        tabs={[
          { value: 'eventos', label: 'Eventos', count: agendaItems.length },
          { value: 'conteudos', label: 'Conteudos', count: projetoContents.length },
        ]}
        value={activeTab}
        onChange={value => setActiveTab(value as ProjectDetailTab)}
      />

      {activeTab === 'eventos' && (
        <section className="space-y-3">
          {agendaItems.length === 0 ? (
            <MobileEmptyState
              title="Nenhum evento ainda"
              description="Adicione reunioes, entregas e publicacoes. Tudo vai aparecer no calendario."
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
                    <button
                      type="button"
                      onClick={() => onDeleteAgendaItem(item.id)}
                      className="p-2 opacity-30 transition-all hover:text-red-400 hover:opacity-60"
                      aria-label="Remover evento"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  }
                />
              ))}
              {tabAction}
            </>
          )}
        </section>
      )}

      {activeTab === 'conteudos' && (
        <section className="space-y-3">
          {projetoContents.length === 0 ? (
            <MobileEmptyState
              title="Nenhum conteudo vinculado"
              description="Vincule ideias ja existentes ou crie novos conteudos para este projeto."
              action={tabAction}
              icon={<ClipboardList className="h-8 w-8" />}
            />
          ) : (
            <>
              {projetoContents.map(content => (
                <MobileListCard
                  key={content.id}
                  title={content.title || '(sem titulo)'}
                  description={content.status}
                  meta={
                    <>
                      {content.publishDate ? (
                        <span className="rounded-full bg-[var(--bg-hover)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                          Publicacao: {formatDate(content.publishDate)}
                        </span>
                      ) : null}
                      {content.recordingDate ? (
                        <span className="rounded-full bg-[var(--bg-hover)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                          Gravacao: {formatDate(content.recordingDate)}
                        </span>
                      ) : null}
                    </>
                  }
                  trailing={
                    <button
                      type="button"
                      onClick={() => onOpenContent(content.id)}
                      className="inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-card)] border border-[var(--border-color)] px-3 text-xs font-semibold text-[var(--text-primary)]"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Abrir
                    </button>
                  }
                />
              ))}
              {tabAction}
            </>
          )}
        </section>
      )}

      {/* Edit sheet */}
      <BottomSheetModal open={isEditing} onClose={onCancelEdit} desktopMaxW="max-w-xl" zIndex="z-[110]">
        <div className="border-b border-[var(--border-color)] px-5 py-4">
          <p className="t-section-title text-[var(--text-primary)]">Editar projeto</p>
        </div>
        <div className="space-y-4 p-5 pb-safe">
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
            <p className="mb-2 t-label text-[var(--text-tertiary)]">Cor do projeto</p>
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
            <button
              type="button"
              onClick={onDeleteProjeto}
              className="min-h-11 w-full rounded-[var(--radius-card)] border border-red-500/30 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10"
            >
              Excluir projeto
            </button>
          </div>
        </div>
      </BottomSheetModal>

      {/* Novo evento sheet */}
      <BottomSheetModal open={showAgendaForm} onClose={onCloseAgendaForm} desktopMaxW="max-w-xl" zIndex="z-[110]">
        <div className="border-b border-[var(--border-color)] px-5 py-4">
          <p className="t-section-title text-[var(--text-primary)]">Novo evento</p>
        </div>
        <div className="space-y-4 p-5 pb-safe">
          <input
            autoFocus
            value={agendaTitle}
            onChange={event => onAgendaTitleChange(event.target.value)}
            placeholder="Titulo do evento"
            className="w-full"
          />
          <label className="block space-y-1.5">
            <span className="t-label text-[var(--text-tertiary)]">Data</span>
            <input
              type="date"
              value={agendaDate}
              onChange={event => onAgendaDateChange(event.target.value)}
              className="w-full"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="t-label text-[var(--text-tertiary)]">Horario</span>
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
          <label className="block space-y-1.5">
            <span className="t-label text-[var(--text-tertiary)]">Tipo</span>
            <select value={agendaTipo} onChange={event => onAgendaTipoChange(event.target.value as AgendaItem['tipo'])}>
              {TIPO_AGENDA.map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </label>
          <AppButton variant="primary" onClick={onAddAgenda} className="min-h-11 w-full justify-center">
            Adicionar evento
          </AppButton>
        </div>
      </BottomSheetModal>

      {/* Vincular conteudo sheet */}
      <BottomSheetModal open={linkSheetOpen} onClose={() => setLinkSheetOpen(false)} desktopMaxW="max-w-xl" zIndex="z-[110]">
        <div className="border-b border-[var(--border-color)] px-5 py-4">
          <p className="t-section-title text-[var(--text-primary)]">Vincular conteudo</p>
        </div>
        <div className="space-y-4 p-5 pb-safe">
          <select
            value={selectedContentId}
            onChange={event => setSelectedContentId(event.target.value)}
          >
            <option value="">Escolha um conteudo...</option>
            {disponiveisParaVincular.map(content => (
              <option key={content.id} value={content.id}>
                {content.title || '(sem titulo)'}
              </option>
            ))}
          </select>
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
