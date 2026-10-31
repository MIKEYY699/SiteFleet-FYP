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
