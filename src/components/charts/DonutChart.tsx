interface DonutChartProps {
  value: number | null;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export function DonutChart({value, size = 96, strokeWidth = 10, label}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const hasValue = value !== null && Number.isFinite(value);
  const clamped = hasValue ? Math.max(0, Math.min(100, value)) : 0;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{width: size, height: size}}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden={!hasValue}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-hover)"
          strokeWidth={strokeWidth}
        />
        {hasValue ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--accent-green)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
        <span className="text-xl font-bold text-[var(--text-primary)]">
          {hasValue ? `${clamped}%` : '—'}
        </span>
        {label ? <span className="text-xs font-medium leading-tight text-[var(--text-tertiary)]">{label}</span> : null}
      </div>
    </div>
  );
}
