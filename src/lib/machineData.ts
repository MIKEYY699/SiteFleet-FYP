'use client';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MachineStatus = 'working' | 'completed' | 'idle' | 'maintenance';
export type MaintStatus = 'good' | 'due-soon' | 'overdue';
export type MaintenanceType = 'Routine' | 'Repair' | 'Emergency';
export type MaintenanceRecordStatus = 'Active' | 'Due' | 'Overdue';

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
}

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

export interface MaintenanceAlert {
  id: string;
  machineId: string;
  machineName: string;
  machineIdCode: string;
  part: string;
  hoursSince: number;
  limit: number;
  remaining: number;
  severity: 'overdue' | 'due-soon';
}

// ─── Machine Fleet Data ───────────────────────────────────────────────────────

export const MACHINES: Machine[] = [
  {
    id: 'mach-001', name: 'Excavator EC210', machineId: 'EX-015', type: 'Excavator',
    operator: 'Ramesh Kumar', site: 'Block-7 Foundation', status: 'working',
    startTime: '07:30', hoursToday: 10.5, totalLifetimeHours: 4820, maintStatus: 'overdue',
  },
  {
    id: 'mach-002', name: 'Bulldozer D6T', machineId: 'BD-022', type: 'Bulldozer',
    operator: 'Suresh Patel', site: 'Site-3 Clearing', status: 'working',
    startTime: '06:45', hoursToday: 11.2, totalLifetimeHours: 3650, maintStatus: 'good',
  },
  {
    id: 'mach-003', name: 'Tower Crane TC-500', machineId: 'CR-008', type: 'Crane',
    operator: 'Arjun Singh', site: 'Tower A — Floor 12', status: 'working',
    startTime: '08:00', hoursToday: 9.9, totalLifetimeHours: 2980, maintStatus: 'due-soon',
  },
  {
    id: 'mach-004', name: 'Concrete Mixer CM-7', machineId: 'CM-034', type: 'Mixer',
    operator: 'Vijay Nair', site: 'Block-5 Slab', status: 'working',
    startTime: '08:30', hoursToday: 9.4, totalLifetimeHours: 1840, maintStatus: 'good',
  },
  {
    id: 'mach-005', name: 'Motor Grader G140', machineId: 'MG-011', type: 'Grader',
    operator: 'Prakash Reddy', site: 'Access Road Levelling', status: 'working',
    startTime: '09:00', hoursToday: 8.9, totalLifetimeHours: 3120, maintStatus: 'due-soon',
  },
  {
    id: 'mach-006', name: 'Backhoe Loader 3CX', machineId: 'BH-019', type: 'Backhoe',
    operator: 'Mohan Yadav', site: 'Utility Trench — Zone B', status: 'idle',
    startTime: '07:00', hoursToday: 10.9, totalLifetimeHours: 2540, maintStatus: 'good',
  },
  {
    id: 'mach-007', name: 'Compactor CS533E', machineId: 'CP-007', type: 'Compactor',
    operator: 'Dinesh Sharma', site: 'Parking Area Phase-2', status: 'idle',
    startTime: '08:00', hoursToday: 0, totalLifetimeHours: 1920, maintStatus: 'good',
  },
  {
    id: 'mach-008', name: 'Wheel Loader WA380', machineId: 'WL-013', type: 'Loader',
    operator: 'Sanjay Mehta', site: 'Material Yard', status: 'idle',
    startTime: '07:30', hoursToday: 0, totalLifetimeHours: 2210, maintStatus: 'due-soon',
  },
  {
    id: 'mach-009', name: 'Piling Rig HR-260', machineId: 'PR-004', type: 'Piling Rig',
    operator: 'Rajiv Sharma', site: 'Commercial Wing Foundation', status: 'maintenance',
    startTime: '—', hoursToday: 0, totalLifetimeHours: 5600, maintStatus: 'overdue',
  },
  {
    id: 'mach-010', name: 'Dump Truck HD785', machineId: 'DT-031', type: 'Dump Truck',
    operator: 'Anil Gupta', site: 'Site-3 Clearing', status: 'maintenance',
    startTime: '—', hoursToday: 0, totalLifetimeHours: 4100, maintStatus: 'overdue',
  },
  {
    id: 'mach-011', name: 'Crawler Crane CC-2000', machineId: 'CC-002', type: 'Crane',
    operator: 'Harish Verma', site: 'Bridge Deck — Span 3', status: 'working',
    startTime: '07:00', hoursToday: 11.5, totalLifetimeHours: 6200, maintStatus: 'good',
  },
  {
    id: 'mach-012', name: 'Road Roller RR-120', machineId: 'RR-006', type: 'Roller',
    operator: 'Kiran Bose', site: 'Highway Ext. Phase-1', status: 'working',
    startTime: '08:15', hoursToday: 9.7, totalLifetimeHours: 2890, maintStatus: 'good',
  },
];

