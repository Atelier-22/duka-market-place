import { CSSProperties, ReactNode } from 'react';
import { GlassCard } from './GlassCard';

/**
 * Content-shaped loading placeholders. Every skeleton mirrors the layout it
 * stands in for so the page does not jump when real data lands. All colours
 * come from brand tokens (see .shimmer-bg in index.css), so they work in
 * dark mode and under every accent.
 */

interface BoneProps {
  className?: string;
  style?: CSSProperties;
}

/** One shimmering bar or block. Size it with Tailwind classes. */
export function Bone({ className = '', style }: BoneProps) {
  return <span aria-hidden className={`block animate-shimmer shimmer-bg rounded-lg ${className}`} style={style} />;
}

/** A line of text. `w` is any Tailwind width class. */
export function BoneText({ w = 'w-2/3', className = '' }: { w?: string; className?: string }) {
  return <Bone className={`h-3.5 ${w} ${className}`} />;
}

export function BoneCircle({ size = 48, className = '' }: { size?: number; className?: string }) {
  return <Bone className={`shrink-0 rounded-full ${className}`} style={{ width: size, height: size }} />;
}

export function BonePill({ w = 'w-20', className = '' }: { w?: string; className?: string }) {
  return <Bone className={`h-6 rounded-full ${w} ${className}`} />;
}

export function BoneButton({ w = 'w-full', className = '' }: { w?: string; className?: string }) {
  return <Bone className={`h-11 rounded-xl ${w} ${className}`} />;
}

/** Wraps a skeleton so screen readers announce loading once, not per bone. */
export function SkeletonRegion({ label = 'Loading', children, className = '' }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      {children}
    </div>
  );
}

/* ---------- Recurring shapes ---------- */

/** Page title + one-line subtitle. */
export function SkeletonHeading({ subtitle = true }: { subtitle?: boolean }) {
  return (
    <div>
      <Bone className="h-7 w-48" />
      {subtitle && <BoneText w="w-64" className="mt-2.5" />}
    </div>
  );
}

/** 2×2 / 4-up DashboardStat grid. */
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <GlassCard key={i} hover={false}>
          <div className="flex items-start justify-between">
            <BoneText w="w-20" />
            <Bone className="h-4 w-4" />
          </div>
          <Bone className="mt-4 h-7 w-24" />
        </GlassCard>
      ))}
    </div>
  );
}

/** Rows shaped like "Order #… / meta line" with a status pill on the right. */
export function SkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <GlassCard key={i} hover={false} className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <BoneText w="w-32" />
            <BoneText w="w-48" className="mt-2.5 h-3" />
          </div>
          <BonePill />
        </GlassCard>
      ))}
    </div>
  );
}

/** A RequestCard: title, uppercase sourcing line, badge, two lines, price row. */
export function SkeletonRequestCard() {
  return (
    <GlassCard hover={false}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Bone className="h-5 w-3/4" />
          <BoneText w="w-24" className="mt-2.5 h-3" />
        </div>
        <BonePill w="w-16" />
      </div>
      <BoneText w="w-full" className="mt-4" />
      <BoneText w="w-5/6" className="mt-2" />
      <div className="mt-4 flex items-center justify-between border-t border-brand-green/10 pt-3">
        <BoneText w="w-28" />
        <BoneText w="w-12" className="h-3" />
      </div>
    </GlassCard>
  );
}

export function SkeletonRequestGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => <SkeletonRequestCard key={i} />)}
    </div>
  );
}

/** Chat list row: avatar, name + time, preview, request title, badge column. */
export function SkeletonChatRows({ count = 5 }: { count?: number }) {
  return (
    <GlassCard hover={false} padding="md">
      <div className="flex flex-col">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-brand-green/8 py-3 last:border-0">
            <BoneCircle size={48} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <BoneText w="w-32" />
                <BoneText w="w-10" className="h-3" />
              </div>
              <BoneText w="w-3/4" className="mt-2.5 h-3" />
              <BoneText w="w-1/2" className="mt-2 h-2.5" />
            </div>
            <BonePill w="w-14" />
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

/** A detail page: back link, title + badge, banner, and a tall main card. */
export function SkeletonDetail({ withMap = false }: { withMap?: boolean }) {
  return (
    <div className="mx-auto max-w-3xl pb-16">
      <BoneText w="w-14" className="mb-4 h-3" />
      <div className="flex items-center justify-between">
        <Bone className="h-7 w-44" />
        <BonePill />
      </div>
      <Bone className="mt-4 h-[68px] w-full rounded-xl2" />
      {withMap && <Bone className="mt-4 h-72 w-full rounded-xl2" />}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <GlassCard padding="lg" hover={false}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 pb-8 last:pb-0">
              <BoneCircle size={40} />
              <div className="flex-1 pt-1.5">
                <BoneText w="w-36" />
                <BoneText w="w-20" className="mt-2 h-3" />
              </div>
            </div>
          ))}
        </GlassCard>
        <div className="flex flex-col gap-4">
          <GlassCard hover={false}>
            <div className="flex items-center gap-3">
              <BoneCircle size={48} />
              <div className="flex-1">
                <BoneText w="w-32" />
                <BoneText w="w-24" className="mt-2 h-3" />
              </div>
            </div>
          </GlassCard>
          <GlassCard hover={false}>
            <BoneText w="w-24" className="h-3" />
            <BoneText w="w-full" className="mt-4" />
            <BoneText w="w-full" className="mt-2.5" />
            <BoneText w="w-2/3" className="mt-2.5" />
          </GlassCard>
          <BoneButton />
        </div>
      </div>
    </div>
  );
}

/** Admin-style table inside a GlassCard: header row + N body rows. */
export function SkeletonTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <GlassCard padding="sm" hover={false}>
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="grid gap-4 border-b border-brand-green/10 px-2 py-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }).map((_, i) => <BoneText key={i} w="w-16" className="h-3" />)}
          </div>
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="grid gap-4 border-b border-brand-green/5 px-2 py-3.5 last:border-0" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {Array.from({ length: cols }).map((_, c) => (
                <BoneText key={c} w={c === 0 ? 'w-3/4' : 'w-1/2'} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

/** Whole-app shell placeholder used while the session is being restored. */
export function SkeletonAppShell() {
  return (
    <SkeletonRegion label="Loading your account" className="min-h-screen">
      <div className="atmosphere" />
      <div className="glass sticky top-2 z-40 mx-2 mb-4 flex items-center justify-between rounded-2xl px-3 py-2 sm:mx-3">
        <div className="flex items-center gap-2 py-1">
          <BoneCircle size={26} />
          <Bone className="h-4 w-14" />
        </div>
        <BoneCircle size={44} />
      </div>
      <div className="mx-auto max-w-7xl p-3 sm:p-4">
        <SkeletonHeading />
        <div className="mt-6">
          <SkeletonStats />
        </div>
        <div className="mt-6">
          <SkeletonRows count={3} />
        </div>
      </div>
    </SkeletonRegion>
  );
}
