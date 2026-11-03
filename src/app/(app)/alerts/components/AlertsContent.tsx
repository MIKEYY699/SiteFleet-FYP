'use client';
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Wrench, Clock, CheckCircle2, BellOff } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { syncAlerts } from '@/lib/alertsSync';
import { useMachines } from '@/lib/useMachines';
import { useCurrentProject } from '@/lib/ProjectContext';
import { alertFromDb, type DbAlert, type MaintenanceAlert } from '@/lib/alerts';
import { ListSkeleton } from '@/components/ui/LoadingSkeleton';
import { friendlyError } from '@/lib/errors';
import LoadError from '@/components/ui/LoadError';

// Dismissals are remembered per project in this browser. Each one is keyed by the
// alert's severity, part and limit, so an alert that escalates (Due Soon -> Overdue)
// or starts a new maintenance cycle shows up again instead of staying hidden.
const dismissedStorageKey = (projectId: string) => `skbequip_dismissed_alerts_${projectId}`;

function alertSignature(a: MaintenanceAlert): string {
  return `${a.id}|${a.severity}|${a.part}|${a.limit}`;
}

function loadDismissed(projectId: string): Set<string> {
  try {
    const raw = localStorage.getItem(dismissedStorageKey(projectId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(projectId: string, signatures: Set<string>) {
  localStorage.setItem(dismissedStorageKey(projectId), JSON.stringify([...signatures]));
}

export default function AlertsContent() {
  const { machines } = useMachines();
  const { currentProjectId, ready } = useCurrentProject();
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!ready) return;
    if (!currentProjectId) {
      setAlerts([]);
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      setSyncWarning(await syncAlerts(currentProjectId));
      const { data, error: loadError } = await supabase.from('alerts').select('*').eq('project_id', currentProjectId).order('remaining', { ascending: true });
      if (loadError) {
        setError(friendlyError(loadError));
      } else {
        setError(null);
        const loaded = ((data || []) as DbAlert[]).map(alertFromDb);
        // Drop dismissals for alerts that no longer exist (resolved or changed),
        // so storage doesn't grow and a recurring alert isn't hidden forever.
        const current = new Set(loaded.map(alertSignature));
        const stillRelevant = new Set([...loadDismissed(currentProjectId)].filter(sig => current.has(sig)));
        saveDismissed(currentProjectId, stillRelevant);
        setDismissed(stillRelevant);
        setAlerts(loaded);
      }
      setLoading(false);
    };
    load();
  }, [currentProjectId, ready, reloadKey]);

  const activeAlerts = alerts.filter(a => !dismissed.has(alertSignature(a)));
  const overdueAlerts = activeAlerts.filter(a => a.severity === 'overdue');
  const dueSoonAlerts = activeAlerts.filter(a => a.severity === 'due-soon');

  const updateDismissed = (next: Set<string>) => {
    setDismissed(next);
    if (currentProjectId) saveDismissed(currentProjectId, next);
  };
  const handleDismiss = (alert: MaintenanceAlert) => updateDismissed(new Set([...dismissed, alertSignature(alert)]));
  const handleDismissAll = () => updateDismissed(new Set(alerts.map(alertSignature)));

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
                <span className={`inline-flex items-center gap-1.5 text-2xs font-700 px-2 py-0.5 rounded-full ${isOverdue ? 'maint-overdue' : 'maint-due-soon'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOverdue ? 'bg-danger' : 'bg-warning'}`} aria-hidden="true" />
                  {isOverdue ? 'Immediate Maintenance Required' : 'Maintenance Due Soon'}
                </span>
              </div>
              <h3 className="font-700 text-sm text-foreground mt-1">{alert.machineName}</h3>
              <p className="text-xs text-muted-foreground">Machine ID: {alert.machineIdCode}</p>
            </div>
          </div>
          <button onClick={() => handleDismiss(alert)} aria-label={`Dismiss alert for ${alert.machineName}`} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0" title="Dismiss alert">
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

      {loading && <ListSkeleton rows={3} />}

      {!loading && error && (
        <LoadError title="Could not load maintenance alerts" message={error} onRetry={() => setReloadKey(k => k + 1)} />
      )}

      {!loading && !error && syncWarning && (
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/25 text-sm text-foreground">
          These alerts may be out of date: they could not be recalculated from the latest machine hours. {syncWarning}
        </div>
      )}

      {!loading && !error && overdueAlerts.length > 0 && (
        <div>
          <h2 className="text-sm font-700 text-danger mb-3 flex items-center gap-2"><AlertTriangle size={15} /> Overdue — Immediate Action Required ({overdueAlerts.length})</h2>
          <div className="space-y-4">{overdueAlerts.map(alert => <AlertCard key={alert.id} alert={alert} />)}</div>
        </div>
      )}

      {!loading && !error && dueSoonAlerts.length > 0 && (
        <div>
          <h2 className="text-sm font-700 text-idle mb-3 flex items-center gap-2"><Clock size={15} /> Due Soon — Schedule Maintenance ({dueSoonAlerts.length})</h2>
          <div className="space-y-4">{dueSoonAlerts.map(alert => <AlertCard key={alert.id} alert={alert} />)}</div>
        </div>
      )}

      {!loading && !error && activeAlerts.length === 0 && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={28} className="text-success" /></div>
          <h3 className="text-base font-700 text-foreground mb-1">All Clear!</h3>
          <p className="text-sm text-muted-foreground">No active maintenance alerts. All machines are in good standing.</p>
        </div>
      )}
    </div>
  );
}