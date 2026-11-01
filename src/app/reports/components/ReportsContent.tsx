'use client';
import React, { useState, useEffect } from 'react';
import { Download, Clock, Wrench, TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useMachines } from '@/lib/useMachines';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentProject } from '@/lib/ProjectContext';
import { useAppSettings } from '@/lib/AppSettingsContext';
import { formatDateTimeInTz, formatDisplayDate, lastNDays, lastNMonths, todayInTz } from '@/lib/format';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
type MaintRow = {
  id: string;
  machine_name: string;
  machine_code: string;
  part_repaired_or_replaced: string;
  maintenance_type: string;
  maintenance_date: string;
  cost_of_maintenance: number | null;
};

type WorkHoursRow = {
  entry_date: string;
  total_hours: number | null;
};

export default function ReportsContent() {
  const { machines } = useMachines();
  const { currentProjectId, ready } = useCurrentProject();
  const { currency, timezone, money, moneyShort } = useAppSettings();

  const handleExport = () => {
    const rows = [
      ['Machine', 'Machine Code', 'Part', 'Type', 'Date', `Cost (${currency})`],
      ...maintRecords.map(r => [r.machine_name, r.machine_code, r.part_repaired_or_replaced, r.maintenance_type, r.maintenance_date, r.cost_of_maintenance ?? '']),
    ];
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maintenance-report-${todayInTz(timezone)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('SKBEquip — Maintenance Cost Report', 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated: ${formatDateTimeInTz(new Date(), timezone)} (${timezone})`, 14, 25);
    autoTable(doc, {
      startY: 32,
      head: [['Machine', 'Code', 'Part', 'Type', 'Date', 'Cost']],
      body: maintRecords.map(r => [
        r.machine_name, r.machine_code, r.part_repaired_or_replaced, r.maintenance_type, formatDisplayDate(r.maintenance_date),
        r.cost_of_maintenance ? money(r.cost_of_maintenance) : '-',
      ]),
    });
    doc.save(`maintenance-report-${todayInTz(timezone)}.pdf`);
  };
 const [maintRecords, setMaintRecords] = useState<MaintRow[]>([]);
  const [workHours, setWorkHours] = useState<WorkHoursRow[]>([]);
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');

  useEffect(() => {
    if (!ready) return;
    if (!currentProjectId) {
      setMaintRecords([]);
      setWorkHours([]);
      return;
    }
    const load = async () => {
      const [{ data: maint }, { data: work }] = await Promise.all([
        supabase.from('maintenance_records').select('*').eq('project_id', currentProjectId),
        supabase.from('work_records').select('entry_date, total_hours').eq('project_id', currentProjectId),
      ]);
      if (maint) setMaintRecords(maint as MaintRow[]);
      if (work) setWorkHours(work as WorkHoursRow[]);
    };
    load();
  }, [currentProjectId, ready]);

  // Both series use `label` so the chart can switch between them with one dataKey.
  const WEEKLY_DATA = lastNDays(7, timezone).map(d => ({
    label: d.label,
    hours: Math.round(workHours.filter(r => r.entry_date === d.date).reduce((s, r) => s + (r.total_hours || 0), 0) * 100) / 100,
  }));

  const MONTHLY_DATA = lastNMonths(6, timezone).map(m => ({
    label: m.label,
    hours: Math.round(workHours.filter(r => r.entry_date.startsWith(m.key)).reduce((s, r) => s + (r.total_hours || 0), 0) * 100) / 100,
  }));

  const totalHoursToday = machines.reduce((s, m) => s + (m.hoursToday || 0), 0);
  const totalLifetime = machines.reduce((s, m) => s + (m.totalLifetimeHours || 0), 0);
  const totalMaintCost = maintRecords.reduce((s, r) => s + (r.cost_of_maintenance ?? 0), 0);

  const MACHINE_HOURS = machines
    .map(m => ({ name: m.machineId, fullName: m.name, hours: m.totalLifetimeHours, today: m.hoursToday }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 8);

  const STATUS_PIE = [
    { name: 'Working', value: machines.filter(m => m.status === 'working').length, color: '#15A36B' },
    { name: 'Idle', value: machines.filter(m => m.status === 'idle').length, color: '#D97706' },
    { name: 'Maintenance', value: machines.filter(m => m.status === 'maintenance').length, color: '#E23F3F' },
    { name: 'Completed', value: machines.filter(m => m.status === 'completed').length, color: '#0B5FCE' },
  ];

  const MAINT_TYPE_PIE = [
    { name: 'Routine', value: maintRecords.filter(r => r.maintenance_type === 'Routine').length, color: '#0B5FCE' },
    { name: 'Repair', value: maintRecords.filter(r => r.maintenance_type === 'Repair').length, color: '#8B5E3C' },
    { name: 'Emergency', value: maintRecords.filter(r => r.maintenance_type === 'Emergency').length, color: '#E23F3F' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-end flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-600">
            <Download size={15} /> Export CSV
          </button>
          <button onClick={handleExportPDF} className="btn-secondary flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-600">
            <Download size={15} /> Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Hours Today', value: `${totalHoursToday.toFixed(1)}h`, icon: Clock, cls: 'kpi-card-hours' },
          { label: 'Total Fleet Hours', value: `${totalLifetime.toLocaleString()}h`, icon: TrendingUp, cls: 'kpi-card-completed' },
          { label: 'Maintenance Records', value: maintRecords.length, icon: Wrench, cls: 'kpi-card-working' },
          { label: 'Total Maint. Cost', value: moneyShort(totalMaintCost), icon: BarChart3, cls: 'kpi-card-due-soon' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-xl p-4 flex items-center gap-3 ${s.cls}`}>
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <Icon size={18} className="text-white" />
              </div>
              <div>
                <div className="font-display text-xl font-700 text-white font-tabular">{s.value}</div>
                <div className="text-xs text-white/80 font-500">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-card rounded-xl border border-border card-shadow p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-700 text-foreground">Working Hours Overview</h2>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button onClick={() => setPeriod('weekly')} className={`px-3 py-1.5 text-xs font-600 rounded-md transition-all ${period === 'weekly' ? 'bg-card text-foreground card-shadow' : 'text-muted-foreground'}`}>Weekly</button>
            <button onClick={() => setPeriod('monthly')} className={`px-3 py-1.5 text-xs font-600 rounded-md transition-all ${period === 'monthly' ? 'bg-card text-foreground card-shadow' : 'text-muted-foreground'}`}>Monthly</button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={period === 'weekly' ? WEEKLY_DATA : MONTHLY_DATA} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} cursor={{ fill: 'rgba(11,95,206,0.05)' }} />
            <Bar dataKey="hours" fill="#0B5FCE" radius={[4, 4, 0, 0]} name="Hours" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border card-shadow p-5">
          <h2 className="text-sm font-700 text-foreground mb-4">Total Lifetime Hours per Machine</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={MACHINE_HOURS} layout="vertical" barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} width={50} />
              <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} formatter={(v, n, p) => [`${v}h`, p?.payload?.fullName]} />
              <Bar dataKey="hours" fill="#8B5E3C" radius={[0, 4, 4, 0]} name="Lifetime Hours" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <div className="bg-card rounded-xl border border-border card-shadow p-5">
            <h2 className="text-xs font-700 text-foreground mb-3">Maintenance Type Breakdown</h2>
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie data={MAINT_TYPE_PIE} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={3}>
                  {MAINT_TYPE_PIE.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border card-shadow overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-700 text-foreground">Maintenance Cost Summary</h2>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-5 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Machine</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Part</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Date</th>
                <th className="text-right px-5 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Cost</th>
              </tr>
            </thead>
            <tbody>
              {maintRecords.filter(r => r.cost_of_maintenance).length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-sm text-muted-foreground">No costed maintenance records yet.</td></tr>
              ) : maintRecords.filter(r => r.cost_of_maintenance).map(r => (
                <tr key={r.id} className="border-b border-border table-row-hover last:border-0">
                  <td className="px-5 py-3">
                    <p className="font-600 text-foreground text-sm">{r.machine_name}</p>
                    <p className="text-xs text-muted-foreground">{r.machine_code}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{r.part_repaired_or_replaced}</td>
                  <td className="px-4 py-3">
                    <span className={`text-2xs font-600 px-2 py-0.5 rounded-full ${r.maintenance_type === 'Routine' ? 'bg-primary/10 text-primary' : r.maintenance_type === 'Emergency' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-idle'}`}>
                      {r.maintenance_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground font-tabular">{formatDisplayDate(r.maintenance_date)}</td>
                 <td className="px-5 py-3 text-right font-tabular font-700 text-foreground">{money(r.cost_of_maintenance ?? 0)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted/40 border-t border-border">
                <td colSpan={4} className="px-5 py-3 text-sm font-700 text-foreground">Total</td>
                <td className="px-5 py-3 text-right font-tabular font-800 text-foreground">{money(totalMaintCost)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
