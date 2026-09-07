interface TabItem<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  items: TabItem<T>[];
  ariaLabel: string;
  className?: string;
}

/** Segmented control for switching views inside a page. */
export function Tabs<T extends string>({ value, onChange, items, ariaLabel, className = '' }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={`inline-flex max-w-full gap-1 rounded-xl border border-line bg-surface-2 p-1 ${className}`}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={[
              'flex min-h-[36px] items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition-[background-color,color,box-shadow,transform] duration-150 ease-standard active:scale-[0.98]',
              active ? 'bg-surface text-brand-green-deep shadow-card' : 'text-ink-2 hover:text-ink',
            ].join(' ')}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={`rounded-full px-1.5 text-caption font-semibold ${active ? 'bg-brand-green-mist text-brand-green-deep' : 'bg-line/70 text-ink-2'}`}>
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
