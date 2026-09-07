import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import {useBlocker, type Blocker, type BlockerFunction} from 'react-router-dom';

interface NavigationBlockerContextValue {
  blocker: Blocker;
  register: (id: string, fn: () => boolean) => void;
  unregister: (id: string) => void;
}

const NavigationBlockerContext = createContext<NavigationBlockerContextValue | null>(null);

export function NavigationBlockerProvider({children}: {children: ReactNode}) {
  const guardsRef = useRef(new Map<string, () => boolean>());

  const shouldBlock = useCallback<BlockerFunction>(({currentLocation, nextLocation}) => {
    if (currentLocation.pathname === nextLocation.pathname) return false;
    for (const fn of guardsRef.current.values()) {
      if (fn()) return true;
    }
    return false;
  }, []);

  const blocker = useBlocker(shouldBlock);

  const register = useCallback((id: string, fn: () => boolean) => {
    guardsRef.current.set(id, fn);
  }, []);

  const unregister = useCallback((id: string) => {
    guardsRef.current.delete(id);
  }, []);

  const value = useMemo(
    () => ({blocker, register, unregister}),
    [blocker, register, unregister],
  );

  return (
    <NavigationBlockerContext.Provider value={value}>
      {children}
    </NavigationBlockerContext.Provider>
  );
}

export function useNavigationBlocker(shouldBlock: () => boolean): Blocker {
  const context = useContext(NavigationBlockerContext);
  if (!context) {
    throw new Error('useNavigationBlocker must be used within NavigationBlockerProvider');
  }

  const id = useId();
  const {blocker, register, unregister} = context;
  const shouldBlockRef = useRef(shouldBlock);
  const blockerRef = useRef(blocker);
  shouldBlockRef.current = shouldBlock;
  blockerRef.current = blocker;

  // Do not depend on `blocker` here — identity changes on every block/proceed and
  // would unregister the guard (and used to reset) right after navigation is blocked.
  useEffect(() => {
    register(id, () => shouldBlockRef.current());
    return () => {
      unregister(id);
    };
  }, [id, register, unregister]);

  useEffect(() => {
    return () => {
      if (blockerRef.current.state === 'blocked') {
        blockerRef.current.reset?.();
      }
    };
  }, []);

  return blocker;
}
