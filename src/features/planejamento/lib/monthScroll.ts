export const monthIndex = (date: Date) => date.getFullYear() * 12 + date.getMonth();
export const monthDate = (index: number) => new Date(Math.floor(index / 12), ((index % 12) + 12) % 12, 1, 12);

/** Uma margem na fronteira impede alternância dos indicadores por pequenos movimentos. */
export function activeMonthAt(
  sections: readonly {index: number; top: number; bottom: number}[],
  current: number,
  point: number,
): number {
  const active = sections.find(section => section.index === current);
  if (active && active.top <= point + 24 && active.bottom > point - 24) return current;
  return sections.find(section => section.top <= point && section.bottom > point)?.index ?? current;
}

/** Janela limitada de DOM, sem limitar a navegação a um número de meses. */
export function extendMonthWindow(range: {start: number; end: number}, direction: -1 | 1, limit = 15) {
  const trim = range.end - range.start + 1 >= limit;
  return direction === -1
    ? {start: range.start - 1, end: range.end - (trim ? 1 : 0)}
    : {start: range.start + (trim ? 1 : 0), end: range.end + 1};
}

/** Ignora wrappers sem rolagem: desktop e mobile usam o main do respectivo shell. */
export function nearestVerticalScrollOwner<T extends {parentElement: T | null}>(
  element: T,
  overflowY: (node: T) => string,
): T | null {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (/^(auto|scroll|overlay)$/.test(overflowY(parent))) return parent;
  }
  return null;
}

/** Coordenadas da parte legível da página, abaixo de todas as barras fixas. */
export function monthReadingViewport({top, height, toolbarTop, toolbarHeight, weekdayHeight}: {
  top: number; height: number; toolbarTop: number; toolbarHeight: number; weekdayHeight: number;
}) {
  const bottom = top + height;
  const readingTop = Math.min(bottom, top + toolbarTop + toolbarHeight + weekdayHeight);
  return {top: readingTop, bottom, point: readingTop + Math.min((bottom - readingTop) * 0.35, 200)};
}
