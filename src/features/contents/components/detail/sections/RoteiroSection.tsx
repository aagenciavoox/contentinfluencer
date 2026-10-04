import {useState} from 'react';
import {Columns2} from 'lucide-react';
import {MobileScriptEditor} from '../../../../../mobile/components/MobileScriptEditor';
import {MobileSegmentTabs} from '../../../../../mobile/components/MobileSegmentTabs';
import {AppButton} from '../../../../../components/ui/AppButton';
import {Skeleton} from '../../../../../components/ui/Skeleton';
import {Text} from '../../../../../components/ui/Text';
import type {Content, ContentPlataforma, Pilar, Serie} from '../../../../../lib/database';
import {cn, htmlToReadableText} from '../../../../../lib/utils';
import {CONTENT_STATUS} from '../../../lib/contentPipeline';
import {ContentManageWorkspace} from '../ContentManageWorkspace';
import {ContentOperationalPanel} from '../ContentOperationalPanel';
import {ContentScriptWorkspace} from '../ContentScriptWorkspace';
import {PlatformCopyEditor} from '../PlatformCopyEditor';
import {
  ScriptBlockToolbar,
  appendScriptBlock,
  type ScriptBlockLabel,
} from '../ScriptBlockToolbar';
import {WritingNotesPane} from '../WritingNotesPane';

export type ScriptDraft = {
  title: string;
  seriesId: string | null;
  pilarId: string | null;
  bibliotecaItemId: string | null;
  livroIds: string[];
  slotType: Content['slotType'];
  formatoVisual: string | null;
  funcao: Content['funcao'];
  funcaoOrigem: Content['funcaoOrigem'];
  classificacaoCongeladaEm: Content['classificacaoCongeladaEm'];
  contaNaGrade: Content['contaNaGrade'];
  script: string | null;
  scriptNotes: Content['scriptNotes'];
  referencias: string | null;
  notes: string | null;
  writingNotes?: string | null;
  status: Content['status'];
  recordingDate: string | null;
  publishDate: string | null;
  publishTime: string | null;
  postedAt: string | null;
  plataformas: ContentPlataforma[];
  legendaBase: string | null;
};

