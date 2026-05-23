import {useState} from 'react';
import {MobileScriptEditor} from '../../../../../mobile/components/MobileScriptEditor';
import {MobileScriptReader} from '../../../../../mobile/components/MobileScriptReader';
import {htmlToReadableText} from '../../../../../lib/utils';
import type {Content, Pilar, Serie} from '../../../../../lib/database';
import {cn} from '../../../../../lib/utils';
import {ContentOperationalPanel} from '../ContentOperationalPanel';
import {ContentScriptWorkspace} from '../ContentScriptWorkspace';

type ScriptDraft = {
  title: string;
  seriesId: string | null;
  pilarId: string | null;
  slotType: Content['slotType'];
  formatoVisual: string | null;
  script: string | null;
  scriptNotes: Content['scriptNotes'];
  referencias: string | null;
  notes: string | null;
  status: Content['status'];
  recordingDate: string | null;
  publishDate: string | null;
};

interface RoteiroSectionProps {
  draft: ScriptDraft;
  series: Serie[];
  pilares: Pilar[];
  authorName: string;
  onChange: (updates: Partial<ScriptDraft>) => void;
  onStatusChange?: (status: string) => void;
  mobileComposer?: boolean;
  autoFocusScript?: boolean;
  layout?: 'stack' | 'workspace';
}

export function RoteiroSection({
  draft,
  series,
  pilares,
  authorName,
  onChange,
  onStatusChange,
  mobileComposer = false,
  autoFocusScript = false,
  layout = 'stack',
}: RoteiroSectionProps) {
  const hasScript = htmlToReadableText(draft.script).trim().length > 0;
  const [mobileMode, setMobileMode] = useState<'read' | 'edit'>(autoFocusScript || !hasScript ? 'edit' : 'read');

  const annotationHandlers = {
    onAddAnnotation: (text: string, selection: {from: number; to: number}, comment: string) =>
      onChange({
        scriptNotes: [
          ...(draft.scriptNotes || []),
          {
            id: Math.random().toString(36).slice(2, 11),
            text,
            selection,
            comment,
            color: '#F5C543',
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    onRemoveAnnotation: (id: string) =>
      onChange({
        scriptNotes: (draft.scriptNotes || []).filter(note => note.id !== id),
      }),
    onUpdateAnnotation: (id: string, comment: string, color?: string) =>
      onChange({
        scriptNotes: (draft.scriptNotes || []).map(note =>
          note.id === id ? {...note, comment, color} : note
        ),
      }),
  };

  if (layout === 'workspace' && !mobileComposer) {
    return (
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(280px,3fr)]">
        <ContentScriptWorkspace
          script={draft.script}
          scriptNotes={draft.scriptNotes}
          documentTitle={draft.title?.trim() || 'Novo roteiro'}
          authorName={authorName}
          referencias={draft.referencias}
          onScriptChange={html => onChange({script: html})}
          onReferenciasChange={value => onChange({referencias: value})}
          {...annotationHandlers}
        />
        <div className="sticky top-4">
          <ContentOperationalPanel
            draft={draft}
            series={series}
            pilares={pilares}
            onChange={onChange}
            onStatusChange={onStatusChange}
            showTitle={false}
          />
        </div>
      </div>
    );
  }

  const fieldClass =
    'ds-input w-full border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]';

  if (mobileComposer) {
    return (
      <div className="grid gap-3">
        <section className="ds-card bg-[var(--bg-secondary)] p-3">
          <label className="block">
            <span className="ds-section-label">Titulo</span>
            <input
              value={draft.title}
              onChange={event => onChange({title: event.target.value})}
              className={cn(fieldClass, 'font-semibold')}
              placeholder="Titulo do conteudo"
            />
          </label>
        </section>

        {mobileMode === 'edit' && hasScript ? (
          <button
            type="button"
            onClick={() => setMobileMode('read')}
            className="text-left text-xs font-semibold text-[var(--accent-blue)]"
          >
            Voltar para leitura
          </button>
        ) : null}

        {mobileMode === 'read' ? (
          <MobileScriptReader
            content={draft.script || ''}
            title={draft.title?.trim() || 'Roteiro'}
            onEdit={() => setMobileMode('edit')}
          />
        ) : (
          <MobileScriptEditor
            content={draft.script || ''}
            onChange={html => onChange({script: html})}
            placeholder="Abra o seu coracao e escreva o roteiro..."
            documentTitle={draft.title?.trim() || 'Novo roteiro'}
            autoFocus={autoFocusScript || mobileMode === 'edit'}
          />
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <ContentOperationalPanel
        draft={draft}
        series={series}
        pilares={pilares}
        onChange={onChange}
        onStatusChange={onStatusChange}
      />
      <ContentScriptWorkspace
        script={draft.script}
        scriptNotes={draft.scriptNotes}
        documentTitle={draft.title?.trim() || 'Novo roteiro'}
        authorName={authorName}
        referencias={draft.referencias}
        onScriptChange={html => onChange({script: html})}
        onReferenciasChange={value => onChange({referencias: value})}
        {...annotationHandlers}
      />
    </div>
  );
}
