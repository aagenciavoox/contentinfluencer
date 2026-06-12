import {useState} from 'react';
import {ChevronDown} from 'lucide-react';
import type {Content, Pilar, Serie} from '../../../../lib/database';
import {cn} from '../../../../lib/utils';
import {VISUAL_FORMATS} from '../../../../constants';
import {useAppContext} from '../../../../context/AppContext';
import {PostingTimeSuggestions} from '../../../settings/components/PostingTimeSuggestions';
import {getPostingTimes} from '../../../settings/lib/postingTimes';
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
  | 'publishTime'
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
  authorName?: string;
}

const fieldClass =
  'w-full rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] outline-none transition-colors hover:border-[var(--border-strong)] focus:border-[var(--accent-blue)] focus:ring-2 focus:ring-[var(--shadow-focus)]';

function PanelField({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-[var(--text-secondary)]">{label}</span>
      {children}
    </label>
  );
}

function hasOrganizationValues(draft: OperationalDraft) {
  return !!(draft.seriesId || draft.pilarId || draft.formatoVisual || draft.slotType);
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
  authorName,
}: ContentOperationalPanelProps) {
  const {state} = useAppContext();
  const postingTimes = getPostingTimes(state.preferences);
  const compact = density === 'compact';
  const publishDateOnly = draft.publishDate ? draft.publishDate.slice(0, 10) : '';
  const [organizationOpen, setOrganizationOpen] = useState(() => hasOrganizationValues(draft));

  return (
    <aside className={cn('cms-panel flex flex-col', compact ? 'gap-2.5 p-3' : 'gap-5 p-5', className)}>
      <div className={cn(compact ? 'space-y-2.5' : 'space-y-3')}>
        {showTitle ? (
          <PanelField label="Título">
            <input
              value={draft.title}
              onChange={event => onChange({title: event.target.value})}
              className={cn(fieldClass, 'font-semibold')}
              placeholder="Título do conteúdo"
            />
          </PanelField>
        ) : null}

        <div className="overflow-hidden rounded-[var(--radius-input)] border border-[var(--border-color)]">
          <button
            type="button"
            onClick={() => setOrganizationOpen(prev => !prev)}
            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--bg-hover)]"
          >
            <span className="text-xs font-medium text-[var(--text-secondary)]">Organização (opcional)</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-transform',
                organizationOpen && 'rotate-180',
              )}
            />
          </button>
          {organizationOpen ? (
            <div className="space-y-3 border-t border-[var(--border-color)] p-3">
              <PanelField label="Serie">
                <select
                  value={draft.seriesId ?? ''}
                  onChange={event => onChange({seriesId: event.target.value || null})}
                  className={fieldClass}
                >
                  <option value="">Selecionar série…</option>
                  {series.map(serie => (
                    <option key={serie.id} value={serie.id}>
                      {serie.name}
                    </option>
                  ))}
                </select>
              </PanelField>

              <PanelField label="Pilar">
                <select
                  value={draft.pilarId ?? ''}
                  onChange={event => onChange({pilarId: event.target.value || null})}
                  className={fieldClass}
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
              </PanelField>

              <PanelField label="Formato">
                <select
                  value={draft.formatoVisual ?? ''}
                  onChange={event => onChange({formatoVisual: event.target.value || null})}
                  className={fieldClass}
                >
                  <option value="">Selecionar formato…</option>
                  {VISUAL_FORMATS.map(format => (
                    <option key={format} value={format}>
                      {format}
                    </option>
                  ))}
                </select>
              </PanelField>

              <PanelField label="Slot">
                <select
                  value={draft.slotType ?? ''}
                  onChange={event => onChange({slotType: (event.target.value || null) as Content['slotType']})}
                  className={fieldClass}
                >
                  <option value="">Selecionar slot…</option>
                  <option value="ÚNICO">Unico</option>
                  <option value="SÉRIE">Serie</option>
                  <option value="JANELA">Janela</option>
                </select>
              </PanelField>
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium text-[var(--text-secondary)]">Quando gravar / postar</p>
          <div className="grid grid-cols-2 gap-2">
            <PanelField label="Gravação">
              <input
                type="date"
                value={draft.recordingDate ? draft.recordingDate.slice(0, 10) : ''}
                onChange={event =>
                  onChange({recordingDate: event.target.value ? `${event.target.value}T12:00:00.000Z` : null})
                }
                className={fieldClass}
              />
            </PanelField>
            <PanelField label="Postagem">
              <input
                type="date"
                value={publishDateOnly}
                onChange={event =>
                  onChange({publishDate: event.target.value ? `${event.target.value}T12:00:00.000Z` : null})
                }
                className={fieldClass}
              />
            </PanelField>
          </div>

          {publishDateOnly ? (
            <div className="space-y-1.5">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-[var(--text-secondary)]">Hora de postagem</span>
                <input
                  type="time"
                  value={draft.publishTime ?? ''}
                  onChange={event => onChange({publishTime: event.target.value || null})}
                  className={fieldClass}
                />
              </label>
              <PostingTimeSuggestions
                date={publishDateOnly}
                selectedTime={draft.publishTime ?? ''}
                postingTimes={postingTimes}
                onSelect={time => onChange({publishTime: time})}
              />
            </div>
          ) : null}
        </div>

        <PanelField label="Notas">
          <textarea
            value={draft.notes ?? ''}
            onChange={event => onChange({notes: event.target.value})}
            className={cn(fieldClass, 'min-h-[88px] resize-none')}
            placeholder="Observacoes editoriais"
          />
        </PanelField>
      </div>
    </aside>
  );
}
