import {useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {getDay, parseISO} from 'date-fns';
import {BookOpen, CalendarClock, ChevronDown, Clock, ExternalLink, Layers, ListChecks, Palette, Sun, Target, Video} from 'lucide-react';
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
import {AppButton} from '../../../../components/ui/AppButton';
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
type AsideSectionId = 'properties' | 'schedule' | 'notes';

const quietFieldClass =
  'w-full rounded-[var(--radius-input)] border border-transparent bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition-colors hover:bg-[var(--bg-hover)] focus:border-[var(--border-color)] focus:bg-[var(--bg-elevated)]';

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
> & Partial<Pick<Content, 'postedAt' | 'bibliotecaItemId'>>;

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
  /** Cards variant only: render every section expanded in a responsive grid. */
  sectionsOpen?: boolean;
}

function AsideAccordion({
  id,
  title,
  openId,
  onToggle,
  alwaysOpen = false,
  children,
}: {
  id: AsideSectionId;
  title: string;
  openId: AsideSectionId | null;
  onToggle: (id: AsideSectionId) => void;
  alwaysOpen?: boolean;
  children: React.ReactNode;
}) {
  const open = openId === id;

  if (alwaysOpen) {
    return (
      <Surface variant="outlined" padding="md" className="stack-md overflow-visible">
        <span className="panel-section-title">{title}</span>
        {children}
      </Surface>
    );
  }

  return (
    <Surface variant="outlined" padding="none" className="overflow-visible">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onToggle(id)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-[var(--bg-hover)] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
      >
        <span className="panel-section-title">{title}</span>
        <ChevronDown className={cn('h-4 w-4 text-[var(--text-tertiary)] transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="stack-md border-t border-[var(--border-subtle)] p-4">{children}</div>
      ) : null}
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
          quietFieldClass,
          'appearance-none py-2 pr-8',
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
    <span className="relative inline-flex w-full min-w-0 items-center">
      {dotColor ? (
        <span className="pointer-events-none absolute left-3 z-10">
          <ColorDot color={dotColor} />
        </span>
      ) : null}
      <PropertySelect
        value={value}
        onChange={onChange}
        className={cn(empty && 'property-row-value--empty', dotColor && 'pl-7')}
      >
        {children}
      </PropertySelect>
    </span>
  );
}

