import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AppButton } from '../../../components/ui/AppButton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { fetchContentsByIds } from '../../../lib/database';
import { resolveContentDetailBack } from '../../../lib/navigation/detailBack';
import { ERRORS } from '../../../lib/uiCopy';
import { ContentDetailShell } from '../components/detail/ContentDetailShell';
import { isContentBodyLoaded, upsertContent } from '../lib/contentBody';

const BODY_FETCH_TIMEOUT_MS = 8_000;

type AppContextValue = ReturnType<typeof useAppContext>;
type Contents = AppContextValue['state']['contents'];
type ContentItem = Contents[number];
type BackDestination = ReturnType<typeof resolveContentDetailBack>;
type FetchState =
  | { status: 'loading' | 'done'; error: null }
  | { status: 'error'; error: string };

function ContentDetailBootLoading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="stack-lg p-4 md:p-6">
      <div className="stack-sm" aria-hidden="true">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-2/3 max-w-md" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div aria-hidden="true" className="stack-sm rounded-[var(--radius-card)] border border-[var(--border-color)] p-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <Skeleton className="mt-4 h-40 w-full" />
      </div>
      <p className="text-center text-xs font-semibold t-label-uppercase text-[var(--text-tertiary)]">
        Carregando roteiro…
      </p>
    </div>
  );
}

function ContentDetailFailure({
  title = 'Não foi possível abrir este roteiro',
  description,
  onRetry,
  onBack,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
  onBack: () => void;
}) {
  return (
    <div className="p-4 md:p-6">
      <EmptyState
        title={title}
        description={description}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            {onRetry ? (
              <AppButton type="button" variant="secondary" size="sm" onClick={onRetry}>
                Tentar novamente
              </AppButton>
            ) : null}
            <AppButton type="button" variant="primary" size="sm" onClick={onBack}>
              Voltar
            </AppButton>
          </div>
        }
      />
    </div>
  );
}

export function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const backTo = resolveContentDetailBack(location.state as { from?: string } | null);
  const goBack = useCallback(() => {
    navigate(backTo, { replace: true });
  }, [backTo, navigate]);

  if (!id) return <Navigate to="/criacao" replace />;
  if (authLoading) return <ContentDetailBootLoading />;
  if (!user) {
    return (
      <ContentDetailFailure
        title="Sua sessão não está disponível"
        description="Entre novamente para abrir este roteiro."
        onBack={goBack}
      />
    );
  }

  // Cada roteiro/usuário tem seu próprio histórico de carregamento e suas tentativas.
  return (
    <AuthenticatedContentDetail
      key={JSON.stringify([user.id, id])}
      id={id}
      userId={user.id}
      backTo={backTo}
      onBack={goBack}
    />
  );
}

function AuthenticatedContentDetail({
  id,
  userId,
  backTo,
  onBack,
}: {
  id: string;
  userId: string;
  backTo: BackDestination;
  onBack: () => void;
}) {
  const { state, dispatch } = useAppContext();
  const content = state.contents.find(item => item.id === id);
  const hasContent = content !== undefined;
  const hadContentRef = useRef(hasContent);

  useEffect(() => {
    if (hasContent) hadContentRef.current = true;
  }, [hasContent]);

  // Ao remover o roteiro, desmonta também o loader: a busca antiga não o reinsere.
  if (!hasContent && hadContentRef.current) return <Navigate to={backTo} replace />;

  return (
    <ContentDetailLoader
      id={id}
      userId={userId}
      content={content}
      contents={state.contents}
      dispatch={dispatch}
      onBack={onBack}
    />
  );
}

function ContentDetailLoader({
  id,
  userId,
  content,
  contents,
  dispatch,
  onBack,
}: {
  id: string;
  userId: string;
  content: ContentItem | undefined;
  contents: Contents;
  dispatch: AppContextValue['dispatch'];
  onBack: () => void;
}) {
  const isMobile = useIsMobile();
  const bodyLoaded = content ? isContentBodyLoaded(content) : false;
  const contentsRef = useRef(contents);
  const [fetchState, setFetchState] = useState<FetchState>(() => ({
    status: bodyLoaded ? 'done' : 'loading',
    error: null,
  }));
  const [retryToken, setRetryToken] = useState(0);

  // O merge utiliza os dados do último render confirmado, sem capturar a lista inicial.
  useEffect(() => { contentsRef.current = contents; }, [contents]);

  const retryBodyFetch = useCallback(() => {
    if (bodyLoaded) return;
    setFetchState({ status: 'loading', error: null });
    setRetryToken(token => token + 1);
  }, [bodyLoaded]);

  useEffect(() => {
    if (bodyLoaded) {
      setFetchState(current => current.status === 'done'
        ? current : { status: 'done', error: null });
      return;
    }

    let active = true;
    let settled = false;
    setFetchState({ status: 'loading', error: null });

    const finish = (next: FetchState) => {
      if (!active || settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      setFetchState(next);
    };

    const timeoutId = window.setTimeout(() => {
      finish({ status: 'error', error: 'A busca do roteiro demorou demais. Tente novamente.' });
    }, BODY_FETCH_TIMEOUT_MS);

    void (async () => {
      try {
        const fetched = await fetchContentsByIds(userId, [id]);
        // Timeout, nova tentativa, navegação ou desmontagem invalidam esta resposta.
        if (!active || settled) return;

        const item = fetched.find(candidate => candidate.id === id);
        if (!item) {
          const summaryExists = contentsRef.current.some(candidate => candidate.id === id);
          finish({
            status: 'error',
            error: summaryExists
              ? 'Não foi possível carregar o roteiro completo.'
              : 'Roteiro não encontrado.',
          });
          return;
        }

        const nextContents = upsertContent(contentsRef.current, item);
        dispatch({ type: 'SET_DATA', payload: { contents: nextContents } });
        finish(isContentBodyLoaded(item)
          ? { status: 'done', error: null }
          : { status: 'error', error: 'Não foi possível carregar o roteiro completo.' });
      } catch {
        finish({ status: 'error', error: ERRORS.carregarDados });
      }
    })();

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
    // Identidades de resumo e de usuário não reiniciam a busca: apenas valores relevantes.
  }, [bodyLoaded, dispatch, id, retryToken, userId]);

  if (content) {
    return (
      <ContentDetailShell
        content={content}
        mode={isMobile ? 'mobile' : 'desktop'}
        bodyLoading={!bodyLoaded && fetchState.status !== 'error'}
        bodyError={!bodyLoaded ? fetchState.error : null}
        onRetryBody={retryBodyFetch}
      />
    );
  }

  if (fetchState.status !== 'error') return <ContentDetailBootLoading />;

  return (
    <ContentDetailFailure
      description={fetchState.error}
      onRetry={retryBodyFetch}
      onBack={onBack}
    />
  );
}
