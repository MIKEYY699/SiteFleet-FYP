'use client';
import React, { useEffect, useState } from 'react';
import { X, MapPin, User, Clock, Wrench, AlertTriangle } from 'lucide-react';
import { useMachines, Machine } from '@/lib/useMachines';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentProject } from '@/lib/ProjectContext';
import { StatusBadge, MaintStatusBadge } from '@/components/ui/StatusBadge';

interface DrillDownModalProps {
  filter: string | null;
  onClose: () => void;
}

type Alert = {
  id: string;
  machineName: string;
  machineIdCode: string;
  part: string;
  hoursSince: number;
  limit: number;
  remaining: number;
  severity: 'overdue' | 'due-soon';
};

type WorkRecordRow = {
  id: string;
  machine_name: string;
  machine_code: string;
  operator: string;
  project_site: string;
  total_hours: number | null;
  status: string;
};

type MaintCostRow = {
  id: string;
  machine_name: string;
  machine_code: string;
  part_repaired_or_replaced: string;
  maintenance_type: string;
  maintenance_date: string;
  cost_of_maintenance: number | null;
};

function getTitle(filter: string): string {
  const map: Record<string, string> = {
    working: 'Machines Currently Working',
    completed: 'Jobs Completed Today',
    cost: 'Maintenance Cost Breakdown',
    hours: 'Working Hours Summary',
    idle: 'Machines Currently Idle',
    'due-soon': 'Maintenance Due Soon',
    overdue: 'Overdue Maintenance',
    maintenance: 'Machines Under Maintenance',
  };
  return map[filter] ?? 'Machine Details';
}

