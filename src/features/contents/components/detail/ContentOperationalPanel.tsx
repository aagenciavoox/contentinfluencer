import type {Content, Pilar, Serie} from '../../../../lib/database';
import {cn} from '../../../../lib/utils';
import {VISUAL_FORMATS} from '../../../../constants';
import {CONTENT_STATUS} from '../../lib/contentPipeline';

type OperationalDraft = Pick<
  Content,
  | 'title'
  | 'seriesId'
  | 'pilarId'
  | 'slotType'
  | 'formatoVisual'
  | 'notes'
  | 'status'
  | 'recordingDate'
  | 'publishDate'
>;

interface ContentOperationalPanelProps {
  draft: OperationalDraft;
  series: Serie[];
  pilares: Pilar[];
  onChange: (updates: Partial<OperationalDraft>) => void;
  onStatusChange?: (status: string) => void;
  density?: 'default' | 'compact';
  showTitle?: boolean;
  className?: string;
}

const ALL_STATUSES = Object.values(CONTENT_STATUS);

const fieldClass =
  'ds-input w-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--border-strong)]';

function PanelSection({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <section className="space-y-2">
      <h3 className="ds-meta">{title}</h3>
      {children}
    </section>
  );
}

export function ContentOperationalPanel({
  draft,
  series,
  pilares,
  onChange,
  onStatusChange,
  density = 'default',
  showTitle = true,
  className,
}: ContentOperationalPanelProps) {
  const compact = density === 'compact';

  return (
    <aside
      className={cn(
        'ds-card flex flex-col gap-4 bg-[var(--bg-secondary)]',
        compact ? 'p-3' : 'p-4',
        className
      )}
    >
      <PanelSection title="Status">
        <select
          value={draft.status}
          onChange={event => onStatusChange?.(event.target.value)}
          className={fieldClass}
        >
          {ALL_STATUSES.map(status => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </PanelSection>

      {showTitle ? (
        <PanelSection title="Titulo">
          <input
            value={draft.title}
            onChange={event => onChange({title: event.target.value})}
            className={cn(fieldClass, 'font-semibold')}
            placeholder="Titulo do conteudo"
          />
        </PanelSection>
      ) : null}

      <PanelSection title="Serie e pilar">
        <div className="space-y-2">
          <select
            value={draft.seriesId ?? ''}
            onChange={event => onChange({seriesId: event.target.value || null})}
            className={fieldClass}
          >
            <option value="">Sem serie</option>
            {series.map(serie => (
              <option key={serie.id} value={serie.id}>
                {serie.name}
              </option>
            ))}
          </select>
          <select
            value={draft.pilarId ?? ''}
            onChange={event => onChange({pilarId: event.target.value || null})}
            className={fieldClass}
          >
            <option value="">Sem pilar</option>
            {pilares
              .filter(pilar => pilar.ativo)
              .map(pilar => (
                <option key={pilar.id} value={pilar.id}>
                  {pilar.nome}
                </option>
              ))}
          </select>
        </div>
      </PanelSection>

      <PanelSection title="Distribuicao">
        <div className="space-y-2">
          <select
            value={draft.slotType ?? ''}
            onChange={event => onChange({slotType: (event.target.value || null) as Content['slotType']})}
            className={fieldClass}
          >
            <option value="">Sem slot</option>
            <option value="ÚNICO">Unico</option>
            <option value="SÉRIE">Serie</option>
            <option value="JANELA">Janela</option>
          </select>
          <select
            value={draft.formatoVisual ?? ''}
            onChange={event => onChange({formatoVisual: event.target.value || null})}
            className={fieldClass}
          >
            <option value="">Sem formato</option>
            {VISUAL_FORMATS.map(format => (
              <option key={format} value={format}>
                {format}
              </option>
            ))}
          </select>
        </div>
      </PanelSection>

      <PanelSection title="Datas">
        <div className="space-y-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">Gravacao</span>
            <input
              type="date"
              value={draft.recordingDate ? draft.recordingDate.slice(0, 10) : ''}
              onChange={event =>
                onChange({recordingDate: event.target.value ? `${event.target.value}T12:00:00.000Z` : null})
              }
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">Postagem</span>
            <input
              type="date"
              value={draft.publishDate ? draft.publishDate.slice(0, 10) : ''}
              onChange={event =>
                onChange({publishDate: event.target.value ? `${event.target.value}T12:00:00.000Z` : null})
              }
              className={fieldClass}
            />
          </label>
        </div>
      </PanelSection>

      <PanelSection title="Notas">
        <textarea
          value={draft.notes ?? ''}
          onChange={event => onChange({notes: event.target.value})}
          className={cn(fieldClass, 'min-h-[88px] resize-none')}
          placeholder="Observacoes editoriais"
        />
      </PanelSection>
    </aside>
  );
}
