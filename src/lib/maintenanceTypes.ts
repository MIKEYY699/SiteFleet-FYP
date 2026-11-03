export type MaintenanceType = 'Routine' | 'Repair' | 'Emergency';
export type MaintenanceRecordStatus = 'Active' | 'Due' | 'Overdue';

export interface MaintenanceRecord {
  id: string;
  machineId: string;
  machineName: string;
  operatorName: string;
  workshopName?: string;
  maintenanceDate: string;
  maintenanceType: MaintenanceType;
  partRepairedOrReplaced: string;
  descriptionOfWork: string;
  technicianName?: string;
  costOfMaintenance?: number;
  remarks?: string;
  recommendedHoursUntilNext: number;
  hoursAtMaintenance: number;
  status: MaintenanceRecordStatus;
}

// Database row <-> app record.
export type DbMaintenanceRecord = {
  id: string;
  machine_id: string | null;
  machine_name: string;
  machine_code: string;
  operator_name: string;
  workshop_name: string | null;
  maintenance_date: string;
  maintenance_type: string;
  part_repaired_or_replaced: string;
  description_of_work: string;
  technician_name: string | null;
  cost_of_maintenance: number | null;
  remarks: string | null;
  recommended_hours_until_next: number;
  hours_at_maintenance: number;
  status: string;
};

export function maintenanceFromDb(row: DbMaintenanceRecord): MaintenanceRecord {
  return {
    id: row.id,
    machineId: row.machine_code,
    machineName: row.machine_name,
    operatorName: row.operator_name,
    workshopName: row.workshop_name || undefined,
    maintenanceDate: row.maintenance_date,
    maintenanceType: row.maintenance_type as MaintenanceType,
    partRepairedOrReplaced: row.part_repaired_or_replaced,
    descriptionOfWork: row.description_of_work,
    technicianName: row.technician_name || undefined,
    costOfMaintenance: row.cost_of_maintenance ?? undefined,
    remarks: row.remarks || undefined,
    recommendedHoursUntilNext: row.recommended_hours_until_next,
    hoursAtMaintenance: row.hours_at_maintenance,
    status: row.status as MaintenanceRecordStatus,
  };
}

export function maintenanceToDb(rec: MaintenanceRecord, machineDbId: string | null): DbMaintenanceRecord {
  return {
    id: rec.id,
    machine_id: machineDbId,
    machine_name: rec.machineName,
    machine_code: rec.machineId,
    operator_name: rec.operatorName,
    workshop_name: rec.workshopName || null,
    maintenance_date: rec.maintenanceDate,
    maintenance_type: rec.maintenanceType,
    part_repaired_or_replaced: rec.partRepairedOrReplaced,
    description_of_work: rec.descriptionOfWork,
    technician_name: rec.technicianName || null,
    cost_of_maintenance: rec.costOfMaintenance ?? null,
    remarks: rec.remarks || null,
    recommended_hours_until_next: rec.recommendedHoursUntilNext,
    hours_at_maintenance: rec.hoursAtMaintenance,
    status: rec.status,
  };
}
