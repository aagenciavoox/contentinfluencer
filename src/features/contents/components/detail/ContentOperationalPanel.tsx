import {useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {getDay, parseISO} from 'date-fns';
import {CalendarClock, ChevronDown, Clock, ExternalLink, ImageIcon, Layers, ListChecks, Palette, Sun, Target, Video, Zap} from 'lucide-react';
import type {Content, EnergiaNivel, Pilar, Serie} from '../../../../lib/database';
import {VISUAL_FORMATS, getVisualFormatLabel} from '../../../../constants';
import {
  FUNCAO_LABELS,
  FUNCOES,
  funcaoHerdavelDaSerie,
  isFuncaoEditorial,
  resolveFuncao,
  rotuloDaSerie,
} from '../../../editorial/lib/funcoes';
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
  | 'funcao'
  | 'funcaoOrigem'
  | 'classificacaoCongeladaEm'
  | 'contaNaGrade'
  | 'notes'
  | 'recordingDate'
  | 'publishDate'
  | 'publishTime'
  | 'status'
> & Partial<Pick<Content, 'postedAt' | 'energiaNecessaria'>>;

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

function AsideAccordion({
  id,
  title,
  openId,
  onToggle,
  children,
}: {
  id: AsideSectionId;
  title: string;
  openId: AsideSectionId | null;
  onToggle: (id: AsideSectionId) => void;
  children: React.ReactNode;
}) {
  const open = openId === id;

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
        className="property-input flex w-full items-center justify-between gap-2 text-left focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
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


type FuncaoDraft = Pick<Content, 'funcao' | 'funcaoOrigem' | 'classificacaoCongeladaEm' | 'contaNaGrade'>;

function funcaoChoiceValue(draft: Pick<Content, 'funcao' | 'funcaoOrigem'>): string {
  const origem = draft.funcaoOrigem ?? null;
  if (!origem) return 'indefinida';
  if (origem === 'herdada') return 'herdada';
  if (origem === 'nenhuma') return 'nenhuma';
  return draft.funcao ?? 'indefinida';
}

function updatesFromFuncaoChoice(value: string): Partial<Pick<Content, 'funcao' | 'funcaoOrigem'>> {
  if (value === 'herdada') return {funcao: null, funcaoOrigem: 'herdada'};
  if (value === 'nenhuma') return {funcao: null, funcaoOrigem: 'nenhuma'};
  if (value === 'indefinida') return {funcao: null, funcaoOrigem: null};
  if (isFuncaoEditorial(value)) return {funcao: value, funcaoOrigem: 'escolhida'};
  return {};
}

function FuncaoEditorialFields({
  draft,
  serie,
  onChange,
  variant,
  formInputClass,
}: {
  draft: FuncaoDraft;
  serie: Serie | null;
  onChange: (updates: Partial<Pick<Content, 'funcao' | 'funcaoOrigem' | 'contaNaGrade'>>) => void;
  variant: 'property' | 'form' | 'cards';
  formInputClass?: string;
}) {
  const resolved = resolveFuncao(draft, serie);
  const daSerieFuncao = resolved.congelada && resolved.estado === 'herdada'
    ? resolved.funcao
    : funcaoHerdavelDaSerie(serie);
  const daSerieLabel = rotuloDaSerie(daSerieFuncao);
  const value = funcaoChoiceValue(draft);
  const handleFuncao = (next: string) => onChange(updatesFromFuncaoChoice(next));
  const grade = (
    <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
      <input
        type="checkbox"
        checked={draft.contaNaGrade !== false}
        onChange={event => onChange({contaNaGrade: event.target.checked})}
      />
      Conta na grade
    </label>
  );
  const options = (
    <>
      <option value="herdada">{daSerieLabel}</option>
      {FUNCOES.map(funcao => (
        <option key={funcao} value={funcao}>{FUNCAO_LABELS[funcao]}</option>
      ))}
      <option value="nenhuma">Nenhuma</option>
      <option value="indefinida">Ainda não escolhida</option>
    </>
  );

  if (variant === 'form') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Função</span>
          <select value={value} onChange={event => handleFuncao(event.target.value)} className={formInputClass}>
            {options}
          </select>
        </div>
        {grade}
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <>
        <RoteiroField label="Função" icon={<ListChecks className="h-3.5 w-3.5" />}>
          <RoteiroSelect value={value} onChange={event => handleFuncao(event.target.value)}>
            {options}
          </RoteiroSelect>
        </RoteiroField>
        <RoteiroField label="Grade" icon={<ListChecks className="h-3.5 w-3.5" />}>
          {grade}
        </RoteiroField>
      </>
    );
  }

  return (
    <>
      <PropertyRow label="Função" icon={<ListChecks />}>
        <PropertySelect
          value={value}
          onChange={event => handleFuncao(event.target.value)}
          className={value === 'indefinida' ? 'property-row-value--empty' : ''}
        >
          {options}
        </PropertySelect>
      </PropertyRow>
      <PropertyRow label="Grade" icon={<ListChecks />}>
        {grade}
      </PropertyRow>
    </>
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
  const visualFormats = useMemo(
    () => Array.from(new Set([
      ...VISUAL_FORMATS,
      ...series.map(serie => serie.formatoVisualPadrao).filter((value): value is string => Boolean(value)),
      ...(draft.formatoVisual ? [draft.formatoVisual] : []),
    ])),
    [draft.formatoVisual, series],
  );
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
      <PropertyRow label="Série" icon={<Layers />}>
        <PropertySelect
          value={draft.seriesId ?? ''}
          onChange={event => onChange({seriesId: event.target.value || null})}
          className={emptySelect(draft.seriesId)}
        >
          <option value="">Selecionar série…</option>
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
          <option value="">Selecionar pilar…</option>
          {pilares
            .filter(pilar => pilar.ativo)
            .map(pilar => (
              <option key={pilar.id} value={pilar.id}>
                {pilar.nome}
              </option>
            ))}
        </ColoredSelect>
      </PropertyRow>

      <PropertyRow label="Formato visual" icon={<ImageIcon />}>
        <PropertySelect
          value={draft.formatoVisual ?? ''}
          onChange={event => onChange({formatoVisual: event.target.value || null})}
          className={emptySelect(draft.formatoVisual)}
        >
          <option value="">Sem formato</option>
          {visualFormats.map(format => (
            <option key={format} value={format}>{getVisualFormatLabel(format)}</option>
          ))}
        </PropertySelect>
      </PropertyRow>

      <PropertyRow label="Energia" icon={<Zap />}>
        <PropertySelect
          value={draft.energiaNecessaria ?? ''}
          onChange={event => onChange({energiaNecessaria: (event.target.value || null) as EnergiaNivel | null})}
          className={emptySelect(draft.energiaNecessaria)}
        >
          <option value="">Sem energia</option>
          <option value="baixa">Baixa</option>
          <option value="média">Média</option>
          <option value="alta">Alta</option>
        </PropertySelect>
      </PropertyRow>

      <FuncaoEditorialFields
        draft={draft}
        serie={linkedSerie}
        onChange={onChange}
        variant="property"
      />

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
          <option value="">Selecionar janela…</option>
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
      <PropertyRow label="Gravação" icon={<Video />}>
        <PropertyDatePicker
          value={draft.recordingDate ? draft.recordingDate.slice(0, 10) : null}
          onChange={date => onChange({recordingDate: toIsoDate(date)})}
        />
      </PropertyRow>

      <PropertyRow label="Publicação" icon={<CalendarClock />}>
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
    <PropertySection label="Observações">
      <div className="stack-sm">
        <PropertyTextarea
          value={draft.notes ?? ''}
          onChange={event => onChange({notes: event.target.value.slice(0, NOTES_MAX)})}
          className="w-full"
          placeholder="Observações editoriais, referências, links…"
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
            <option value="">Selecionar pilar…</option>
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
          <span className="text-xs font-medium text-[var(--text-secondary)]">Série</span>
          <select
            value={draft.seriesId ?? ''}
            onChange={event => onChange({seriesId: event.target.value || null})}
            className={formInputClass}
          >
            <option value="">Selecionar série…</option>
            {series.map(serie => (
              <option key={serie.id} value={serie.id}>
                {serie.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Formato visual</span>
            <select
              value={draft.formatoVisual ?? ''}
              onChange={event => onChange({formatoVisual: event.target.value || null})}
              className={formInputClass}
            >
              <option value="">Sem formato</option>
              {visualFormats.map(format => (
                <option key={format} value={format}>{getVisualFormatLabel(format)}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Energia</span>
            <select
              value={draft.energiaNecessaria ?? ''}
              onChange={event => onChange({energiaNecessaria: (event.target.value || null) as EnergiaNivel | null})}
              className={formInputClass}
            >
              <option value="">Sem energia</option>
              <option value="baixa">Baixa</option>
              <option value="média">Média</option>
              <option value="alta">Alta</option>
            </select>
          </div>
        </div>

        <FuncaoEditorialFields
          draft={draft}
          serie={linkedSerie}
          onChange={onChange}
          variant="form"
          formInputClass={formInputClass}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Gravação</span>
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
          <span className="text-xs font-medium text-[var(--text-secondary)]">Observações</span>
          <textarea
            value={draft.notes ?? ''}
            onChange={event => onChange({notes: event.target.value.slice(0, NOTES_MAX)})}
            className={cn(formInputClass, 'min-h-[88px] resize-none')}
            placeholder="Observações editoriais"
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
      <aside className={cn('flex flex-col gap-3', className)}>
        <Surface variant="outlined" padding="md" className="stack-md">
          <RoteiroField label="Status" icon={<ListChecks className="h-3.5 w-3.5" />}>
            <StatusDropdownField
              status={draft.status}
              publishDate={draft.publishDate}
              postedAt={draft.postedAt ?? null}
              allowedStatuses={allowedStatuses}
              onStatusChange={status => onChange({status})}
            />
          </RoteiroField>
          <div className="flex flex-wrap gap-2">
            <Badge variant="neutral">{linkedSerie?.name ?? 'Sem série'}</Badge>
            <Badge variant="tag">{linkedPilar?.nome ?? 'Sem pilar'}</Badge>
          </div>
        </Surface>

        <AsideAccordion id="properties" title="Propriedades" openId={openSection} onToggle={toggleSection}>
          <RoteiroField label="Série" icon={<Layers className="h-3.5 w-3.5" />}>
            <RoteiroSelect
              value={draft.seriesId ?? ''}
              onChange={event => onChange({seriesId: event.target.value || null})}
            >
              <option value="">Selecionar série…</option>
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
              <option value="">Selecionar pilar…</option>
              {pilares
                .filter(pilar => pilar.ativo)
                .map(pilar => (
                  <option key={pilar.id} value={pilar.id}>
                    {pilar.nome}
                  </option>
                ))}
            </RoteiroSelect>
          </RoteiroField>

          <RoteiroField label="Formato visual" icon={<ImageIcon className="h-3.5 w-3.5" />}>
            <RoteiroSelect
              value={draft.formatoVisual ?? ''}
              onChange={event => onChange({formatoVisual: event.target.value || null})}
            >
              <option value="">Sem formato</option>
              {visualFormats.map(format => (
                <option key={format} value={format}>{getVisualFormatLabel(format)}</option>
              ))}
            </RoteiroSelect>
          </RoteiroField>

          <RoteiroField label="Energia" icon={<Zap className="h-3.5 w-3.5" />}>
            <RoteiroSelect
              value={draft.energiaNecessaria ?? ''}
              onChange={event => onChange({energiaNecessaria: (event.target.value || null) as EnergiaNivel | null})}
            >
              <option value="">Sem energia</option>
              <option value="baixa">Baixa</option>
              <option value="média">Média</option>
              <option value="alta">Alta</option>
            </RoteiroSelect>
          </RoteiroField>

          <FuncaoEditorialFields
            draft={draft}
            serie={linkedSerie}
            onChange={onChange}
            variant="cards"
          />

          <RoteiroField label="Janela" icon={<Sun className="h-3.5 w-3.5" />}>
            <RoteiroSelect
              value={postingWindow?.id ?? ''}
              onChange={event => {
                const windowId = event.target.value as PostingWindowId | '';
                const window = POSTING_WINDOWS.find(item => item.id === windowId);
                onChange({publishTime: window?.defaultTime ?? null});
              }}
              dotColor={postingWindow?.color ?? null}
            >
              <option value="">Selecionar janela…</option>
              {POSTING_WINDOWS.map(window => (
                <option key={window.id} value={window.id}>
                  {window.label}
                </option>
              ))}
            </RoteiroSelect>
          </RoteiroField>
        </AsideAccordion>

        <AsideAccordion id="schedule" title="Agendamento" openId={openSection} onToggle={toggleSection}>
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

        <AsideAccordion id="notes" title="Observações" openId={openSection} onToggle={toggleSection}>
          <textarea
            value={draft.notes ?? ''}
            onChange={event => onChange({notes: event.target.value.slice(0, NOTES_MAX)})}
            className={cn(quietFieldClass, 'min-h-[100px] resize-none bg-[var(--bg-hover)]')}
            placeholder="Observações editoriais, referências, links…"
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
          placeholder="Título do roteiro"
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
        <PropertySection label="Vínculos">
          <PropertyRow
            label="Central da série"
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