export function ContentStatusField({
  status,
  publishDate,
  postedAt,
  allowedStatuses,
  onStatusChange,
  boxed = false,
}: {
  status: Content['status'];
  publishDate: string | null;
  postedAt: string | null;
  allowedStatuses: string[];
  onStatusChange: (status: string) => void;
  boxed?: boolean;
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
        className={cn(
          'flex w-full items-center justify-between gap-2 text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
          boxed
            ? 'h-11 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-primary)] px-3'
            : 'property-input',
        )}
      >
        <Badge variant="status" status={displayStatus}>
          {displayStatus}
        </Badge>
        <ChevronDown className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] p-1 shadow-[var(--shadow-dropdown)]">
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
    <PropertyRow label="Status" icon={<ListChecks />}>
      <ContentStatusField
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
  sectionsOpen = false,
}: ContentOperationalPanelProps) {
  const {state, ensureDataDomains} = useAppContext();
  const navigate = useNavigate();
  const showLibraryLink = variant === 'cards' && layout !== 'form';
  useEffect(() => {
    if (showLibraryLink) void ensureDataDomains(['library']);
  }, [ensureDataDomains, showLibraryLink]);
  const bibliotecaOptions = useMemo(
    () =>
      state.bibliotecaItems
        .filter(item => !item.deletedAt || item.id === draft.bibliotecaItemId)
        .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR')),
    [state.bibliotecaItems, draft.bibliotecaItemId],
  );
  const linkedBibliotecaItem = draft.bibliotecaItemId
    ? state.bibliotecaItems.find(item => item.id === draft.bibliotecaItemId) ?? null
    : null;
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
  const [openSection, setOpenSection] = useState<AsideSectionId | null>(null);
  const toggleSection = (id: AsideSectionId) => {
    setOpenSection(current => (current === id ? null : id));
  };

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
          <option value="">Selecionar série...</option>
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
          <option value="">Selecionar pilar...</option>
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
          <option value="">Selecionar janela...</option>
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
      <div className="stack-sm">
        <PropertyTextarea
          value={draft.notes ?? ''}
          onChange={event => onChange({notes: event.target.value.slice(0, NOTES_MAX)})}
          className="w-full"
          placeholder="Observacoes editoriais, referencias, links..."
        />
        <Text variant="meta" className="text-right">
          {(draft.notes ?? '').length} / {NOTES_MAX}
        </Text>
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
            <option value="">Selecionar pilar...</option>
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
            <option value="">Selecionar série...</option>
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
            onClick={() => navigate('/series/' + linkedSerie.id + '/roteiros')}
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
      <aside
        className={cn(
          sectionsOpen
            ? 'grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4'
            : 'flex flex-col gap-3',
          className,
        )}
      >
        <Surface variant="outlined" padding="md" className="stack-md">
          <RoteiroField label="Status" icon={<ListChecks className="h-3.5 w-3.5" />}>
            <ContentStatusField
              status={draft.status}
              publishDate={draft.publishDate}
              postedAt={draft.postedAt ?? null}
              allowedStatuses={allowedStatuses}
              onStatusChange={status => onChange({status})}
            />
          </RoteiroField>
          <RoteiroField label="Biblioteca" icon={<BookOpen className="h-3.5 w-3.5" />}>
            <div className="flex items-center gap-1">
              <div className="min-w-0 flex-1">
                <RoteiroSelect
                  value={draft.bibliotecaItemId ?? ''}
                  onChange={event => onChange({bibliotecaItemId: event.target.value || null})}
                >
                  <option value="">Sem item vinculado</option>
                  {bibliotecaOptions.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.titulo}
                    </option>
                  ))}
                </RoteiroSelect>
              </div>
              {linkedBibliotecaItem ? (
                <AppButton
                  type="button"
                  variant="ghost"
                  size="xs"
                  aria-label={`Abrir ${linkedBibliotecaItem.titulo} na biblioteca`}
                  title="Abrir na biblioteca"
                  onClick={() => navigate(`/biblioteca/${linkedBibliotecaItem.id}?tab=conteudos`)}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </AppButton>
              ) : null}
            </div>
          </RoteiroField>
          <div className="flex flex-wrap gap-2">
            <Badge variant="neutral">{linkedSerie?.name ?? 'Sem série'}</Badge>
            <Badge variant="tag">{linkedPilar?.nome ?? 'Sem pilar'}</Badge>
          </div>
        </Surface>

        <AsideAccordion id="properties" title="Propriedades" openId={openSection} onToggle={toggleSection} alwaysOpen={sectionsOpen}>
          <RoteiroField label="Série" icon={<Layers className="h-3.5 w-3.5" />}>
            <RoteiroSelect
              value={draft.seriesId ?? ''}
              onChange={event => onChange({seriesId: event.target.value || null})}
            >
              <option value="">Selecionar série...</option>
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
              <option value="">Selecionar pilar...</option>
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
              <option value="">Selecionar janela...</option>
              {POSTING_WINDOWS.map(window => (
                <option key={window.id} value={window.id}>
                  {window.label}
                </option>
              ))}
            </RoteiroSelect>
          </RoteiroField>
        </AsideAccordion>

        <AsideAccordion id="schedule" title="Agendamento" openId={openSection} onToggle={toggleSection} alwaysOpen={sectionsOpen}>
          <RoteiroField label="Gravação" icon={<Video className="h-3.5 w-3.5" />}>
            <PropertyDatePicker
              variant="field"
              className="border-transparent bg-transparent hover:bg-[var(--bg-hover)] focus:border-[var(--border-color)]"
              value={draft.recordingDate ? draft.recordingDate.slice(0, 10) : null}
              onChange={date => onChange({recordingDate: toIsoDate(date)})}
            />
          </RoteiroField>

          <RoteiroField label="Publicação" icon={<CalendarClock className="h-3.5 w-3.5" />}>
            <PropertyDatePicker
              variant="field"
              className="border-transparent bg-transparent hover:bg-[var(--bg-hover)] focus:border-[var(--border-color)]"
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
                  className={quietFieldClass}
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
        </AsideAccordion>

        <AsideAccordion id="notes" title="Notas" openId={openSection} onToggle={toggleSection} alwaysOpen={sectionsOpen}>
          <textarea
            value={draft.notes ?? ''}
            onChange={event => onChange({notes: event.target.value.slice(0, NOTES_MAX)})}
            className={cn(quietFieldClass, 'min-h-[100px] resize-none bg-[var(--bg-hover)]')}
            placeholder="Observacoes editoriais, referencias, links..."
          />
          <Text variant="meta" className="text-right">
            {(draft.notes ?? '').length} / {NOTES_MAX}
          </Text>
        </AsideAccordion>
      </aside>
    );
  }

  return (
    <aside className={cn('flex flex-col', compact ? 'gap-[var(--space-lg)]' : 'gap-6', className)}>
      {showTitle ? (
        <input
          value={draft.title}
          onChange={event => onChange({title: event.target.value})}
          className="content-operational-title t-page-title w-full border-0 bg-transparent p-0 outline-none placeholder:text-[var(--text-tertiary)]"
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
            onClick={() => navigate('/series/' + linkedSerie.id + '/roteiros')}
          >
            <span className="min-w-0 truncate">{linkedSerie.name}</span>
          </PropertyRow>
        </PropertySection>
      ) : null}
    </aside>
  );
}
