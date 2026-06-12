import { useState } from 'react';
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Link2,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { AppButton } from '../../../components/ui/AppButton';
import type { AgendaItem, Content, Projeto, ProjetoEtapa } from '../../../lib/database';
import { cn } from '../../../lib/utils';
import { PostingTimeSuggestions } from '../../../features/settings/components/PostingTimeSuggestions';
import type { PostingTimesSettings } from '../../../features/settings/lib/postingTimes';
import { MobileEmptyState } from '../../components/MobileEmptyState';
import { MobileListCard } from '../../components/MobileListCard';
import { MobileSegmentTabs } from '../../components/MobileSegmentTabs';

type ProjectDetailTab = 'etapas' | 'agenda' | 'conteudos';

const STATUS_ETAPA: ProjetoEtapa['status'][] = ['pendente', 'em_andamento', 'concluída'];
const STATUS_LABELS: Record<ProjetoEtapa['status'], string> = {
  pendente: 'Em aberto',
  em_andamento: 'Em andamento',
  concluída: 'Concluida',
};
const STATUS_COLORS: Record<ProjetoEtapa['status'], string> = {
  pendente: 'bg-zinc-800 text-zinc-400',
  em_andamento: 'bg-yellow-400/10 text-yellow-400',
  concluída: 'bg-green-400/10 text-green-400',
};
const TIPO_AGENDA: AgendaItem['tipo'][] = ['Reunião', 'Entrega', 'Publicação', 'Outro'];

function formatDate(value: string | null) {
  if (!value) return '--';
  return new Date(value).toLocaleDateString('pt-BR');
}

function getProgress(etapas: ProjetoEtapa[]) {
  if (etapas.length === 0) return 0;
  const done = etapas.filter(etapa => etapa.status === 'concluída').length;
  return Math.round((done / etapas.length) * 100);
}

export interface ProjectDetailEditFields {
  nome: string;
  tipo: Projeto['tipo'];
  brand: string;
  dataInicio: string;
  dataFim: string;
  value: string;
  notes: string;
  color: string;
}

export interface ProjectDetailMobileScreenProps {
  projeto: Projeto;
  projetoTipoNormalizado: string;
  sortedEtapas: ProjetoEtapa[];
  agendaItems: AgendaItem[];
  projetoContents: Content[];
  disponiveisParaVincular: Content[];
  etapasConcluidas: number;
  proximaEntrega: ProjetoEtapa | null;
  proximoEvento: AgendaItem | null;
  postingTimes: PostingTimesSettings;
  projectColors: string[];
  isEditing: boolean;
  editFields: ProjectDetailEditFields;
  onEditFieldChange: <K extends keyof ProjectDetailEditFields>(key: K, value: ProjectDetailEditFields[K]) => void;
  onStartEditing: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDeleteProjeto: () => void;
  showEtapaForm: boolean;
  novaEtapaNome: string;
  novaEtapaPrazo: string;
  onNovaEtapaNomeChange: (value: string) => void;
  onNovaEtapaPrazoChange: (value: string) => void;
  onOpenEtapaForm: () => void;
  onCloseEtapaForm: () => void;
  onAddEtapa: () => void;
  onToggleEtapaStatus: (etapa: ProjetoEtapa) => void;
  onMoveEtapa: (etapa: ProjetoEtapa, direction: -1 | 1) => void;
  onDeleteEtapa: (etapaId: string) => void;
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
  projetoTipoNormalizado,
  sortedEtapas,
  agendaItems,
  projetoContents,
  disponiveisParaVincular,
  etapasConcluidas,
  proximaEntrega,
  proximoEvento,
  postingTimes,
  projectColors,
  isEditing,
  editFields,
  onEditFieldChange,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onDeleteProjeto,
  showEtapaForm,
  novaEtapaNome,
  novaEtapaPrazo,
  onNovaEtapaNomeChange,
  onNovaEtapaPrazoChange,
  onOpenEtapaForm,
  onCloseEtapaForm,
  onAddEtapa,
  onToggleEtapaStatus,
  onMoveEtapa,
  onDeleteEtapa,
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
  const [activeTab, setActiveTab] = useState<ProjectDetailTab>('etapas');
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState('');

