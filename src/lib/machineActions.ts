import { supabase } from './supabaseClient';
import { newId } from './ids';
import { syncAlerts } from './alertsSync';
import type { Machine } from './useMachines';

export type MachineInput = {
  name: string;
  machineCode: string;
  type: string;
  operator: string;
  site: string;
  inMaintenance: boolean;
  totalLifetimeHours: number;
};

// Creates or updates a machine. Work records and maintenance records store the
// machine's name and code as text, so a rename or code change is copied onto them
// too; otherwise the machine would lose its history (and saving an old record
// would recreate the machine under its old code).
export async function saveMachine(input: MachineInput, existing: Machine | null, projectId: string): Promise<string | null> {
  const row = {
    name: input.name.trim(),
    machine_code: input.machineCode.trim(),
    type: input.type.trim() || 'Other',
    operator: input.operator.trim(),
    site: input.site.trim(),
    total_lifetime_hours: Math.max(0, input.totalLifetimeHours),
  };

  if (!existing) {
    const { error } = await supabase.from('machines').insert({
      ...row,
      id: newId('mach'),
      status: input.inMaintenance ? 'maintenance' : 'idle',
      start_time: '—',
      hours_today: 0,
      maint_status: 'good',
      project_id: projectId,
    });
    return error?.message ?? null;
  }

  // Status other than "maintenance" is derived from work records (see withLiveStatus),
  // so leaving maintenance just hands control back to the records.
  const status = input.inMaintenance ? 'maintenance' : (existing.status === 'maintenance' ? 'idle' : existing.status);
  const { error } = await supabase.from('machines').update({ ...row, status }).eq('id', existing.id);
  if (error) return error.message;

  if (row.name !== existing.name || row.machine_code !== existing.machineId) {
    const renamed = { machine_name: row.name, machine_code: row.machine_code };
    const results = await Promise.all([
      supabase.from('work_records').update(renamed).eq('machine_code', existing.machineId).eq('project_id', projectId),
      supabase.from('maintenance_records').update(renamed).eq('machine_id', existing.id),
      supabase.from('alerts').update(renamed).eq('machine_id', existing.id),
    ]);
    const failed = results.find(r => r.error);
    if (failed?.error) return `Machine saved, but updating its records failed: ${failed.error.message}`;
  }

  // Lifetime hours drive the maintenance countdown, so a meter correction can change alerts.
  if (row.total_lifetime_hours !== existing.totalLifetimeHours) await syncAlerts(projectId);
  return null;
}

// Deletes the machine and its alerts. Work and maintenance records are kept as history.
export async function deleteMachine(machine: Machine): Promise<string | null> {
  const { error: alertsError } = await supabase.from('alerts').delete().eq('machine_id', machine.id);
  if (alertsError) return alertsError.message;
  const { error } = await supabase.from('machines').delete().eq('id', machine.id);
  return error?.message ?? null;
}
