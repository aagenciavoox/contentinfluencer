import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

interface MobileScrollLockContextValue {
  mainElementRef: React.MutableRefObject<HTMLElement | null>;
  registerMainElement: (element: HTMLElement | null) => void;
  isScrollLocked: boolean;
  acquireScrollLock: () => void;
  releaseScrollLock: () => void;
}

const MobileScrollLockContext = createContext<MobileScrollLockContextValue | null>(null);

export function MobileScrollLockProvider({ children }: { children: ReactNode }) {
  const mainElementRef = useRef<HTMLElement | null>(null);
  const [lockCount, setLockCount] = useState(0);

  const registerMainElement = useCallback((element: HTMLElement | null) => {
    mainElementRef.current = element;
  }, []);

  const acquireScrollLock = useCallback(() => {
    setLockCount((count) => count + 1);
  }, []);

  const releaseScrollLock = useCallback(() => {
    setLockCount((count) => Math.max(0, count - 1));
  }, []);

  const value = useMemo(
    () => ({
      mainElementRef,
      registerMainElement,
      isScrollLocked: lockCount > 0,
      acquireScrollLock,
      releaseScrollLock,
    }),
    [lockCount, registerMainElement, acquireScrollLock, releaseScrollLock],
  );

  return (
    <MobileScrollLockContext.Provider value={value}>{children}</MobileScrollLockContext.Provider>
  );
}

export function useMobileScrollLock() {
  return useContext(MobileScrollLockContext);
}
