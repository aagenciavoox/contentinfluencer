import { useEffect, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { fetchContentsByIds } from '../../../lib/database';
import { ContentDetailShell } from '../components/detail/ContentDetailShell';
import { isContentBodyLoaded, upsertContent } from '../lib/contentBody';

function ContentDetailLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-xs font-semibold t-label-uppercase text-[var(--text-tertiary)]">
        Carregando conteúdo...
      </p>
    </div>
  );
}

export function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { state, dispatch } = useAppContext();
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const contentsRef = useRef(state.contents);
  contentsRef.current = state.contents;

  const content = state.contents.find(item => item.id === id);
  const bodyLoaded = content ? isContentBodyLoaded(content) : false;
  const [isFetching, setIsFetching] = useState(() => !bodyLoaded);
  const [fetchAttempted, setFetchAttempted] = useState(bodyLoaded);

  useEffect(() => {
    if (!id || !user) return;

    if (content && isContentBodyLoaded(content)) {
      setIsFetching(false);
      setFetchAttempted(true);
      return;
    }

    let cancelled = false;
    setIsFetching(true);

    void fetchContentsByIds(user.id, [id]).then(fetched => {
      if (cancelled) return;
      const item = fetched[0];
      if (item) {
        dispatch({
          type: 'SET_DATA',
          payload: { contents: upsertContent(contentsRef.current, item) },
        });
      }
      setIsFetching(false);
      setFetchAttempted(true);
    });

    return () => {
      cancelled = true;
    };
  }, [content, dispatch, id, user]);

  if (!id) {
    return <Navigate to="/criacao" replace />;
  }

  const resolvedContent = state.contents.find(item => item.id === id);

  if (resolvedContent && isContentBodyLoaded(resolvedContent)) {
    return <ContentDetailShell content={resolvedContent} mode={isMobile ? 'mobile' : 'desktop'} />;
  }

  if (authLoading || isFetching || (user && !fetchAttempted)) {
    return <ContentDetailLoading />;
  }

  return <Navigate to="/criacao" replace />;
}
