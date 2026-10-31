'use client';
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Wrench, Clock, CheckCircle2, BellOff } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { syncAlerts } from '@/lib/alertsSync';
import { useMachines } from '@/lib/useMachines';
import { useCurrentProject } from '@/lib/ProjectContext';

type DbAlert = {
  id: string;
  machine_id: string;
  machine_name: string;
  machine_code: string;
  part: string;
  hours_since: number;
  limit_hours: number;
  remaining: number;
  status: string;
};

type MaintenanceAlert = {
  id: string;
  machineId: string;
  machineName: string;
  machineIdCode: string;
  part: string;
  hoursSince: number;
  limit: number;
  remaining: number;
  severity: 'overdue' | 'due-soon';
};

function fromDb(row: DbAlert): MaintenanceAlert {
  return {
    id: row.id,
    machineId: row.machine_id,
    machineName: row.machine_name,
    machineIdCode: row.machine_code,
    part: row.part,
    hoursSince: row.hours_since,
    limit: row.limit_hours,
    remaining: row.remaining,
    severity: row.status.toLowerCase().replace(' ', '-') as 'overdue' | 'due-soon',
  };
}

export default function AlertsContent() {
  const { machines } = useMachines();
  const { currentProjectId, ready } = useCurrentProject();
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!ready) return;
    if (!currentProjectId) {
      setAlerts([]);
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      await syncAlerts(currentProjectId);
      const { data } = await supabase.from('alerts').select('*').eq('project_id', currentProjectId).order('remaining', { ascending: true });
      if (data) setAlerts(data.map(fromDb));
      setLoading(false);
    };
    load();
  }, [currentProjectId, ready]);

  const activeAlerts = alerts.filter(a => !dismissed.has(a.id));
  const overdueAlerts = activeAlerts.filter(a => a.severity === 'overdue');
  const dueSoonAlerts = activeAlerts.filter(a => a.severity === 'due-soon');

  const handleDismiss = (id: string) => setDismissed(prev => new Set([...prev, id]));
  const handleDismissAll = () => setDismissed(new Set(alerts.map(a => a.id)));

  const AlertCard = ({ alert }: { alert: MaintenanceAlert }) => {
    const isOverdue = alert.severity === 'overdue';
    const machine = machines.find(m => m.id === alert.machineId);

    return (
      <div className={`rounded-xl border p-5 ${isOverdue ? 'bg-danger/5 border-danger/25' : 'bg-warning/5 border-warning/25'}`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-danger/15' : 'bg-warning/15'}`}>
              {isOverdue ? <AlertTriangle size={18} className="text-danger" /> : <Wrench size={18} className="text-warning" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-2xs font-700 px-2 py-0.5 rounded-full ${isOverdue ? 'maint-overdue' : 'maint-due-soon'}`}>
                  {isOverdue ? '🔴 Immediate Maintenance Required' : '🟡 Maintenance Due Soon'}
                </span>
              </div>
              <h3 className="font-700 text-sm text-foreground mt-1">{alert.machineName}</h3>
              <p className="text-xs text-muted-foreground">Machine ID: {alert.machineIdCode}</p>
            </div>
          </div>
          <button onClick={() => handleDismiss(alert.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0" title="Dismiss alert">
            <BellOff size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div className="bg-card rounded-lg p-3 border border-border">
            <p className="text-2xs text-muted-foreground mb-0.5">Part</p>
            <p className="text-xs font-700 text-foreground">{alert.part}</p>
          </div>
          <div className="bg-card rounded-lg p-3 border border-border">
            <p className="text-2xs text-muted-foreground mb-0.5">Hours Since Repair</p>
            <p className="text-xs font-700 text-foreground font-tabular">{alert.hoursSince}h</p>
          </div>
          <div className="bg-card rounded-lg p-3 border border-border">
            <p className="text-2xs text-muted-foreground mb-0.5">Maintenance Limit</p>
            <p className="text-xs font-700 text-foreground font-tabular">{alert.limit}h</p>
          </div>
          <div className={`rounded-lg p-3 border ${isOverdue ? 'bg-danger/10 border-danger/20' : 'bg-warning/10 border-warning/20'}`}>
            <p className="text-2xs text-muted-foreground mb-0.5">Status</p>
            <p className={`text-xs font-700 font-tabular ${isOverdue ? 'text-danger' : 'text-idle'}`}>
              {alert.remaining <= 0 ? `${Math.abs(alert.remaining)}h Overdue` : `${alert.remaining}h Remaining`}
            </p>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between text-2xs text-muted-foreground mb-1">
            <span>Usage Progress</span>
            <span className="font-600">{Math.min(Math.round((alert.hoursSince / alert.limit) * 100), 100)}%</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${isOverdue ? 'bg-danger' : 'bg-warning'}`} style={{ width: `${Math.min((alert.hoursSince / alert.limit) * 100, 100)}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/maintenance" className="btn-primary text-xs font-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <Wrench size={12} /> Schedule Maintenance
          </Link>
          {machine && (
            <Link href={`/machine-profile/${machine.id}`} className="btn-secondary text-xs font-600 px-3 py-1.5 rounded-lg">
              View Machine Profile
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end flex-wrap gap-3">
        {activeAlerts.length > 0 && (
          <button onClick={handleDismissAll} className="btn-secondary flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-600">
            <BellOff size={15} /> Dismiss All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kpi-card-overdue rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center"><AlertTriangle size={18} className="text-white" /></div>
          <div><div className="text-2xl font-800 text-white font-tabular">{overdueAlerts.length}</div><div className="text-xs text-white/80">Overdue</div></div>
        </div>
        <div className="kpi-card-due-soon rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center"><Clock size={18} className="text-white" /></div>
          <div><div className="text-2xl font-800 text-white font-tabular">{dueSoonAlerts.length}</div><div className="text-xs text-white/80">Due Soon</div></div>
        </div>
        <div className="kpi-card-working rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center"><CheckCircle2 size={18} className="text-white" /></div>
          <div><div className="text-2xl font-800 text-white font-tabular">{dismissed.size}</div><div className="text-xs text-white/80">Dismissed</div></div>
        </div>
      </div>

      {loading && <div className="text-center py-12 text-sm text-muted-foreground">Checking machines against maintenance limits…</div>}

      {!loading && overdueAlerts.length > 0 && (
        <div>
          <h2 className="text-sm font-700 text-danger mb-3 flex items-center gap-2"><AlertTriangle size={15} /> Overdue — Immediate Action Required ({overdueAlerts.length})</h2>
          <div className="space-y-4">{overdueAlerts.map(alert => <AlertCard key={alert.id} alert={alert} />)}</div>
        </div>
      )}

      {!loading && dueSoonAlerts.length > 0 && (
        <div>
          <h2 className="text-sm font-700 text-idle mb-3 flex items-center gap-2"><Clock size={15} /> Due Soon — Schedule Maintenance ({dueSoonAlerts.length})</h2>
          <div className="space-y-4">{dueSoonAlerts.map(alert => <AlertCard key={alert.id} alert={alert} />)}</div>
        </div>
      )}

      {!loading && activeAlerts.length === 0 && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={28} className="text-success" /></div>
          <h3 className="text-base font-700 text-foreground mb-1">All Clear!</h3>
          <p className="text-sm text-muted-foreground">No active maintenance alerts. All machines are in good standing.</p>
        </div>
      )}
    </div>
  );
}