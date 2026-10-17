import { useState } from 'react';
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Link2,
  Plus,
  Trash2,
} from 'lucide-react';
import { BottomSheetModal } from '../../../components/feedback/modals/BottomSheetModal';
import { OverlayBody } from '../../../components/overlays/OverlayBody';
import { OverlayFooter } from '../../../components/overlays/OverlayFooter';
import { OverlayHeader } from '../../../components/overlays/OverlayHeader';
import { AppButton } from '../../../components/ui/AppButton';
import { FormField } from '../../../components/ui/FormField';
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
  if (!value) return '—';
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
    : '—';

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
              { id: 'delete', label: 'Excluir projeto', onClick: onDeleteProjeto, tone: 'danger' },
            ]}
          />
        </div>

        <div className="grid-metrics-3">
          <div className="rounded-[var(--radius-input)] bg-[var(--bg-hover)] px-3 py-3">
            <Text variant="label">Eventos</Text>
            <Text variant="sectionTitle" as="p" className="mt-1 tabular-nums">{agendaItems.length}</Text>
          </div>
          <div className="rounded-[var(--radius-input)] bg-[var(--bg-hover)] px-3 py-3">
            <Text variant="label">Roteiros</Text>
            <Text variant="sectionTitle" as="p" className="mt-1 tabular-nums">{projetoContents.length}</Text>
          </div>
          <div className="rounded-[var(--radius-input)] bg-[var(--bg-hover)] px-3 py-3">
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
          <Text variant="secondary" className="mt-3 rounded-[var(--radius-input)] bg-[var(--bg-hover)] px-3 py-3">
            Próximo: {proximoEvento.title} em {formatDate(proximoEvento.date)}
          </Text>
        ) : ultimoEvento ? (
          <Text variant="secondary" className="mt-3 rounded-[var(--radius-input)] bg-[var(--bg-hover)] px-3 py-3">
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
                  title={content.title || 'Roteiro sem título'}
                  onClick={() => onOpenContent(content.id)}
                  actionLabel={`Abrir roteiro ${content.title || 'sem título'}`}
                  description={content.status}
                  meta={
                    <>
                      {content.publishDate ? (
                        <Badge variant="neutral">Publicação: {formatDate(content.publishDate)}</Badge>
                      ) : null}
                      {content.recordingDate ? (
                        <Badge variant="neutral">Gravação: {formatDate(content.recordingDate)}</Badge>
                      ) : null}
                    </>
                  }
                  trailing={<ChevronRight className="mt-1 h-4 w-4 text-[var(--text-tertiary)]" aria-hidden />}
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

      <BottomSheetModal open={isEditing} onClose={onCancelEdit} desktopMaxW="max-w-xl" zIndex="z-[110]" ariaLabel="Editar projeto">
        <OverlayHeader title="Editar projeto" onClose={onCancelEdit} />
        <OverlayBody className="stack-lg">
          <FormField label="Nome" htmlFor="projeto-edit-nome">
            <input
              id="projeto-edit-nome"
              autoFocus
              value={editFields.nome}
              onChange={event => onEditFieldChange('nome', event.target.value)}
              placeholder="Nome do projeto"
              className="w-full"
            />
          </FormField>
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
          <FormField label="Marca ou parceiro" htmlFor="projeto-edit-marca">
            <input
              id="projeto-edit-marca"
              value={editFields.brand}
              onChange={event => onEditFieldChange('brand', event.target.value)}
              className="w-full"
            />
          </FormField>
          {isProjetoPubli(editFields.tipo) ? (
            <FormField label="Valor (R$)" htmlFor="projeto-edit-valor">
              <input
                id="projeto-edit-valor"
                type="number"
                inputMode="decimal"
                value={editFields.value}
                onChange={event => onEditFieldChange('value', event.target.value)}
                className="w-full"
              />
            </FormField>
          ) : null}
          <ProjetoCorPicker value={editFields.color} onChange={color => onEditFieldChange('color', color)} />
          <FormField label="Link da pasta no Drive" htmlFor="projeto-edit-drive">
            <input
              id="projeto-edit-drive"
              value={editFields.driveUrl}
              onChange={event => onEditFieldChange('driveUrl', event.target.value)}
              type="url"
              placeholder="https://..."
              className="w-full"
            />
          </FormField>
          <FormField label="Notas do projeto" htmlFor="projeto-edit-notas">
            <textarea
              id="projeto-edit-notas"
              value={editFields.notes}
              onChange={event => onEditFieldChange('notes', event.target.value)}
              rows={4}
              className="w-full resize-none"
            />
          </FormField>
        </OverlayBody>
        <OverlayFooter className="pb-safe flex-col-reverse items-stretch gap-2 px-4">
          <AppButton variant="secondary" fullWidth onClick={onCancelEdit}>
            Cancelar
          </AppButton>
          <AppButton
            variant="primary"
            fullWidth
            onClick={onSaveEdit}
            disabled={avisoDiasInvalido(editFields.tipo, editFields.avisoDias)}
          >
            Salvar
          </AppButton>
        </OverlayFooter>
      </BottomSheetModal>

      <BottomSheetModal open={linkSheetOpen} onClose={() => setLinkSheetOpen(false)} desktopMaxW="max-w-xl" zIndex="z-[110]" ariaLabel="Vincular roteiro">
        <OverlayHeader title="Vincular roteiro" onClose={() => setLinkSheetOpen(false)} />
        <OverlayBody className="stack-lg">
          <TagSelect
            label="Roteiro"
            values={selectedContentId ? [selectedContentId] : []}
            onChange={values => setSelectedContentId(values[0] ?? '')}
            options={disponiveisParaVincular.map(content => ({
              value: content.id,
              label: content.title || 'Roteiro sem título',
            }))}
            maxSelections={1}
            placeholder="Escolha um roteiro…"
          />
        </OverlayBody>
        <OverlayFooter className="pb-safe px-4">
          <AppButton
            variant="primary"
            fullWidth
            disabled={!selectedContentId}
            disabledReason="Escolha um roteiro para vincular."
            onClick={() => {
              if (!selectedContentId) return;
              onVincularContent(selectedContentId);
              setSelectedContentId('');
              setLinkSheetOpen(false);
            }}
          >
            Vincular
          </AppButton>
        </OverlayFooter>
      </BottomSheetModal>
    </div>
  );
}
