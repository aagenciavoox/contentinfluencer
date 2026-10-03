import {useEffect, useMemo, type ReactNode} from 'react';
import {BookOpen, Calendar, ChevronDown, Layers, Sparkles, Target} from 'lucide-react';
import {AppButton} from '../../../../components/ui/AppButton';
import {PropertyDatePicker} from '../../../../components/ui/PropertyDatePicker';
import {Surface} from '../../../../components/ui/Surface';
import {Text} from '../../../../components/ui/Text';
import {useAppContext} from '../../../../context/AppContext';
import type {Pilar, Serie} from '../../../../lib/database';
import {cn} from '../../../../lib/utils';
import {getAllowedStatuses} from '../../lib/contentPipeline';
import {getPostingWindowFromTime, POSTING_WINDOWS, type PostingWindowId} from '../../lib/postingWindow';
import {ContentStatusField} from './ContentOperationalPanel';
import {PlatformCopyEditor} from './PlatformCopyEditor';
import type {ScriptDraft} from './sections/RoteiroSection';

const NOTES_MAX = 500;

const selectClass =
  'h-11 w-full appearance-none rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 pr-9 text-sm text-[var(--text-primary)] outline-none focus-visible:shadow-[var(--focus-ring)]';

interface ContentManageWorkspaceProps {
  draft: ScriptDraft;
  series: Serie[];
  pilares: Pilar[];
  onChange: (updates: Partial<ScriptDraft>) => void;
  onSave?: () => void;
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
}

function toIsoDate(dateOnly: string | null) {
  return dateOnly ? `${dateOnly}T12:00:00.000Z` : null;
}

function FieldLabel({icon, children}: {icon: ReactNode; children: string}) {
  return (
    <span className="mb-1.5 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
      {icon}
      {children}
    </span>
  );
}

function ManageSelect({
  value,
  onChange,
  children,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  ariaLabel: string;
}) {
  return (
    <span className="relative block">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={event => onChange(event.target.value)}
        className={selectClass}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
    </span>
  );
}