  const progress = getProgress(sortedEtapas);
  const projectColor = projeto.color || '#78716c';

  const tabAction = (() => {
    if (activeTab === 'etapas') {
      return (
        <button type="button" onClick={onOpenEtapaForm} className="button-primary w-full">
          <Plus className="h-4 w-4" />
          Nova etapa
        </button>
      );
    }
    if (activeTab === 'agenda') {
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
      <section className="rounded-[1.75rem] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <div
            className="mt-0.5 h-11 w-11 shrink-0 rounded-[var(--radius-card-mobile)] md:rounded-[var(--radius-card)]"
            style={{ backgroundColor: projectColor }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-[var(--text-primary)]">{projeto.nome}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {projetoTipoNormalizado}
              {projeto.brand ? ` · ${projeto.brand}` : ''}
            </p>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              {formatDate(projeto.dataInicio)} → {formatDate(projeto.dataFim)}
            </p>
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="t-label text-[var(--text-tertiary)]">Progresso das etapas</span>
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              {etapasConcluidas}/{sortedEtapas.length} · {progress}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-[var(--bg-hover)]">
            <div
              className="h-full rounded-full bg-[var(--text-primary)] transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <p className="t-label text-[var(--text-tertiary)]">Etapas</p>
            <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{sortedEtapas.length}</p>
          </div>
          <div className="rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3">
            <p className="t-label text-[var(--text-tertiary)]">Eventos</p>
            <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{agendaItems.length}</p>
          </div>
        </div>

        {(proximaEntrega || proximoEvento) && (
          <div className="mt-3 space-y-1 rounded-[1.2rem] bg-[var(--bg-hover)] px-3 py-3 text-xs text-[var(--text-secondary)]">
            {proximaEntrega ? (
              <p>
                Proximo ponto: {proximaEntrega.nome} em {formatDate(proximaEntrega.dataPrazo)}
              </p>
            ) : null}
            {proximoEvento ? (
              <p>
                Proximo evento: {proximoEvento.title} em {formatDate(proximoEvento.date)}
              </p>
            ) : null}
          </div>
        )}
      </section>

      <MobileSegmentTabs
        rounded="tight"
        tabs={[
          { value: 'etapas', label: 'Etapas', count: sortedEtapas.length },
          { value: 'agenda', label: 'Agenda', count: agendaItems.length },
          { value: 'conteudos', label: 'Conteudos', count: projetoContents.length },
        ]}
        value={activeTab}
        onChange={value => setActiveTab(value as ProjectDetailTab)}
      />

      {activeTab === 'etapas' && (
        <section className="space-y-3">
          {sortedEtapas.length === 0 ? (
            <MobileEmptyState
              title="Nenhuma etapa criada"
              description="Comece estruturando as entregas e checkpoints deste projeto."
              action={tabAction}
              icon={<ListChecks className="h-8 w-8" />}
            />
          ) : (
            <>
              {sortedEtapas.map((etapa, idx) => (
                <MobileListCard
                  key={etapa.id}
                  title={etapa.nome}
                  description={
                    etapa.dataPrazo ? `Data combinada: ${formatDate(etapa.dataPrazo)}` : 'Sem data combinada'
                  }
                  trailing={
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => onMoveEtapa(etapa, -1)}
                          disabled={idx === 0}
                          className="p-0.5 opacity-30 transition-opacity hover:opacity-80 disabled:opacity-10"
                          aria-label="Mover etapa para cima"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMoveEtapa(etapa, 1)}
                          disabled={idx === sortedEtapas.length - 1}
                          className="p-0.5 opacity-30 transition-opacity hover:opacity-80 disabled:opacity-10"
                          aria-label="Mover etapa para baixo"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeleteEtapa(etapa.id)}
                        className="p-1 opacity-30 transition-all hover:text-red-400 hover:opacity-60"
                        aria-label="Remover etapa"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  }
                  status={
                    <button
                      type="button"
                      onClick={() => onToggleEtapaStatus(etapa)}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                        STATUS_COLORS[etapa.status]
                      )}
                    >
                      {STATUS_LABELS[etapa.status]}
                    </button>
                  }
                />
              ))}
              {tabAction}
            </>
          )}
        </section>
      )}

      {activeTab === 'agenda' && (
        <section className="space-y-3">
          {agendaItems.length === 0 ? (
            <MobileEmptyState
              title="Nenhum evento cadastrado"
              description="Crie reunioes, entregas e publicacoes sem sair da tela do projeto."
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

      <BottomSheetModal open={isEditing} onClose={onCancelEdit} desktopMaxW="max-w-xl" zIndex="z-[110]">
        <div className="border-b border-[var(--border-color)] px-5 py-4">
          <p className="t-section-title text-[var(--text-primary)]">Editar projeto</p>
          <p className="t-secondary mt-1">Ajuste nome, datas, cor e notas do projeto.</p>
        </div>
        <div className="space-y-4 p-5 pb-safe">
          <input
            autoFocus
            value={editFields.nome}
            onChange={event => onEditFieldChange('nome', event.target.value)}
            placeholder="Nome"
            className="w-full"
          />
          <select
            value={editFields.tipo}
            onChange={event => onEditFieldChange('tipo', event.target.value as Projeto['tipo'])}
          >
            <option value="publi">Publi</option>
            <option value="producao">Producao</option>
            <option value="outro">Outro</option>
          </select>
          {editFields.tipo === 'publi' ? (
            <input
              value={editFields.brand}
              onChange={event => onEditFieldChange('brand', event.target.value)}
              placeholder="Marca"
              className="w-full"
            />
          ) : null}
          <input
            type="number"
            value={editFields.value}
            onChange={event => onEditFieldChange('value', event.target.value)}
            placeholder="Valor (R$)"
            className="w-full"
          />
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5">
              <span className="t-label text-[var(--text-tertiary)]">Inicio</span>
              <input
                type="date"
                value={editFields.dataInicio}
                onChange={event => onEditFieldChange('dataInicio', event.target.value)}
                className="w-full"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="t-label text-[var(--text-tertiary)]">Data final</span>
              <input
                type="date"
                value={editFields.dataFim}
                onChange={event => onEditFieldChange('dataFim', event.target.value)}
                className="w-full"
              />
            </label>
          </div>
          <div>
            <p className="mb-2 t-label text-[var(--text-tertiary)]">Cor do projeto</p>
            <div className="flex flex-wrap gap-2">
              {projectColors.map(color => (
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

      <BottomSheetModal open={showEtapaForm} onClose={onCloseEtapaForm} desktopMaxW="max-w-xl" zIndex="z-[110]">
        <div className="border-b border-[var(--border-color)] px-5 py-4">
          <p className="t-section-title text-[var(--text-primary)]">Nova etapa</p>
        </div>
        <div className="space-y-4 p-5 pb-safe">
          <input
            autoFocus
            value={novaEtapaNome}
            onChange={event => onNovaEtapaNomeChange(event.target.value)}
            onKeyDown={event => event.key === 'Enter' && onAddEtapa()}
            placeholder="Nome da etapa"
            className="w-full"
          />
          <label className="block space-y-1.5">
            <span className="t-label text-[var(--text-tertiary)]">Data combinada</span>
            <input
              type="date"
              value={novaEtapaPrazo}
              onChange={event => onNovaEtapaPrazoChange(event.target.value)}
              className="w-full"
            />
          </label>
          <AppButton variant="primary" onClick={onAddEtapa} className="min-h-11 w-full justify-center">
            <Check className="h-4 w-4" />
            Adicionar etapa
          </AppButton>
        </div>
      </BottomSheetModal>

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
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </label>
          <AppButton variant="primary" onClick={onAddAgenda} className="min-h-11 w-full justify-center">
            Adicionar evento
          </AppButton>
        </div>
      </BottomSheetModal>

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