// ─── Maintenance Records ──────────────────────────────────────────────────────

export const MAINTENANCE_RECORDS: MaintenanceRecord[] = [
  {
    id: 'maint-001', machineId: 'EX-015', machineName: 'Excavator EC210',
    operatorName: 'Ramesh Kumar', workshopName: 'SKB Workshop Bay-1',
    maintenanceDate: '2026-06-15', maintenanceType: 'Repair',
    partRepairedOrReplaced: 'Hydraulic Pump', descriptionOfWork: 'Replaced worn hydraulic pump due to pressure loss. Tested system at full load.',
    technicianName: 'Ravi Technician', costOfMaintenance: 45000, remarks: 'Monitor pressure weekly',
    recommendedHoursUntilNext: 1200, hoursAtMaintenance: 3620, status: 'Overdue',
  },
  {
    id: 'maint-002', machineId: 'BD-022', machineName: 'Bulldozer D6T',
    operatorName: 'Suresh Patel', workshopName: 'SKB Workshop Bay-2',
    maintenanceDate: '2026-07-20', maintenanceType: 'Routine',
    partRepairedOrReplaced: 'Air Filter', descriptionOfWork: 'Replaced air filter and cleaned intake system. Checked all fluid levels.',
    technicianName: 'Mohan Mechanic', costOfMaintenance: 3500, remarks: 'Next oil change due at 3900h',
    recommendedHoursUntilNext: 300, hoursAtMaintenance: 3350, status: 'Active',
  },
  {
    id: 'maint-003', machineId: 'CR-008', machineName: 'Tower Crane TC-500',
    operatorName: 'Arjun Singh', workshopName: 'SKB Workshop Bay-1',
    maintenanceDate: '2026-07-01', maintenanceType: 'Routine',
    partRepairedOrReplaced: 'Wire Rope Assembly', descriptionOfWork: 'Replaced main hoist wire rope. Lubricated all sheaves and drums.',
    technicianName: 'Sunil Crane Tech', costOfMaintenance: 28000, remarks: 'Inspect rope weekly',
    recommendedHoursUntilNext: 500, hoursAtMaintenance: 2495, status: 'Due',
  },
  {
    id: 'maint-004', machineId: 'MG-011', machineName: 'Motor Grader G140',
    operatorName: 'Prakash Reddy',
    maintenanceDate: '2026-07-25', maintenanceType: 'Routine',
    partRepairedOrReplaced: 'Engine Oil & Filter', descriptionOfWork: 'Full engine oil change with filter replacement. Checked transmission fluid.',
    technicianName: 'Deepak Mechanic', costOfMaintenance: 8000,
    recommendedHoursUntilNext: 250, hoursAtMaintenance: 2882, status: 'Due',
  },
  {
    id: 'maint-005', machineId: 'PR-004', machineName: 'Piling Rig HR-260',
    operatorName: 'Rajiv Sharma', workshopName: 'External — Volvo Service',
    maintenanceDate: '2026-07-28', maintenanceType: 'Emergency',
    partRepairedOrReplaced: 'Main Drive Motor', descriptionOfWork: 'Emergency replacement of main drive motor after failure during piling operation.',
    technicianName: 'Volvo Service Team', costOfMaintenance: 180000, remarks: 'Machine under observation',
    recommendedHoursUntilNext: 2000, hoursAtMaintenance: 5600, status: 'Active',
  },
  {
    id: 'maint-006', machineId: 'DT-031', machineName: 'Dump Truck HD785',
    operatorName: 'Anil Gupta', workshopName: 'SKB Workshop Bay-3',
    maintenanceDate: '2026-07-30', maintenanceType: 'Repair',
    partRepairedOrReplaced: 'Rear Axle Bearing', descriptionOfWork: 'Replaced rear axle bearing set. Realigned rear axle and tested under load.',
    technicianName: 'Ravi Technician', costOfMaintenance: 35000,
    recommendedHoursUntilNext: 1500, hoursAtMaintenance: 4100, status: 'Active',
  },
  {
    id: 'maint-007', machineId: 'WL-013', machineName: 'Wheel Loader WA380',
    operatorName: 'Sanjay Mehta',
    maintenanceDate: '2026-07-10', maintenanceType: 'Routine',
    partRepairedOrReplaced: 'Bucket Teeth', descriptionOfWork: 'Replaced worn bucket teeth set. Checked bucket pins and bushings.',
    technicianName: 'Deepak Mechanic', costOfMaintenance: 12000,
    recommendedHoursUntilNext: 400, hoursAtMaintenance: 1820, status: 'Due',
  },
  {
    id: 'maint-008', machineId: 'EX-015', machineName: 'Excavator EC210',
    operatorName: 'Ramesh Kumar', workshopName: 'SKB Workshop Bay-1',
    maintenanceDate: '2026-04-10', maintenanceType: 'Routine',
    partRepairedOrReplaced: 'Engine Oil & Filter', descriptionOfWork: 'Routine engine oil change. Replaced oil filter and air filter.',
    technicianName: 'Mohan Mechanic', costOfMaintenance: 9500,
    recommendedHoursUntilNext: 250, hoursAtMaintenance: 3370, status: 'Active',
  },
];

