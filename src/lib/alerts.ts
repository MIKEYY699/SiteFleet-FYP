export type AlertSeverity = 'overdue' | 'due-soon';

export type DbAlert = {
  id: string;
  machine_id: string;
  machine_name: string;
  machine_code: string;
  part: string;
  hours_since: number;
  limit_hours: number;
  remaining: number;
  status: string;
  project_id: string | null;
};

export type MaintenanceAlert = {
  id: string;
  machineId: string;
  machineName: string;
  machineIdCode: string;
  part: string;
  hoursSince: number;
  limit: number;
  remaining: number;
  severity: AlertSeverity;
};

export function alertFromDb(row: DbAlert): MaintenanceAlert {
  return {
    id: row.id,
    machineId: row.machine_id,
    machineName: row.machine_name,
    machineIdCode: row.machine_code,
    part: row.part,
    hoursSince: row.hours_since,
    limit: row.limit_hours,
    remaining: row.remaining,
    severity: row.status.toLowerCase().replace(' ', '-') as AlertSeverity,
  };
}
