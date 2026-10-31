'use client';
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useCurrentProject } from './ProjectContext';

export function useNavCounts() {
  const { currentProjectId, ready } = useCurrentProject();
  const [workRecordsInProgress, setWorkRecordsInProgress] = useState(0);
  const [maintenanceDue, setMaintenanceDue] = useState(0);
  const [alertsCount, setAlertsCount] = useState(0);

  useEffect(() => {
    if (!ready) return;
    if (!currentProjectId) {
      setWorkRecordsInProgress(0);
      setMaintenanceDue(0);
      setAlertsCount(0);
      return;
    }
    const load = async () => {
      const [wr, maint, alerts] = await Promise.all([
        supabase.from('work_records').select('*', { count: 'exact', head: true }).eq('project_id', currentProjectId).eq('status', 'working'),
        supabase.from('maintenance_records').select('*', { count: 'exact', head: true }).eq('project_id', currentProjectId).neq('status', 'Active'),
        supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('project_id', currentProjectId),
      ]);
      setWorkRecordsInProgress(wr.count || 0);
      setMaintenanceDue(maint.count || 0);
      setAlertsCount(alerts.count || 0);
    };
    load();
  }, [currentProjectId, ready]);

  return { workRecordsInProgress, maintenanceDue, alertsCount };
}
