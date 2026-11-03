'use client';
import React from 'react';
import { StatusBadge, MaintStatusBadge } from '@/components/ui/StatusBadge';
import { useMachines } from '@/lib/useMachines';
import Link from 'next/link';
import { ExternalLink, HardHat, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/LoadingSkeleton';

export default function ActiveMachinesTable() {
  const { machines, loading } = useMachines();
  const displayMachines = machines?.filter(m => m?.status === 'working' || m?.status === 'idle')?.slice(0, 6);

  return (
<div className="bg-card rounded-2xl border border-border card-shadow">      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <HardHat size={15} className="text-primary" />
          </div>
          <div>
            <h2 className="text-base font-700 text-foreground">Active Machines</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Currently deployed across all sites</p>
          </div>
        </div>
        <span className="text-xs font-600 bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full">
          {displayMachines?.length ?? 0} machines
        </span>
      </div>
      {loading ? (
        <div role="status" aria-label="Loading" className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={`am-skel-${i}`} className="h-9 w-full" />)}
        </div>
      ) : (
        <div className="overflow-auto scrollbar-thin max-h-[360px]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-3 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide">Machine</th>
                <th className="text-left px-2 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide">Operator</th>
                <th className="text-left px-2 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Site</th>
                <th className="text-left px-2 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide hidden xl:table-cell">Start</th>
                <th className="text-right px-2 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide">Hrs</th>
                <th className="text-left px-2 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-3 py-2.5 text-xs font-600 text-muted-foreground uppercase tracking-wide">Maint.</th>
              </tr>
            </thead>
            <tbody>
              {displayMachines?.map((m) => (
                <tr key={m?.id} className="border-b border-border table-row-hover last:border-0">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div>
                        <p className="font-600 text-foreground text-sm leading-none">{m?.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 font-tabular">{m?.machineId}</p>
                      </div>
                      <Link href={`/machine-profile/${m?.id}`} className="text-muted-foreground hover:text-primary transition-colors" title="View profile">
                        <ExternalLink size={11} />
                      </Link>
                    </div>
                  </td>
                  <td className="px-2 py-2.5">
                    <span className="text-sm text-foreground">{m?.operator}</span>
                  </td>
                  <td className="px-2 py-2.5 hidden lg:table-cell">
                    <span className="text-sm text-foreground truncate max-w-[120px] block">{m?.site}</span>
                  </td>
                  <td className="px-2 py-2.5 hidden xl:table-cell">
                    <span className="text-sm font-tabular text-foreground">{m?.startTime}</span>
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    <span className="font-tabular font-700 text-foreground text-sm">{m?.hoursToday}h</span>
                  </td>
                  <td className="px-2 py-2.5">
                    <StatusBadge status={m?.status} size="sm" />
                  </td>
                  <td className="px-3 py-2.5">
                    <MaintStatusBadge status={m?.maintStatus} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="px-4 pb-4 pt-1">
        <Link href="/machine-profile" className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-600 text-primary hover:bg-secondary rounded-lg transition-colors">
          View All Machines <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}