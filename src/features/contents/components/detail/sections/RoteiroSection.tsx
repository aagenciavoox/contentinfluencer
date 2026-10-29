import {useCallback, useEffect, useRef, useState, type ReactNode} from 'react';
import type {Editor} from '@tiptap/react';
import {PenLine, Pencil, SlidersHorizontal} from 'lucide-react';
import {MobileScriptEditor} from '../../../../../mobile/components/MobileScriptEditor';
import type {CommentPatch} from '../../../../../components/editors/commentModel';
import {MobileSegmentTabs} from '../../../../../mobile/components/MobileSegmentTabs';
import {AppButton} from '../../../../../components/ui/AppButton';
import {Skeleton} from '../../../../../components/ui/Skeleton';
import {Text} from '../../../../../components/ui/Text';
import {SegmentTabs} from '../../../../../components/ui/SegmentTabs';
import {SelectField} from '../../../../../components/ui/SelectField';
import {useAppContext} from '../../../../../context/AppContext';
import type {CarouselSlide, Content, ContentPlataforma, Pilar, Serie, WritingMode} from '../../../../../lib/database';
import {cn, htmlToReadableText} from '../../../../../lib/utils';
import {shouldOpenDraftByDefault} from '../../../../settings/lib/writingWorkspace';
import {WRITING_MODE_LABELS, normalizeWritingMode, slidesForCarouselMode} from '../../../lib/carouselSlides';
import {
  CONTENT_STATUS,
  getStatusOptions,
  normalizeContentStatus,
  type ContentPrimaryAction,
  type ContentPrimaryActionId,
} from '../../../lib/contentPipeline';
import {ContentPrimaryActionButton} from '../ContentDetailHeader';
import {CarouselSlidesEditor} from '../CarouselSlidesEditor';
import {ContentTemaChips} from '../../ContentTemaChips';
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
  contaNaGradeOrigem?: Content['contaNaGradeOrigem'];
  pilarOrigem?: Content['pilarOrigem'];
  scriptOrigem?: Content['scriptOrigem'];
  redeReferenciaCongeladaId?: Content['redeReferenciaCongeladaId'];
  script: string | null;
  scriptNotes: Content['scriptNotes'];
  referencias: string | null;
  notes: string | null;
  writingNotes?: string | null;
  /** Ausente vale como texto. */
  writingMode?: WritingMode;
  carouselSlides?: CarouselSlide[];
  status: Content['status'];
  recordingDate: string | null;
  recordingTime?: string | null;
  publishDate: string | null;
  publishTime: string | null;
  postedAt: string | null;
  plataformas: ContentPlataforma[];
  legendaBase: string | null;
  temaIds: string[];
  tags: string[];
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
  /** Falso enquanto o banco não tem as colunas do carrossel (migration pendente). */
  carouselAvailable?: boolean;
  /** Botão de avançar na linha de controles (Escrita/Gestão no computador). */
  primaryAction?: ContentPrimaryAction;
  onPrimaryAction?: (actionId?: ContentPrimaryActionId) => void;
  primaryBusy?: boolean;
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
  carouselAvailable = true,
  title,
  onTitleChange,
  primaryAction,
  onPrimaryAction,
  primaryBusy = false,
}: RoteiroSectionProps) {
  const writingAreaRef = useRef<HTMLDivElement>(null);
  const insertIntoScriptRef = useRef<((text: string) => void) | null>(null);
  const notesUserOverrideRef = useRef(false);
  const {state} = useAppContext();
  const openDraftByDefault = shouldOpenDraftByDefault(state.preferences);
  const isPosted = draft.status === CONTENT_STATUS.POSTADO;
  const writingMode = normalizeWritingMode(draft.writingMode);
  const isCarousel = writingMode === 'carrossel';
  const [mobilePaneChoice, setMobilePaneChoice] = useState<{
    contentId: string;
    pane: MobilePane;
  } | null>(null);
  const [workspacePaneChoice, setWorkspacePaneChoice] = useState<{
    contentId: string;
    pane: 'write' | 'manage';
  } | null>(null);
  const [notesChoice, setNotesChoice] = useState<{contentId: string; open: boolean} | null>(null);
  const [draftEditor, setDraftEditor] = useState<Editor | null>(null);
  const [focusedPane, setFocusedPane] = useState<'script' | 'draft'>('script');
  const [draftScrollTop, setDraftScrollTop] = useState(0);
  const [draftClosedThisSession, setDraftClosedThisSession] = useState(false);
  const [draftSessionHintDismissed, setDraftSessionHintDismissed] = useState(false);
  const workspacePane = workspacePaneChoice?.contentId === contentId
    ? workspacePaneChoice.pane
    : 'write';
  const notesOpen = notesChoice?.contentId === contentId
    ? notesChoice.open
    : false;
  const setNotesOpen = useCallback((open: boolean) => {
    notesUserOverrideRef.current = true;
    setNotesChoice({contentId, open});
    if (!open) {
      setFocusedPane('script');
      if (openDraftByDefault) setDraftClosedThisSession(true);
    } else {
      setDraftClosedThisSession(false);
    }
  }, [contentId, openDraftByDefault]);

  // Troca de roteiro: a preferência volta a valer; ação nesta edição reinicia.
  useEffect(() => {
    notesUserOverrideRef.current = false;
    setDraftClosedThisSession(false);
    setDraftSessionHintDismissed(false);
  }, [contentId]);

  // Abre o rascunho pela config, sem desfazer um fechar/abrir recente nesta edição.
  useEffect(() => {
    if (!writingWorkspace) return;
    if (notesUserOverrideRef.current) return;
    setNotesChoice({contentId, open: openDraftByDefault});
  }, [contentId, writingWorkspace, openDraftByDefault]);
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
    onAddAnnotation: (text: string, selection: {from: number; to: number}, comment: string, id?: string) =>
      onChange({
        scriptNotes: [
          ...(draft.scriptNotes || []),
          {
            id: id ?? Math.random().toString(36).slice(2, 11),
            authorName,
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
    onPatchAnnotation: (id: string, patch: CommentPatch) =>
      onChange({
        scriptNotes: (draft.scriptNotes || []).map(note =>
          note.id === id ? {...note, ...patch, color: patch.color ?? note.color, comment: patch.comment ?? note.comment} : note
        ),
      }),
  };

  // Texto -> Carrossel: o texto vira a Tela 1 (ou volta às telas já salvas).
  // Carrossel -> Texto: as telas ficam guardadas; nada é apagado nos dois sentidos.
  const handleWritingModeChange = (mode: WritingMode) => {
    if (mode === writingMode) return;
    if (mode === 'carrossel') {
      onChange({writingMode: 'carrossel', carouselSlides: slidesForCarouselMode(draft.script, draft.carouselSlides)});
      return;
    }
    onChange({writingMode: 'texto'});
  };

  const writingModeSelect = (
    <WritingModeSelect
      value={writingMode}
      disabled={bodyLoading || Boolean(bodyError)}
      carouselAvailable={carouselAvailable}
      onChange={handleWritingModeChange}
    />
  );

  const handleInsertBlock = (label: ScriptBlockLabel) => {
    onChange({script: appendScriptBlock(draft.script, label)});
  };

  const handleApplyTemplate = (html: string) => {
    const trimmed = draft.script?.trim() ?? '';
    onChange({script: trimmed ? `${trimmed}${html}` : html});
  };

  const notesPane = (className?: string) => (
    <WritingNotesPane
      value={draft.writingNotes ?? ''}
      onChange={html => onChange({writingNotes: html})}
      onClose={() => setNotesOpen(false)}
      emphasis="secondary"
      className={className}
      onInsertIntoScript={text => insertIntoScriptRef.current?.(text)}
      onEditorReady={setDraftEditor}
      onFocusChange={focused => {
        if (focused) setFocusedPane('draft');
      }}
      scrollTop={draftScrollTop}
      onScrollTopChange={setDraftScrollTop}
      documentId={contentId}
    />
  );

  const showDraftSessionHint = writingWorkspace
    && workspacePane === 'write'
    && openDraftByDefault
    && draftClosedThisSession
    && !notesOpen
    && !draftSessionHintDismissed;

  // Botão simples mostrar/ocultar; ponto indica painel aberto.
  const notesButton = writingWorkspace && workspacePane === 'write' ? (
    <button
      type="button"
      onMouseDown={event => event.preventDefault()}
      onClick={() => setNotesOpen(!notesOpen)}
      aria-pressed={notesOpen}
      title={notesOpen ? 'Fechar rascunho (Ctrl+Shift+N)' : 'Abrir rascunho (Ctrl+Shift+N)'}
      className={cn(
        'flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition',
        'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
        notesOpen
          ? 'border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
          : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'h-2 w-2 rounded-full',
          notesOpen ? 'bg-[var(--brand-accent)]' : 'bg-[var(--text-tertiary)]',
        )}
      />
      <span>Rascunho</span>
    </button>
  ) : null;

  const scriptWorkspace = (fullscreenAside?: ReactNode) => (
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
      writingToolbar={writingWorkspace}
      bodyLoading={bodyLoading}
      bodyError={bodyError}
      onRetryBody={onRetryBody}
      className={writingWorkspace ? 'min-w-0' : undefined}
      fullscreenAside={fullscreenAside}
      notesPanelOpen={notesOpen}
      onNotesPanelChange={setNotesOpen}
      draftEditor={draftEditor}
      focusedPane={focusedPane}
      onFocusedPaneChange={setFocusedPane}
      onRegisterInsertHandler={handler => {
        insertIntoScriptRef.current = handler;
      }}
      toolbarEnd={notesButton}
      {...annotationHandlers}
    />
  );

  const carouselEditor = (
    <CarouselSlidesEditor
      slides={draft.carouselSlides ?? []}
      onChange={carouselSlides => {
        if (mobileComposer) keepMobilePane();
        onChange({carouselSlides});
      }}
      documentTitle={draft.title?.trim() || 'Novo roteiro'}
      authorName={authorName}
      saveState={saveState}
      bodyLoading={bodyLoading}
      bodyError={bodyError}
      onRetryBody={onRetryBody}
      toolbarEnd={notesButton}
      notesPanelOpen={notesOpen}
      className="min-w-0"
    />
  );

  /** Área de escrita do modo atual: roteiro em texto ou telas do carrossel. */
  const writingArea = (fullscreenAside?: ReactNode) => (isCarousel ? carouselEditor : scriptWorkspace(fullscreenAside));

  const captionEditor = (
    <PlatformCopyEditor
      plataformas={draft.plataformas}
      pilar={pilar}
      serie={serie}
      // Cada publicação protege o próprio texto depois de ir ao ar; as pendentes seguem editáveis.
      status={draft.status}
      embedded
      contentId={contentId}
      legendaBase={draft.legendaBase}
      titulo={draft.title}
      onTituloChange={title => onChange({title})}
      onChange={plataformas => onChange({plataformas})}
    />
  );

  if (layout === 'workspace' && !mobileComposer) {
    if (writingWorkspace) {
      const titleValue = title ?? draft.title;
      const changeTitle = onTitleChange ?? ((value: string) => onChange({title: value}));
      // Enter no título leva o cursor para o texto (ou para a primeira tela do carrossel).
      const focusWritingArea = () => {
        writingAreaRef.current?.querySelector<HTMLElement>('.ProseMirror[contenteditable="true"]')?.focus();
      };
      return (
        <div className="stack-md">
          {/* Escrita/Gestão à esquerda; etapa e avançar à direita. Modo de escrita fica no menu ⋯. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <SegmentTabs<'write' | 'manage'>
              ariaLabel="Área do conteúdo"
              options={[
                {id: 'write', label: 'Escrita', icon: <PenLine className="h-4 w-4" />},
                {id: 'manage', label: 'Gestão', icon: <SlidersHorizontal className="h-4 w-4" />},
              ]}
              value={workspacePane}
              onChange={pane => setWorkspacePaneChoice({contentId, pane})}
            />
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              {workspacePane === 'write' ? (
                <EtapaSelect
                  status={draft.status}
                  disabled={isPosted}
                  onChange={status => onChange({status})}
                />
              ) : null}
              {primaryAction && onPrimaryAction ? (
                <ContentPrimaryActionButton
                  primaryAction={primaryAction}
                  onPrimaryAction={onPrimaryAction}
                  busy={primaryBusy}
                />
              ) : null}
            </div>
          </div>

          {/* Título editável sem caixa: tamanho moderado, lápis só no hover/foco. */}
          <div className="min-w-0 stack-sm">
            <label className="group relative block min-w-0">
              <span className="sr-only">Título do roteiro</span>
              <input
                type="text"
                value={titleValue === 'Novo roteiro' ? '' : titleValue}
                onChange={event => changeTitle(event.target.value)}
                onKeyDown={event => {
                  if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
                  event.preventDefault();
                  if (workspacePane === 'write') focusWritingArea();
                  else event.currentTarget.blur();
                }}
                placeholder="Sem título"
                aria-label="Título do roteiro"
                autoComplete="off"
                className={cn(
                  'w-full min-w-0 border-0 bg-transparent py-1 pr-8 text-xl font-semibold tracking-tight',
                  'text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]',
                  'rounded-none shadow-none focus:border-0 focus:shadow-none',
                )}
              />
              <Pencil
                className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)] opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
                aria-hidden
              />
            </label>
            <ContentTemaChips temaIds={draft.temaIds} max={6} />
          </div>

          {workspacePane === 'manage' ? (
            <ContentManageWorkspace
              contentId={contentId}
              draft={draft}
              disabled={isPosted}
              series={series}
              pilares={pilares}
              onChange={onChange}
            />
          ) : (
            <div ref={writingAreaRef} className="min-h-0 min-w-0 stack-sm">
              {showDraftSessionHint ? (
                <div
                  role="status"
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-3 py-2 text-xs text-[var(--text-secondary)]"
                >
                  <span>Rascunho fechado só nesta edição — a preferência de abrir automaticamente continua ligada.</span>
                  <button
                    type="button"
                    onClick={() => setDraftSessionHintDismissed(true)}
                    className="shrink-0 font-medium text-[var(--text-primary)] underline-offset-2 hover:underline"
                  >
                    Entendi
                  </button>
                </div>
              ) : null}
              {writingArea(
                notesOpen
                  ? notesPane('h-full max-h-none min-h-0 flex-1 rounded-none border-0 shadow-none')
                  : undefined,
              )}
            </div>
          )}
        </div>
      );
    }

    if (!showSidePanel) {
      return (
        <div className="grid gap-3">
          <div>{writingModeSelect}</div>
          {writingArea()}
          {captionEditor}
        </div>
      );
    }

    return (
      <div className="grid-editor">
        <div className="flex min-w-0 flex-col gap-3">
          <div>{writingModeSelect}</div>
          {writingArea()}
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
          // Title 2 (22px): o campo herdava 16px e ficava menor que o texto do roteiro (17px).
          className="t-page-title w-full border-0 bg-transparent py-1 !text-[length:var(--font-size-title-2)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
          placeholder="Título"
          aria-label="Título do roteiro"
        />
        <MobileSegmentTabs<MobilePane>
          rounded="tight"
          activateOnPointerDown
          tabs={[
            {value: 'script', label: 'Roteiro'},
            {value: 'notes', label: 'Rascunho'},
            {value: 'captions', label: 'Legendas'},
          ]}
          value={mobilePane}
          onChange={selectMobilePane}
        />
        {mobilePane === 'script' ? <div>{writingModeSelect}</div> : null}
        {mobilePane === 'captions' ? (
          captionEditor
        ) : mobilePane === 'script' && isCarousel ? (
          carouselEditor
        ) : mobilePane === 'notes' ? (
          <WritingNotesPane
            value={draft.writingNotes ?? ''}
            onChange={text => {
              keepMobilePane();
              onChange({writingNotes: text});
            }}
            onClose={() => selectMobilePane('script')}
            onInsertIntoScript={text => {
              keepMobilePane();
              const current = draft.script?.trim() ? draft.script : '';
              const block = text
                .split(/\n{2,}/)
                .map(part => `<p>${part.replace(/\n/g, '<br>')}</p>`)
                .join('');
              onChange({script: current ? `${current}${block}` : block});
              selectMobilePane('script');
            }}
            documentId={contentId}
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
            authorName={authorName}
            annotations={draft.scriptNotes || []}
            {...annotationHandlers}
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
      <div>{writingModeSelect}</div>
      {writingArea()}
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

/** "Modo: Texto | Carrossel". Antes da migration, Carrossel aparece indisponível. */
function WritingModeSelect({
  value,
  disabled,
  carouselAvailable,
  onChange,
}: {
  value: WritingMode;
  disabled: boolean;
  carouselAvailable: boolean;
  onChange: (mode: WritingMode) => void;
}) {
  const carouselBlocked = !carouselAvailable && value !== 'carrossel';
  return (
    <SelectField
      ariaLabel="Modo de escrita"
      prefix="Modo:"
      value={value}
      disabled={disabled}
      onChange={next => onChange(normalizeWritingMode(next))}
      options={[
        {value: 'texto', label: WRITING_MODE_LABELS.texto},
        {
          value: 'carrossel',
          label: carouselBlocked ? `${WRITING_MODE_LABELS.carrossel} (indisponível)` : WRITING_MODE_LABELS.carrossel,
          disabled: carouselBlocked,
        },
      ]}
    />
  );
}

/** "Etapa: Roteiro" como seletor. Só as etapas vizinhas podem ser escolhidas, como em Gestão. */
function EtapaSelect({
  status,
  disabled,
  onChange,
}: {
  status: string;
  disabled: boolean;
  onChange: (status: string) => void;
}) {
  const atual = normalizeContentStatus(status);
  const etapas = getStatusOptions(status);
  return (
    <SelectField
      ariaLabel="Etapa"
      prefix="Etapa:"
      value={atual}
      disabled={disabled}
      onChange={onChange}
      options={etapas.map(etapa => ({
        value: etapa.status,
        label: etapa.disponivel || etapa.atual ? etapa.status : `${etapa.status} (indisponível)`,
        disabled: !etapa.disponivel,
      }))}
    />
  );
}
