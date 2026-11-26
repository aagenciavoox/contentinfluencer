import {useCallback, useEffect, useRef, useState, type ReactNode} from 'react';
import type {Editor} from '@tiptap/react';
import {AlignLeft, Columns3, PenLine, Pencil, SlidersHorizontal} from 'lucide-react';
import {MobileScriptEditor} from '../../../../../mobile/components/MobileScriptEditor';
import type {CommentPatch} from '../../../../../components/editors/commentModel';
import {AppButton} from '../../../../../components/ui/AppButton';
import {Skeleton} from '../../../../../components/ui/Skeleton';
import {Text} from '../../../../../components/ui/Text';
import {SegmentTabs} from '../../../../../components/ui/SegmentTabs';
import {SelectField} from '../../../../../components/ui/SelectField';
import {useAppContext} from '../../../../../context/AppContext';
import type {CarouselSlide, Content, ContentPlataforma, Pilar, Serie, WritingMode} from '../../../../../lib/database';
import {cn, htmlToReadableText} from '../../../../../lib/utils';
import {shouldOpenDraftByDefault} from '../../../../settings/lib/writingWorkspace';
import {WRITING_MODE_LABELS, WRITING_MODES, normalizeWritingMode, podeTrocarModoDeEscrita, writingModeChange} from '../../../lib/carouselSlides';
import {blocosDesdeRoteiro, blocosParaHtml, htmlParaBlocos, type YoutubeBloco} from '../../../lib/youtubeBlocos';
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
import {YoutubeColunasEditor} from '../YoutubeColunasEditor';
import {YoutubeScriptHeader} from '../YoutubeScriptHeader';

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
  /** Proposta do vídeo (modo YouTube). Ausente sem a migração ou antes do corpo carregar. */
  proposta?: string | null;
  status: Content['status'];
  recordingDate: string | null;
  recordingTime?: string | null;
  publishDate: string | null;
  publishTime: string | null;
  postedAt: string | null;
  plataformas: ContentPlataforma[];
  legendaBase: string | null;
  /** Título do vídeo longo. Ausente enquanto o corpo não carregou. */
  youtubeTitulo?: string | null;
  /** Descrição do vídeo longo. Shorts continuam na legenda. */
  youtubeDescricao?: string | null;
  /** Blocos da visão em colunas. `null` ou ausente = o roteiro ainda é só texto corrido. */
  youtubeBlocos?: YoutubeBloco[] | null;
  temaIds: string[];
  tags: string[];
  temporadaId?: string | null;
  origemConteudoId?: string | null;
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
  onSave?: () => void;
  hasUnsavedChanges?: boolean;
  bodyLoading?: boolean;
  bodyError?: string | null;
  onRetryBody?: () => void;
  writingWorkspace?: boolean;
  contentId?: string;
  /** Falso enquanto o banco não tem as colunas do carrossel (migration pendente). */
  carouselAvailable?: boolean;
  /** Falso quando o banco ainda recusa o modo YouTube (migração pendente). */
  youtubeAvailable?: boolean;
  /** Botão de avançar na linha de controles (Escrita/Gestão no computador). */
  primaryAction?: ContentPrimaryAction;
  onPrimaryAction?: (actionId?: ContentPrimaryActionId) => void;
  primaryBusy?: boolean;
  /** Abre o rascunho de apoio no sheet do cabeçalho (celular). */
  onOpenDraft?: () => void;
  /** Na Gestão, ao ir para Produção, oferece um bloco de gravação. */
  onAddToBlock?: () => void;
  /** Peça de texto do clube: só a escrita, sem a Gestão feita para vídeo. */
  pecaDeTexto?: boolean;
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
  youtubeAvailable = true,
  title,
  onTitleChange,
  primaryAction,
  onPrimaryAction,
  primaryBusy = false,
  onOpenDraft,
  onAddToBlock,
  pecaDeTexto = false,
}: RoteiroSectionProps) {
  const writingAreaRef = useRef<HTMLDivElement>(null);
  const insertIntoScriptRef = useRef<((text: string) => void) | null>(null);
  const notesUserOverrideRef = useRef(false);
  const {state} = useAppContext();
  const openDraftByDefault = shouldOpenDraftByDefault(state.preferences);
  const isPosted = draft.status === CONTENT_STATUS.POSTADO;
  const writingMode = normalizeWritingMode(draft.writingMode);
  const isCarousel = writingMode === 'carrossel';
  const roteiroNoBloco = Boolean(
    contentId && state.recordingBlocks.some(block => block.contents.some(item => item.contentId === contentId)),
  );
  const isYoutube = writingMode === 'youtube';
  const [workspacePaneChoice, setWorkspacePaneChoice] = useState<{
    contentId: string;
    pane: 'write' | 'manage';
  } | null>(null);
  const [notesChoice, setNotesChoice] = useState<{contentId: string; open: boolean} | null>(null);
  const [structureChoice, setStructureChoice] = useState<{contentId: string; open: boolean} | null>(null);
  const [visaoChoice, setVisaoChoice] = useState<{contentId: string; visao: 'texto' | 'colunas'} | null>(null);
  const [draftEditor, setDraftEditor] = useState<Editor | null>(null);
  const [focusedPane, setFocusedPane] = useState<'script' | 'draft'>('script');
  const [draftScrollTop, setDraftScrollTop] = useState(0);
  const [draftClosedThisSession, setDraftClosedThisSession] = useState(false);
  const [draftSessionHintDismissed, setDraftSessionHintDismissed] = useState(false);
  const [mobileSubTab, setMobileSubTab] = useState<'roteiro' | 'legenda'>('roteiro');
  const workspacePane = workspacePaneChoice?.contentId === contentId
    ? workspacePaneChoice.pane
    : 'write';
  const visaoYoutube = visaoChoice?.contentId === (contentId ?? '') ? visaoChoice.visao : 'texto';
  const handleWorkspacePrimary = (actionId?: ContentPrimaryActionId) => {
    const id = actionId ?? primaryAction?.id;
    onPrimaryAction?.(actionId);
    if (workspacePane === 'manage' && id === 'advance_to_recording' && !isCarousel && !roteiroNoBloco) {
      onAddToBlock?.();
    }
  };
  const notesOpen = notesChoice?.contentId === contentId
    ? notesChoice.open
    : false;
  // Estrutura começa aberta no YouTube; fechar vale só para este roteiro.
  const structureOpen = structureChoice?.contentId === contentId ? structureChoice.open : true;
  const setStructureOpen = (open: boolean) => setStructureChoice({contentId, open});
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

  // Texto/YouTube -> Carrossel: o texto vira a Tela 1 (ou volta às telas já salvas).
  // Os outros sentidos só trocam o modo; nada é apagado.
  const handleWritingModeChange = (mode: WritingMode) => {
    if (mode === writingMode) return;
    onChange(writingModeChange(mode, draft));
  };

  const writingModeSelect = podeTrocarModoDeEscrita(writingMode) ? (
    <WritingModeSelect
      value={writingMode}
      disabled={bodyLoading || Boolean(bodyError)}
      carouselAvailable={carouselAvailable}
      youtubeAvailable={youtubeAvailable}
      onChange={handleWritingModeChange}
    />
  ) : null;

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

  const notesButton = writingWorkspace && workspacePane === 'write' ? (
    <PaneToggleButton
      label="Rascunho"
      open={notesOpen}
      onToggle={() => setNotesOpen(!notesOpen)}
      title={notesOpen ? 'Fechar rascunho (Ctrl+Shift+N)' : 'Abrir rascunho (Ctrl+Shift+N)'}
    />
  ) : null;

  const structureButton = isYoutube && layout === 'workspace' && !mobileComposer && workspacePane === 'write' ? (
    <PaneToggleButton
      label="Estrutura"
      open={structureOpen}
      onToggle={() => setStructureOpen(!structureOpen)}
      title={structureOpen ? 'Fechar estrutura' : 'Abrir estrutura'}
    />
  ) : null;

  const scriptWorkspace = (fullscreenAside?: ReactNode) => (
    <ContentScriptWorkspace
      script={draft.script}
      scriptNotes={draft.scriptNotes}
      documentTitle={draft.title?.trim() || 'Novo roteiro'}
      authorName={authorName}
      referencias={draft.referencias}
      onScriptChange={html => {
        if (isYoutube && draft.youtubeBlocos) {
          onChange({script: html, youtubeBlocos: htmlParaBlocos(html, draft.youtubeBlocos)});
          return;
        }
        onChange({script: html});
      }}
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
      toolbarEnd={structureButton || notesButton ? <>{structureButton}{notesButton}</> : undefined}
      youtube={isYoutube}
      structurePanelOpen={structureOpen}
      onStructurePanelChange={setStructureOpen}
      {...annotationHandlers}
    />
  );

  const carouselEditor = (
    <CarouselSlidesEditor
      slides={draft.carouselSlides ?? []}
      onChange={carouselSlides => {
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

  const guardarBlocos = (blocos: YoutubeBloco[]) => {
    onChange({youtubeBlocos: blocos, script: blocosParaHtml(blocos)});
  };

  const escolherVisao = (proxima: 'texto' | 'colunas') => {
    if (proxima === 'colunas' && draft.youtubeBlocos == null) {
      guardarBlocos(blocosDesdeRoteiro(draft.script, draft.youtubeBlocos));
    }
    setVisaoChoice({contentId: contentId ?? '', visao: proxima});
  };

  const seletorVisaoYoutube = isYoutube ? (
    <SegmentTabs<'texto' | 'colunas'>
      ariaLabel="Visão do roteiro"
      activateOnPointerDown
      value={visaoYoutube}
      onChange={escolherVisao}
      options={[
        {id: 'texto', label: 'Texto', icon: <AlignLeft className="h-3.5 w-3.5" />},
        {id: 'colunas', label: 'Colunas', icon: <Columns3 className="h-3.5 w-3.5" />},
      ]}
    />
  ) : null;

  /** No YouTube longo do computador, Texto e Colunas editam os mesmos blocos. */
  const areaDeEscrita = (fullscreenAside?: ReactNode, incluirSeletorVisao = true) => {
    if (!isYoutube) return writingArea(fullscreenAside);
    return (
      <div className="stack-sm">
        {incluirSeletorVisao ? seletorVisaoYoutube : null}
        {visaoYoutube === 'colunas' ? (
          <YoutubeColunasEditor
            blocos={draft.youtubeBlocos ?? blocosDesdeRoteiro(draft.script)}
            onChange={guardarBlocos}
            documentTitle={draft.title?.trim() || 'Novo roteiro'}
            authorName={authorName}
            saveState={saveState}
          />
        ) : writingArea(fullscreenAside)}
      </div>
    );
  };

  const captionEditor = (
    <PlatformCopyEditor
      plataformas={draft.plataformas}
      pilar={pilar}
      serie={serie}
      // Cada publicação protege o próprio texto depois de ir ao ar; as pendentes seguem editáveis.
      status={draft.status}
      formatoVisual={draft.formatoVisual}
      writingMode={draft.writingMode}
      embedded
      contentId={contentId}
      legendaBase={draft.legendaBase}
      titulo={draft.title}
      onTituloChange={title => onChange({title})}
      youtubeTitulo={draft.youtubeTitulo}
      youtubeDescricao={draft.youtubeDescricao}
      onYoutubeCopyChange={patch => onChange(patch)}
      onChange={plataformas => onChange({plataformas})}
    />
  );

  if (pecaDeTexto && !mobileComposer) {
    if (layout === 'workspace' && writingWorkspace) {
      const titleValue = title ?? draft.title;
      const changeTitle = onTitleChange ?? ((value: string) => onChange({title: value}));
      const focusWritingArea = () => {
        writingAreaRef.current?.querySelector<HTMLElement>('.ProseMirror[contenteditable="true"]')?.focus();
      };
      return (
        <div className="stack-md">
          <div className="min-w-0 stack-sm">
            <label className="group relative block min-w-0">
              <span className="sr-only">Título do texto</span>
              <input
                type="text"
                value={titleValue === 'Novo arquivo' || titleValue === 'Novo roteiro' ? '' : titleValue}
                onChange={event => changeTitle(event.target.value)}
                onKeyDown={event => {
                  if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
                  event.preventDefault();
                  focusWritingArea();
                }}
                placeholder="Sem título"
                aria-label="Título do texto"
                autoComplete="off"
                className={cn(
                  'w-full min-w-0 border-0 bg-transparent py-1 pr-8 t-section-title tracking-tight',
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
          <div ref={writingAreaRef} className="min-h-0 min-w-0">
            {writingArea(
              notesOpen
                ? notesPane('h-full max-h-none min-h-0 flex-1 rounded-none border-0 shadow-none')
                : undefined,
            )}
          </div>
        </div>
      );
    }
    return <div className="min-w-0">{writingArea()}</div>;
  }

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
                  onPrimaryAction={handleWorkspacePrimary}
                  busy={primaryBusy}
                />
              ) : null}
            </div>
          </div>

          {isYoutube ? (
            <YoutubeScriptHeader
              contentId={contentId}
              title={titleValue}
              onTitleChange={changeTitle}
              onTitleEnter={() => {
                if (workspacePane === 'write') focusWritingArea();
              }}
              proposta={draft.proposta ?? ''}
              onPropostaChange={proposta => onChange({proposta})}
              viewSelector={workspacePane === 'write' ? seletorVisaoYoutube : undefined}
              temaChips={<ContentTemaChips temaIds={draft.temaIds} max={6} />}
            />
          ) : (
          /* Título editável sem caixa: tamanho moderado, lápis só no hover/foco. */
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
                  'w-full min-w-0 border-0 bg-transparent py-1 pr-8 t-section-title tracking-tight',
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
          )}

          {workspacePane === 'manage' ? (
            <ContentManageWorkspace
              contentId={contentId}
              draft={draft}
              disabled={isPosted}
              series={series}
              pilares={pilares}
              onChange={onChange}
              onAddToBlock={onAddToBlock}
            />
          ) : (
            <div ref={writingAreaRef} className="min-h-0 min-w-0 stack-sm">
              {showDraftSessionHint ? (
                <div
                  role="status"
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-input)] border border-[var(--border-color)] bg-[var(--bg-hover)] px-3 py-2 t-meta text-[var(--text-secondary)]"
                >
                  <span>Rascunho fechado só nesta edição — a preferência de abrir automaticamente continua ligada.</span>
                  <button
                    type="button"
                    onClick={() => setDraftSessionHintDismissed(true)}
                    className="shrink-0 text-[var(--text-primary)] underline-offset-2 hover:underline"
                  >
                    Entendi
                  </button>
                </div>
              ) : null}
              {areaDeEscrita(
                notesOpen
                  ? notesPane('h-full max-h-none min-h-0 flex-1 rounded-none border-0 shadow-none')
                  : undefined,
                false,
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
          {areaDeEscrita()}
          {captionEditor}
        </div>
      );
    }

    return (
      <div className="grid-editor">
        <div className="flex min-w-0 flex-col gap-3">
          <div>{writingModeSelect}</div>
          {areaDeEscrita()}
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

    const showCaptionSubTab = !pecaDeTexto && Boolean(captionEditor);

    return (
      <div className="stack-sm">
        {showCaptionSubTab ? (
          <SegmentTabs<'roteiro' | 'legenda'>
            ariaLabel="Seção do roteiro"
            fullWidth
            activateOnPointerDown
            value={mobileSubTab}
            onChange={setMobileSubTab}
            options={[
              {id: 'roteiro', label: 'Roteiro'},
              {id: 'legenda', label: 'Legenda'},
            ]}
          />
        ) : null}
        {showCaptionSubTab && mobileSubTab === 'legenda' ? (
          captionEditor
        ) : (
          <>
            <input
              value={draft.title === 'Novo roteiro' ? '' : draft.title}
              onChange={event => onChange({title: event.target.value})}
              // Title 2 (22px): o campo herdava 16px e ficava menor que o texto do roteiro (17px).
              className="t-page-title w-full border-0 bg-transparent py-0.5 !text-[length:var(--font-size-title-2)] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
              placeholder="Título"
              aria-label={pecaDeTexto ? 'Título do texto' : 'Título do roteiro'}
            />
            {onOpenDraft && hasWritingNotesText(draft.writingNotes) && !htmlToReadableText(draft.script) ? (
              <button
                type="button"
                onClick={onOpenDraft}
                className="self-start text-[var(--text-secondary)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]"
              >
                <Text variant="meta" as="span">O texto está no rascunho</Text>
              </button>
            ) : null}
            {isCarousel ? carouselEditor : (
              <MobileScriptEditor
                content={draft.script || ''}
                onChange={html => onChange({script: html})}
                placeholder={pecaDeTexto ? 'Escreva o texto…' : 'Escreva o roteiro…'}
                documentTitle={draft.title?.trim() || (pecaDeTexto ? 'Novo texto' : 'Novo roteiro')}
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
          </>
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
      {areaDeEscrita()}
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

/** "Modo: Texto | YouTube | Carrossel". Antes da migração, o modo aparece indisponível. */
export function WritingModeSelect({
  value,
  disabled,
  carouselAvailable,
  youtubeAvailable,
  onChange,
}: {
  value: WritingMode;
  disabled: boolean;
  carouselAvailable: boolean;
  youtubeAvailable: boolean;
  onChange: (mode: WritingMode) => void;
}) {
  const available: Record<WritingMode, boolean> = {
    texto: true,
    youtube: youtubeAvailable,
    carrossel: carouselAvailable,
  };
  return (
    <SelectField
      ariaLabel="Modo de escrita"
      prefix="Modo:"
      value={value}
      disabled={disabled}
      onChange={next => onChange(normalizeWritingMode(next))}
      options={WRITING_MODES.map(mode => {
        const blocked = !available[mode] && value !== mode;
        return {
          value: mode,
          label: blocked ? `${WRITING_MODE_LABELS[mode]} (indisponível)` : WRITING_MODE_LABELS[mode],
          disabled: blocked,
        };
      })}
    />
  );
}

/** Mostrar/ocultar um painel da escrita; o ponto rosa indica painel aberto. */
function PaneToggleButton({
  label,
  open,
  onToggle,
  title,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={event => event.preventDefault()}
      onClick={onToggle}
      aria-pressed={open}
      title={title}
      className={cn(
        'flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 t-label transition',
        'focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)]',
        open
          ? 'border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)]'
          : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'h-2 w-2 rounded-full',
          open ? 'bg-[var(--brand-accent)]' : 'bg-[var(--text-tertiary)]',
        )}
      />
      <span>{label}</span>
    </button>
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
