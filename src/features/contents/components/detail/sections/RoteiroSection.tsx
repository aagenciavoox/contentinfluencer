import {MobileScriptEditor} from '../../../../../mobile/components/MobileScriptEditor';
import {AppButton} from '../../../../../components/ui/AppButton';
import {Skeleton} from '../../../../../components/ui/Skeleton';
import {Text} from '../../../../../components/ui/Text';
import type {Content, ContentPlataforma, Pilar, Serie} from '../../../../../lib/database';
import {CONTENT_STATUS} from '../../../lib/contentPipeline';
import {ContentOperationalPanel} from '../ContentOperationalPanel';
import {ContentScriptWorkspace} from '../ContentScriptWorkspace';
import {PlatformCopyEditor} from '../PlatformCopyEditor';
import {
  ScriptBlockToolbar,
  appendScriptBlock,
  type ScriptBlockLabel,
} from '../ScriptBlockToolbar';

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
  bodyLoading?: boolean;
  bodyError?: string | null;
  onRetryBody?: () => void;
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
  bodyLoading = false,
  bodyError = null,
  onRetryBody,
}: RoteiroSectionProps) {
  const isPosted = draft.status === CONTENT_STATUS.POSTADO;

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

  const handleInsertBlock = (label: ScriptBlockLabel) => {
    onChange({script: appendScriptBlock(draft.script, label)});
  };

  const handleApplyTemplate = (html: string) => {
    const trimmed = draft.script?.trim() ?? '';
    onChange({script: trimmed ? `${trimmed}${html}` : html});
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
      bodyLoading={bodyLoading}
      bodyError={bodyError}
      onRetryBody={onRetryBody}
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
      <div className="grid-editor">
        <div className="flex min-w-0 flex-col gap-3">
          {scriptWorkspace}
          {captionEditor}
        </div>
        <div className="sticky top-4 min-w-0">
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

  if (mobileComposer) {
    if (bodyLoading) {
      return (
        <div className="stack-sm pt-4" aria-busy="true" aria-label="Carregando roteiro">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="mt-4 h-40 w-full" />
        </div>
      );
    }

    if (bodyError) {
      return (
        <div className="stack-md pt-8 text-center">
          <Text variant="sectionTitle">Não foi possível carregar o roteiro</Text>
          <Text variant="meta">{bodyError}</Text>
          {onRetryBody ? (
            <AppButton type="button" variant="secondary" size="sm" onClick={onRetryBody}>
              Tentar novamente
            </AppButton>
          ) : null}
        </div>
      );
    }

    return (
      <div className="stack-sm">
        <input
          value={draft.title === 'Novo roteiro' ? '' : draft.title}
          onChange={event => onChange({title: event.target.value})}
          className="t-page-title w-full border-0 bg-transparent py-1 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
          placeholder="Título"
          aria-label="Título do roteiro"
        />
        <MobileScriptEditor
          content={draft.script || ''}
          onChange={html => onChange({script: html})}
          placeholder="Escreva o roteiro..."
          documentTitle={draft.title?.trim() || 'Novo roteiro'}
          autoFocus={autoFocusScript}
          saveState={saveState}
          toolbarStart={
            <ScriptBlockToolbar
              menuPlacement="top"
              onInsertBlock={handleInsertBlock}
              onApplyTemplate={handleApplyTemplate}
            />
          }
        />
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
