import { supabase } from './supabaseClient';
import type { DbAlert } from './alerts';

// Used when app_settings has no due_soon_threshold. Matches the column's default in
// the database (20) and what Settings shows.
export const DEFAULT_DUE_SOON_THRESHOLD = 20;

type RecordStatus = 'Active' | 'Due' | 'Overdue';
type MaintStatus = 'good' | 'due-soon' | 'overdue';

type MachineRow = {
  id: string;
  name: string;
  machine_code: string;
  total_lifetime_hours: number;
  maint_status: string;
  project_id: string | null;
};

type MaintRow = {
  id: string;
  machine_id: string | null;
  part_repaired_or_replaced: string;
  hours_at_maintenance: number;
  recommended_hours_until_next: number;
  status: string;
};

const partKey = (part: string) => part.trim().toLowerCase();
const partSlug = (part: string) => partKey(part).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'part';

const SEVERITY_RANK: Record<RecordStatus, number> = { Active: 0, Due: 1, Overdue: 2 };
const MACHINE_STATUS: Record<RecordStatus, MaintStatus> = { Active: 'good', Due: 'due-soon', Overdue: 'overdue' };

function sameAlert(a: DbAlert, b: DbAlert): boolean {
  return a.machine_id === b.machine_id && a.machine_name === b.machine_name && a.machine_code === b.machine_code
    && a.part === b.part && a.hours_since === b.hours_since && a.limit_hours === b.limit_hours
    && a.remaining === b.remaining && a.status === b.status && a.project_id === b.project_id;
}

// Recomputes maintenance alerts from machine hours and maintenance history.
//
// Each (machine, part) pair is tracked separately, so an engine-oil schedule and a
// hydraulic-pump schedule on the same machine each get their own countdown. The
// result is written to three places, touching only rows that actually changed:
//   - alerts: one row per (machine, part) that is Due Soon or Overdue
//   - machines.maint_status: the worst status across that machine's parts
//   - maintenance_records.status: Active / Due / Overdue on the record that governs
//     each countdown; superseded records are Active
export async function syncAlerts(projectId?: string | null) {
  let machinesQuery = supabase.from('machines').select('id, name, machine_code, total_lifetime_hours, maint_status, project_id');
  let maintQuery = supabase.from('maintenance_records')
    .select('id, machine_id, part_repaired_or_replaced, hours_at_maintenance, recommended_hours_until_next, status')
    .order('maintenance_date', { ascending: false })
    .order('created_at', { ascending: false });
  let alertsQuery = supabase.from('alerts').select('*');
  if (projectId) {
    machinesQuery = machinesQuery.eq('project_id', projectId);
    maintQuery = maintQuery.eq('project_id', projectId);
    alertsQuery = alertsQuery.eq('project_id', projectId);
  }

  const [machinesRes, maintRes, alertsRes, settingsRes] = await Promise.all([
    machinesQuery,
    maintQuery,
    alertsQuery,
    supabase.from('app_settings').select('due_soon_threshold, auto_reset').eq('id', 1).maybeSingle(),
  ]);
  if (machinesRes.error || maintRes.error || alertsRes.error) {
    console.error('syncAlerts: could not load data', machinesRes.error || maintRes.error || alertsRes.error);
    return;
  }

  const machines = (machinesRes.data || []) as MachineRow[];
  const maintRecords = (maintRes.data || []) as MaintRow[];
  const existingAlerts = (alertsRes.data || []) as DbAlert[];
  const dueSoonThreshold = settingsRes.data?.due_soon_threshold ?? DEFAULT_DUE_SOON_THRESHOLD;
  const autoReset = settingsRes.data?.auto_reset ?? true;

  const desiredAlerts = new Map<string, DbAlert>();
  const recordStatus = new Map<string, RecordStatus>();
  const machineStatus = new Map<string, MaintStatus>();

  for (const machine of machines) {
    // maintRecords is sorted newest-first, so within each part group [0] is the most
    // recent service and the last entry is the oldest. Auto-Reset ON counts down from
    // the most recent service; OFF keeps anchoring to the first one logged.
    const byPart = new Map<string, MaintRow[]>();
    for (const r of maintRecords) {
      if (r.machine_id !== machine.id) continue;
      const key = partKey(r.part_repaired_or_replaced);
      byPart.set(key, [...(byPart.get(key) || []), r]);
    }

    let worst: RecordStatus = 'Active';
    for (const group of byPart.values()) {
      const governing = autoReset ? group[0] : group[group.length - 1];
      const hoursSince = machine.total_lifetime_hours - governing.hours_at_maintenance;
      const limit = governing.recommended_hours_until_next;
      const remaining = limit - hoursSince;
      const status: RecordStatus = remaining <= 0 ? 'Overdue' : remaining <= dueSoonThreshold ? 'Due' : 'Active';

      group.forEach(r => recordStatus.set(r.id, r === governing ? status : 'Active'));
      if (SEVERITY_RANK[status] > SEVERITY_RANK[worst]) worst = status;

      if (status !== 'Active') {
        const id = `alert-${machine.id}-${partSlug(governing.part_repaired_or_replaced)}`;
        desiredAlerts.set(id, {
          id, machine_id: machine.id, machine_name: machine.name, machine_code: machine.machine_code,
          part: governing.part_repaired_or_replaced, hours_since: hoursSince, limit_hours: limit, remaining,
          status: status === 'Overdue' ? 'Overdue' : 'Due Soon',
          project_id: machine.project_id,
        });
      }
    }
    machineStatus.set(machine.id, MACHINE_STATUS[worst]);
  }

  const existingById = new Map(existingAlerts.map(a => [a.id, a]));
  const toUpsert = [...desiredAlerts.values()].filter(a => {
    const prev = existingById.get(a.id);
    return !prev || !sameAlert(prev, a);
  });
  const toDelete = existingAlerts.filter(a => !desiredAlerts.has(a.id)).map(a => a.id);

  // Group status changes so each distinct value is a single UPDATE ... WHERE id IN (...).
  const machineUpdates = new Map<MaintStatus, string[]>();
  for (const machine of machines) {
    const next = machineStatus.get(machine.id)!;
    if (machine.maint_status !== next) machineUpdates.set(next, [...(machineUpdates.get(next) || []), machine.id]);
  }
  const recordUpdates = new Map<RecordStatus, string[]>();
  for (const r of maintRecords) {
    const next = recordStatus.get(r.id);
    if (next && r.status !== next) recordUpdates.set(next, [...(recordUpdates.get(next) || []), r.id]);
  }

  const writes = [
    toUpsert.length ? supabase.from('alerts').upsert(toUpsert) : null,
    toDelete.length ? supabase.from('alerts').delete().in('id', toDelete) : null,
    ...[...machineUpdates].map(([status, ids]) => supabase.from('machines').update({ maint_status: status }).in('id', ids)),
    ...[...recordUpdates].map(([status, ids]) => supabase.from('maintenance_records').update({ status }).in('id', ids)),
  ].filter(Boolean);

  const results = await Promise.all(writes);
  results.forEach(res => { if (res?.error) console.error('syncAlerts: write failed', res.error); });
}
