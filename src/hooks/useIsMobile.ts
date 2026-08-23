import { useEffect, useState } from 'react';

/** Matches Tailwind `lg` (1024px). Phone landscape and tablets stay on the mobile shell. */
export const MOBILE_QUERY = '(max-width: 1023px)';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia(MOBILE_QUERY).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}
