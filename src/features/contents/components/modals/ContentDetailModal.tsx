import {useEffect, useMemo, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Copy,
  FileText,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {ConfirmModal} from '../../../../components/feedback/modals/ConfirmModal';
import {RichTextEditor} from '../../../../components/editors/RichTextEditor';
import {FixedPanelModal} from '../../../../components/overlays/FixedPanelModal';
import {useAppContext} from '../../../../context/AppContext';
import {useAuth} from '../../../../context/AuthContext';
import {useIsMobile} from '../../../../hooks/useIsMobile';
import {Content, ContentPlataforma} from '../../../../lib/database';
import {cn} from '../../../../lib/utils';
import {DEFAULT_PLATFORMS, STATUS_STAGES, VISUAL_FORMATS} from '../../../../constants';
import {generateUUID} from '../../../../utils/uuid';

interface ContentDetailModalProps {
  content: Content;
  onClose: () => void;
  initialLivroOrigemId?: string;
  isNewContent?: boolean;
  initialTab?: ContentTab;
  visibleTabs?: ContentTab[];
  compactMobileComposer?: boolean;
}

type ContentTab = 'roteiro' | 'producao';

type ScriptDraft = Pick<
  Content,
  | 'title'
  | 'status'
  | 'seriesId'
  | 'pilarId'
  | 'slotType'
  | 'formatoVisual'
  | 'bibliotecaItemId'
  | 'script'
  | 'scriptNotes'
  | 'referencias'
>;

type ProductionDraft = Pick<
  Content,
  | 'plataformas'
  | 'recordingDate'
  | 'recordingDateEnabled'
  | 'publishDate'
  | 'publishDateEnabled'
  | 'tags'
  | 'lookId'
  | 'cenarioId'
>;

interface ContentDraftSnapshot {
  title: string;
  status: Content['status'];
  seriesId: Content['seriesId'];
  pilarId: Content['pilarId'];
  slotType: Content['slotType'];
  formatoVisual: Content['formatoVisual'];
  bibliotecaItemId: Content['bibliotecaItemId'];
  script: Content['script'];
  scriptNotes: Content['scriptNotes'];
  referencias: Content['referencias'];
  plataformas: Content['plataformas'];
  recordingDate: Content['recordingDate'];
  recordingDateEnabled: boolean;
  publishDate: Content['publishDate'];
  publishDateEnabled: boolean;
  tags: Content['tags'];
  lookId: Content['lookId'];
  cenarioId: Content['cenarioId'];
}

const CHAR_LIMITS: Record<string, number> = {
  Instagram: 2200,
  TikTok: 2200,
  YouTube: 5000,
};

type DateInputWithPicker = HTMLInputElement & {
  showPicker?: () => void;
};

function buildDraftSnapshot(
  scriptDraft: ScriptDraft,
  productionDraft: ProductionDraft
): ContentDraftSnapshot {
  return {
    title: scriptDraft.title,
    status: scriptDraft.status,
    seriesId: scriptDraft.seriesId,
    pilarId: scriptDraft.pilarId,
    slotType: scriptDraft.slotType,
    formatoVisual: scriptDraft.formatoVisual,
    bibliotecaItemId: scriptDraft.bibliotecaItemId,
    script: scriptDraft.script,
    scriptNotes: scriptDraft.scriptNotes || [],
    referencias: scriptDraft.referencias,
    plataformas: productionDraft.plataformas,
    recordingDate: productionDraft.recordingDate,
    recordingDateEnabled: productionDraft.recordingDateEnabled ?? false,
    publishDate: productionDraft.publishDate,
    publishDateEnabled: productionDraft.publishDateEnabled ?? false,
    tags: productionDraft.tags || [],
    lookId: productionDraft.lookId,
    cenarioId: productionDraft.cenarioId,
  };
}

export function ContentDetailModal({
  content,
  onClose,
  initialLivroOrigemId,
  isNewContent = false,
  initialTab = 'roteiro',
  visibleTabs = ['roteiro', 'producao'],
  compactMobileComposer = false,
}: ContentDetailModalProps) {
  const {state, dispatch, createContent, updateContent} = useAppContext();
  const {user} = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const isDesktopNewContent = isNewContent && !isMobile;
  const isCompactMobileComposer = compactMobileComposer && isMobile && isNewContent;
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';

  const baseContent = useMemo(() => {
    const current = state.contents.find(item => item.id === content.id) || content;
    if (initialLivroOrigemId && !current.bibliotecaItemId) {
      return {...current, bibliotecaItemId: initialLivroOrigemId};
    }
    return current;
  }, [content, initialLivroOrigemId, state.contents]);

  const availableTabs = visibleTabs.length > 0 ? visibleTabs : (['roteiro', 'producao'] as ContentTab[]);
  const availableTabsKey = availableTabs.join('|');
  const [activeTab, setActiveTab] = useState<ContentTab>(
    availableTabs.includes(initialTab) ? initialTab : availableTabs[0]
  );
  const [confirm, setConfirm] = useState<{message: string; onConfirm: () => void} | null>(null);
  const [refsOpen, setRefsOpen] = useState(!!baseContent.referencias);
  const [isCreatingSeries, setIsCreatingSeries] = useState(false);
  const [newSeriesName, setNewSeriesName] = useState('');
  const [isCreatingPillar, setIsCreatingPillar] = useState(false);
  const [newPillarName, setNewPillarName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedLegendaPlatform, setCopiedLegendaPlatform] = useState<string | null>(null);

  const [scriptDraft, setScriptDraft] = useState<ScriptDraft>(() => ({
    title: baseContent.title,
    status: baseContent.status,
    seriesId: baseContent.seriesId,
    pilarId: baseContent.pilarId,
    slotType: baseContent.slotType,
    formatoVisual: baseContent.formatoVisual,
    bibliotecaItemId: baseContent.bibliotecaItemId,
    script: baseContent.script,
    scriptNotes: baseContent.scriptNotes || [],
    referencias: baseContent.referencias,
  }));

  const [productionDraft, setProductionDraft] = useState<ProductionDraft>(() => ({
    plataformas: (baseContent.plataformas || []).map(plataforma => ({
      ...plataforma,
      publishDateEnabled:
        plataforma.publishDateEnabled ?? (plataforma.publishDate != null) ?? false,
    })),
    recordingDate: baseContent.recordingDate,
    recordingDateEnabled: baseContent.recordingDateEnabled ?? (baseContent.recordingDate != null),
    publishDate: baseContent.publishDate,
    publishDateEnabled: baseContent.publishDateEnabled ?? (baseContent.publishDate != null),
    tags: baseContent.tags || [],
    lookId: baseContent.lookId,
    cenarioId: baseContent.cenarioId,
  }));
  const initialDraftSnapshot = useMemo(
    () =>
      JSON.stringify(
        buildDraftSnapshot(
          {
            title: baseContent.title,
            status: baseContent.status,
            seriesId: baseContent.seriesId,
            pilarId: baseContent.pilarId,
            slotType: baseContent.slotType,
            formatoVisual: baseContent.formatoVisual,
            bibliotecaItemId: baseContent.bibliotecaItemId,
            script: baseContent.script,
            scriptNotes: baseContent.scriptNotes || [],
            referencias: baseContent.referencias,
          },
          {
            plataformas: (baseContent.plataformas || []).map(plataforma => ({
              ...plataforma,
              publishDateEnabled:
                plataforma.publishDateEnabled ?? (plataforma.publishDate != null) ?? false,
            })),
            recordingDate: baseContent.recordingDate,
            recordingDateEnabled: baseContent.recordingDateEnabled ?? (baseContent.recordingDate != null),
            publishDate: baseContent.publishDate,
            publishDateEnabled: baseContent.publishDateEnabled ?? (baseContent.publishDate != null),
            tags: baseContent.tags || [],
            lookId: baseContent.lookId,
            cenarioId: baseContent.cenarioId,
          }
        )
      ),
    [baseContent]
  );
  const lastSavedSnapshotRef = useRef(initialDraftSnapshot);

  const [legendaTab, setLegendaTab] = useState<string>(() => {
    const first = baseContent.plataformas?.[0];
    return first?.platformId || 'Instagram';
  });

  const activePlataformaIds = useMemo(() => {
    if (!productionDraft.plataformas.length) return ['Instagram'];
    return productionDraft.plataformas.map(plataforma => plataforma.platformId);
  }, [productionDraft.plataformas]);

  const livroOrigem = scriptDraft.bibliotecaItemId
    ? state.bibliotecaItems.find(item => item.id === scriptDraft.bibliotecaItemId)
    : null;

  const pilarAtual = state.pilares.find(pilar => pilar.id === scriptDraft.pilarId);
  const hashtagSugestao: Record<string, string> = pilarAtual
    ? Object.fromEntries(pilarAtual.plataformas.map(plataforma => [plataforma.platformId, plataforma.hashtags]))
    : {};

  const legendaAtual = useMemo(() => {
    const current = productionDraft.plataformas.find(plataforma => plataforma.platformId === legendaTab);
    return current?.legenda || '';
  }, [productionDraft.plataformas, legendaTab]);

  const charLimit = CHAR_LIMITS[legendaTab];
  const charCount = legendaAtual.length;
  const draftSnapshot = useMemo(
    () => JSON.stringify(buildDraftSnapshot(scriptDraft, productionDraft)),
    [productionDraft, scriptDraft]
  );
  const isDirty = draftSnapshot !== lastSavedSnapshotRef.current;

  useEffect(() => {
    setActiveTab(availableTabs.includes(initialTab) ? initialTab : availableTabs[0]);
  }, [availableTabsKey, initialTab]);

  useEffect(() => {
    lastSavedSnapshotRef.current = initialDraftSnapshot;
  }, [initialDraftSnapshot]);

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const sectionLabel =
    'mb-3 block text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]';
  const groupTitle =
    'mb-4 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]';
  const fieldLabel =
    'text-[10px] font-black uppercase tracking-widest text-[var(--text-primary)] opacity-50 md:w-24 md:shrink-0';
  const selectClass =
    'w-full md:w-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-3 py-2.5 text-xs text-[var(--text-primary)] shadow-sm focus:ring-0';
  const textareaClass =
    'w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] p-4 text-base text-[var(--text-primary)] placeholder:italic placeholder:opacity-30 focus:ring-0 resize-none md:text-sm';

  const sidebarStages = STATUS_STAGES.map((stage, index) => {
    const currentIndex = STATUS_STAGES.indexOf(scriptDraft.status);
    return {
      stage,
      index,
      isDone: index < currentIndex,
      isActive: index === currentIndex,
    };
  });

  const updateScriptDraft = (updates: Partial<ScriptDraft>) => {
    let merged = {...updates};

    if (merged.seriesId) {
      const serie = state.series.find(item => item.id === merged.seriesId);
      if (serie?.estruturaRoteiro && !scriptDraft.script && livroOrigem) {
        merged = {
          ...merged,
          script: serie.estruturaRoteiro
            .replace(/\{\{livro\}\}/g, livroOrigem.titulo || '')
            .replace(/\{\{autor\}\}/g, livroOrigem.autorDiretor || ''),
        };
      }
    }

    setScriptDraft(previous => ({...previous, ...merged}));
  };

  const updateProductionDraft = (updates: Partial<ProductionDraft>) => {
    setProductionDraft(previous => ({...previous, ...updates}));
  };

  const updateRecordingTags = (value: string) => {
    updateProductionDraft({
      tags: value
        .split(/[,\n]/)
        .map(tag => tag.trim())
        .filter(Boolean),
    });
  };

  const openMobileDatePicker = (
    event:
      | React.MouseEvent<HTMLInputElement>
      | React.FocusEvent<HTMLInputElement>
  ) => {
    if (!isMobile) return;
    const input = event.currentTarget as DateInputWithPicker;
    if (input.disabled) return;
    input.showPicker?.();
  };

  const handleAplicarTemplateManual = () => {
    const serie = state.series.find(item => item.id === scriptDraft.seriesId);
    if (!serie?.estruturaRoteiro) return;

    const scriptPreenchido = serie.estruturaRoteiro
      .replace(/\{\{livro\}\}/g, livroOrigem?.titulo || '')
      .replace(/\{\{autor\}\}/g, livroOrigem?.autorDiretor || '');

    updateScriptDraft({script: scriptPreenchido});
  };

  const updateLegenda = (platformId: string, legenda: string) => {
    const current = productionDraft.plataformas;
    const index = current.findIndex(plataforma => plataforma.platformId === platformId);

    const next = [...current];
    if (index >= 0) {
      next[index] = {...next[index], legenda};
    } else {
      next.push({
        id: '',
        contentId: baseContent.id,
        platformId,
        legenda,
        hashtags: '',
        publishDate: productionDraft.publishDateEnabled ? productionDraft.publishDate : null,
        publishDateEnabled: productionDraft.publishDateEnabled,
      });
    }

    updateProductionDraft({plataformas: next});
  };

  const syncPublishDate = (publishDate: string | null, publishDateEnabled: boolean) => {
    updateProductionDraft({
      publishDate,
      publishDateEnabled,
      plataformas: productionDraft.plataformas.map(plataforma => ({
        ...plataforma,
        publishDate: publishDateEnabled ? publishDate : null,
        publishDateEnabled,
      })),
    });
  };

  const togglePlataforma = (platformId: string) => {
    const currentIds = activePlataformaIds;
    const nextIds = currentIds.includes(platformId)
      ? currentIds.filter(item => item !== platformId)
      : [...currentIds, platformId];

    if (nextIds.length === 0) return;

    const nextPlataformas: ContentPlataforma[] = nextIds.map(id => {
      const existing = productionDraft.plataformas.find(plataforma => plataforma.platformId === id);
      return (
        existing || {
          id: '',
          contentId: baseContent.id,
          platformId: id,
          legenda: '',
          hashtags: '',
          publishDate: productionDraft.publishDateEnabled ? productionDraft.publishDate : null,
          publishDateEnabled: productionDraft.publishDateEnabled,
        }
      );
    });

    updateProductionDraft({plataformas: nextPlataformas});

    if (!nextIds.includes(legendaTab)) {
      setLegendaTab(nextIds[0]);
    }
  };

  const handleAddAnnotation = (
    text: string,
    selection: {from: number; to: number},
    comment: string
  ) => {
    updateScriptDraft({
      scriptNotes: [
        ...(scriptDraft.scriptNotes || []),
        {
          id: Math.random().toString(36).slice(2, 11),
          text,
          selection,
          comment,
          color: '#F5C543',
          createdAt: new Date().toISOString(),
        },
      ],
    });
  };

  const handleRemoveAnnotation = (id: string) => {
    updateScriptDraft({
      scriptNotes: (scriptDraft.scriptNotes || []).filter(note => note.id !== id),
    });
  };

  const handleUpdateAnnotation = (id: string, comment: string, color?: string) => {
    updateScriptDraft({
      scriptNotes: (scriptDraft.scriptNotes || []).map(note =>
        note.id === id ? {...note, comment, color} : note
      ),
    });
  };

  const buildContentPayload = (): Content => ({
    ...baseContent,
    ...scriptDraft,
    ...productionDraft,
    tags: productionDraft.tags,
    recordingDate:
      productionDraft.recordingDateEnabled ? productionDraft.recordingDate || null : null,
    publishDate: productionDraft.publishDateEnabled ? productionDraft.publishDate || null : null,
    plataformas: productionDraft.plataformas.map(plataforma => ({
      ...plataforma,
      publishDate:
        productionDraft.publishDateEnabled && plataforma.publishDateEnabled !== false
          ? productionDraft.publishDate || plataforma.publishDate || null
          : null,
      publishDateEnabled:
        plataforma.publishDateEnabled ?? productionDraft.publishDateEnabled ?? false,
    })),
    updatedAt: new Date().toISOString(),
  });

  const persistContentDraft = async () => {
    const payload = buildContentPayload();
    if (isNewContent) {
      await createContent(payload);
      return;
    }
    await updateContent(payload);
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = buildContentPayload();
      await persistContentDraft();
      lastSavedSnapshotRef.current = JSON.stringify(
        buildDraftSnapshot(
          {
            title: payload.title,
            status: payload.status,
            seriesId: payload.seriesId,
            pilarId: payload.pilarId,
            slotType: payload.slotType,
            formatoVisual: payload.formatoVisual,
            bibliotecaItemId: payload.bibliotecaItemId,
            script: payload.script,
            scriptNotes: payload.scriptNotes || [],
            referencias: payload.referencias,
          },
          {
            plataformas: payload.plataformas,
            recordingDate: payload.recordingDate,
            recordingDateEnabled: payload.recordingDateEnabled ?? (payload.recordingDate != null),
            publishDate: payload.publishDate,
            publishDateEnabled: payload.publishDateEnabled ?? (payload.publishDate != null),
            tags: payload.tags || [],
            lookId: payload.lookId,
            cenarioId: payload.cenarioId,
          }
        )
      );
      setSaveSuccess(true);
      setTimeout(() => onClose(), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar conteúdo');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContent = () => {
    setConfirm({
      message: 'Tem certeza que deseja excluir este conteúdo?',
      onConfirm: () => {
        void dispatch({type: 'DELETE_CONTENT', payload: baseContent.id});
        onClose();
      },
    });
  };

  const handleConfirmNewSeries = () => {
    if (!newSeriesName.trim()) {
      setIsCreatingSeries(false);
      return;
    }

    const newSeries = {
      id: generateUUID(),
      userId: user?.id || '',
      name: newSeriesName.trim(),
      template: '',
      notes: '',
      slotPadrao: null,
      formatoVisualPadrao: null,
      estruturaRoteiro: null,
      bordao: null,
      cor: '#F5C543',
      ativa: true,
      frequenciaRecomendada: null,
      pilarIds: [],
      plataformas: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    void dispatch({type: 'ADD_SERIES', payload: newSeries});
    updateScriptDraft({seriesId: newSeries.id});
    setNewSeriesName('');
    setIsCreatingSeries(false);
  };

  const handleConfirmNewPillar = () => {
    if (!newPillarName.trim()) {
      setIsCreatingPillar(false);
      return;
    }

    const newPillar = {
      id: generateUUID(),
      userId: user?.id || '',
      nome: newPillarName.trim(),
      descricao: '',
      cor: '#F5C543',
      ativo: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      plataformas: [],
    };

    void dispatch({type: 'ADD_PILAR', payload: newPillar});
    updateScriptDraft({pilarId: newPillar.id});
    setNewPillarName('');
    setIsCreatingPillar(false);
  };

  const requestClose = () => {
    if (loading) return;
    if (!isDirty) {
      onClose();
      return;
    }

    setConfirm({
      message: isNewContent
        ? 'Descartar este novo conteúdo? As alterações ainda não foram salvas.'
        : 'Descartar alterações não salvas?',
      onConfirm: onClose,
    });
  };

  const handleCopyLegenda = async () => {
    if (!legendaAtual.trim()) return;

    try {
      await navigator.clipboard.writeText(legendaAtual);
      setCopiedLegendaPlatform(legendaTab);
      window.setTimeout(() => {
        setCopiedLegendaPlatform(current => (current === legendaTab ? null : current));
      }, 2000);
    } catch {
      setError('Nao foi possivel copiar a legenda para a area de transferencia.');
    }
  };

  return (
    <>
      <FixedPanelModal
        open
        onClose={requestClose}
        desktopMaxW="md:max-w-[1240px]"
        desktopPanelClassName={
          isDesktopNewContent
            ? 'md:w-[1360px] md:h-[1080px] md:max-w-[calc(100vw-32px)] md:max-h-[calc(100dvh-32px)] md:rounded-[32px]'
            : undefined
        }
      >
        <div
          className={cn(
            'flex h-full flex-col overflow-hidden bg-[var(--bg-primary)] md:flex-row',
            isDesktopNewContent ? 'md:h-[1080px] md:bg-[#fbfaf7]' : 'md:h-[85vh]'
          )}
        >
          {!isMobile && (
            <aside
              className={cn(
                'flex shrink-0 flex-col border-r border-[var(--border-color)] bg-[var(--bg-secondary)] pt-8',
                isDesktopNewContent ? 'w-[255px] bg-[#f8f6f1]' : 'w-[220px]'
              )}
            >
              <div className={cn('mb-8', isDesktopNewContent ? 'px-9 pt-2' : 'px-8')}>
                <span className="mb-6 block text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                  {isDesktopNewContent ? 'Fluxo de Criação' : 'Fluxo de Vida'}
                </span>
                <div className="flex flex-col gap-1">
                  {sidebarStages.map(({stage, index, isDone, isActive}) => (
                    <button
                      key={stage}
                      onClick={() => updateScriptDraft({status: stage})}
                      className={cn(
                        'group flex shrink-0 items-center gap-3 text-left',
                        isDesktopNewContent ? 'py-3.5' : 'py-2'
                      )}
                    >
                      <div
                        className={cn(
                          'flex shrink-0 items-center justify-center rounded-full border transition-all',
                          isDesktopNewContent ? 'h-7 w-7' : 'h-5 w-5 border-2',
                          isActive
                            ? 'border-[var(--text-primary)] bg-[var(--text-primary)]'
                            : isDone
                              ? 'border-[var(--accent-green)] bg-[var(--accent-green)]'
                              : 'border-[var(--border-color)] group-hover:border-[var(--text-primary)]/40'
                        )}
                      >
                        {isDesktopNewContent ? (
                          <span
                            className={cn(
                              'text-[11px] font-black',
                              isActive || isDone
                                ? 'text-[var(--bg-primary)]'
                                : 'text-[var(--text-tertiary)]'
                            )}
                          >
                            {index + 1}
                          </span>
                        ) : isDone ? (
                          <Check className="h-3.5 w-3.5 text-[var(--bg-primary)]" />
                        ) : isActive ? (
                          <div className="h-1.5 w-1.5 rounded-full bg-[var(--bg-primary)]" />
                        ) : null}
                      </div>
                      <span
                        className={cn(
                          'font-black uppercase tracking-widest transition-all',
                          isDesktopNewContent ? 'text-[11px]' : 'text-[10px]',
                          isActive
                            ? 'text-[var(--text-primary)] opacity-100'
                            : isDone
                              ? 'text-[var(--accent-green)] opacity-70'
                              : 'text-[var(--text-primary)] opacity-30 group-hover:opacity-60'
                        )}
                      >
                        {stage}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div
                className={cn(
                  'mt-auto flex flex-col gap-2 border-t border-[var(--border-color)]',
                  isDesktopNewContent ? 'p-10' : 'p-8'
                )}
              >
                <button
                  onClick={() =>
                    setConfirm({
                      message: 'Excluir definitivamente?',
                      onConfirm: () => {
                        void dispatch({type: 'DELETE_CONTENT', payload: baseContent.id});
                        onClose();
                      },
                    })
                  }
                  className="group flex w-full items-center gap-2 rounded-xl px-4 py-2 transition-colors hover:bg-[var(--accent-pink)]/10"
                >
                  <Trash2 className="h-4 w-4 text-[var(--accent-pink)] opacity-40 group-hover:opacity-100" />
                  <span className="text-[10px] font-black uppercase text-[var(--accent-pink)] opacity-40 group-hover:opacity-100">
                    Excluir
                  </span>
                </button>
              </div>
            </aside>
          )}

          <div className="flex flex-1 flex-col overflow-hidden">
            <header
              className={cn(
                'z-10 flex shrink-0 flex-col justify-between gap-3 border-b border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 md:flex-row md:items-center md:px-10 md:py-6',
                isDesktopNewContent && 'md:bg-[#fbfaf7] md:px-8 md:py-5',
                isMobile && 'pt-5'
              )}
            >
              {isMobile && !isCompactMobileComposer && (
                <div className="flex w-full items-center justify-between gap-2">
                  <select
                    value={scriptDraft.status}
                    onChange={event => updateScriptDraft({status: event.target.value})}
                    className="flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-hover)] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-[var(--text-primary)] focus:ring-0"
                  >
                    {STATUS_STAGES.map(status => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={requestClose}
                    className="shrink-0 rounded-lg border border-[var(--border-color)] bg-[var(--bg-hover)] p-1.5 text-[var(--text-primary)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="w-full min-w-0 flex-1">
                <input
                  type="text"
                  value={scriptDraft.title}
                  onChange={event => updateScriptDraft({title: event.target.value})}
                  className={cn(
                    'w-full font-black tracking-tight text-[var(--text-primary)] placeholder:opacity-30 focus:ring-0',
                    isMobile
                      ? cn(
                          'rounded-lg border border-[var(--border-color)] bg-[var(--bg-hover)]',
                          isCompactMobileComposer ? 'px-3 py-2 text-base' : 'px-2.5 py-1.5 text-xs'
                        )
                      : isDesktopNewContent
                        ? 'h-13 truncate rounded-2xl border border-[#ddd7cf] bg-white px-5 text-[16px] shadow-[0_1px_2px_rgba(17,24,39,0.04)]'
                        : 'truncate border-none bg-transparent p-0 text-3xl'
                  )}
                  placeholder="Título..."
                />
              </div>

              {!isMobile && (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className={cn(
                      'flex items-center gap-2 bg-[var(--text-primary)] text-[var(--bg-primary)] transition-all active:scale-95 disabled:opacity-50',
                      isDesktopNewContent
                        ? 'h-12 rounded-2xl px-8 shadow-[0_10px_30px_rgba(15,23,42,0.14)]'
                        : 'rounded-2xl px-6 py-2.5',
                      saveSuccess && 'bg-[var(--accent-green)]'
                    )}
                  >
                    {loading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--bg-primary)] border-t-transparent" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      {loading ? 'Salvando...' : saveSuccess ? 'Salvo!' : 'Salvar'}
                    </span>
                  </button>
                  <button
                    onClick={requestClose}
                    className={cn(
                      'text-[var(--text-tertiary)]',
                      isDesktopNewContent
                        ? 'rounded-2xl border border-transparent p-3 hover:border-[#ddd7cf] hover:bg-white'
                        : 'rounded-full p-2 hover:bg-[var(--bg-hover)]'
                    )}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              )}
            </header>

            {error && (
              <div className="animate-in slide-in-from-top-1 border-b border-[var(--accent-pink)]/20 bg-[var(--accent-pink)]/10 px-4 py-3 text-xs font-bold text-[var(--accent-pink)] duration-300 md:px-10">
                {error}
              </div>
            )}

            <nav
              className={cn(
                'flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2 no-scrollbar md:px-10',
                isDesktopNewContent && 'md:bg-[#fbfaf7] md:px-8 md:py-0',
                availableTabs.length === 1 && 'hidden'
              )}
            >
              {[
                {id: 'roteiro' as const, label: 'Roteiro', icon: FileText},
                {id: 'producao' as const, label: 'Produção', icon: Clapperboard},
              ].filter(tab => availableTabs.includes(tab.id)).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 text-[9px] font-black uppercase tracking-widest transition-all md:text-[10px]',
                    isDesktopNewContent ? 'rounded-none border-b-2 px-4 py-4 -mb-px' : 'rounded-lg px-3 py-1.5',
                    activeTab === tab.id
                      ? isDesktopNewContent
                        ? 'border-[var(--text-primary)] text-[var(--text-primary)]'
                        : 'border border-[var(--border-strong)] bg-[var(--text-primary)] text-[var(--bg-primary)]'
                      : isDesktopNewContent
                        ? 'border-transparent text-[var(--text-primary)] opacity-35 hover:opacity-100'
                        : 'text-[var(--text-primary)] opacity-40 hover:opacity-100'
                  )}
                >
                  <tab.icon className="h-3 w-3" />
                  {tab.label}
                </button>
              ))}
            </nav>

            <main
              className={cn(
                'custom-scrollbar flex-1 overflow-y-auto bg-[var(--bg-primary)] p-4 md:p-10',
                isDesktopNewContent && 'md:bg-[#fbfaf7] md:px-8 md:py-7'
              )}
            >
              {activeTab === 'roteiro' && (
                <div
                  className={cn(
                    'animate-in space-y-8 fade-in duration-300 md:space-y-12',
                    isDesktopNewContent && 'md:space-y-6'
                  )}
                >
                  {!isCompactMobileComposer && <section
                    className={cn(
                      isDesktopNewContent &&
                        'rounded-[24px] border border-[#e5dfd6] bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.04)]'
                    )}
                  >
                    <p className={groupTitle}>Classificação</p>
                    {!isCompactMobileComposer && <div
                      className={cn(
                        'grid grid-cols-1 gap-x-12 gap-y-5 md:grid-cols-2 md:gap-y-6',
                        isDesktopNewContent && 'md:grid-cols-4 md:gap-4'
                      )}
                    >
                      <div className="flex flex-col gap-2">
                        <span className={fieldLabel}>Série</span>
                        <div className="relative">
                          <select
                            value={isCreatingSeries ? 'new' : (scriptDraft.seriesId ?? '')}
                            onChange={event => {
                              if (event.target.value === 'new') {
                                setIsCreatingSeries(true);
                                return;
                              }
                              setIsCreatingSeries(false);
                              setNewSeriesName('');
                              updateScriptDraft({seriesId: event.target.value || null});
                            }}
                            className={cn(
                              selectClass,
                              isDesktopNewContent ? 'md:h-12 md:w-full md:rounded-2xl md:bg-[#faf8f4] pr-10' : 'pr-10'
                            )}
                          >
                            <option value="">Sem Série</option>
                            {state.series.map(serie => (
                              <option key={serie.id} value={serie.id}>
                                {serie.name}
                              </option>
                            ))}
                            <option value="new">+ Nova Série…</option>
                          </select>
                          {isCreatingSeries && (
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                autoFocus
                                type="text"
                                value={newSeriesName}
                                onChange={event => setNewSeriesName(event.target.value)}
                                onKeyDown={event => {
                                  if (event.key === 'Enter') handleConfirmNewSeries();
                                  if (event.key === 'Escape') {
                                    setIsCreatingSeries(false);
                                    setNewSeriesName('');
                                  }
                                }}
                                placeholder="Nome da série..."
                                className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-3 py-2 text-xs text-[var(--text-primary)]"
                              />
                              <button
                                type="button"
                                onClick={handleConfirmNewSeries}
                                className="rounded-xl bg-[var(--text-primary)] p-2 text-[var(--bg-primary)]"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate('/configuracoes/series')}
                          className="self-start text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]"
                        >
                          Configurar serie no painel
                        </button>
                      </div>

                      <div className="flex flex-col gap-2">
                        <span className={fieldLabel}>Pilar</span>
                        <div className="relative">
                          <select
                            value={isCreatingPillar ? 'new' : (scriptDraft.pilarId ?? '')}
                            onChange={event => {
                              if (event.target.value === 'new') {
                                setIsCreatingPillar(true);
                                return;
                              }
                              setIsCreatingPillar(false);
                              setNewPillarName('');
                              updateScriptDraft({pilarId: event.target.value || null});
                            }}
                            className={cn(selectClass, 'pr-10')}
                          >
                            <option value="">Sem pilar</option>
                            {state.pilares
                              .filter(pilar => pilar.ativo)
                              .map(pilar => (
                                <option key={pilar.id} value={pilar.id}>
                                  {pilar.nome}
                                </option>
                              ))}
                            <option value="new">+ Novo pilar...</option>
                          </select>
                          {isCreatingPillar && (
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                autoFocus
                                type="text"
                                value={newPillarName}
                                onChange={event => setNewPillarName(event.target.value)}
                                onKeyDown={event => {
                                  if (event.key === 'Enter') handleConfirmNewPillar();
                                  if (event.key === 'Escape') {
                                    setIsCreatingPillar(false);
                                    setNewPillarName('');
                                  }
                                }}
                                placeholder="Nome do pilar..."
                                className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-hover)] px-3 py-2 text-xs text-[var(--text-primary)]"
                              />
                              <button
                                type="button"
                                onClick={handleConfirmNewPillar}
                                className="rounded-xl bg-[var(--text-primary)] p-2 text-[var(--bg-primary)]"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate('/configuracoes/pilares')}
                          className="self-start text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]"
                        >
                          Configurar pilar no painel
                        </button>
                      </div>

                      <div className="flex flex-col gap-2">
                        <span className={fieldLabel}>Slot</span>
                        <select
                          value={scriptDraft.slotType || ''}
                          onChange={event =>
                            updateScriptDraft({
                              slotType: (event.target.value || null) as Content['slotType'],
                            })
                          }
                          className={selectClass}
                        >
                          <option value="">—</option>
                          <option value="ÚNICO">Único (Viral)</option>
                          <option value="SÉRIE">Série (Identidade)</option>
                          <option value="JANELA">Janela (Presença)</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <span className={fieldLabel}>Visual</span>
                        <select
                          value={scriptDraft.formatoVisual || ''}
                          onChange={event =>
                            updateScriptDraft({formatoVisual: event.target.value || null})
                          }
                          className={selectClass}
                        >
                          <option value="">—</option>
                          {VISUAL_FORMATS.map(format => (
                            <option key={format} value={format}>
                              {format}
                            </option>
                          ))}
                        </select>
                      </div>

                      {state.bibliotecaItems.length > 0 && (
                        <div className="flex flex-col gap-4 border-t border-[var(--border-color)] pt-6 md:col-span-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-3.5 w-3.5 text-[var(--accent-blue)]" />
                              <span className={fieldLabel}>Vínculo com Livro</span>
                            </div>
                            <button
                              onClick={() =>
                                updateScriptDraft({
                                  bibliotecaItemId: scriptDraft.bibliotecaItemId
                                    ? null
                                    : state.bibliotecaItems[0]?.id || null,
                                })
                              }
                              className={cn(
                                'relative h-4 w-8 rounded-full transition-all duration-300',
                                scriptDraft.bibliotecaItemId
                                  ? 'bg-[var(--accent-blue)]'
                                  : 'bg-[var(--bg-hover)]'
                              )}
                            >
                              <div
                                className={cn(
                                  'absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all duration-300',
                                  scriptDraft.bibliotecaItemId ? 'left-4.5' : 'left-0.5 shadow-sm'
                                )}
                              />
                            </button>
                          </div>

                          {scriptDraft.bibliotecaItemId && (
                            <div className="animate-in slide-in-from-top-2 duration-300">
                              <select
                                value={scriptDraft.bibliotecaItemId}
                                onChange={event =>
                                  updateScriptDraft({bibliotecaItemId: event.target.value})
                                }
                                className={cn(
                                  selectClass,
                                  'h-auto w-full border-2 border-[var(--accent-blue)]/20 bg-[var(--bg-secondary)] py-3.5 text-xs font-bold'
                                )}
                              >
                                {state.bibliotecaItems.map(item => (
                                  <option key={item.id} value={item.id}>
                                    {item.titulo}
                                    {item.autorDiretor ? ` — ${item.autorDiretor}` : ''}
                                  </option>
                                ))}
                              </select>
                              {livroOrigem && (
                                <div className="mt-2 flex items-center gap-2 px-1">
                                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-blue)]" />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-blue)] opacity-60">
                                    Status: {livroOrigem.status}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>}
                  </section>}

                  <section
                    className={cn(
                      isDesktopNewContent &&
                        'overflow-hidden rounded-[24px] border border-[#e5dfd6] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]'
                    )}
                  >
                    <div
                      className={cn(
                        'mb-4 flex items-center justify-between border-b border-[var(--border-color)] pb-4',
                        isDesktopNewContent && 'mb-0 px-5 pb-3 pt-4'
                      )}
                    >
                      <span className={sectionLabel}>Roteiro Final</span>
                      {(() => {
                        const serie = state.series.find(item => item.id === scriptDraft.seriesId);
                        if (!serie?.estruturaRoteiro) return null;
                        return (
                          <button
                            onClick={handleAplicarTemplateManual}
                            className="text-[9px] font-bold text-[var(--accent-blue)] opacity-60 hover:opacity-100 hover:underline"
                          >
                            {scriptDraft.script ? 'Reiniciar Template' : 'Usar template da série'}
                          </button>
                        );
                      })()}
                    </div>
                    <RichTextEditor
                      content={scriptDraft.script || ''}
                      onChange={html => updateScriptDraft({script: html})}
                      placeholder="Abra o seu coração e escreva o roteiro..."
                      authorName={userName}
                      documentTitle={scriptDraft.title?.trim() || 'Novo roteiro'}
                      className={cn(isDesktopNewContent && 'min-h-[520px] rounded-none border-0')}
                      editorViewportClassName={cn(isDesktopNewContent && 'bg-white p-0')}
                      editorCanvasClassName={cn(
                        isDesktopNewContent &&
                          'min-h-[420px] rounded-none border-0 p-6 shadow-none md:p-6',
                        isCompactMobileComposer && 'min-h-[52dvh] rounded-2xl border border-[var(--border-color)] p-4 shadow-none'
                      )}
                      annotations={scriptDraft.scriptNotes || []}
                      onAddAnnotation={handleAddAnnotation}
                      onRemoveAnnotation={handleRemoveAnnotation}
                      onUpdateAnnotation={handleUpdateAnnotation}
                      compactMobileComposer={isCompactMobileComposer}
                    />
                  </section>

                  {!isCompactMobileComposer && <section>
                    <button
                      onClick={() => setRefsOpen(open => !open)}
                      className="group flex w-full items-center justify-between"
                    >
                      <span className={sectionLabel}>Referências / Observações</span>
                      {refsOpen ? (
                        <ChevronUp className="h-4 w-4 opacity-30" />
                      ) : (
                        <ChevronDown className="h-4 w-4 opacity-30" />
                      )}
                    </button>
                    {refsOpen && (
                      <textarea
                        value={scriptDraft.referencias || ''}
                        onChange={event => updateScriptDraft({referencias: event.target.value})}
                        className="input-inline mt-4 min-h-[100px] w-full resize-none text-base text-[var(--text-primary)] placeholder:italic placeholder:opacity-30 md:text-sm"
                        placeholder="Links, inspirações, vídeos de referência..."
                      />
                    )}
                  </section>}
                </div>
              )}

              {activeTab === 'producao' && (
                <div className="animate-in slide-in-from-right-4 space-y-12 duration-300 max-w-4xl">
                  <section>
                    <p className={groupTitle}>Distribuição</p>
                    <div className="space-y-6">
                      <div className="flex flex-col gap-2">
                        <span className={fieldLabel}>Plataformas</span>
                        <div className="flex flex-wrap gap-2">
                          {DEFAULT_PLATFORMS.map(platform => {
                            const active = activePlataformaIds.includes(platform);
                            return (
                              <button
                                key={platform}
                                onClick={() => togglePlataforma(platform)}
                                className={cn(
                                  'rounded-full border px-3 py-1.5 text-[9px] font-bold transition-all',
                                  active
                                    ? 'border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-secondary)]'
                                    : 'border-[var(--border-color)] opacity-40 hover:opacity-100'
                                )}
                              >
                                {platform}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                        <div>
                          <div className="mb-4 flex items-center justify-between">
                            <span className={sectionLabel}>Legenda & Copy</span>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={handleCopyLegenda}
                                disabled={!legendaAtual.trim()}
                                className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-green)]/5 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-[var(--accent-green)] transition-colors hover:bg-[var(--accent-green)]/10 disabled:cursor-not-allowed disabled:opacity-35"
                                title="Copiar legenda"
                              >
                                {copiedLegendaPlatform === legendaTab ? (
                                  <Check className="h-3.5 w-3.5" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                                {copiedLegendaPlatform === legendaTab ? 'Copiado' : 'Copiar'}
                              </button>
                              <button
                                onClick={() =>
                                  setConfirm({
                                    message: 'Limpar a legenda atual?',
                                    onConfirm: () => updateLegenda(legendaTab, ''),
                                  })
                                }
                                className="text-[9px] font-bold text-[var(--accent-blue)] opacity-60 hover:opacity-100 hover:underline"
                              >
                                Limpar
                              </button>
                            </div>
                          </div>

                        <div className="mb-3 flex gap-1">
                          {activePlataformaIds.map(platform => (
                            <button
                              key={platform}
                              onClick={() => setLegendaTab(platform)}
                              className={cn(
                                'rounded-lg px-3 py-1.5 text-[9px] font-black transition-all',
                                legendaTab === platform
                                  ? 'bg-[var(--text-primary)] text-[var(--bg-secondary)]'
                                  : 'bg-[var(--bg-hover)] text-[var(--text-tertiary)]'
                              )}
                            >
                              {platform}
                            </button>
                          ))}
                        </div>

                        <textarea
                          value={legendaAtual}
                          onChange={event => updateLegenda(legendaTab, event.target.value)}
                          className={cn(
                            textareaClass,
                            'min-h-[200px]',
                            charLimit && charCount > charLimit && 'border-[var(--accent-pink)]'
                          )}
                          placeholder={`Copy matadora para ${legendaTab}...`}
                        />

                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {hashtagSugestao[legendaTab] && (
                              <button
                                onClick={() => {
                                  const hashtags = hashtagSugestao[legendaTab];
                                  if (
                                    hashtags &&
                                    !legendaAtual.includes(hashtags.split(' ')[0] || '')
                                  ) {
                                    updateLegenda(legendaTab, `${legendaAtual}\n\n${hashtags}`.trim());
                                  }
                                }}
                                className="rounded-md bg-[var(--accent-green)]/5 p-1.5 text-[9px] font-black uppercase tracking-widest text-[var(--accent-green)] transition-colors hover:bg-[var(--accent-green)]/10"
                              >
                                + Adicionar Hashtags do Pilar
                              </button>
                            )}
                          </div>
                          {charLimit && (
                            <span
                              className={cn(
                                'text-[10px] font-black tabular-nums opacity-30',
                                charCount > charLimit && 'text-[var(--accent-pink)] opacity-100'
                              )}
                            >
                              {charCount}/{charLimit}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <p className={groupTitle}>Cronograma</p>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div className="space-y-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                        <div className="flex items-center justify-between gap-4">
                          <span className={fieldLabel}>Gravação</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateProductionDraft({
                                recordingDateEnabled: !productionDraft.recordingDateEnabled,
                                recordingDate: productionDraft.recordingDateEnabled
                                  ? null
                                  : productionDraft.recordingDate,
                              })
                            }
                            className={cn(
                              'relative h-6 w-11 rounded-full transition-colors',
                              productionDraft.recordingDateEnabled
                                ? 'bg-[var(--text-primary)]'
                                : 'bg-[var(--bg-hover)]'
                            )}
                          >
                            <span
                              className={cn(
                                'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all',
                                productionDraft.recordingDateEnabled ? 'left-5.5' : 'left-0.5'
                              )}
                            />
                          </button>
                        </div>
                        <input
                          type="date"
                          value={productionDraft.recordingDate || ''}
                          onChange={event =>
                            updateProductionDraft({
                              recordingDate: event.target.value || null,
                              recordingDateEnabled: true,
                            })
                          }
                          onClick={openMobileDatePicker}
                          onFocus={openMobileDatePicker}
                          disabled={!productionDraft.recordingDateEnabled}
                          className={cn(
                            selectClass,
                            'w-full',
                            !productionDraft.recordingDateEnabled && 'cursor-not-allowed opacity-40'
                          )}
                        />
                      </div>

                      <div className="space-y-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                        <div className="flex items-center justify-between gap-4">
                          <span className={fieldLabel}>Postagem</span>
                          <button
                            type="button"
                            onClick={() =>
                              syncPublishDate(
                                productionDraft.publishDateEnabled
                                  ? null
                                  : productionDraft.publishDate,
                                !productionDraft.publishDateEnabled
                              )
                            }
                            className={cn(
                              'relative h-6 w-11 rounded-full transition-colors',
                              productionDraft.publishDateEnabled
                                ? 'bg-[var(--text-primary)]'
                                : 'bg-[var(--bg-hover)]'
                            )}
                          >
                            <span
                              className={cn(
                                'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all',
                                productionDraft.publishDateEnabled ? 'left-5.5' : 'left-0.5'
                              )}
                            />
                          </button>
                        </div>
                        <input
                          type="date"
                          value={productionDraft.publishDate || ''}
                          onChange={event =>
                            syncPublishDate(event.target.value || null, true)
                          }
                          onClick={openMobileDatePicker}
                          onFocus={openMobileDatePicker}
                          disabled={!productionDraft.publishDateEnabled}
                          className={cn(
                            selectClass,
                            'w-full',
                            !productionDraft.publishDateEnabled && 'cursor-not-allowed opacity-40'
                          )}
                        />
                      </div>
                    </div>
                  </section>

                  <section>
                    <p className={groupTitle}>Marcadores de Gravacao</p>
                    <div className="space-y-3">
                      <span className={fieldLabel}>Variacao visual</span>
                      <textarea
                        value={(productionDraft.tags || []).join(', ')}
                        onChange={event => updateRecordingTags(event.target.value)}
                        className={cn(textareaClass, 'min-h-[110px]')}
                        placeholder="Ex: roupa preta, estante, caneca vermelha, luz quente, livro na mao"
                      />
                      <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                        Use marcadores livres para separar gravacoes em lote e distribuir a publicacao sem parecer tudo gravado no mesmo dia.
                      </p>
                    </div>
                  </section>
                </div>
              )}
            </main>

            <footer
              className={cn(
                'flex shrink-0 items-center justify-between gap-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] px-6 py-5 md:px-10',
                isDesktopNewContent && 'md:bg-[#fbfaf7] md:px-8 md:py-6'
              )}
            >
              {isDesktopNewContent ? (
                <div className="flex w-full items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    {!isNewContent && (
                      <button
                        onClick={handleDeleteContent}
                        className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-[var(--accent-pink)] opacity-70 transition-opacity hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir Conteúdo
                      </button>
                    )}
                    <button
                      onClick={requestClose}
                      className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--text-primary)] opacity-45 transition-opacity hover:opacity-100"
                    >
                      {isNewContent ? 'Cancelar' : 'Descartar Alterações'}
                    </button>
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex h-[52px] items-center gap-2 rounded-2xl bg-[var(--text-primary)] px-9 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--bg-primary)] shadow-[0_14px_30px_rgba(15,23,42,0.18)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--bg-primary)] border-t-transparent" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    {loading ? 'Salvando...' : saveSuccess ? 'Salvo!' : 'Salvar Alterações'}
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={requestClose}
                    className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)] opacity-30 transition-opacity hover:opacity-100"
                  >
                    {isCompactMobileComposer ? 'Cancelar' : 'Descartar'}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-2xl bg-[var(--text-primary)] px-10 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--bg-primary)] shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--bg-primary)] border-t-transparent" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    {loading ? 'Salvando...' : saveSuccess ? 'Salvo!' : 'Salvar Alterações'}
                  </button>
                </>
              )}
            </footer>
          </div>
        </div>
      </FixedPanelModal>

      <ConfirmModal
        open={!!confirm}
        message={confirm?.message || ''}
        onConfirm={() => {
          confirm?.onConfirm();
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
