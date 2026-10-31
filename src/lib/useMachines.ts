'use client';
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { useCurrentProject } from './ProjectContext';

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

type DbMachine = {
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

function fromDb(row: DbMachine): Machine {
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

export function useMachines() {
  const { currentProjectId, ready } = useCurrentProject();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;

    if (!currentProjectId) {
      setMachines([]);
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .eq('project_id', currentProjectId)
        .order('name');
      if (!error && data) {
        setMachines(data.map(fromDb));
      }
      setLoading(false);
    };
    load();
  }, [currentProjectId, ready]);

  return { machines, loading };
}
