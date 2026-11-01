'use client';
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Wrench, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { syncAlerts } from '@/lib/alertsSync';
import { useCurrentProject } from '@/lib/ProjectContext';
import { useRole } from '@/lib/RoleContext';
import { alertFromDb, type DbAlert, type MaintenanceAlert } from '@/lib/alerts';
import { ListSkeleton } from '@/components/ui/LoadingSkeleton';

const SEV_CONFIG = {
  overdue: { bg: 'bg-danger/8 border-danger/20', icon: 'text-danger', label: 'Overdue', labelCls: 'maint-overdue' },
  'due-soon': { bg: 'bg-warning/8 border-warning/20', icon: 'text-warning', label: 'Due Soon', labelCls: 'maint-due-soon' },
};

export default function MaintenanceAlertsPanel() {
  const { currentProjectId, ready } = useCurrentProject();
  const { isOperator } = useRole();
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!currentProjectId) {
      setAlerts([]);
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      // Only operators may write alerts; viewers read the latest computed ones.
      if (isOperator) await syncAlerts(currentProjectId);
      const { data } = await supabase.from('alerts').select('*').eq('project_id', currentProjectId).order('remaining', { ascending: true });
      if (data) setAlerts((data as DbAlert[]).map(alertFromDb));
      setLoading(false);
    };
    load();
  }, [currentProjectId, ready, isOperator]);

  const displayAlerts = alerts.slice(0, 4);

  return (
    <div className="bg-card rounded-2xl border border-border card-shadow">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-danger/10 flex items-center justify-center">
            <AlertTriangle size={15} className="text-danger" />
          </div>
          <div>
            <h2 className="text-sm font-700 text-foreground">Maintenance Alerts</h2>
          </div>
        </div>
        <span className="text-2xs font-700 bg-danger/10 text-danger rounded-full px-2 py-0.5">
          {alerts.length} alerts
        </span>
      </div>
      <div className="p-4 space-y-3">
        {loading ? (
          <ListSkeleton rows={3} compact />
        ) : displayAlerts.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No active alerts — all machines in good standing.</p>
        ) : displayAlerts.map((alert) => {
          const cfg = SEV_CONFIG[alert.severity];
          return (
            <div key={alert.id} className={`rounded-lg border p-3 ${cfg.bg}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Wrench size={13} className={cfg.icon + ' flex-shrink-0'} />
                  <span className="text-xs font-700 text-foreground truncate">{alert.machineName}</span>
                </div>
                <span className={`text-2xs font-600 px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.labelCls}`}>
                  {cfg.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-1.5">
                <span className="font-600 text-foreground">{alert.part}</span> · {alert.machineIdCode}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock size={11} />
                {alert.remaining <= 0
                  ? <span className="text-danger font-600">{Math.abs(alert.remaining)}h overdue</span>
                  : <span className="text-warning font-600">{alert.remaining}h remaining</span>
                }
                <span>of {alert.limit}h limit</span>
              </div>
              <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${alert.severity === 'overdue' ? 'bg-danger' : 'bg-warning'}`}
                  style={{ width: `${Math.min((alert.hoursSince / alert.limit) * 100, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-4 pb-4">
        <Link href="/alerts" className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-600 text-primary hover:bg-secondary rounded-lg transition-colors">
          View All Alerts <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