export function ContentManageWorkspace({
  draft,
  series,
  pilares,
  onChange,
  onSave,
  saveState = 'idle',
}: ContentManageWorkspaceProps) {
  const {state, ensureDataDomains} = useAppContext();
  const linkedPilar = draft.pilarId ? pilares.find(item => item.id === draft.pilarId) ?? null : null;
  const linkedSerie = draft.seriesId ? series.find(item => item.id === draft.seriesId) ?? null : null;
  const publishDateOnly = draft.publishDate ? draft.publishDate.slice(0, 10) : '';
  const postingWindow = getPostingWindowFromTime(draft.publishTime);
  const allowedStatuses = getAllowedStatuses(draft.status);
  const bibliotecaOptions = useMemo(
    () =>
      state.bibliotecaItems
        .filter(item => !item.deletedAt || item.id === draft.bibliotecaItemId)
        .sort((left, right) => left.titulo.localeCompare(right.titulo, 'pt-BR')),
    [draft.bibliotecaItemId, state.bibliotecaItems],
  );

  useEffect(() => {
    void ensureDataDomains(['library']);
  }, [ensureDataDomains]);

  return (
    <div className="stack-lg">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <Text variant="pageTitle" as="h2">Gestão do conteúdo</Text>
          <Text variant="secondary" className="mt-1">
            Organize os detalhes e prepare a publicação.
          </Text>
        </div>
        <div className="flex shrink-0 items-end gap-3">
          <div className="min-w-[9.5rem]">
            <Text variant="meta" as="span" className="mb-1.5 block text-[var(--text-secondary)]">
              Status
            </Text>
            <ContentStatusField
              boxed
              status={draft.status}
              publishDate={draft.publishDate}
              postedAt={draft.postedAt ?? null}
              allowedStatuses={allowedStatuses}
              onStatusChange={status => onChange({status})}
            />
          </div>
          <AppButton
            variant="primary"
            size="lg"
            disabled={saveState === 'saving' || !onSave}
            onClick={onSave}
          >
            {saveState === 'saving' ? 'Salvando...' : saveState === 'error' ? 'Tentar novamente' : 'Salvar alterações'}
          </AppButton>
        </div>
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)]">
        <PlatformCopyEditor
          presentation="manage"
          plataformas={draft.plataformas}
          pilar={linkedPilar}
          serie={linkedSerie}
          onChange={plataformas => onChange({plataformas})}
        />

        <Surface variant="outlined" padding="lg" className="flex h-full flex-col bg-[var(--bg-elevated)]">
          <Text variant="sectionTitle" as="h3">Organização</Text>
          <Text variant="secondary" className="mt-1">
            Classifique e vincule este conteúdo.
          </Text>
          <div className="mt-4 stack-md">
            <label className="block">
              <FieldLabel icon={<BookOpen className="h-4 w-4" />}>Biblioteca</FieldLabel>
              <ManageSelect
                ariaLabel="Biblioteca"
                value={draft.bibliotecaItemId ?? ''}
                onChange={value => onChange({bibliotecaItemId: value || null})}
              >
                <option value="">Sem item vinculado</option>
                {bibliotecaOptions.map(item => (
                  <option key={item.id} value={item.id}>{item.titulo}</option>
                ))}
              </ManageSelect>
            </label>
            <label className="block">
              <FieldLabel icon={<Layers className="h-4 w-4" />}>Série</FieldLabel>
              <ManageSelect
                ariaLabel="Série"
                value={draft.seriesId ?? ''}
                onChange={value => onChange({seriesId: value || null})}
              >
                <option value="">Selecionar série...</option>
                {series.map(item => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </ManageSelect>
            </label>
            <label className="block">
              <FieldLabel icon={<Target className="h-4 w-4" />}>Pilar</FieldLabel>
              <ManageSelect
                ariaLabel="Pilar"
                value={draft.pilarId ?? ''}
                onChange={value => onChange({pilarId: value || null})}
              >
                <option value="">Selecionar pilar...</option>
                {pilares.filter(item => item.ativo).map(item => (
                  <option key={item.id} value={item.id}>{item.nome}</option>
                ))}
              </ManageSelect>
            </label>
          </div>
        </Surface>

        <Surface variant="outlined" padding="lg" className="h-full bg-[var(--bg-elevated)]">
          <Text variant="sectionTitle" as="h3">Agendamento</Text>
          <Text variant="secondary" className="mt-1">
            Defina as datas e o período de publicação.
          </Text>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block min-w-0">
              <FieldLabel icon={<Calendar className="h-4 w-4" />}>Gravação</FieldLabel>
              <span className="relative block">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <PropertyDatePicker
                  variant="field"
                  placeholder="Selecionar data e horário"
                  className="h-11 py-0 pl-9 pr-8"
                  value={draft.recordingDate ? draft.recordingDate.slice(0, 10) : null}
                  onChange={date => onChange({recordingDate: toIsoDate(date)})}
                />
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
              </span>
            </label>
            <label className="block min-w-0">
              <FieldLabel icon={<Calendar className="h-4 w-4" />}>Publicação</FieldLabel>
              <span className="relative block">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                <PropertyDatePicker
                  variant="field"
                  placeholder="Selecionar data e horário"
                  className={cn('h-11 py-0 pl-9', publishDateOnly ? 'pr-28' : 'pr-8')}
                  value={publishDateOnly || null}
                  onChange={date => onChange({publishDate: toIsoDate(date)})}
                />
                {publishDateOnly ? (
                  <input
                    type="time"
                    aria-label="Horário de publicação"
                    value={draft.publishTime ?? ''}
                    onChange={event => onChange({publishTime: event.target.value || null})}
                    className="absolute right-8 top-1/2 h-7 w-20 -translate-y-1/2 border-0 bg-transparent text-xs text-[var(--text-primary)] outline-none"
                  />
                ) : (
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
                )}
              </span>
            </label>
          </div>
          <label className="mt-4 block">
            <FieldLabel icon={<Sparkles className="h-4 w-4" />}>Janela de publicação</FieldLabel>
            <ManageSelect
              ariaLabel="Janela de publicação"
              value={postingWindow?.id ?? ''}
              onChange={value => {
                const windowId = value as PostingWindowId | '';
                const window = POSTING_WINDOWS.find(item => item.id === windowId);
                onChange({publishTime: window?.defaultTime ?? null});
              }}
            >
              <option value="">Selecionar janela...</option>
              {POSTING_WINDOWS.map(window => (
                <option key={window.id} value={window.id}>{window.label}</option>
              ))}
            </ManageSelect>
          </label>
        </Surface>

        <Surface variant="outlined" padding="lg" className="flex h-full flex-col bg-[var(--bg-elevated)]">
          <Text variant="sectionTitle" as="h3">Notas</Text>
          <Text variant="secondary" className="mt-1">
            Adicione observações, referências e links.
          </Text>
          <div className="relative mt-4 min-h-0 flex-1">
            <textarea
              value={draft.notes ?? ''}
              onChange={event => onChange({notes: event.target.value.slice(0, NOTES_MAX)})}
              placeholder="Observações editoriais, referências e links..."
              className="block h-full min-h-36 w-full resize-none rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 pb-8 pt-3 text-sm leading-6 text-[var(--text-primary)] outline-none focus-visible:shadow-[var(--focus-ring)]"
            />
            <span className="pointer-events-none absolute bottom-2 right-3 text-xs text-[var(--text-tertiary)]">
              {(draft.notes ?? '').length} / {NOTES_MAX}
            </span>
          </div>
        </Surface>
      </div>
    </div>
  );
}
