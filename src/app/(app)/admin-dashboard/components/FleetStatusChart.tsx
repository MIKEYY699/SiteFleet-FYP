'use client';
import React from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { useMachines } from '@/lib/useMachines';
import { Skeleton } from '@/components/ui/LoadingSkeleton';

export default function FleetStatusChart() {
  const { machines, loading } = useMachines();

  const STATUS_PIE = [
    { name: 'Working', value: machines.filter(m => m.status === 'working').length, color: '#15A36B' },
    { name: 'Idle', value: machines.filter(m => m.status === 'idle').length, color: '#D97706' },
    { name: 'Completed', value: machines.filter(m => m.status === 'completed').length, color: '#0B5FCE' },
    { name: 'In Maintenance', value: machines.filter(m => m.status === 'maintenance').length, color: '#8B5CF6' },
  ].filter(s => s.value > 0);

  return (
    <div className="bg-card rounded-2xl border border-border card-shadow p-4 h-full flex flex-col min-h-0 overflow-hidden">
      <div className="mb-2 shrink-0">
        <h2 className="text-xs font-700 text-foreground">Fleet Status Distribution</h2>
        <p className="text-2xs text-muted-foreground mt-0.5">What each machine is doing right now (not maintenance health)</p>
      </div>
      {loading ? (
        <div className="flex-1 flex items-center justify-center" role="status" aria-label="Loading">
          <Skeleton className="w-40 h-40 rounded-full" />
        </div>
      ) : STATUS_PIE.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">No machines yet.</div>
      ) : (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%" minHeight={200}>
            <PieChart>
              <Pie data={STATUS_PIE} cx="50%" cy="42%" innerRadius={54} outerRadius={86} dataKey="value" paddingAngle={4}>
                {STATUS_PIE.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '9px', lineHeight: '13px' }} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}