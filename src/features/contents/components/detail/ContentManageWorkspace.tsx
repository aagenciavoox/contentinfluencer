import {useEffect, type ReactNode} from 'react';
import {BookOpen, Calendar, ChevronDown, Clock, Flag, Layers, Search, Tag, Target} from 'lucide-react';
import {PropertyDatePicker} from '../../../../components/ui/PropertyDatePicker';
import {Surface} from '../../../../components/ui/Surface';
import {Text} from '../../../../components/ui/Text';
import {useAppContext} from '../../../../context/AppContext';
import type {Pilar, Serie} from '../../../../lib/database';
import {getAllowedStatuses, normalizeContentStatus} from '../../lib/contentPipeline';
import {patchAoEscolherSerie} from '../../../editorial/lib/pilarDaSerie';
import {FuncaoEditorialFields} from './ContentOperationalPanel';
import {LivroMultiSelect} from './LivroMultiSelect';
import {PlatformCopyEditor} from './PlatformCopyEditor';
import {TemaField} from './TemaField';
import type {ScriptDraft} from './sections/RoteiroSection';

const NOTES_MAX = 500;

const fieldClass =
  'h-11 w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-60';

const selectClass =
  'h-11 w-full appearance-none rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 pr-9 text-sm text-[var(--text-primary)] outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-60';

interface ContentManageWorkspaceProps {
  contentId: string;
  draft: ScriptDraft;
  disabled?: boolean;
  series: Serie[];
  pilares: Pilar[];
  onChange: (updates: Partial<ScriptDraft>) => void;
}

function toIsoDate(dateOnly: string | null) {
  return dateOnly ? `${dateOnly}T12:00:00.000Z` : null;
}

function clockInputValue(value: string | null | undefined) {
  const match = /^(\d{2}):(\d{2})/.exec(value?.trim() ?? '');
  return match ? `${match[1]}:${match[2]}` : '';
}

function FieldLabel({icon, children}: {icon?: ReactNode; children: string}) {
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
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <span className="relative block">
      <select
        aria-label={ariaLabel}
        value={value}
        disabled={disabled}
        onChange={event => onChange(event.target.value)}
        className={selectClass}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
    </span>
  );
}

function ScheduleMoment({
  label,
  date,
  time,
  disabled,
  onDate,
  onTime,
}: {
  label: string;
  date: string | null;
  time: string | null | undefined;
  disabled: boolean;
  onDate: (date: string | null) => void;
  onTime: (time: string | null) => void;
}) {
  return (
    <div className="min-w-0">
      <Text variant="bodyStrong" as="p">{label}</Text>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block min-w-0">
          <FieldLabel icon={<Calendar className="h-4 w-4" />}>Data</FieldLabel>
          <PropertyDatePicker
            variant="field"
            placeholder="Selecionar data"
            disabled={disabled}
            className="h-11 bg-[var(--bg-primary)] py-0"
            value={date}
            onChange={onDate}
          />
        </label>
        <label className="block min-w-0">
          <FieldLabel icon={<Clock className="h-4 w-4" />}>Horário</FieldLabel>
          <input
            type="time"
            aria-label={`Horário de ${label.toLowerCase()}`}
            disabled={disabled}
            step={60}
            value={clockInputValue(time)}
            onChange={event => onTime(event.target.value || null)}
            className={fieldClass}
          />
        </label>
      </div>
    </div>
  );
}

