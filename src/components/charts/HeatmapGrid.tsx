interface HeatmapCell {
  key: string;
  label: string;
  value: number;
}

interface HeatmapGridProps {
  cells: HeatmapCell[];
  columns?: number;
  maxValue?: number;
}

export function HeatmapGrid({cells, columns = 7, maxValue}: HeatmapGridProps) {
  const peak = maxValue ?? Math.max(...cells.map(cell => cell.value), 1);

  return (
    <div
      className="grid gap-1"
      style={{gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`}}
    >
      {cells.map(cell => {
        const intensity = cell.value / peak;
        return (
          <div
            key={cell.key}
            title={`${cell.label}: ${cell.value}`}
            className="flex aspect-square flex-col items-center justify-center rounded-[4px] border border-[var(--border-color)] text-xs font-medium"
            style={{
              backgroundColor: `color-mix(in srgb, var(--accent-blue) ${Math.round(intensity * 72)}%, var(--bg-hover))`,
            }}
          >
            <span className="text-[var(--text-tertiary)]">{cell.label}</span>
            {cell.value > 0 ? <span className="text-[var(--text-primary)]">{cell.value}</span> : null}
          </div>
        );
      })}
    </div>
  );
}
