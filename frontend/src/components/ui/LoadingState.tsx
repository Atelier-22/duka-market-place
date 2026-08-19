export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-brand-green-deep/60">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-green/20 border-t-brand-green-fresh" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function SkeletonCard() {
  return <div className="h-32 w-full animate-shimmer shimmer-bg rounded-xl2" />;
}