export function ContentManageWorkspace({
  contentId,
  draft,
  disabled = false,
  series,
  pilares,
  onChange,
}: ContentManageWorkspaceProps) {
  const {state, ensureDataDomains} = useAppContext();
  const linkedPilar = draft.pilarId ? pilares.find(item => item.id === draft.pilarId) ?? null : null;
  const linkedSerie = draft.seriesId ? series.find(item => item.id === draft.seriesId) ?? null : null;
  const publishDateOnly = draft.publishDate ? draft.publishDate.slice(0, 10) : '';
  const currentStatus = normalizeContentStatus(draft.status);
  const etapas = getAllowedStatuses(draft.status);

  useEffect(() => {
    void ensureDataDomains(['library']);
  }, [ensureDataDomains]);

  return (
    <div className="stack-lg">
      <Text variant="sectionTitle" as="h2" className="sr-only">Gestão do conteúdo</Text>

      <div className="grid items-stretch gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)]">
        <PlatformCopyEditor
          embedded
          plataformas={draft.plataformas}
          pilar={linkedPilar}
          serie={linkedSerie}
          disabled={disabled}
          contentId={contentId}
          legendaBase={draft.legendaBase}
          onLegendaBaseChange={legendaBase => onChange({legendaBase})}
          titulo={draft.title}
          onTituloChange={title => onChange({title})}
          onChange={plataformas => onChange({plataformas})}
        />

        <div className="flex min-w-0 flex-col gap-4">
          <Surface variant="outlined" padding="lg" className="bg-[var(--bg-elevated)]">
            <Text variant="sectionTitle" as="h3">Organização</Text>
            <div className="mt-4 stack-md">
              <label className="block">
                <FieldLabel>Etapa</FieldLabel>
                <ManageSelect
                  ariaLabel="Etapa"
                  disabled={disabled}
                  value={currentStatus}
                  onChange={status => onChange({status})}
                >
                  {etapas.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </ManageSelect>
              </label>

              <div className="border-t border-[var(--border-color)]" aria-hidden />

              <label className="block">
                <FieldLabel icon={<Layers className="h-4 w-4" />}>Série</FieldLabel>
                <ManageSelect
                  ariaLabel="Série"
                  disabled={disabled}
                  value={draft.seriesId ?? ''}
                  onChange={value => onChange(patchAoEscolherSerie(
                    draft,
                    series.find(item => item.id === value) ?? null,
                  ))}
                >
                  <option value="">Selecionar série...</option>
                  {series.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </ManageSelect>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block min-w-0">
                  <FieldLabel icon={<Target className="h-4 w-4" />}>Pilar</FieldLabel>
                  <ManageSelect
                    ariaLabel="Pilar"
                    disabled={disabled}
                    value={draft.pilarId ?? ''}
                    onChange={value => onChange({pilarId: value || null})}
                  >
                    <option value="">Selecionar pilar...</option>
                    {pilares.filter(item => item.ativo).map(item => (
                      <option key={item.id} value={item.id}>{item.nome}</option>
                    ))}
                  </ManageSelect>
                </label>
                <div className="min-w-0">
                  <FuncaoEditorialFields
                    draft={draft}
                    serie={linkedSerie}
                    onChange={onChange}
                    variant="form"
                    formPart="funcao"
                    formLabel={<FieldLabel icon={<Flag className="h-4 w-4" />}>Função</FieldLabel>}
                    formInputClass={selectClass}
                  />
                </div>
              </div>

              <div>
                <FieldLabel icon={<Tag className="h-4 w-4" />}>Temas</FieldLabel>
                <TemaField
                  temaIds={draft.temaIds}
                  onChange={temaIds => onChange({temaIds})}
                  selectProps={{
                    hideLabel: true,
                    placeholder: 'Adicionar tema, ex.: Halloween',
                    controlClassName: 'min-h-11',
                  }}
                />
              </div>

              <div className="border-t border-[var(--border-color)]" aria-hidden />

              <FuncaoEditorialFields
                draft={draft}
                serie={linkedSerie}
                onChange={onChange}
                variant="form"
                formPart="grade"
              />
            </div>
          </Surface>

          <Surface variant="outlined" padding="lg" className="bg-[var(--bg-elevated)]">
            <div className="flex items-start gap-3">
              <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-[var(--text-primary)]" aria-hidden />
              <div className="min-w-0">
                <Text variant="sectionTitle" as="h3">Livros citados</Text>
                <Text variant="meta" className="mt-0.5 block text-[var(--text-secondary)]">
                  Vincule um ou mais livros.
                </Text>
              </div>
            </div>
            <div className="mt-4">
              <LivroMultiSelect
                livroIds={draft.livroIds}
                bibliotecaItemId={draft.bibliotecaItemId}
                bibliotecaItems={state.bibliotecaItems}
                onChange={onChange}
                selectProps={{
                  hideLabel: true,
                  searchable: true,
                  placeholder: 'Buscar livros...',
                  leadingIcon: <Search className="h-4 w-4" />,
                  controlClassName: 'min-h-11',
                }}
              />
            </div>
          </Surface>
        </div>
      </div>

      <Surface variant="outlined" padding="lg" className="bg-[var(--bg-elevated)]">
        <Text variant="sectionTitle" as="h3">Gravação e publicação</Text>
        <Text variant="secondary" className="mt-1">
          Dia e horário de cada etapa.
        </Text>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <ScheduleMoment
            label="Gravação"
            date={draft.recordingDate ? draft.recordingDate.slice(0, 10) : null}
            time={draft.recordingTime}
            disabled={disabled}
            onDate={date => onChange({recordingDate: toIsoDate(date)})}
            onTime={recordingTime => onChange({recordingTime})}
          />
          <ScheduleMoment
            label="Publicação"
            date={publishDateOnly || null}
            time={draft.publishTime}
            disabled={disabled}
            onDate={date => onChange({publishDate: toIsoDate(date)})}
            onTime={publishTime => onChange({publishTime})}
          />
        </div>
      </Surface>

      <Surface variant="outlined" padding="lg" className="bg-[var(--bg-elevated)]">
        <Text variant="sectionTitle" as="h3">Observações</Text>
        <Text variant="secondary" className="mt-1">
          Adicione observações, referências e links.
        </Text>
        <div className="relative mt-4">
          <textarea
            value={draft.notes ?? ''}
            disabled={disabled}
            onChange={event => onChange({notes: event.target.value.slice(0, NOTES_MAX)})}
            placeholder="Observações editoriais, referências e links..."
            className="block min-h-36 w-full resize-none rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 pb-8 pt-3 text-sm leading-6 text-[var(--text-primary)] outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-60"
          />
          <span className="pointer-events-none absolute bottom-2 right-3 text-xs text-[var(--text-tertiary)]">
            {(draft.notes ?? '').length} / {NOTES_MAX}
          </span>
        </div>
      </Surface>
    </div>
  );
}
