import {useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode} from 'react';
import {format, isSameDay} from 'date-fns';
import {AppButton} from '../../../components/ui/AppButton';
import {Text} from '../../../components/ui/Text';
import {mes} from '../../../lib/dates';
import {monthIndex, monthDate, activeMonthAt, extendMonthWindow, nearestVerticalScrollOwner, monthReadingViewport} from '../lib/monthScroll';

/** A grade cresce na página. O shell continua sendo o único dono da rolagem vertical. */
export function ProgressiveMonthGrid({anchorDate, navigationKey, onActiveMonthChange, renderMonth}: {
  anchorDate: Date;
  navigationKey: number;
  onActiveMonthChange: (date: Date) => void;
  renderMonth: (date: Date) => ReactNode;
}) {
  const initial = monthIndex(anchorDate);
  const [range, setRange] = useState({start: initial - 1, end: initial + 1});
  const container = useRef<HTMLDivElement>(null);
  const before = useRef<HTMLDivElement>(null);
  const after = useRef<HTMLDivElement>(null);
  const scrollOwner = useRef<HTMLElement | null>(null);
  const active = useRef(initial);
  const pendingNavigation = useRef<Date | null>(anchorDate);
  const pendingAnchor = useRef<{index: string; top: number} | null>(null);
  const savedOverflowAnchor = useRef<string | null>(null);
  const loading = useRef(false);
  const navKey = useRef(navigationKey);
  const callback = useRef(onActiveMonthChange);
  callback.current = onActiveMonthChange;

  const readingViewport = useCallback(() => {
    const owner = scrollOwner.current;
    const grid = container.current;
    if (!owner || !grid) return null;
    const documentScroll = owner === document.scrollingElement;
    const toolbar = grid.closest('[data-planning-page]')?.querySelector<HTMLElement>('[data-planning-sticky]');
    const weekdays = grid.querySelector<HTMLElement>('[data-month-weekdays]');
    return monthReadingViewport({
      top: documentScroll ? 0 : owner.getBoundingClientRect().top + owner.clientTop,
      height: documentScroll ? window.innerHeight : owner.clientHeight,
      toolbarTop: toolbar ? parseFloat(getComputedStyle(toolbar).top) || 0 : 0,
      toolbarHeight: toolbar?.getBoundingClientRect().height ?? 0,
      weekdayHeight: weekdays?.getBoundingClientRect().height ?? 0,
    });
  }, []);

  const scrollBy = useCallback((delta: number) => {
    // Ignora scroll-behavior:smooth durante a correção de posição, antes da pintura.
    scrollOwner.current?.scrollBy({top: delta, behavior: 'instant'});
  }, []);

  const load = useCallback((direction: -1 | 1) => {
    const grid = container.current;
    const owner = scrollOwner.current;
    const viewport = readingViewport();
    if (!grid || !owner || !viewport || loading.current || pendingNavigation.current) return;
    const visible = [...grid.querySelectorAll<HTMLElement>('[data-month]')]
      .find(section => section.getBoundingClientRect().bottom > viewport.top);
    if (visible) pendingAnchor.current = {index: visible.dataset.month!, top: visible.getBoundingClientRect().top};
    savedOverflowAnchor.current = owner.style.overflowAnchor;
    owner.style.overflowAnchor = 'none';
    loading.current = true;
    setRange(current => extendMonthWindow(current, direction));
  }, [readingViewport]);

  useLayoutEffect(() => {
    const grid = container.current;
    if (!grid) return;
    scrollOwner.current = nearestVerticalScrollOwner<HTMLElement>(grid, node => getComputedStyle(node).overflowY)
      ?? document.scrollingElement as HTMLElement;
    return () => {
      if (scrollOwner.current && savedOverflowAnchor.current !== null) {
        scrollOwner.current.style.overflowAnchor = savedOverflowAnchor.current;
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (navKey.current === navigationKey) return;
    navKey.current = navigationKey;
    pendingNavigation.current = anchorDate;
    active.current = monthIndex(anchorDate);
    pendingAnchor.current = null;
    setRange(current => active.current < current.start || active.current > current.end
      ? {start: active.current - 1, end: active.current + 1}
      : {...current});
  }, [navigationKey, anchorDate]);

  useLayoutEffect(() => {
    const grid = container.current;
    const viewport = readingViewport();
    if (!grid || !viewport) return;
    if (pendingNavigation.current) {
      const date = pendingNavigation.current;
      const section = grid.querySelector<HTMLElement>('[data-month="' + monthIndex(date) + '"]');
      if (section) {
        const today = isSameDay(date, new Date()) ? section.querySelector<HTMLElement>('[data-date="' + format(date, 'yyyy-MM-dd') + '"]') : null;
        const target = today ?? section;
        scrollBy(target.getBoundingClientRect().top - (today ? viewport.point : viewport.top));
      }
      pendingNavigation.current = null;
    } else if (pendingAnchor.current) {
      const anchor = pendingAnchor.current;
      const section = grid.querySelector<HTMLElement>('[data-month="' + anchor.index + '"]');
      if (section) scrollBy(section.getBoundingClientRect().top - anchor.top);
      pendingAnchor.current = null;
    }
    loading.current = false;
    const frame = requestAnimationFrame(() => {
      if (scrollOwner.current && savedOverflowAnchor.current !== null) {
        scrollOwner.current.style.overflowAnchor = savedOverflowAnchor.current;
        savedOverflowAnchor.current = null;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [range, readingViewport, scrollBy]);

  useEffect(() => {
    const grid = container.current;
    const owner = scrollOwner.current;
    if (!grid || !owner) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const viewport = readingViewport();
      if (!viewport || pendingNavigation.current || loading.current) return;
      const sections = [...grid.querySelectorAll<HTMLElement>('[data-month]')].map(section => {
        const box = section.getBoundingClientRect();
        return {index: Number(section.dataset.month), top: box.top, bottom: box.bottom};
      });
      const next = activeMonthAt(sections, active.current, viewport.point);
      if (next !== active.current) {active.current = next; callback.current(monthDate(next));}
    };
    const onScroll = () => {if (!frame) frame = requestAnimationFrame(update);};
    const eventTarget = owner === document.scrollingElement ? window : owner;
    eventTarget.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', onScroll);
    return () => {
      eventTarget.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [readingViewport]);

  useEffect(() => {
    const owner = scrollOwner.current;
    if (!owner) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) load(entry.target === before.current ? -1 : 1);
      }
    }, {root: owner === document.scrollingElement ? null : owner, rootMargin: '480px 0px'});
    if (before.current) observer.observe(before.current);
    if (after.current) observer.observe(after.current);
    return () => observer.disconnect();
  }, [range, load]);

  return (
    <div ref={container} role="region" aria-label="Calendário mensal com rolagem contínua" className="relative min-w-0">
      <div ref={before} aria-hidden />
      <AppButton variant="ghost" size="sm" onClick={() => load(-1)}>Carregar mês anterior</AppButton>
      {Array.from({length: range.end - range.start + 1}, (_, offset) => range.start + offset).map(index => (
        <section key={index} data-month={index} aria-label={mes(monthDate(index))}>
          <div className="border-t-2 border-[var(--border-strong)] bg-[var(--bg-secondary)] px-3 py-2">
            <Text variant="label" as="h2">{mes(monthDate(index))}</Text>
          </div>
          {renderMonth(monthDate(index))}
        </section>
      ))}
      <AppButton variant="ghost" size="sm" onClick={() => load(1)}>Carregar próximo mês</AppButton>
      <div ref={after} aria-hidden />
    </div>
  );
}
