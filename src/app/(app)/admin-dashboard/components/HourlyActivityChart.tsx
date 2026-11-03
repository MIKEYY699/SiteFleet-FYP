'use client';
import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { supabase } from '@/lib/supabaseClient';
import { friendlyError } from '@/lib/errors';
import LoadError from '@/components/ui/LoadError';
import { ChartSkeleton } from '@/components/ui/LoadingSkeleton';
import { Inbox } from 'lucide-react';
import { useCurrentProject } from '@/lib/ProjectContext';
import { useAppSettings } from '@/lib/AppSettingsContext';
import { todayInTz } from '@/lib/format';

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 card-shadow-md">
      <p className="text-xs font-600 text-foreground">{label}</p>
      <p className="text-sm font-700 text-primary mt-0.5">{payload[0].value.toFixed(2)} hrs today</p>
    </div>
  );
}

export default function HourlyActivityChart() {
  const { currentProjectId, ready } = useCurrentProject();
  const { timezone } = useAppSettings();
  const [data, setData] = useState<{ machine: string; hours: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!ready) return;
    if (!currentProjectId) {
      setData([]);
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      const todayStr = todayInTz(timezone);
      const { data: records, error: loadError } = await supabase
        .from('work_records')
        .select('machine_name, machine_code, total_hours')
        .eq('project_id', currentProjectId)
        .eq('entry_date', todayStr);
      if (loadError) {
        setError(friendlyError(loadError));
        setLoading(false);
        return;
      }
      setError(null);

      const byMachine = new Map<string, number>();
      (records || []).forEach(r => {
        const key = r.machine_code || r.machine_name;
        byMachine.set(key, (byMachine.get(key) || 0) + (r.total_hours || 0));
      });

      setData(Array.from(byMachine.entries()).map(([machine, hours]) => ({ machine, hours })));
      setLoading(false);
    };
    load();
  }, [currentProjectId, ready, timezone, reloadKey]);

  if (loading) {
    return <ChartSkeleton height={200} />;
  }

  if (error) {
    return <LoadError compact title="Could not load working hours" message={error} onRetry={() => setReloadKey(k => k + 1)} />;
  }

  if (data.length === 0) {
    return (
      <div className="h-[64px] flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Inbox size={16} className="opacity-40" />
        <span>No work logged yet today.</span>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="hourlyGradLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0B5FCE" />
            <stop offset="100%" stopColor="#15A36B" />
          </linearGradient>
          <linearGradient id="hourlyGradFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0B5FCE" stopOpacity={0.35} />
            <stop offset="60%" stopColor="#15A36B" stopOpacity={0.12} />
            <stop offset="95%" stopColor="#15A36B" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="machine" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="hours" stroke="url(#hourlyGradLine)" strokeWidth={2.5} fill="url(#hourlyGradFill)" dot={{ r: 3, fill: '#0B5FCE' }} activeDot={{ r: 5, fill: '#0B5FCE', strokeWidth: 2, stroke: '#fff' }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
