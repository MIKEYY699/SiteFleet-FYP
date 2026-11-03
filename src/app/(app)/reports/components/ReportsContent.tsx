'use client';
import React, { useState } from 'react';
import { Download, Clock, Wrench, TrendingUp, BarChart3, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { useMachines } from '@/lib/useMachines';
import { supabase } from '@/lib/supabaseClient';
import { friendlyError } from '@/lib/errors';
import LoadError from '@/components/ui/LoadError';
import { useCurrentProject } from '@/lib/ProjectContext';
import { useAppSettings } from '@/lib/AppSettingsContext';
import { formatDateTimeInTz, formatDisplayDate, lastNDays, lastNMonths, todayInTz } from '@/lib/format';
import { fetchAllRows } from '@/lib/fetchAll';
import { loadPdfTools } from '@/lib/pdf';
import { fetchMaintenanceSummary, fetchWorkHoursByDay } from '@/lib/reportTotals';

type MaintRow = {
  id: string;
  machine_name: string;
  machine_code: string;
  part_repaired_or_replaced: string;
  maintenance_type: string;
  maintenance_date: string;
  cost_of_maintenance: number | null;
};

const MAINT_COLUMNS = 'id, machine_name, machine_code, part_repaired_or_replaced, maintenance_type, maintenance_date, cost_of_maintenance';
// The on-screen cost table shows the latest entries; the exports contain all of them.
const COST_TABLE_ROWS = 25;

export default function ReportsContent() {
  const { machines, error: machinesError, reload: reloadMachines } = useMachines();
  const { currentProjectId, ready } = useCurrentProject();
  const { currency, timezone, money, moneyShort } = useAppSettings();
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [exporting, setExporting] = useState<'' | 'csv' | 'pdf'>('');
  const [exportError, setExportError] = useState<string | null>(null);
  const enabled = ready && !!currentProjectId;

  // Totals are added up by the database (see supabase/migrations/*_report_totals.sql),
  // so they stay correct however many records the project has.
  const months = lastNMonths(6, timezone);
  const today = todayInTz(timezone);
  const hoursQuery = useQuery({
    queryKey: ['reports', currentProjectId, 'hoursByDay', months[0].key, today],
    queryFn: () => fetchWorkHoursByDay(currentProjectId!, `${months[0].key}-01`, today),
    enabled,
  });
  const summaryQuery = useQuery({
    queryKey: ['maintenanceRecords', currentProjectId, 'summary'],
    queryFn: () => fetchMaintenanceSummary(currentProjectId!),
    enabled,
  });
  const costTableQuery = useQuery({
    queryKey: ['reports', currentProjectId, 'latestCosts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select(MAINT_COLUMNS)
        .eq('project_id', currentProjectId!)
        .gt('cost_of_maintenance', 0)
        .order('maintenance_date', { ascending: false })
        .order('id')
        .limit(COST_TABLE_ROWS);
      if (error) throw new Error(friendlyError(error));
      return (data || []) as MaintRow[];
    },
    enabled,
  });

  // Exports need every record, so they're fetched (in batches) only when clicked.
  const fetchAllMaintenance = async () => {
    const { data, error } = await fetchAllRows<MaintRow>((from, to) => supabase
      .from('maintenance_records')
      .select(MAINT_COLUMNS)
      .eq('project_id', currentProjectId!)
      .order('maintenance_date', { ascending: false })
      .order('id')
      .range(from, to));
    if (error) throw new Error(friendlyError(error));
    return data;
  };

  const runExport = async (kind: 'csv' | 'pdf', build: (rows: MaintRow[]) => Promise<void> | void) => {
    if (!currentProjectId || exporting) return;
    setExporting(kind);
    setExportError(null);
    try {
      await build(await fetchAllMaintenance());
    } catch (err) {
      console.error('Export failed', err);
      setExportError(err instanceof Error ? err.message : friendlyError(err));
    } finally {
      setExporting('');
    }
  };
  const handleExport = () => runExport('csv', maintRecords => {
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
  });

  const handleExportPDF = () => runExport('pdf', async maintRecords => {
    const { jsPDF, autoTable } = await loadPdfTools();
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
  });

  const reportError = hoursQuery.error?.message || summaryQuery.error?.message || costTableQuery.error?.message || machinesError;
  const retryReport = () => { hoursQuery.refetch(); summaryQuery.refetch(); costTableQuery.refetch(); reloadMachines(); };

  const hoursByDay = hoursQuery.data ?? new Map<string, number>();
  const summary = summaryQuery.data;
  const costRows = costTableQuery.data ?? [];
  const round2 = (n: number) => Math.round(n * 100) / 100;

  // Both series use `label` so the chart can switch between them with one dataKey.
  const WEEKLY_DATA = lastNDays(7, timezone).map(d => ({
    label: d.label,
    hours: round2(hoursByDay.get(d.date) ?? 0),
  }));

  const MONTHLY_DATA = months.map(m => ({
    label: m.label,
    hours: round2([...hoursByDay].filter(([date]) => date.startsWith(m.key)).reduce((s, [, h]) => s + h, 0)),
  }));

  const totalHoursToday = machines.reduce((s, m) => s + (m.hoursToday || 0), 0);
  const totalLifetime = machines.reduce((s, m) => s + (m.totalLifetimeHours || 0), 0);
  const totalMaintCost = summary?.totalCost ?? 0;

  const MACHINE_HOURS = machines
    .map(m => ({ name: m.machineId, fullName: m.name, hours: m.totalLifetimeHours, today: m.hoursToday }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 8);

  const MAINT_TYPE_PIE = [
    { name: 'Routine', value: summary?.routineCount ?? 0, color: '#0B5FCE' },
    { name: 'Repair', value: summary?.repairCount ?? 0, color: '#8B5E3C' },
    { name: 'Emergency', value: summary?.emergencyCount ?? 0, color: '#E23F3F' },
  ];

  // Exporting after a failed load would produce an empty or partial report.
  if (reportError) {
    return <LoadError title="Could not load report data" message={reportError} onRetry={retryReport} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={!!exporting} className="btn-secondary flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-600 disabled:opacity-60">
            {exporting === 'csv' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Export CSV
          </button>
          <button onClick={handleExportPDF} disabled={!!exporting} className="btn-secondary flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-600 disabled:opacity-60">
            {exporting === 'pdf' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Export PDF
          </button>
        </div>
      </div>

      {exportError && <LoadError title="Could not create the export" message={exportError} />}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Hours Today', value: `${totalHoursToday.toFixed(1)}h`, icon: Clock, cls: 'kpi-card-hours' },
          { label: 'Total Fleet Hours', value: `${totalLifetime.toLocaleString()}h`, icon: TrendingUp, cls: 'kpi-card-completed' },
          { label: 'Maintenance Records', value: summary?.recordCount ?? '—', icon: Wrench, cls: 'kpi-card-working' },
          { label: 'Total Maint. Cost', value: summary ? moneyShort(totalMaintCost) : '—', icon: BarChart3, cls: 'kpi-card-due-soon' },
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
          <p className="text-xs text-muted-foreground mt-0.5">Latest {COST_TABLE_ROWS} costed entries. Use Export for the full list.</p>
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
              {costRows.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-sm text-muted-foreground">No costed maintenance records yet.</td></tr>
              ) : costRows.map(r => (
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
