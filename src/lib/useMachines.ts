'use client';
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabaseClient';
import { useCurrentProject } from './ProjectContext';
import { useAppSettings } from './AppSettingsContext';
import { addDays, todayInTz } from './format';
import { friendlyError } from './errors';
import { queryKeys } from './queryClient';

export type MachineStatus = 'working' | 'completed' | 'idle' | 'maintenance';
export type MaintStatus = 'good' | 'due-soon' | 'overdue';

export interface Machine {
  id: string;
  name: string;
  machineId: string;
  type: string;
  operator: string;
  site: string;
  status: MachineStatus;
  startTime: string;
  hoursToday: number;
  totalLifetimeHours: number;
  maintStatus: MaintStatus;
  projectId: string | null;
}

export type DbMachine = {
  id: string;
  name: string;
  machine_code: string;
  type: string;
  operator: string;
  site: string;
  status: string;
  start_time: string;
  hours_today: number;
  total_lifetime_hours: number;
  maint_status: string;
  project_id: string | null;
};

export function machineFromDb(row: DbMachine): Machine {
  return {
    id: row.id,
    name: row.name,
    machineId: row.machine_code,
    type: row.type,
    operator: row.operator,
    site: row.site,
    status: row.status as MachineStatus,
    startTime: row.start_time,
    hoursToday: row.hours_today,
    totalLifetimeHours: row.total_lifetime_hours,
    maintStatus: row.maint_status as MaintStatus,
    projectId: row.project_id,
  };
}

export type RecentWorkRecord = {
  project_id: string | null;
  machine_code: string;
  entry_date: string;
  status: string;
  start_time: string | null;
  total_hours: number | null;
  created_at: string;
};

export const RECENT_WORK_RECORD_COLUMNS = 'project_id, machine_code, entry_date, status, start_time, total_hours, created_at';

// Work records that can affect a machine's live state: everything from today, plus
// yesterday's (so a night shift that crosses midnight and is still open counts).
export function recentWorkRecordsQuery(todayStr: string) {
  return supabase.from('work_records').select(RECENT_WORK_RECORD_COLUMNS).gte('entry_date', addDays(todayStr, -1));
}

// machines.status / hours_today / start_time are only written when a work record is
// saved, so they go stale overnight. This derives them from the records instead:
//   - hoursToday: sum of today's records
//   - status: latest of today's records, or an open (still "working") shift from
//     yesterday; with no activity the machine is idle
//   - startTime: earliest start among today's records
// "maintenance" is set by hand on the machine and is left alone.
export function withLiveStatus(machines: Machine[], records: RecentWorkRecord[], todayStr: string): Machine[] {
  return machines.map(m => {
    const mine = records.filter(r => r.machine_code === m.machineId && r.project_id === m.projectId);
    const today = mine.filter(r => r.entry_date === todayStr);
    const relevant = [...today, ...mine.filter(r => r.entry_date < todayStr && r.status === 'working')]
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const hoursToday = Math.round(today.reduce((s, r) => s + (r.total_hours || 0), 0) * 100) / 100;
    const starts = today.map(r => r.start_time).filter((t): t is string => !!t).sort();
    const startTime = starts[0] ?? (relevant[0]?.start_time || '—');

    let status: MachineStatus;
    if (m.status === 'maintenance') status = 'maintenance';
    else if (relevant.length === 0) status = 'idle';
    else status = relevant[0].status as MachineStatus;

    return { ...m, status, hoursToday, startTime };
  });
}

// `machine` is null with no error when the id doesn't exist; `error` is set when the
// lookup itself failed, so the caller can say "couldn't load" instead of "not found".
export async function fetchMachineById(id: string, todayStr: string): Promise<{ machine: Machine | null; error: string | null }> {
  const { data, error } = await supabase.from('machines').select('*').eq('id', id).maybeSingle();
  if (error) return { machine: null, error: friendlyError(error) };
  if (!data) return { machine: null, error: null };
  const machine = machineFromDb(data as DbMachine);
  const { data: records, error: recordsError } = await recentWorkRecordsQuery(todayStr)
    .eq('machine_code', machine.machineId)
    .eq('project_id', machine.projectId);
  if (recordsError) return { machine: null, error: friendlyError(recordsError) };
  return { machine: withLiveStatus([machine], (records || []) as RecentWorkRecord[], todayStr)[0], error: null };
}

async function loadMachines(projectId: string, timezone: string): Promise<Machine[]> {
  const todayStr = todayInTz(timezone);
  const [machinesRes, recordsRes] = await Promise.all([
    supabase.from('machines').select('*').eq('project_id', projectId).order('name'),
    recentWorkRecordsQuery(todayStr).eq('project_id', projectId),
  ]);
  const error = machinesRes.error || recordsRes.error;
  if (error) throw new Error(friendlyError(error));
  return withLiveStatus(
    ((machinesRes.data || []) as DbMachine[]).map(machineFromDb),
    (recordsRes.data || []) as RecentWorkRecord[],
    todayStr,
  );
}

const NO_MACHINES: Machine[] = [];

// The current project's machines with live status. Backed by TanStack Query, so the
// many widgets that call this on one screen share a single request and cache.
// After changing machine data, call invalidateFleetData() (lib/queryClient).
export function useMachines() {
  const { currentProjectId, ready } = useCurrentProject();
  const { timezone } = useAppSettings();
  const enabled = ready && !!currentProjectId;
  const query = useQuery({
    queryKey: queryKeys.machines(currentProjectId, timezone),
    queryFn: () => loadMachines(currentProjectId!, timezone),
    enabled,
  });
  const { refetch } = query;
  const reload = useCallback(() => { refetch(); }, [refetch]);

  return {
    machines: query.data ?? NO_MACHINES,
    // Still waiting for the project to be known counts as loading; no project means nothing to load.
    loading: !ready || (enabled && query.isPending),
    error: query.error ? query.error.message : null,
    reload,
  };
}
