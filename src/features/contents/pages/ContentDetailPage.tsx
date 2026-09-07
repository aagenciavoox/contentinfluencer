import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
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

const BODY_FETCH_TIMEOUT_MS = 8000;

function ContentDetailBootLoading() {
  return (
    <div className="stack-lg p-4 md:p-6">
      <div className="stack-sm">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-2/3 max-w-md" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="stack-sm rounded-[var(--radius-card)] border border-[var(--border-color)] p-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <Skeleton className="mt-4 h-40 w-full" />
      </div>
      <p className="text-center text-xs font-semibold t-label-uppercase text-[var(--text-tertiary)]">
        Carregando conteúdo...
      </p>
    </div>
  );
}

export function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { state, dispatch } = useAppContext();
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const contentsRef = useRef(state.contents);
  contentsRef.current = state.contents;
  const hadContentRef = useRef(false);

  const content = id ? state.contents.find(item => item.id === id) : undefined;
  const bodyLoaded = content ? isContentBodyLoaded(content) : false;
  const [isFetching, setIsFetching] = useState(() => Boolean(id && !bodyLoaded));
  const [fetchAttempted, setFetchAttempted] = useState(bodyLoaded);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const retryBodyFetch = useCallback(() => {
    setFetchError(null);
    setFetchAttempted(false);
    setIsFetching(true);
    setRetryToken(token => token + 1);
  }, []);

  useEffect(() => {
    if (!id || !user) return;

    if (content && isContentBodyLoaded(content)) {
      setIsFetching(false);
      setFetchAttempted(true);
      setFetchError(null);
      return;
    }

    let cancelled = false;
    setIsFetching(true);
    setFetchError(null);

    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      setFetchError('A busca do roteiro demorou demais. Tente novamente.');
      setIsFetching(false);
      setFetchAttempted(true);
    }, BODY_FETCH_TIMEOUT_MS);

    void fetchContentsByIds(user.id, [id])
      .then(fetched => {
        if (cancelled) return;
        window.clearTimeout(timeoutId);
        const item = fetched[0];
        if (item) {
          dispatch({
            type: 'SET_DATA',
            payload: { contents: upsertContent(contentsRef.current, item) },
          });
          setFetchError(null);
        } else if (!content) {
          setFetchError('Conteúdo não encontrado.');
        } else {
          setFetchError('Não foi possível carregar o roteiro completo.');
        }
        setIsFetching(false);
        setFetchAttempted(true);
      })
      .catch(() => {
        if (cancelled) return;
        window.clearTimeout(timeoutId);
        setFetchError(ERRORS.carregarDados);
        setIsFetching(false);
        setFetchAttempted(true);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [content, dispatch, id, retryToken, user]);

  if (!id) {
    return <Navigate to="/criacao" replace />;
  }

  const resolvedContent = state.contents.find(item => item.id === id);
  const resolvedBodyLoaded = resolvedContent ? isContentBodyLoaded(resolvedContent) : false;
  if (resolvedContent) {
    hadContentRef.current = true;
  }

  // Summary available — show shell immediately with localized body loading.
  if (resolvedContent) {
    return (
      <ContentDetailShell
        content={resolvedContent}
        mode={isMobile ? 'mobile' : 'desktop'}
        bodyLoading={!resolvedBodyLoaded && (isFetching || !fetchAttempted)}
        bodyError={!resolvedBodyLoaded ? fetchError : null}
        onRetryBody={retryBodyFetch}
      />
    );
  }

  if (authLoading || isFetching || (user && !fetchAttempted)) {
    return <ContentDetailBootLoading />;
  }

  // Content was open and then removed (e.g. moved to trash) — leave the detail route.
  if (hadContentRef.current) {
    return (
      <Navigate
        to={resolveContentDetailBack(location.state as { from?: string } | null)}
        replace
      />
    );
  }

  return (
    <div className="p-4 md:p-6">
      <EmptyState
        title="Não foi possível abrir este conteúdo"
        description={fetchError || 'O item pode ter sido removido ou ainda não sincronizou.'}
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <AppButton variant="secondary" size="sm" onClick={retryBodyFetch}>
              Tentar novamente
            </AppButton>
            <AppButton variant="primary" size="sm" onClick={() => window.history.back()}>
              Voltar
            </AppButton>
          </div>
        }
      />
    </div>
  );
}
