import {useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {getDay, parseISO} from 'date-fns';
import {CalendarClock, ChevronDown, ChevronUp, Clock, ExternalLink, Layers, ListChecks, Palette, Sun, Target, Video} from 'lucide-react';
import type {Content, Pilar, Serie} from '../../../../lib/database';
import type {Weekday} from '../../../settings/lib/postingTimes';
import {cn} from '../../../../lib/utils';
import {useAppContext} from '../../../../context/AppContext';
import {
  PropertyInput,
  PropertyRow,
  PropertySection,
  PropertySelect,
  PropertyTextarea,
} from '../../../../components/ui/PropertyRow';
import {PropertyDatePicker} from '../../../../components/ui/PropertyDatePicker';
import {Surface} from '../../../../components/ui/Surface';
import {Badge} from '../../../../components/ui/Badge';
import {Text} from '../../../../components/ui/Text';
import {PostingTimeSuggestions} from '../../../settings/components/PostingTimeSuggestions';
import {getCrossedPostingTimesForPilar} from '../../../settings/lib/pilarPostingSchedule';
import {
  getPostingWindowFromTime,
  POSTING_WINDOWS,
  type PostingWindowId,
} from '../../lib/postingWindow';
import {getAllowedStatuses, getDisplayStatus} from '../../lib/contentPipeline';

const NOTES_MAX = 500;

function toIsoDate(dateOnly: string | null) {
  return dateOnly ? `${dateOnly}T12:00:00.000Z` : null;
}

type OperationalDraft = Pick<
  Content,
  | 'title'
  | 'seriesId'
  | 'pilarId'
  | 'slotType'
  | 'formatoVisual'
  | 'notes'
  | 'recordingDate'
  | 'publishDate'
  | 'publishTime'
  | 'status'
> & Partial<Pick<Content, 'postedAt'>>;

interface ContentOperationalPanelProps {
  draft: OperationalDraft;
  series: Serie[];
  pilares: Pilar[];
  onChange: (updates: Partial<OperationalDraft>) => void;
  density?: 'default' | 'compact';
  layout?: 'property' | 'form';
  variant?: 'default' | 'cards';
  showTitle?: boolean;
  className?: string;
  authorName?: string;
}

function CollapsibleCard({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Surface variant="outlined" padding="none" className="overflow-visible shadow-sm">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex w-full items-center justify-between gap-2 border-b border-[var(--border-color)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <Text variant="sectionTitle">{title}</Text>
        <ChevronUp className={cn('h-4 w-4 text-[var(--text-tertiary)] transition-transform', !open && 'rotate-180')} />
      </button>
      {open ? <div className="stack-md p-4">{children}</div> : null}
    </Surface>
  );
}

function RoteiroField({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="inline-flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

function RoteiroSelect({
  value,
  onChange,
  dotColor,
  children,
}: {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  dotColor?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      {dotColor ? (
        <span
          className="pointer-events-none absolute left-3 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
          style={{backgroundColor: dotColor}}
          aria-hidden
        />
      ) : null}
      <select
        value={value}
        onChange={onChange}
        className={cn(
          'w-full appearance-none rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] py-2 pr-8 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent-blue)]',
          dotColor ? 'pl-7' : 'pl-3',
        )}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
    </div>
  );
}

function ColorDot({color}: {color: string}) {
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{backgroundColor: color}}
      aria-hidden
    />
  );
}

function ColoredSelect({
  value,
  onChange,
  empty,
  dotColor,
  children,
}: {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  empty: boolean;
  dotColor?: string | null;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-center gap-1.5">
      {dotColor ? <ColorDot color={dotColor} /> : null}
      <PropertySelect value={value} onChange={onChange} className={empty ? 'property-row-value--empty' : ''}>
        {children}
      </PropertySelect>
    </span>
  );
}

function StatusDropdownField({
  status,
  publishDate,
  postedAt,
  allowedStatuses,
  onStatusChange,
}: {
  status: Content['status'];
  publishDate: string | null;
  postedAt: string | null;
  allowedStatuses: string[];
  onStatusChange: (status: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const displayStatus = getDisplayStatus({status, publishDate, postedAt});

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="inline-flex w-full items-center justify-between gap-2 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <Badge variant="status" status={displayStatus}>
          {displayStatus}
        </Badge>
        <ChevronDown className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-1 shadow-lg">
          {allowedStatuses.map(option => (
            <button
              key={option}
              type="button"
              onClick={() => {
                onStatusChange(option);
                setOpen(false);
              }}
              className={cn(
                'w-full rounded-md px-3 py-2 text-left text-sm transition-colors',
                status === option
                  ? 'bg-[var(--bg-hover)] font-semibold text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
              )}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StatusPropertyRow({
  status,
  publishDate,
  postedAt,
  allowedStatuses,
  onStatusChange,
}: {
  status: Content['status'];
  publishDate: string | null;
  postedAt: string | null;
  allowedStatuses: string[];
  onStatusChange: (status: string) => void;
}) {
  return (
    <PropertyRow label="Status">
      <StatusDropdownField
        status={status}
        publishDate={publishDate}
        postedAt={postedAt}
        allowedStatuses={allowedStatuses}
        onStatusChange={onStatusChange}
      />
    </PropertyRow>
  );
}

export function ContentOperationalPanel({
  draft,
  series,
  pilares,
  onChange,
  density = 'default',
  layout = 'property',
  variant = 'default',
  showTitle = true,
  className,
}: ContentOperationalPanelProps) {
  const {state} = useAppContext();
  const navigate = useNavigate();
  const publishDateOnly = draft.publishDate ? draft.publishDate.slice(0, 10) : '';
  const linkedSerie = draft.seriesId ? series.find(serie => serie.id === draft.seriesId) ?? null : null;
  const linkedPilar = draft.pilarId ? pilares.find(pilar => pilar.id === draft.pilarId) ?? null : null;
  const postingWindow = getPostingWindowFromTime(draft.publishTime);
  const allowedStatuses = getAllowedStatuses(draft.status);
  const publishWeekday = useMemo(() => {
    if (!publishDateOnly) return null;
    try {
      return getDay(parseISO(publishDateOnly)) as Weekday;
    } catch {
      return null;
    }
  }, [publishDateOnly]);
  const pilarPostingPreview = useMemo(() => {
    if (!linkedPilar || publishWeekday == null) return [];
    return getCrossedPostingTimesForPilar(
      linkedPilar,
      state.postingTimeEntries,
      state.platforms,
      publishWeekday,
    );
  }, [linkedPilar, publishWeekday, state.platforms, state.postingTimeEntries]);
  const compact = density === 'compact';
  const emptySelect = (value: unknown) => (value ? '' : 'property-row-value--empty');

  const formInputClass =
    'w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-blue)] transition-colors';

  const propertiesSection = (
    <PropertySection label="Propriedades">
      <PropertyRow label="Serie" icon={<Layers />}>
        <PropertySelect
          value={draft.seriesId ?? ''}
          onChange={event => onChange({seriesId: event.target.value || null})}
          className={emptySelect(draft.seriesId)}
        >
          <option value="">Vazio</option>
          {series.map(serie => (
            <option key={serie.id} value={serie.id}>
              {serie.name}
            </option>
          ))}
        </PropertySelect>
      </PropertyRow>

      <PropertyRow label="Pilar" icon={<Palette />}>
        <ColoredSelect
          value={draft.pilarId ?? ''}
          onChange={event => onChange({pilarId: event.target.value || null})}
          empty={!draft.pilarId}
          dotColor={linkedPilar?.cor ?? null}
        >
          <option value="">Vazio</option>
          {pilares
            .filter(pilar => pilar.ativo)
            .map(pilar => (
              <option key={pilar.id} value={pilar.id}>
                {pilar.nome}
              </option>
            ))}
        </ColoredSelect>
      </PropertyRow>

      <PropertyRow label="Janela" icon={<Sun />}>
        <ColoredSelect
          value={postingWindow?.id ?? ''}
          onChange={event => {
            const windowId = event.target.value as PostingWindowId | '';
            const window = POSTING_WINDOWS.find(item => item.id === windowId);
            onChange({publishTime: window?.defaultTime ?? null});
          }}
          empty={!postingWindow}
          dotColor={postingWindow?.color ?? null}
        >
          <option value="">Vazio</option>
          {POSTING_WINDOWS.map(window => (
            <option key={window.id} value={window.id}>
              {window.label}
            </option>
          ))}
        </ColoredSelect>
      </PropertyRow>

      <StatusPropertyRow
        status={draft.status}
        publishDate={draft.publishDate}
        postedAt={draft.postedAt ?? null}
        allowedStatuses={allowedStatuses}
        onStatusChange={status => onChange({status})}
      />
    </PropertySection>
  );

  const scheduleSection = (
    <PropertySection label="Agendamento">
      <PropertyRow label="Gravacao" icon={<Video />}>
        <PropertyDatePicker
          value={draft.recordingDate ? draft.recordingDate.slice(0, 10) : null}
          onChange={date => onChange({recordingDate: toIsoDate(date)})}
        />
      </PropertyRow>

      <PropertyRow label="Publicacao" icon={<CalendarClock />}>
        <PropertyDatePicker
          value={publishDateOnly || null}
          onChange={date => onChange({publishDate: toIsoDate(date)})}
        />
      </PropertyRow>

      {publishDateOnly ? (
        <PropertyRow label="Hora" icon={<Clock />}>
          <PropertyInput
            type="time"
            value={draft.publishTime ?? ''}
            onChange={event => onChange({publishTime: event.target.value || null})}
            className={draft.publishTime ? '' : 'property-row-value--empty'}
          />
        </PropertyRow>
      ) : null}
    </PropertySection>
  );

  const notesSection = (
    <PropertySection label="Notas">
      <div className="px-2">
        <PropertyTextarea
          value={draft.notes ?? ''}
          onChange={event => onChange({notes: event.target.value.slice(0, NOTES_MAX)})}
          className="min-h-[88px] w-full"
          placeholder="Observacoes editoriais, referencias, links..."
        />
        <p className="mt-1 text-right text-xs text-[var(--text-tertiary)]">
          {(draft.notes ?? '').length} / {NOTES_MAX}
        </p>
      </div>
    </PropertySection>
  );

  if (layout === 'form') {
    return (
      <aside className={cn('cms-panel flex flex-col gap-4 p-4', className)}>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Pilar</span>
          <select
            value={draft.pilarId ?? ''}
            onChange={event => onChange({pilarId: event.target.value || null})}
            className={formInputClass}
          >
            <option value="">Vazio</option>
            {pilares
              .filter(pilar => pilar.ativo)
              .map(pilar => (
                <option key={pilar.id} value={pilar.id}>
                  {pilar.nome}
                </option>
              ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Serie</span>
          <select
            value={draft.seriesId ?? ''}
            onChange={event => onChange({seriesId: event.target.value || null})}
            className={formInputClass}
          >
            <option value="">Vazio</option>
            {series.map(serie => (
              <option key={serie.id} value={serie.id}>
                {serie.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Gravacao</span>
            <PropertyDatePicker
              variant="field"
              value={draft.recordingDate ? draft.recordingDate.slice(0, 10) : null}
              onChange={date => onChange({recordingDate: toIsoDate(date)})}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Postagem</span>
            <PropertyDatePicker
              variant="field"
              value={publishDateOnly || null}
              onChange={date => onChange({publishDate: toIsoDate(date)})}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Notas</span>
          <textarea
            value={draft.notes ?? ''}
            onChange={event => onChange({notes: event.target.value.slice(0, NOTES_MAX)})}
            className={cn(formInputClass, 'min-h-[88px] resize-none')}
            placeholder="Observacoes editoriais"
          />
        </div>

        {linkedSerie ? (
          <button
            type="button"
            onClick={() => navigate('/configuracoes/series/' + linkedSerie.id + '/roteiros')}
            className="flex items-center justify-between gap-2 rounded-[var(--radius-input)] border border-[var(--border-color)] px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
          >
            <span className="truncate">{linkedSerie.name}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" />
          </button>
        ) : null}
      </aside>
    );
  }

  if (variant === 'cards') {
    return (
      <aside className={cn('flex flex-col gap-3', className)}>
        <CollapsibleCard title="Propriedades">
          <RoteiroField label="Série" icon={<Layers className="h-3.5 w-3.5" />}>
            <RoteiroSelect
              value={draft.seriesId ?? ''}
              onChange={event => onChange({seriesId: event.target.value || null})}
            >
              <option value="">Vazio</option>
              {series.map(serie => (
                <option key={serie.id} value={serie.id}>
                  {serie.name}
                </option>
              ))}
            </RoteiroSelect>
          </RoteiroField>

          <RoteiroField label="Pilar" icon={<Target className="h-3.5 w-3.5" />}>
            <RoteiroSelect
              value={draft.pilarId ?? ''}
              onChange={event => onChange({pilarId: event.target.value || null})}
              dotColor={linkedPilar?.cor ?? null}
            >
              <option value="">Vazio</option>
              {pilares
                .filter(pilar => pilar.ativo)
                .map(pilar => (
                  <option key={pilar.id} value={pilar.id}>
                    {pilar.nome}
                  </option>
                ))}
            </RoteiroSelect>
          </RoteiroField>

          <RoteiroField label="Slot" icon={<Sun className="h-3.5 w-3.5" />}>
            <RoteiroSelect
              value={postingWindow?.id ?? ''}
              onChange={event => {
                const windowId = event.target.value as PostingWindowId | '';
                const window = POSTING_WINDOWS.find(item => item.id === windowId);
                onChange({publishTime: window?.defaultTime ?? null});
              }}
              dotColor={postingWindow?.color ?? null}
            >
              <option value="">Vazio</option>
              {POSTING_WINDOWS.map(window => (
                <option key={window.id} value={window.id}>
                  {window.label}
                </option>
              ))}
            </RoteiroSelect>
          </RoteiroField>

          <RoteiroField label="Status" icon={<ListChecks className="h-3.5 w-3.5" />}>
            <StatusDropdownField
              status={draft.status}
              publishDate={draft.publishDate}
              postedAt={draft.postedAt ?? null}
              allowedStatuses={allowedStatuses}
              onStatusChange={status => onChange({status})}
            />
          </RoteiroField>
        </CollapsibleCard>

        <CollapsibleCard title="Agendamento">
          <RoteiroField label="Gravação" icon={<Video className="h-3.5 w-3.5" />}>
            <PropertyDatePicker
              variant="field"
              value={draft.recordingDate ? draft.recordingDate.slice(0, 10) : null}
              onChange={date => onChange({recordingDate: toIsoDate(date)})}
            />
          </RoteiroField>

          <RoteiroField label="Publicação" icon={<CalendarClock className="h-3.5 w-3.5" />}>
            <PropertyDatePicker
              variant="field"
              value={publishDateOnly || null}
              onChange={date => onChange({publishDate: toIsoDate(date)})}
            />
          </RoteiroField>

          {publishDateOnly ? (
            <>
              <RoteiroField label="Hora" icon={<Clock className="h-3.5 w-3.5" />}>
                <input
                  type="time"
                  value={draft.publishTime ?? ''}
                  onChange={event => onChange({publishTime: event.target.value || null})}
                  className={formInputClass}
                />
              </RoteiroField>
              <PostingTimeSuggestions
                date={publishDateOnly}
                selectedTime={draft.publishTime ?? ''}
                postingTimeEntries={state.postingTimeEntries}
                platforms={state.platforms}
                pilar={linkedPilar}
                onSelect={time => onChange({publishTime: time})}
              />
            </>
          ) : null}
        </CollapsibleCard>

        <CollapsibleCard title="Notas">
          <textarea
            value={draft.notes ?? ''}
            onChange={event => onChange({notes: event.target.value.slice(0, NOTES_MAX)})}
            className={cn(formInputClass, 'min-h-[100px] resize-none')}
            placeholder="Observacoes editoriais, referencias, links..."
          />
          <p className="text-right text-xs text-[var(--text-tertiary)]">
            {(draft.notes ?? '').length} / {NOTES_MAX}
          </p>
        </CollapsibleCard>
      </aside>
    );
  }

  return (
    <aside className={cn('flex flex-col', compact ? 'gap-[var(--space-xl)]' : 'gap-6', className)}>
      {showTitle ? (
        <input
          value={draft.title}
          onChange={event => onChange({title: event.target.value})}
          className="t-page-title w-full border-0 bg-transparent p-0 outline-none placeholder:text-[var(--text-tertiary)]"
          placeholder="Titulo do conteudo"
        />
      ) : null}

      {propertiesSection}
      {scheduleSection}

      {publishDateOnly ? (
        <>
          <PostingTimeSuggestions
            date={publishDateOnly}
            selectedTime={draft.publishTime ?? ''}
            postingTimeEntries={state.postingTimeEntries}
            platforms={state.platforms}
            pilar={linkedPilar}
            onSelect={time => onChange({publishTime: time})}
          />
          {linkedPilar && pilarPostingPreview.length === 0 ? (
            <Text variant="meta" className="text-[var(--text-tertiary)]">
              Nenhum horário do pilar cruza com os horários configurados neste dia.
            </Text>
          ) : null}
        </>
      ) : null}

      {notesSection}

      {linkedSerie ? (
        <PropertySection label="Vinculos">
          <PropertyRow
            label="Central da serie"
            icon={<ExternalLink />}
            onClick={() => navigate('/configuracoes/series/' + linkedSerie.id + '/roteiros')}
          >
            <span className="min-w-0 truncate">{linkedSerie.name}</span>
          </PropertyRow>
        </PropertySection>
      ) : null}
    </aside>
  );
}
