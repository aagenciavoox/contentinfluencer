import { useEffect, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAppContext } from '../../../context/AppContext';
import { useAuth } from '../../../context/AuthContext';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { Content, fetchContentsByIds } from '../../../lib/database';
import { ContentDetailShell } from '../components/detail/ContentDetailShell';

function upsertContent(contents: Content[], item: Content): Content[] {
  const index = contents.findIndex(entry => entry.id === item.id);
  if (index === -1) return [item, ...contents];
  const next = [...contents];
  next[index] = item;
  return next;
}

export function ContentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { state, dispatch } = useAppContext();
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const contentsRef = useRef(state.contents);
  contentsRef.current = state.contents;

  const content = state.contents.find(item => item.id === id);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  useEffect(() => {
    if (!id || !user || content) return;

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
  }, [dispatch, id, content, user]);

  if (!id) {
    return <Navigate to="/conteudos" replace />;
  }

  if (content) {
    return <ContentDetailShell content={content} mode={isMobile ? 'mobile' : 'desktop'} />;
  }

  if (authLoading || isFetching || (user && !fetchAttempted)) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-xs font-semibold t-label-uppercase text-[var(--text-tertiary)]">
          Carregando conteúdo...
        </p>
      </div>
    );
  }

  return <Navigate to="/conteudos" replace />;
}
