'use client';
import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabaseClient';
import { useCurrentProject } from './ProjectContext';
import { queryKeys } from './queryClient';

type NavCounts = { workRecordsInProgress: number; maintenanceDue: number; alertsCount: number };
const ZERO: NavCounts = { workRecordsInProgress: 0, maintenanceDue: 0, alertsCount: 0 };

async function loadNavCounts(projectId: string): Promise<NavCounts> {
  const [wr, maint, alerts] = await Promise.all([
    supabase.from('work_records').select('*', { count: 'exact', head: true }).eq('project_id', projectId).eq('status', 'working'),
    supabase.from('maintenance_records').select('*', { count: 'exact', head: true }).eq('project_id', projectId).neq('status', 'Active'),
    supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('project_id', projectId),
  ]);
  const error = wr.error || maint.error || alerts.error;
  if (error) throw error;
  return { workRecordsInProgress: wr.count || 0, maintenanceDue: maint.count || 0, alertsCount: alerts.count || 0 };
}

// Sidebar and topbar badges. Shared through the query cache (both call this), and
// refreshed by invalidateFleetData() after edits. Badges only: on failure the last
// known numbers stay (TanStack keeps previous data), or zero if there never were any.
export function useNavCounts(): NavCounts {
  const { currentProjectId, ready } = useCurrentProject();
  const { data } = useQuery({
    queryKey: queryKeys.navCounts(currentProjectId),
    queryFn: () => loadNavCounts(currentProjectId!),
    enabled: ready && !!currentProjectId,
  });
  return currentProjectId && data ? data : ZERO;
}
