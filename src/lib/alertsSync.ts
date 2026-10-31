import { supabase } from './supabaseClient';

export async function syncAlerts(projectId?: string | null) {
  let machinesQuery = supabase.from('machines').select('*');
  if (projectId) machinesQuery = machinesQuery.eq('project_id', projectId);
  const { data: machines } = await machinesQuery;

  let maintQuery = supabase.from('maintenance_records').select('*').order('maintenance_date', { ascending: false });
  if (projectId) maintQuery = maintQuery.eq('project_id', projectId);
  const { data: maintRecords } = await maintQuery;

  const { data: settings } = await supabase.from('app_settings').select('due_soon_threshold, auto_reset').eq('id', 1).maybeSingle();
  const dueSoonThreshold = settings?.due_soon_threshold ?? 50;
  const autoReset = settings?.auto_reset ?? true;

  if (!machines || !maintRecords) return;

  for (const machine of machines) {
    // maintRecords is sorted newest-first, so [0] is most recent and the last
    // match is the oldest. Auto-Reset ON uses the most recent service as the
    // countdown's baseline; OFF keeps anchoring to the very first one logged.
    const machineMaintRecords = maintRecords.filter((r) => r.machine_id === machine.id);
    const lastMaint = autoReset ? machineMaintRecords[0] : machineMaintRecords[machineMaintRecords.length - 1];
    if (!lastMaint) {
      // No real maintenance record exists yet — clear any stale status and skip.
      if (machine.maint_status !== 'good') {
        await supabase.from('machines').update({ maint_status: 'good' }).eq('id', machine.id);
      }
      await supabase.from('alerts').delete().eq('id', `alert-${machine.id}`);
      continue;
    }

    const hoursSince = machine.total_lifetime_hours - lastMaint.hours_at_maintenance;
    const limit = lastMaint.recommended_hours_until_next;
    const remaining = limit - hoursSince;
    const alertId = `alert-${machine.id}`;

    if (remaining <= 0) {
      await supabase.from('alerts').upsert({
        id: alertId, machine_id: machine.id, machine_name: machine.name, machine_code: machine.machine_code,
        part: lastMaint.part_repaired_or_replaced, hours_since: hoursSince, limit_hours: limit, remaining, status: 'Overdue',
        project_id: machine.project_id,
      });
      if (machine.maint_status !== 'overdue') {
        await supabase.from('machines').update({ maint_status: 'overdue' }).eq('id', machine.id);
      }
    } else if (remaining <= dueSoonThreshold) {
      await supabase.from('alerts').upsert({
        id: alertId, machine_id: machine.id, machine_name: machine.name, machine_code: machine.machine_code,
        part: lastMaint.part_repaired_or_replaced, hours_since: hoursSince, limit_hours: limit, remaining, status: 'Due Soon',
        project_id: machine.project_id,
      });
      if (machine.maint_status !== 'due-soon') {
        await supabase.from('machines').update({ maint_status: 'due-soon' }).eq('id', machine.id);
      }
    } else {
      await supabase.from('alerts').delete().eq('id', alertId);
      if (machine.maint_status !== 'good') {
        await supabase.from('machines').update({ maint_status: 'good' }).eq('id', machine.id);
      }
    }
  }
}