type MobilePane = 'script' | 'notes' | 'captions';

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
  onSave?: () => void;
  hasUnsavedChanges?: boolean;
  bodyLoading?: boolean;
  bodyError?: string | null;
  onRetryBody?: () => void;
  writingWorkspace?: boolean;
  contentId?: string;
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
  onSave,
  hasUnsavedChanges = false,
  bodyLoading = false,
  bodyError = null,
  onRetryBody,
  writingWorkspace = false,
  contentId = '',
}: RoteiroSectionProps) {
  const isPosted = draft.status === CONTENT_STATUS.POSTADO;
  const [mobilePaneChoice, setMobilePaneChoice] = useState<{
    contentId: string;
    pane: MobilePane;
  } | null>(null);
  const [workspacePaneChoice, setWorkspacePaneChoice] = useState<{
    contentId: string;
    pane: 'write' | 'manage';
  } | null>(null);
  const [notesChoice, setNotesChoice] = useState<{contentId: string; open: boolean} | null>(null);
  const workspacePane = workspacePaneChoice?.contentId === contentId
    ? workspacePaneChoice.pane
    : 'write';
  const notesOpen = notesChoice?.contentId === contentId
    ? notesChoice.open
    : hasWritingNotesText(draft.writingNotes);
  // Until a tab is picked, open on "Notas" when the text lives only in the notes pane.
  const mobilePane: MobilePane = mobilePaneChoice?.contentId === contentId
    ? mobilePaneChoice.pane
    : mobileComposer && hasWritingNotesText(draft.writingNotes) && !htmlToReadableText(draft.script)
      ? 'notes'
      : 'script';
  const selectMobilePane = (pane: MobilePane) => setMobilePaneChoice({contentId, pane});
  // Pin the current tab on the first edit so emptying a field does not switch tabs while typing.
  const keepMobilePane = () => {
    if (mobilePaneChoice?.contentId !== contentId) selectMobilePane(mobilePane);
  };

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

  const splitPanelClass = notesOpen
    ? 'h-[calc(100dvh-14rem)] max-h-[calc(100dvh-14rem)] min-h-[24rem]'
    : 'max-h-[calc(100dvh-14rem)]';

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
      onSave={onSave}
      hasUnsavedChanges={hasUnsavedChanges}
      showReferencias={layout !== 'workspace'}
      bodyLoading={bodyLoading}
      bodyError={bodyError}
      onRetryBody={onRetryBody}
      className={writingWorkspace ? splitPanelClass : undefined}
      headerAction={
        writingWorkspace && workspacePane === 'write' && !notesOpen ? (
          <AppButton
            type="button"
            variant="secondary"
            size="xs"
            leftIcon={<Columns2 className="h-3.5 w-3.5" />}
            onClick={() => setNotesChoice({contentId, open: true})}
          >
            Área de notas
          </AppButton>
        ) : null
      }
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
      contentId={contentId}
      legendaBase={draft.legendaBase}
      onLegendaBaseChange={legendaBase => onChange({legendaBase})}
      titulo={draft.title}
      onTituloChange={title => onChange({title})}
      onChange={plataformas => onChange({plataformas})}
    />
  );

  if (layout === 'workspace' && !mobileComposer) {
    if (writingWorkspace) {
      return (
        <div className="stack-sm">
          <MobileSegmentTabs<'write' | 'manage'>
            rounded="tight"
            tabs={[
              {value: 'write', label: 'Escrita'},
              {value: 'manage', label: 'Gestão'},
            ]}
            value={workspacePane}
            onChange={pane => setWorkspacePaneChoice({contentId, pane})}
          />
          {workspacePane === 'manage' ? (
            <ContentManageWorkspace
              contentId={contentId}
              draft={draft}
              disabled={isPosted}
              series={series}
              pilares={pilares}
              onChange={onChange}
              onSave={onSave}
              saveState={saveState}
            />
          ) : (
            <div className={cn('grid min-h-0 items-stretch gap-3', notesOpen && 'lg:grid-cols-2')}>
              {scriptWorkspace}
              {notesOpen ? (
                <WritingNotesPane
                  value={draft.writingNotes ?? ''}
                  onChange={html => onChange({writingNotes: html})}
                  onClose={() => setNotesChoice({contentId, open: false})}
                  className={splitPanelClass}
                />
              ) : null}
            </div>
          )}
        </div>
      );
    }

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
        <MobileSegmentTabs<MobilePane>
          rounded="tight"
          activateOnPointerDown
          tabs={[
            {value: 'script', label: 'Roteiro'},
            {value: 'notes', label: 'Notas'},
            {value: 'captions', label: 'Legendas'},
          ]}
          value={mobilePane}
          onChange={selectMobilePane}
        />
        {mobilePane === 'captions' ? (
          captionEditor
        ) : mobilePane === 'notes' ? (
          <WritingNotesPane
            value={draft.writingNotes ?? ''}
            onChange={text => {
              keepMobilePane();
              onChange({writingNotes: text});
            }}
            onClose={() => selectMobilePane('script')}
            className="h-[calc(100dvh-19rem)] min-h-[18rem]"
          />
        ) : (
          <MobileScriptEditor
            content={draft.script || ''}
            onChange={html => {
              keepMobilePane();
              onChange({script: html});
            }}
            placeholder="Escreva o roteiro…"
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
            onSave={onSave}
            hasUnsavedChanges={hasUnsavedChanges}
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
        authorName={authorName}
        onChange={onChange}
      />
      {scriptWorkspace}
      {captionEditor}
    </div>
  );
}

function hasWritingNotesText(value: string | null | undefined) {
  const text = (value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim();
  return text.length > 0;
}
