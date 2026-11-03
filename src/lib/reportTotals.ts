import { supabase } from './supabaseClient';
import { friendlyError } from './errors';

// Typed wrappers for the totals functions in
// supabase/migrations/20261103000000_report_totals.sql. Each throws a friendly
// Error on failure, so they plug straight into TanStack Query.

export type MaintenanceSummary = {
  recordCount: number;
  totalCost: number;
  routineCount: number;
  repairCount: number;
  emergencyCount: number;
  activeCount: number;
  dueCount: number;
  overdueCount: number;
};

export type ProjectOverviewRow = {
  projectId: string;
  machineCount: number;
  hoursToday: number;
  alertCount: number;
  maintCost: number;
};

// numeric/bigint can arrive as strings depending on size; normalise to numbers.
const num = (v: unknown) => Number(v ?? 0) || 0;

/** Hours per day (key "YYYY-MM-DD"). Days with no work are simply absent. */
export async function fetchWorkHoursByDay(projectId: string, from: string, to: string): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc('work_hours_by_day', { p_project_id: projectId, p_from: from, p_to: to });
  if (error) throw new Error(friendlyError(error));
  const rows = (data || []) as { entry_date: string; hours: unknown }[];
  return new Map(rows.map(r => [String(r.entry_date).slice(0, 10), num(r.hours)]));
}

export async function fetchMaintenanceSummary(projectId: string): Promise<MaintenanceSummary> {
  const { data, error } = await supabase.rpc('maintenance_summary', { p_project_id: projectId });
  if (error) throw new Error(friendlyError(error));
  const r = ((data || []) as Record<string, unknown>[])[0] ?? {};
  return {
    recordCount: num(r.record_count),
    totalCost: num(r.total_cost),
    routineCount: num(r.routine_count),
    repairCount: num(r.repair_count),
    emergencyCount: num(r.emergency_count),
    activeCount: num(r.active_count),
    dueCount: num(r.due_count),
    overdueCount: num(r.overdue_count),
  };
}

export async function fetchProjectOverview(today: string): Promise<ProjectOverviewRow[]> {
  const { data, error } = await supabase.rpc('project_overview', { p_today: today });
  if (error) throw new Error(friendlyError(error));
  return ((data || []) as Record<string, unknown>[]).map(r => ({
    projectId: String(r.project_id),
    machineCount: num(r.machine_count),
    hoursToday: num(r.hours_today),
    alertCount: num(r.alert_count),
    maintCost: num(r.maint_cost),
  }));
}

export async function fetchWorkRecordSites(projectId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc('work_record_sites', { p_project_id: projectId });
  if (error) throw new Error(friendlyError(error));
  return ((data || []) as { site: string }[]).map(r => r.site);
}
