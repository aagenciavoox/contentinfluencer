export interface BarChartItem {
  id: string;
  label: string;
  value: number;
  percent: number;
  color?: string;
}

interface HorizontalBarChartProps {
  items: BarChartItem[];
  valueSuffix?: string;
}

export function HorizontalBarChart({items, valueSuffix = ''}: HorizontalBarChartProps) {
  if (items.length === 0) {
    return <p className="py-4 text-center text-sm text-[var(--text-tertiary)]">Sem dados no periodo</p>;
  }

  return (
    <div className="stack-md">
      {items.map(item => (
        <div key={item.id}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {item.color ? (
                <span className="h-2 w-2 shrink-0 rounded-full" style={{backgroundColor: item.color}} />
              ) : null}
              <span className="truncate text-sm font-medium text-[var(--text-primary)]">{item.label}</span>
            </div>
            <span className="shrink-0 text-xs font-medium text-[var(--text-secondary)]">
              {item.value}
              {valueSuffix} · {item.percent}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-hover)]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${item.percent}%`,
                backgroundColor: item.color || 'var(--accent-blue)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
