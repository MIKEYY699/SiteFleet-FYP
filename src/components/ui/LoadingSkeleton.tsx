import React from 'react';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-muted rounded-md ${className}`} />
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border border-border p-5 card-shadow">
      <div className="flex items-start justify-between mb-4">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-8 w-20 mb-1.5" />
      <Skeleton className="h-4 w-28" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 8 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={`skel-col-${i + 1}`} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="animate-pulse bg-muted rounded-lg w-full" style={{ height }} />
  );
}

// ─── Page-level placeholders ────────────────────────────────────────────────
// Shown while a page's data loads, shaped like the content that will replace them,
// so the layout doesn't jump. role="status" lets screen readers announce "Loading".

export function StatRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={`stat-skel-${i}`} className="bg-card rounded-xl border border-border p-4 card-shadow">
          <Skeleton className="h-9 w-9 rounded-lg mb-3" />
          <Skeleton className="h-7 w-16 mb-1.5" />
          <Skeleton className="h-3.5 w-24" />
        </div>
      ))}
    </div>
  );
}

export function TableCardSkeleton({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div role="status" aria-label="Loading" className="bg-card rounded-xl border border-border card-shadow overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={`row-skel-${r}`} className="px-5 py-3.5 grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {Array.from({ length: cols }).map((__, c) => (
              <Skeleton key={`cell-skel-${r}-${c}`} className={`h-4 ${c === 0 ? 'w-full' : 'w-3/4'}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={`card-skel-${i}`} className="bg-card rounded-xl border border-border p-5 card-shadow">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
          </div>
          <div className="flex gap-2 mt-4">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 3, compact = false }: { rows?: number; compact?: boolean }) {
  return (
    <div role="status" aria-label="Loading" className={compact ? 'space-y-2' : 'space-y-4'}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={`list-skel-${i}`} className={`rounded-xl border border-border ${compact ? 'p-3' : 'p-5 bg-card card-shadow'}`}>
          <div className="flex items-center gap-3">
            <Skeleton className={`${compact ? 'h-7 w-7' : 'h-10 w-10'} rounded-lg`} />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          {!compact && <Skeleton className="h-2 w-full mt-4 rounded-full" />}
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-6">
      {Array.from({ length: sections }).map((_, i) => (
        <div key={`form-skel-${i}`} className="bg-card rounded-xl border border-border card-shadow p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="flex justify-end"><Skeleton className="h-9 w-28" /></div>
        </div>
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-10 w-80 max-w-full rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1].map(i => (
          <div key={`profile-skel-${i}`} className="bg-card rounded-xl border border-border card-shadow p-5 space-y-3">
            <Skeleton className="h-4 w-40 mb-2" />
            {Array.from({ length: 6 }).map((_, r) => (
              <div key={`profile-row-${i}-${r}`} className="flex justify-between"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-3.5 w-20" /></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
