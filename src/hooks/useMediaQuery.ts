import { useEffect, useState } from 'react';

/** Subscribe to a CSS media query. SSR-safe initial value defaults to false. */
export function useMediaQuery(query: string, getServerSnapshot = () => false): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return getServerSnapshot();
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
