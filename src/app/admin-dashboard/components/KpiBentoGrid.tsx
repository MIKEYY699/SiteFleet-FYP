'use client';
import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, HardHat, Timer, CheckCircle2, Clock, Wrench, AlertTriangle, BarChart3 } from 'lucide-react';
import { useMachines } from '@/lib/useMachines';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentProject } from '@/lib/ProjectContext';

interface KpiBentoGridProps {
  onCardClick?: (filter: string) => void;
}

type DbWorkRecord = { id: string; entry_date: string; total_hours: number | null; status: string };

function getDateStr(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  const diff = previous === 0 ? 100 : Math.round(((current - previous) / previous) * 100);
  const isUp = diff >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-2xs font-700 ${isUp ? 'text-success' : 'text-danger'}`}>
      {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {Math.abs(diff)}%
    </span>
  );
}

export default function KpiBentoGrid({ onCardClick }: KpiBentoGridProps) {
  const { machines, loading } = useMachines();
  const { currentProjectId, ready } = useCurrentProject();
  const [todayRecords, setTodayRecords] = useState<DbWorkRecord[]>([]);
  const [yesterdayRecords, setYesterdayRecords] = useState<DbWorkRecord[]>([]);
  const [totalCompleted, setTotalCompleted] = useState<number>(0);
  const [totalMaintCost, setTotalMaintCost] = useState<number | null>(null);
  const [recordsLoading, setRecordsLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!currentProjectId) {
      setTodayRecords([]);
      setYesterdayRecords([]);
      setTotalCompleted(0);
      setTotalMaintCost(0);
      setRecordsLoading(false);
      return;
    }
    const load = async () => {
      setRecordsLoading(true);
      const todayStr = getDateStr(0);
      const yestStr = getDateStr(-1);
      const [{ data: today }, { data: yest }, { count: completedCount }, { data: maint }] = await Promise.all([
        supabase.from('work_records').select('id, entry_date, total_hours, status').eq('project_id', currentProjectId).eq('entry_date', todayStr),
        supabase.from('work_records').select('id, entry_date, total_hours, status').eq('project_id', currentProjectId).eq('entry_date', yestStr),
        supabase.from('work_records').select('id', { count: 'exact', head: true }).eq('project_id', currentProjectId).eq('status', 'completed'),
        supabase.from('maintenance_records').select('cost_of_maintenance').eq('project_id', currentProjectId),
      ]);
      if (today) setTodayRecords(today as DbWorkRecord[]);
      if (yest) setYesterdayRecords(yest as DbWorkRecord[]);
      setTotalCompleted(completedCount || 0);
      if (maint) setTotalMaintCost(maint.reduce((s, r) => s + (r.cost_of_maintenance || 0), 0));
      setRecordsLoading(false);
    };
    load();
  }, [currentProjectId, ready]);

  const working = machines.filter(m => m.status === 'working');
  const idle = machines.filter(m => m.status === 'idle');
  const dueSoon = machines.filter(m => m.maintStatus === 'due-soon');
  const overdue = machines.filter(m => m.maintStatus === 'overdue');

  const totalHoursToday = todayRecords.reduce((s, r) => s + (r.total_hours || 0), 0);
  const totalHoursYesterday = yesterdayRecords.reduce((s, r) => s + (r.total_hours || 0), 0);

  const numCls = (n: number, base: string) => (n === 0 ? 'text-muted-foreground' : base);

const STATS = [
    { id: 'working', label: 'Working', dotCls: 'bg-success', icon: HardHat, glowCls: 'text-success bg-success/10', value: loading ? '—' : `${working.length}`, valueCls: loading ? 'text-foreground' : numCls(working.length, 'text-success'), filter: 'working', trend: null as React.ReactNode },
    { id: 'idle', label: 'Idle', dotCls: 'bg-slate-400', icon: Timer, glowCls: 'text-slate-400 bg-slate-100', value: loading ? '—' : `${idle.length}`, valueCls: 'text-muted-foreground', filter: 'idle', trend: null },
    { id: 'completed', label: 'Completed', dotCls: 'bg-completed', icon: CheckCircle2, glowCls: 'text-completed bg-completed/10', value: recordsLoading ? '—' : `${totalCompleted}`, valueCls: recordsLoading ? 'text-foreground' : numCls(totalCompleted, 'text-completed'), filter: 'completed', trend: null },
    { id: 'hours', label: 'Hours Today', dotCls: 'bg-earth', icon: Clock, glowCls: 'text-earth bg-earth/10', value: recordsLoading ? '—' : `${totalHoursToday.toFixed(1)}h`, valueCls: recordsLoading ? 'text-foreground' : numCls(totalHoursToday, 'text-earth'), filter: 'hours', trend: !recordsLoading && <TrendBadge current={totalHoursToday} previous={totalHoursYesterday} /> },
    { id: 'due-soon', label: 'Due Soon', dotCls: 'bg-idle', icon: Wrench, glowCls: 'text-idle bg-idle/10', value: loading ? '—' : `${dueSoon.length}`, valueCls: loading ? 'text-foreground' : numCls(dueSoon.length, 'text-idle'), filter: 'due-soon', trend: null },
    { id: 'overdue', label: 'Overdue', dotCls: 'bg-danger', icon: AlertTriangle, glowCls: 'text-danger bg-danger/10', value: loading ? '—' : `${overdue.length}`, valueCls: loading ? 'text-foreground' : numCls(overdue.length, 'text-danger'), filter: 'overdue', trend: null },
    { id: 'cost', label: 'Maint. Cost', dotCls: 'bg-primary', icon: BarChart3, glowCls: 'text-primary bg-primary/10', value: totalMaintCost === null ? '—' : totalMaintCost >= 1000 ? `Rs ${(totalMaintCost / 1000).toFixed(0)}K` : `Rs ${totalMaintCost}`, valueCls: totalMaintCost ? 'text-primary' : 'text-muted-foreground', filter: 'cost', trend: null },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border card-shadow overflow-hidden">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 divide-x divide-y divide-border">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
          <button
            key={stat.id}
            onClick={() => onCardClick?.(stat.filter)}
            className="w-full px-4 py-4 text-left hover:bg-muted/40 transition-colors relative"
          >
            <div className={`absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center ${stat.glowCls}`}>
              <Icon size={10} />
            </div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${stat.dotCls}`} />
              <span className="text-xs font-700 text-muted-foreground whitespace-nowrap">{stat.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-tabular font-800 leading-none ${stat.id === 'cost' ? 'text-2xl' : 'text-[28px]'} ${stat.valueCls}`}>{stat.value}</span>
              {stat.trend}
            </div>
          </button>
          );
        })}
      </div>
    </div>
  );
}