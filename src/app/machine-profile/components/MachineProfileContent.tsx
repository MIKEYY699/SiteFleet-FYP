'use client';
import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, User, Clock, Wrench, AlertTriangle, TrendingUp, HardHat } from 'lucide-react';
import Link from 'next/link';
import { useMachines } from '@/lib/useMachines';
import { supabase } from '@/lib/supabaseClient';
import { StatusBadge, MaintStatusBadge } from '@/components/ui/StatusBadge';

interface Props {
  machineId: string;
}

type MaintRow = {
  id: string;
  maintenance_date: string;
  maintenance_type: string;
  part_repaired_or_replaced: string;
  description_of_work: string;
  technician_name: string | null;
  recommended_hours_until_next: number;
  hours_at_maintenance: number;
  status: string;
  cost_of_maintenance: number | null;
};

type AlertRow = {
  id: string;
  part: string;
  hours_since: number;
  limit_hours: number;
  remaining: number;
  status: string;
};
type WorkRecordRow = {
  id: string;
  entry_date: string;
  start_time: string;
  end_time: string | null;
  total_hours: number | null;
  status: string;
  project_site: string;
  operator: string;
};

export default function MachineProfileContent({ machineId }: Props) {
  const { machines, loading: machinesLoading } = useMachines();
  const machine = machines.find(m => m.id === machineId);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'work'>('overview');
  const [maintRecords, setMaintRecords] = useState<MaintRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [workRecords, setWorkRecords] = useState<WorkRecordRow[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: maint }, { data: alertData }] = await Promise.all([
        supabase.from('maintenance_records').select('*').eq('machine_id', machineId).order('maintenance_date', { ascending: false }),
        supabase.from('alerts').select('*').eq('machine_id', machineId),
      ]);
      if (maint) setMaintRecords(maint as MaintRow[]);
      if (alertData) setAlerts(alertData as AlertRow[]);

      if (machine?.machineId) {
        const { data: work } = await supabase
          .from('work_records')
          .select('id, entry_date, start_time, end_time, total_hours, status, project_site, operator')
          .eq('machine_code', machine.machineId)
          .eq('project_id', machine.projectId)
          .order('entry_date', { ascending: false });
        if (work) setWorkRecords(work as WorkRecordRow[]);
      }

      setDataLoading(false);
    };
    load();
  }, [machineId, machine?.machineId, machine?.projectId]);

  if (machinesLoading || dataLoading) {
    return <div className="text-center py-20 text-sm text-muted-foreground">Loading machine profile…</div>;
  }

  if (!machine) {
    return (
      <div className="text-center py-20">
        <HardHat size={40} className="text-muted-foreground mx-auto mb-3" />
        <h2 className="text-lg font-700 text-foreground mb-1">Machine Not Found</h2>
        <p className="text-sm text-muted-foreground mb-4">The machine profile you are looking for does not exist.</p>
        <Link href="/admin-dashboard" className="btn-primary px-4 py-2 rounded-lg text-sm font-600">Back to Dashboard</Link>
      </div>
    );
  }

  const lastMaint = maintRecords[0];
  const nextDueHours = lastMaint ? lastMaint.hours_at_maintenance + lastMaint.recommended_hours_until_next : null;
  const remainingHours = nextDueHours ? nextDueHours - machine.totalLifetimeHours : null;

  const getMaintStatusLabel = () => {
    if (machine.maintStatus === 'overdue') return { label: 'Overdue', icon: '🔴' };
    if (machine.maintStatus === 'due-soon') return { label: 'Due Soon', icon: '🟡' };
    return { label: 'Good', icon: '🟢' };
  };
  const maintStatusInfo = getMaintStatusLabel();

  const STATUS_COLORS: Record<string, string> = { Active: 'maint-good', Due: 'maint-due-soon', Overdue: 'maint-overdue' };
  const TYPE_CLS: Record<string, string> = { Routine: 'bg-primary/10 text-primary', Repair: 'bg-warning/10 text-idle', Emergency: 'bg-danger/10 text-danger' };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin-dashboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={15} /> Back to Dashboard
        </Link>
      </div>

      <div className={`rounded-xl p-6 ${machine.maintStatus === 'overdue' ? 'kpi-card-overdue' : machine.maintStatus === 'due-soon' ? 'kpi-card-due-soon' : 'kpi-card-completed'}`}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center"><HardHat size={28} className="text-white" /></div>
            <div>
              <h1 className="font-display text-xl font-700 text-white">{machine.name}</h1>
              <p className="text-sm text-white/80 mt-0.5">{machine.machineId} · {machine.type}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-600">{maintStatusInfo.icon} {maintStatusInfo.label}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={machine.status} />
            <Link href="/maintenance" className="bg-white/20 hover:bg-white/30 text-white text-xs font-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
              <Wrench size={12} /> Log Maintenance
            </Link>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
        <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 text-sm font-600 rounded-md transition-all ${activeTab === 'overview' ? 'bg-card text-foreground card-shadow' : 'text-muted-foreground'}`}>Overview</button>
        <button onClick={() => setActiveTab('history')} className={`px-4 py-2 text-sm font-600 rounded-md transition-all ${activeTab === 'history' ? 'bg-card text-foreground card-shadow' : 'text-muted-foreground'}`}>Maintenance History ({maintRecords.length})</button>
        <button onClick={() => setActiveTab('work')} className={`px-4 py-2 text-sm font-600 rounded-md transition-all ${activeTab === 'work' ? 'bg-card text-foreground card-shadow' : 'text-muted-foreground'}`}>Work History ({workRecords.length})</button>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border border-border card-shadow p-5">
            <h2 className="text-sm font-700 text-foreground mb-4 flex items-center gap-2"><HardHat size={15} className="text-primary" />General Information</h2>
            <div className="space-y-3">
              {[
                { label: 'Machine Name', value: machine.name, icon: HardHat },
                { label: 'Machine ID', value: machine.machineId, icon: HardHat },
                { label: 'Machine Type', value: machine.type, icon: HardHat },
                { label: 'Operator', value: machine.operator, icon: User },
                { label: 'Current Location', value: machine.site, icon: MapPin },
                { label: 'Working Status', value: machine.status, icon: Clock, isStatus: true },
                { label: 'Total Lifetime Hours', value: `${machine.totalLifetimeHours.toLocaleString()}h`, icon: TrendingUp },
                { label: 'Hours Today', value: `${machine.hoursToday}h`, icon: Clock },
              ].map(item => {
                const ItemIcon = item.icon;
                return (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground"><ItemIcon size={12} />{item.label}</div>
                    {item.isStatus ? <StatusBadge status={machine.status} size="sm" /> : <span className="text-sm font-600 text-foreground">{item.value}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border card-shadow p-5">
              <h2 className="text-sm font-700 text-foreground mb-4 flex items-center gap-2"><Wrench size={15} className="text-earth" />Maintenance Information</h2>
              <div className="space-y-3">
                {[
                  { label: 'Last Maintenance Date', value: lastMaint?.maintenance_date ?? 'No record' },
                  { label: 'Last Repaired Part', value: lastMaint?.part_repaired_or_replaced ?? 'No record' },
                  { label: 'Next Maintenance Due', value: nextDueHours ? `At ${nextDueHours.toLocaleString()}h` : 'Not scheduled' },
                  { label: 'Remaining Hours', value: remainingHours != null ? (remainingHours <= 0 ? `${Math.abs(remainingHours)}h overdue` : `${remainingHours}h`) : 'N/A' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className={`text-sm font-600 ${item.label === 'Remaining Hours' && remainingHours != null && remainingHours <= 0 ? 'text-danger' : 'text-foreground'}`}>{item.value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs text-muted-foreground">Maintenance Status</span>
                  <MaintStatusBadge status={machine.maintStatus} />
                </div>
              </div>

              {lastMaint && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>Hours used since last maintenance</span>
                    <span className="font-600">{(machine.totalLifetimeHours - lastMaint.hours_at_maintenance).toLocaleString()}h / {lastMaint.recommended_hours_until_next}h</span>
                  </div>
                  <div className="h-2.5 bg-border rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${machine.maintStatus === 'overdue' ? 'bg-danger' : machine.maintStatus === 'due-soon' ? 'bg-warning' : 'bg-success'}`}
                      style={{ width: `${Math.min(((machine.totalLifetimeHours - lastMaint.hours_at_maintenance) / lastMaint.recommended_hours_until_next) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {alerts.length > 0 && (
              <div className="bg-card rounded-xl border border-border card-shadow p-5">
                <h2 className="text-sm font-700 text-foreground mb-3 flex items-center gap-2"><AlertTriangle size={15} className="text-danger" />Active Alerts</h2>
                <div className="space-y-2">
                  {alerts.map(alert => {
                    const isOverdue = alert.status.toLowerCase() === 'overdue';
                    return (
                      <div key={alert.id} className={`rounded-lg p-3 border ${isOverdue ? 'bg-danger/8 border-danger/20' : 'bg-warning/8 border-warning/20'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-700 text-foreground">{alert.part}</span>
                          <span className={`text-2xs font-600 px-2 py-0.5 rounded-full ${isOverdue ? 'maint-overdue' : 'maint-due-soon'}`}>{isOverdue ? 'Overdue' : 'Due Soon'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{alert.remaining <= 0 ? `${Math.abs(alert.remaining)}h overdue` : `${alert.remaining}h remaining`} · Limit: {alert.limit_hours}h</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-card rounded-xl border border-border card-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-700 text-foreground">Maintenance History — {machine.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{maintRecords.length} records found</p>
          </div>
          {maintRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Wrench size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No maintenance history for this machine.</p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-5 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Part</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Technician</th>
                    <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Hr Limit</th>
                    <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">At Hours</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-right px-5 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {maintRecords.map(r => (
                    <tr key={r.id} className="border-b border-border table-row-hover last:border-0">
                      <td className="px-5 py-3.5 font-tabular text-sm text-foreground">{r.maintenance_date}</td>
                      <td className="px-4 py-3.5">
                        <p className="font-600 text-sm text-foreground">{r.part_repaired_or_replaced}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">{r.description_of_work}</p>
                      </td>
                      <td className="px-4 py-3.5"><span className={`text-2xs font-600 px-2 py-0.5 rounded-full ${TYPE_CLS[r.maintenance_type]}`}>{r.maintenance_type}</span></td>
                      <td className="px-4 py-3.5 text-sm text-foreground">{r.technician_name ?? '—'}</td>
                      <td className="px-4 py-3.5 text-right font-tabular font-600 text-foreground">{r.recommended_hours_until_next}h</td>
                      <td className="px-4 py-3.5 text-right font-tabular text-foreground">{r.hours_at_maintenance}h</td>
                      <td className="px-4 py-3.5"><span className={`text-2xs font-600 px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status]}`}>{r.status}</span></td>
                      <td className="px-5 py-3.5 text-right font-tabular text-foreground">{r.cost_of_maintenance ? `PKR ${r.cost_of_maintenance.toLocaleString()}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'work' && (
        <div className="bg-card rounded-xl border border-border card-shadow overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-700 text-foreground">Work History — {machine.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{workRecords.length} daily entries found</p>
          </div>
          {workRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock size={32} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">No work records for this machine yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-5 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Site</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Operator</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Start</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">End</th>
                    <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Hours</th>
                    <th className="text-left px-5 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {workRecords.map(r => (
                    <tr key={r.id} className="border-b border-border table-row-hover last:border-0">
                      <td className="px-5 py-3.5 font-tabular text-sm text-foreground">{r.entry_date}</td>
                      <td className="px-4 py-3.5 text-sm text-foreground">{r.project_site}</td>
                      <td className="px-4 py-3.5 text-sm text-foreground">{r.operator}</td>
                      <td className="px-4 py-3.5 font-tabular text-sm text-foreground">{r.start_time}</td>
                      <td className="px-4 py-3.5 font-tabular text-sm text-foreground">{r.end_time || '—'}</td>
                      <td className="px-4 py-3.5 text-right font-tabular font-600 text-foreground">{r.total_hours != null ? `${r.total_hours}h` : '—'}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={r.status as 'working' | 'completed' | 'idle' | 'maintenance'} size="sm" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}