interface Point {
  label: string;
  value: number;
  secondary?: number;
}

interface BarChartProps {
  points: Point[];
  height?: number;
  format?: (v: number) => string;
  ariaLabel: string;
  emptyText?: string;
}

export function BarChart({ points, height = 140, format = (v) => String(v), ariaLabel, emptyText = 'No data for this range yet.' }: BarChartProps) {
  const max = Math.max(0, ...points.map((p) => p.value));
  if (points.length === 0 || max === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-dashed border-line px-4 text-center text-small text-ink-3" style={{ height }}>
        {emptyText}
      </div>
    );
  }
  const step = Math.max(1, Math.ceil(points.length / 7));
  return (
    <div role="img" aria-label={ariaLabel} className="w-full">
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {points.map((p, i) => {
          const h = Math.max(2, Math.round((p.value / max) * (height - 18)));
          return (
            <div key={`${p.label}-${i}`} className="group relative flex flex-1 flex-col items-center justify-end" style={{ height }}>
              <span className="pointer-events-none absolute -top-1 hidden -translate-y-full whitespace-nowrap rounded-md bg-ink px-2 py-1 text-caption text-white group-hover:block">
                {p.label}: {format(p.value)}
              </span>
              <div className="w-full rounded-t-md bg-brand-green transition-[height] duration-300" style={{ height: h }} />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-[3px]">
        {points.map((p, i) => (
          <span key={`${p.label}-l-${i}`} className="flex-1 truncate text-center text-[10px] text-ink-3">
            {i % step === 0 ? p.label : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Sparkline({ values, width = 120, height = 36 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <div style={{ width, height }} />;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const d = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i / (values.length - 1)) * width} ${height - ((v - min) / span) * (height - 4) - 2}`)
    .join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="overflow-visible">
      <path d={d} fill="none" stroke="rgb(var(--brand-green))" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function HorizontalBars({ rows, format = (v) => String(v) }: { rows: { label: string; value: number; hint?: string }[]; format?: (v: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return <p className="text-small text-ink-3">Nothing to show yet.</p>;
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate text-ink">{r.label}</span>
            <span className="shrink-0 tabular-nums text-ink-2">{format(r.value)}</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-brand-green" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </div>
          {r.hint && <p className="mt-0.5 text-caption text-ink-3">{r.hint}</p>}
        </li>
      ))}
    </ul>
  );
}
