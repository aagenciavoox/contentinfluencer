import {ArrowLeft, AlertTriangle, CheckCircle2, Clock3} from 'lucide-react';
import {useMemo, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {AppButton} from '../../../../components/ui/AppButton';
import {useAppContext} from '../../../../context/AppContext';
import {useAuth} from '../../../../context/AuthContext';
import type {Content} from '../../../../lib/database';
import {PageScaffold} from '../../../../layouts/page/PageScaffold';
import {ContentDetailMobileScreen} from '../../../../mobile/screens/contents/ContentDetailMobileScreen';
import {
  CONTENT_STATUS,
  getContentBlockSummary,
  getContentStage,
  getInitialTabForContext,
  getPostingAutomationStatus,
  getPostingAlerts,
  getPrimaryAction,
  type ContentDetailTab,
} from '../../lib/contentPipeline';
import {ContentDetailHeader} from './ContentDetailHeader';
import {ContentDetailTabs} from './ContentDetailTabs';
import {HistorySection} from './sections/HistorySection';
import {PostingSection} from './sections/PostingSection';
import {ProductionSection} from './sections/ProductionSection';
import {RecordingSection} from './sections/RecordingSection';
import {RoteiroSection} from './sections/RoteiroSection';

interface ContentDetailShellProps {
  content: Content;
  mode?: 'desktop' | 'mobile';
}

type ContentDraft = Pick<
  Content,
  | 'title'
  | 'seriesId'
  | 'pilarId'
  | 'slotType'
  | 'formatoVisual'
  | 'script'
  | 'scriptNotes'
  | 'referencias'
  | 'notes'
  | 'status'
  | 'publishDate'
  | 'recordingDate'
  | 'plataformas'
>;

export function ContentDetailShell({content, mode = 'desktop'}: ContentDetailShellProps) {
  const {state, dispatch, updateContent} = useAppContext();
  const {user} = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [draft, setDraft] = useState<ContentDraft>(() => ({
    title: content.title,
    seriesId: content.seriesId,
    pilarId: content.pilarId,
    slotType: content.slotType,
    formatoVisual: content.formatoVisual,
    script: content.script,
    scriptNotes: content.scriptNotes || [],
    referencias: content.referencias,
    notes: content.notes,
    status: content.status,
    publishDate: content.publishDate,
    recordingDate: content.recordingDate,
    plataformas: content.plataformas || [],
  }));
  const [isSaving, setIsSaving] = useState(false);
  const activeTab = getInitialTabForContext(searchParams.get('tab'));

  const liveContent = state.contents.find(item => item.id === content.id) || content;
  const series = state.series.find(item => item.id === draft.seriesId) || null;
  const pillar = state.pilares.find(item => item.id === draft.pilarId) || null;
  const blockSummary = getContentBlockSummary(content.id, state.recordingBlocks);
  const primaryAction = getPrimaryAction(
    {
      ...liveContent,
      ...draft,
    },
    {block: blockSummary?.block}
  );
  const postingAlerts = useMemo(
    () =>
      getPostingAlerts({
        publishDate: draft.publishDate,
        status: draft.status,
      }),
    [draft.publishDate, draft.status]
  );

  const persist = async (updates?: Partial<Content>, options?: {advanceToReady?: boolean}) => {
    setIsSaving(true);

    try {
      let nextStatus =
        options?.advanceToReady && draft.status === CONTENT_STATUS.ROTEIRO
          ? CONTENT_STATUS.PRONTO_PARA_GRAVAR
          : updates?.status ?? draft.status;

      const nextPublishDate = updates?.publishDate ?? draft.publishDate;
      nextStatus = getPostingAutomationStatus({
        publishDate: nextPublishDate,
        status: nextStatus,
      });

      const payload: Content = {
        ...liveContent,
        ...draft,
        ...updates,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
      };

      await updateContent(payload);
      setDraft(previous => ({...previous, ...updates, status: nextStatus}));

      if (options?.advanceToReady) {
        setSearchParams(previous => {
          const next = new URLSearchParams(previous);
          next.set('tab', 'gravacao');
          return next;
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrimaryAction = async () => {
    switch (primaryAction.id) {
      case 'advance_to_recording':
        await persist({}, {advanceToReady: true});
        return;
      case 'send_to_posting':
        setSearchParams(previous => {
          const next = new URLSearchParams(previous);
          next.set('tab', 'postagem');
          return next;
        });
        return;
      case 'go_to_execution':
        if (blockSummary?.block) {
          navigate(`/gravacao/${blockSummary.block.id}`);
          return;
        }
        setSearchParams(previous => {
          const next = new URLSearchParams(previous);
          next.set('tab', 'gravacao');
          return next;
        });
        return;
      case 'save_schedule':
        await persist();
        return;
      default:
        setSearchParams(previous => {
          const next = new URLSearchParams(previous);
          next.set('tab', primaryAction.targetTab);
          return next;
        });
    }
  };

  const stage = getContentStage({...liveContent, ...draft}, {block: blockSummary?.block});
  const stageLabel: Record<string, string> = {
    IDEIA: 'Ideia',
    ROTEIRO: 'Roteiro',
    PRONTO_PARA_GRAVAR: 'Pronto para gravacao',
    EM_BLOCO: 'Em bloco',
    GRAVADO: 'Gravado',
    PRODUCAO: 'Producao',
    PROGRAMADO: 'Programado',
    POSTADO: 'Postado',
  };

  const detailSection =
    activeTab === 'roteiro' ? (
      <RoteiroSection
        draft={draft}
        series={state.series}
        pilares={state.pilares}
        authorName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}
        onChange={updates => setDraft(previous => ({...previous, ...updates}))}
      />
    ) : activeTab === 'gravacao' ? (
      <RecordingSection
        content={{...liveContent, ...draft}}
        stage={stage}
        recordingBlocks={state.recordingBlocks}
        onPersist={persist}
        onDispatch={dispatch}
      />
    ) : activeTab === 'producao' ? (
      <ProductionSection
        draft={draft}
        pilar={pillar}
        onChange={updates => setDraft(previous => ({...previous, ...updates}))}
      />
    ) : activeTab === 'postagem' ? (
      <PostingSection
        draft={draft}
        alerts={postingAlerts}
        onChange={updates => setDraft(previous => ({...previous, ...updates}))}
      />
    ) : activeTab === 'historico' ? (
      <HistorySection content={{...liveContent, ...draft}} />
    ) : (
      <PlaceholderSection
        tab={activeTab}
        blockName={blockSummary?.block.name ?? null}
        progress={blockSummary?.progressPercentage ?? null}
      />
    );

  if (mode === 'mobile') {
    return (
      <ContentDetailMobileScreen
        content={{...liveContent, ...draft}}
        activeTab={activeTab}
        onTabChange={tab =>
          setSearchParams(previous => {
            const next = new URLSearchParams(previous);
            next.set('tab', tab);
            return next;
          })
        }
        primaryAction={primaryAction}
        onPrimaryAction={() => void handlePrimaryAction()}
        onStatusChange={status => void persist({status})}
        isSaving={isSaving}
        postingAlerts={postingAlerts}
        stageLabel={stageLabel[stage]}
        seriesName={series?.name}
        seriesColor={series?.cor}
        pillarName={pillar?.nome}
        pillarColor={pillar?.cor}
        blockName={blockSummary?.block.name ?? null}
        blockOrder={blockSummary?.order ?? null}
        blockProgress={blockSummary?.progressPercentage ?? null}
        section={detailSection}
        onSave={() => void persist()}
      />
    );
  }

  return (
    <PageScaffold contentWidth="full" contentClassName="pb-12 md:pb-10">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
        <div className="flex items-center justify-between gap-3 pt-4 md:pt-8">
          <AppButton variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => navigate('/conteudos', {replace: true})}>
            Voltar
          </AppButton>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Etapa atual
            </p>
            <p className="text-sm font-black text-[var(--text-primary)]">{stageLabel[stage]}</p>
          </div>
        </div>

        <ContentDetailHeader
          content={{...liveContent, ...draft}}
          primaryAction={primaryAction}
          onPrimaryAction={() => void handlePrimaryAction()}
          onStatusChange={status => void persist({status})}
          isSaving={isSaving}
          seriesName={series?.name}
          seriesColor={series?.cor}
          pillarName={pillar?.nome}
          pillarColor={pillar?.cor}
          blockName={blockSummary?.block.name ?? null}
          blockOrder={blockSummary?.order ?? null}
          blockProgress={blockSummary?.progressPercentage ?? null}
        />

        {postingAlerts.length > 0 ? (
          <section className="grid gap-3">
            {postingAlerts.map(alert => (
              <article
                key={alert.id}
                className="flex items-start gap-3 rounded-[22px] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4"
              >
                {alert.tone === 'warning' ? (
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
                ) : (
                  <Clock3 className="mt-0.5 h-5 w-5 text-sky-500" />
                )}
                <p className="text-sm font-semibold text-[var(--text-primary)]">{alert.message}</p>
              </article>
            ))}
          </section>
        ) : null}

        <ContentDetailTabs
          activeTab={activeTab}
          onTabChange={tab =>
            setSearchParams(previous => {
              const next = new URLSearchParams(previous);
              next.set('tab', tab);
              return next;
            })
          }
        />

        {detailSection}

        <section className="rounded-[24px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                Salvamento
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Roteiro, gravacao, producao, postagem e historico agora compartilham a mesma fonte de verdade nesta rota unica.
              </p>
            </div>
            <AppButton variant="secondary" onClick={() => void persist()}>
              {isSaving ? 'Salvando...' : 'Salvar rascunho'}
            </AppButton>
          </div>
        </section>
      </div>
    </PageScaffold>
  );
}

function PlaceholderSection({
  tab,
  blockName,
  progress,
}: {
  tab: ContentDetailTab;
  blockName: string | null;
  progress: number | null;
}) {
  const copyByTab: Record<ContentDetailTab, {title: string; body: string}> = {
    roteiro: {
      title: 'Roteiro',
      body: 'A escrita central do conteudo ja foi migrada para o shell novo.',
    },
    gravacao: {
      title: 'Gravacao',
      body: blockName
        ? `Este conteudo ja esta no bloco "${blockName}" com progresso atual de ${progress ?? 0}%.`
        : 'A gravacao agora vive na aba dedicada deste mesmo detalhe.',
    },
    producao: {
      title: 'Producao',
      body: 'Assets, copy e preparacao de distribuicao entram nesta aba na proxima fase.',
    },
    postagem: {
      title: 'Postagem',
      body: 'Plataformas, datas, alertas e agendamento vao viver aqui no mesmo detalhe.',
    },
    historico: {
      title: 'Historico',
      body: 'A timeline com mudancas e eventos sera derivada dos campos atuais na fase seguinte.',
    },
  };

  const copy = copyByTab[tab];

  return (
    <section className="rounded-[28px] border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] p-8 text-center shadow-sm">
      <CheckCircle2 className="mx-auto h-10 w-10 text-[var(--accent-green)]" />
      <h2 className="mt-4 text-2xl font-black text-[var(--text-primary)]">{copy.title}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-[var(--text-secondary)]">
        {copy.body}
      </p>
    </section>
  );
}