// ─── Maintenance Alerts ───────────────────────────────────────────────────────

export const MAINTENANCE_ALERTS: MaintenanceAlert[] = [
  {
    id: 'alert-001', machineId: 'mach-001', machineName: 'Excavator EC210', machineIdCode: 'EX-015',
    part: 'Hydraulic Pump', hoursSince: 1200, limit: 1200, remaining: 0, severity: 'overdue',
  },
  {
    id: 'alert-002', machineId: 'mach-003', machineName: 'Tower Crane TC-500', machineIdCode: 'CR-008',
    part: 'Wire Rope Assembly', hoursSince: 485, limit: 500, remaining: 15, severity: 'due-soon',
  },
  {
    id: 'alert-003', machineId: 'mach-005', machineName: 'Motor Grader G140', machineIdCode: 'MG-011',
    part: 'Engine Oil', hoursSince: 238, limit: 250, remaining: 12, severity: 'due-soon',
  },
  {
    id: 'alert-004', machineId: 'mach-009', machineName: 'Piling Rig HR-260', machineIdCode: 'PR-004',
    part: 'Drive Belt', hoursSince: 312, limit: 300, remaining: -12, severity: 'overdue',
  },
  {
    id: 'alert-005', machineId: 'mach-008', machineName: 'Wheel Loader WA380', machineIdCode: 'WL-013',
    part: 'Bucket Teeth', hoursSince: 390, limit: 400, remaining: 10, severity: 'due-soon',
  },
];

// ─── Helper functions ─────────────────────────────────────────────────────────

export function getMachineById(id: string): Machine | undefined {
  return MACHINES.find(m => m.id === id || m.machineId === id);
}

export function getMaintenanceRecordsForMachine(machineIdCode: string): MaintenanceRecord[] {
  return MAINTENANCE_RECORDS.filter(r => r.machineId === machineIdCode);
}

export function getAlertsForMachine(machineId: string): MaintenanceAlert[] {
  return MAINTENANCE_ALERTS.filter(a => a.machineId === machineId || a.machineIdCode === machineId);
}

export function getMaintStatusFromAlerts(machineId: string): MaintStatus {
  const alerts = getAlertsForMachine(machineId);
  if (alerts.some(a => a.severity === 'overdue')) return 'overdue';
  if (alerts.some(a => a.severity === 'due-soon')) return 'due-soon';
  return 'good';
}