export default function DrillDownModal({ filter, onClose }: DrillDownModalProps) {
  const { machines } = useMachines();
  const { currentProjectId } = useCurrentProject();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [todayRecords, setTodayRecords] = useState<WorkRecordRow[]>([]);
  const [costRecords, setCostRecords] = useState<MaintCostRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!filter || !currentProjectId) return;
    const load = async () => {
      if (filter === 'due-soon' || filter === 'overdue') {
        const { data } = await supabase.from('alerts').select('*').eq('project_id', currentProjectId);
        if (data) {
          setAlerts(data.map((row) => ({
            id: row.id,
            machineName: row.machine_name,
            machineIdCode: row.machine_code,
            part: row.part,
            hoursSince: row.hours_since,
            limit: row.limit_hours,
            remaining: row.remaining,
            severity: row.status.toLowerCase().replace(' ', '-') as 'overdue' | 'due-soon',
          })));
        }
      }
      if (filter === 'cost') {
        const { data } = await supabase
          .from('maintenance_records')
          .select('id, machine_name, machine_code, part_repaired_or_replaced, maintenance_type, maintenance_date, cost_of_maintenance')
          .eq('project_id', currentProjectId)
          .order('maintenance_date', { ascending: false });
        if (data) setCostRecords(data as MaintCostRow[]);
      }
      if (filter === 'completed') {
        const now = new Date();
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const { data } = await supabase
          .from('work_records')
          .select('id, machine_name, machine_code, operator, project_site, total_hours, status')
          .eq('project_id', currentProjectId)
          .eq('entry_date', todayStr)
          .eq('status', 'completed');
        if (data) setTodayRecords(data as WorkRecordRow[]);
      }
      setLoading(false);
    };
    load();
  }, [filter, currentProjectId]);

  if (!filter) return null;

  const showAlerts = filter === 'due-soon' || filter === 'overdue';
  const showRecords = filter === 'completed';
  const showCost = filter === 'cost';

  let filteredMachines: Machine[] = [];
  if (!showAlerts && !showRecords) {
    if (filter === 'working') filteredMachines = machines.filter(m => m.status === 'working');
    else if (filter === 'idle') filteredMachines = machines.filter(m => m.status === 'idle');
    else if (filter === 'maintenance') filteredMachines = machines.filter(m => m.status === 'maintenance');
    else if (filter === 'hours') filteredMachines = machines.filter(m => m.hoursToday > 0);
    else filteredMachines = machines;
  }

  const filteredAlerts = alerts.filter(a => a.severity === filter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay fade-in" onClick={onClose}>
      <div
        className="w-full max-w-3xl bg-card rounded-xl card-shadow-md border border-border scale-in max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h3 className="text-base font-700 text-foreground">{getTitle(filter)}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {showAlerts ? `${filteredAlerts.length} alerts found`
                : showRecords ? `${todayRecords.length} jobs completed today`
                : showCost ? `${costRecords.length} maintenance records`
                : `${filteredMachines.length} machines`}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
          {loading ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Loading…</div>
          ) : showAlerts ? (
            filteredAlerts.length > 0 ? (
              <div className="space-y-3">
                {filteredAlerts.map(alert => (
                  <div key={alert.id} className={`rounded-lg border p-4 ${alert.severity === 'overdue' ? 'bg-danger/8 border-danger/20' : 'bg-warning/8 border-warning/20'}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        {alert.severity === 'overdue' ? <AlertTriangle size={15} className="text-danger flex-shrink-0" /> : <Wrench size={15} className="text-warning flex-shrink-0" />}
                        <span className="font-700 text-sm text-foreground">{alert.machineName}</span>
                        <span className="text-xs text-muted-foreground">({alert.machineIdCode})</span>
                      </div>
                      <span className={`text-2xs font-700 px-2 py-0.5 rounded-full flex-shrink-0 ${alert.severity === 'overdue' ? 'maint-overdue' : 'maint-due-soon'}`}>
                        {alert.severity === 'overdue' ? 'Overdue' : 'Due Soon'}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mb-1">Part: <span className="font-600">{alert.part}</span></p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock size={11} />{alert.hoursSince}h since last maintenance</span>
                      <span>Limit: {alert.limit}h</span>
                      {alert.remaining <= 0 ? <span className="text-danger font-600">{Math.abs(alert.remaining)}h overdue</span> : <span className="text-warning font-600">{alert.remaining}h remaining</span>}
                    </div>
                    <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${alert.severity === 'overdue' ? 'bg-danger' : 'bg-warning'}`} style={{ width: `${Math.min((alert.hoursSince / alert.limit) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground"><p className="text-sm">No alerts in this category.</p></div>
            )
          ) : showCost ? (
            costRecords.length > 0 ? (
              <div>
                <div className="overflow-x-auto scrollbar-thin rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Machine</th>
                        <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Part</th>
                        <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Type</th>
                        <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Date</th>
                        <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costRecords.map(r => (
                        <tr key={r.id} className="border-b border-border table-row-hover last:border-0">
                          <td className="px-4 py-3">
                            <p className="font-600 text-foreground text-sm leading-none">{r.machine_name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 font-tabular">{r.machine_code}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-foreground">{r.part_repaired_or_replaced}</td>
                          <td className="px-4 py-3 text-sm text-foreground">{r.maintenance_type}</td>
                          <td className="px-4 py-3 text-sm text-foreground font-tabular">{r.maintenance_date}</td>
                          <td className="px-4 py-3 text-right font-tabular font-700 text-foreground">{r.cost_of_maintenance ? `Rs ${r.cost_of_maintenance.toLocaleString()}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end mt-3 pr-1">
                  <span className="text-sm font-700 text-foreground">
                    Total: Rs {costRecords.reduce((s, r) => s + (r.cost_of_maintenance || 0), 0).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground"><p className="text-sm">No maintenance cost records yet.</p></div>
            )
          ) : showRecords ? (
            todayRecords.length > 0 ? (
              <div className="overflow-x-auto scrollbar-thin rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Machine</th>
                      <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Operator</th>
                      <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Site</th>
                      <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayRecords.map(r => (
                      <tr key={r.id} className="border-b border-border table-row-hover last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-600 text-foreground text-sm leading-none">{r.machine_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 font-tabular">{r.machine_code}</p>
                        </td>
                        <td className="px-4 py-3"><div className="flex items-center gap-1.5"><User size={12} className="text-muted-foreground flex-shrink-0" /><span className="text-sm text-foreground">{r.operator}</span></div></td>
                        <td className="px-4 py-3"><div className="flex items-center gap-1.5"><MapPin size={12} className="text-muted-foreground flex-shrink-0" /><span className="text-sm text-foreground truncate max-w-[160px]">{r.project_site}</span></div></td>
                        <td className="px-4 py-3 text-right"><span className="font-tabular font-700 text-foreground">{r.total_hours}h</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground"><p className="text-sm">No jobs completed today yet.</p></div>
            )
          ) : filteredMachines.length > 0 ? (
            <div className="overflow-x-auto scrollbar-thin rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Machine</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Operator</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Site</th>
                    {filter === 'hours' && <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Hrs Today</th>}
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Maint.</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMachines.map(m => (
                    <tr key={m.id} className="border-b border-border table-row-hover last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-600 text-foreground text-sm leading-none">{m.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 font-tabular">{m.machineId} · {m.type}</p>
                      </td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1.5"><User size={12} className="text-muted-foreground flex-shrink-0" /><span className="text-sm text-foreground">{m.operator}</span></div></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1.5"><MapPin size={12} className="text-muted-foreground flex-shrink-0" /><span className="text-sm text-foreground truncate max-w-[160px]">{m.site}</span></div></td>
                      {filter === 'hours' && <td className="px-4 py-3 text-right"><span className="font-tabular font-700 text-foreground">{m.hoursToday}h</span></td>}
                      <td className="px-4 py-3"><StatusBadge status={m.status} size="sm" /></td>
                      <td className="px-4 py-3"><MaintStatusBadge status={m.maintStatus} size="sm" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground"><p className="text-sm">No machines found for this category.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}