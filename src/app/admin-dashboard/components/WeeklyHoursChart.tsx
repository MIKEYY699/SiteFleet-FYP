'use client';
import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { supabase } from '@/lib/supabaseClient';
import { ChartSkeleton } from '@/components/ui/LoadingSkeleton';
import { useCurrentProject } from '@/lib/ProjectContext';

function getLast7Days() {
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    days.push({ date: dateStr, label });
  }
  return days;
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 card-shadow-md">
      <p className="text-xs font-600 text-foreground">{label}</p>
      <p className="text-sm font-700 text-primary mt-0.5">{payload[0].value.toFixed(1)} hrs</p>
    </div>
  );
}

export default function WeeklyHoursChart() {
  const { currentProjectId, ready } = useCurrentProject();
  const [data, setData] = useState<{ day: string; hours: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!currentProjectId) {
      setData([]);
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      const days = getLast7Days();
      const { data: records } = await supabase
        .from('work_records')
        .select('entry_date, total_hours')
        .eq('project_id', currentProjectId)
        .gte('entry_date', days[0].date)
        .lte('entry_date', days[6].date);

      const totals = days.map(d => ({
        day: d.label,
        hours: (records || []).filter(r => r.entry_date === d.date).reduce((s, r) => s + (r.total_hours || 0), 0),
      }));
      setData(totals);
      setLoading(false);
    };
    load();
  }, [currentProjectId, ready]);

  if (loading) {
    return <ChartSkeleton height={200} />;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barSize={30}>
        <defs>
          <linearGradient id="weeklyBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5B9FE3" />
            <stop offset="100%" stopColor="#0B5FCE" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', radius: 4 }} />
        <Bar dataKey="hours" radius={[8, 8, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-weekly-${index + 1}`} fill="url(#weeklyBarGrad)" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
