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
import type { AgendaItem, Content, FuncaoPadraoSerie, Projeto } from '../../../lib/database';
import { cn } from '../../../lib/utils';
import { EmptyState } from '../../../components/ui/EmptyState';
import { FuncaoDoRoteiro } from '../../../features/projects/components/FuncaoDoRoteiro';
import { ProjetoCorPicker } from '../../../features/projects/components/ProjetoCorPicker';
import { ProjetoEventoFields } from '../../../features/projects/components/ProjetoEventoFields';
import { ProjectMonthCalendar } from '../../../features/projects/components/ProjectMonthCalendar';
import {
  avisoDiasInvalido,
  isProjetoEvento,
  isProjetoPubli,
  rotuloAvisoDias,
  rotuloProjetoTipo,
  tiposPersonalizadosUsados,
  type EscolhaFuncaoEvento,
  type ProjetoTipoFormulario,
} from '../../../features/projects/lib/evento';
import { PROJECT_STATUS_LABEL } from '../../../features/projects/pages/ProjectsPage';
import { MobileListCard } from '../../components/MobileListCard';
import { MobileSegmentTabs } from '../../components/MobileSegmentTabs';

type ProjectDetailTab = 'eventos' | 'conteudos';

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
  tipo: ProjetoTipoFormulario;
  tipoPersonalizado: string;
  avisoDias: string;
}

export interface ProjectDetailMobileScreenProps {
  projeto: Projeto;
  agendaItems: AgendaItem[];
  projetoContents: Content[];
  disponiveisParaVincular: Content[];
  isEditing: boolean;
  editFields: ProjectDetailEditFields;
  onEditFieldChange: <K extends keyof ProjectDetailEditFields>(key: K, value: ProjectDetailEditFields[K]) => void;
  onStartEditing: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDeleteProjeto: () => void;
  onCreateEvent: (date: string) => void;
  onOpenEvent: (item: AgendaItem) => void;
  tiposSalvos: string[];
  onVincularContent: (contentId: string) => void;
  onOpenContent: (contentId: string) => void;
  onCreateContent: () => void;
  series: Array<{ id: string; funcaoPadrao?: FuncaoPadraoSerie | null }>;
  onEscolherFuncao: (contentId: string, escolha: EscolhaFuncaoEvento) => void;
}

export function ProjectDetailMobileScreen({
  projeto,
  agendaItems,
  projetoContents,
  disponiveisParaVincular,
  isEditing,
  editFields,
  onEditFieldChange,
  onStartEditing,
  onSaveEdit,
  onCancelEdit,
  onDeleteProjeto,
  onCreateEvent,
  onOpenEvent,
  tiposSalvos,
  onVincularContent,
  onOpenContent,
  onCreateContent,
  series,
  onEscolherFuncao,
}: ProjectDetailMobileScreenProps) {
  const [activeTab, setActiveTab] = useState<ProjectDetailTab>('eventos');
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);
  const [selectedContentId, setSelectedContentId] = useState('');

  const { proximoEvento, ultimoEvento } = resolveEventHighlight(agendaItems);
  const statusLabel = PROJECT_STATUS_LABEL[projeto.status] ?? projeto.status;
  const evento = isProjetoEvento(projeto.tipo);
  const serieDe = (seriesId: string | null) => series.find(item => item.id === seriesId) ?? null;
  const formattedValue = projeto.value
    ? projeto.value.toLocaleString('pt-BR', { style: 'currency', currency: projeto.currency || 'BRL' })
    : '--';

  const tabAction = (() => {
    if (activeTab === 'eventos') {
      return (
        <AppButton variant="primary" fullWidth onClick={() => onCreateEvent(localTodayKey())} leftIcon={<Plus className="h-4 w-4" />}>
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
              <Badge variant="neutral">{rotuloProjetoTipo(projeto.tipo, projeto.tipoPersonalizado)}</Badge>
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
            <Text variant="label">{isProjetoPubli(projeto.tipo) ? 'Valor' : 'Etapas'}</Text>
            <Text variant="sectionTitle" as="p" className="mt-1 tabular-nums">
              {isProjetoPubli(projeto.tipo) ? formattedValue : projeto.etapas.length}
            </Text>
          </div>
        </div>

        {evento ? (
          <Text variant="secondary" className="mt-3">
            {rotuloAvisoDias(projeto.avisoDias)}
          </Text>
        ) : null}

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
          <ProjectMonthCalendar
            eventos={agendaItems}
            livros={projeto.livros ?? []}
            cor={projeto.color}
            onCreate={onCreateEvent}
            onOpen={onOpenEvent}
          />
        </section>
      )}

      {activeTab === 'conteudos' && (
        <section className="stack-md">
          {projetoContents.length === 0 ? (
            <EmptyState compact
              title="Nenhum roteiro vinculado"
              description={evento
                ? 'Vincule um roteiro. Cada um deste evento fica com a própria função.'
                : 'Vincule ideias já existentes ou crie novos roteiros para este projeto.'}
              action={tabAction}
              icon={<ClipboardList className="h-8 w-8" />}
            />
          ) : (
            <>
              {evento ? (
                <Text variant="secondary">Cada roteiro deste evento tem a própria função.</Text>
              ) : null}
              {projetoContents.map(content => (
                <div key={content.id} className="stack-sm">
                <MobileListCard
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
                {evento ? (
                  <FuncaoDoRoteiro
                    contentId={content.id}
                    content={content}
                    serie={serieDe(content.seriesId)}
                    onChange={escolha => onEscolherFuncao(content.id, escolha)}
                  />
                ) : null}
                </div>
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
          <ProjetoEventoFields
            tipo={editFields.tipo}
            avisoDias={editFields.avisoDias}
            tipoPersonalizado={editFields.tipoPersonalizado}
            tiposSalvos={tiposSalvos}
            incluirProducao={editFields.tipo === 'producao'}
            onTipoChange={value => onEditFieldChange('tipo', value)}
            onAvisoDiasChange={value => onEditFieldChange('avisoDias', value)}
            onTipoPersonalizadoChange={value => onEditFieldChange('tipoPersonalizado', value)}
          />
          <input
            value={editFields.brand}
            onChange={event => onEditFieldChange('brand', event.target.value)}
            placeholder="Marca ou parceiro"
            className="w-full"
          />
          {isProjetoPubli(editFields.tipo) ? (
            <input
              type="number"
              value={editFields.value}
              onChange={event => onEditFieldChange('value', event.target.value)}
              placeholder="Valor (R$)"
              className="w-full"
            />
          ) : null}
          <ProjetoCorPicker value={editFields.color} onChange={color => onEditFieldChange('color', color)} />
          <input
            value={editFields.driveUrl}
            onChange={event => onEditFieldChange('driveUrl', event.target.value)}
            type="url"
            placeholder="Link da pasta no Drive (https://...)"
            className="w-full"
          />
          <textarea
            value={editFields.notes}
            onChange={event => onEditFieldChange('notes', event.target.value)}
            placeholder="Notas do projeto"
            rows={4}
            className="w-full resize-none"
          />
          <div className="grid grid-cols-1 gap-2">
            <AppButton
              variant="primary"
              onClick={onSaveEdit}
              disabled={avisoDiasInvalido(editFields.tipo, editFields.avisoDias)}
              className="min-h-11 w-full justify-center"
            >
              Salvar
            </AppButton>
            <AppButton variant="secondary" onClick={onCancelEdit} className="min-h-11 w-full justify-center">
              Cancelar
            </AppButton>
          </div>
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
