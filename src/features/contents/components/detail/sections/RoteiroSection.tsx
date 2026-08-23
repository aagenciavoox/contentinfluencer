import {useState} from 'react';
import {MobileScriptEditor} from '../../../../../mobile/components/MobileScriptEditor';
import {MobileScriptReader} from '../../../../../mobile/components/MobileScriptReader';
import {htmlToReadableText} from '../../../../../lib/utils';
import type {Content, ContentPlataforma, Pilar, Serie} from '../../../../../lib/database';
import {cn} from '../../../../../lib/utils';
import {CONTENT_STATUS} from '../../../lib/contentPipeline';
import {ContentOperationalPanel} from '../ContentOperationalPanel';
import {ContentScriptWorkspace} from '../ContentScriptWorkspace';
import {PlatformCopyEditor} from '../PlatformCopyEditor';

export type ScriptDraft = {
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
  publishTime: string | null;
  postedAt: string | null;
  plataformas: ContentPlataforma[];
};

interface RoteiroSectionProps {
  draft: ScriptDraft;
  series: Serie[];
  pilares: Pilar[];
  pilar: Pilar | null;
  serie: Serie | null;
  authorName: string;
  onChange: (updates: Partial<ScriptDraft>) => void;
  mobileComposer?: boolean;
  autoFocusScript?: boolean;
  layout?: 'stack' | 'workspace';
  showSidePanel?: boolean;
  title?: string;
  onTitleChange?: (title: string) => void;
  saveState?: 'idle' | 'saving' | 'saved' | 'error';
}

export function RoteiroSection({
  draft,
  series,
  pilares,
  pilar,
  serie,
  authorName,
  onChange,
  mobileComposer = false,
  autoFocusScript = false,
  layout = 'stack',
  showSidePanel = true,
  saveState,
}: RoteiroSectionProps) {
  const hasScript = htmlToReadableText(draft.script).trim().length > 0;
  const isPosted = draft.status === CONTENT_STATUS.POSTADO;
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
            color: 'color-mix(in srgb, var(--warning), transparent 50%)',
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

  const scriptWorkspace = (
    <ContentScriptWorkspace
      script={draft.script}
      scriptNotes={draft.scriptNotes}
      documentTitle={draft.title?.trim() || 'Novo roteiro'}
      authorName={authorName}
      referencias={draft.referencias}
      onScriptChange={html => onChange({script: html})}
      onReferenciasChange={value => onChange({referencias: value})}
      saveState={saveState}
      showReferencias={layout !== 'workspace'}
      {...annotationHandlers}
    />
  );

  const captionEditor = (
    <PlatformCopyEditor
      plataformas={draft.plataformas}
      pilar={pilar}
      serie={serie}
      disabled={isPosted}
      embedded
      onChange={plataformas => onChange({plataformas})}
    />
  );

  if (layout === 'workspace' && !mobileComposer) {
    if (!showSidePanel) {
      return (
        <div className="grid gap-3">
          {scriptWorkspace}
          {captionEditor}
        </div>
      );
    }

    return (
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,30%)]">
        <div className="flex flex-col gap-3">
          {scriptWorkspace}
          {captionEditor}
        </div>
        <div className="sticky top-4">
          <ContentOperationalPanel
            draft={draft}
            series={series}
            pilares={pilares}
            authorName={authorName}
            onChange={onChange}
            showTitle={false}
            density="compact"
            layout="property"
            variant="cards"
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
        <section className="cms-panel p-3">
          <label className="block">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Titulo</span>
            <input
              value={draft.title}
              onChange={event => onChange({title: event.target.value})}
              className={cn(fieldClass, 'mt-1.5 font-semibold')}
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

        {captionEditor}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <ContentOperationalPanel
        draft={draft}
        series={series}
        pilares={pilares}
        authorName={authorName}
        onChange={onChange}
      />
      {scriptWorkspace}
      {captionEditor}
    </div>
  );
}
