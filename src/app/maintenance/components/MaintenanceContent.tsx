'use client';
import React, { useState, useEffect } from 'react';
import { Plus, Wrench, Clock, CheckCircle2, AlertTriangle, Search } from 'lucide-react';
import { MaintenanceRecord, MaintenanceType, MaintenanceRecordStatus } from '@/lib/machineData';
import { useMachines } from '@/lib/useMachines';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentProject } from '@/lib/ProjectContext';
import { syncAlerts } from '@/lib/alertsSync';

import { ToastContainer, useToast } from '@/components/ui/Toast';
import MaintenanceFormModal from './MaintenanceFormModal';
import MaintenanceHistoryPanel from './MaintenanceHistoryPanel';

type DbMaintenanceRecord = {
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

function fromDb(row: DbMaintenanceRecord): MaintenanceRecord {
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

function toDb(rec: MaintenanceRecord, machineDbId: string | null): DbMaintenanceRecord {
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

export default function MaintenanceContent() {
  const { machines } = useMachines();
  const { currentProjectId, ready } = useCurrentProject();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<MaintenanceRecord | null>(null);
  const [historyMachineId, setHistoryMachineId] = useState<string | null>(null);
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    if (!ready) return;
    if (!currentProjectId) {
      setRecords([]);
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('maintenance_records')
        .select('*')
        .eq('project_id', currentProjectId)
        .order('maintenance_date', { ascending: false });
      if (error) {
        addToast('error', 'Could not load maintenance records', error.message);
      } else if (data) {
        setRecords(data.map(fromDb));
      }
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId, ready]);

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.machineName.toLowerCase().includes(q) || r.machineId.toLowerCase().includes(q) || r.partRepairedOrReplaced.toLowerCase().includes(q);
    const matchType = !typeFilter || r.maintenanceType === typeFilter;
    const matchStatus = !statusFilter || r.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const stats = {
    total: records.length,
    active: records.filter(r => r.status === 'Active').length,
    due: records.filter(r => r.status === 'Due').length,
    overdue: records.filter(r => r.status === 'Overdue').length,
  };

  const handleSave = async (data: MaintenanceRecord) => {
    const matchedMachine = machines.find(m => m.machineId === data.machineId);
    const machineDbId = matchedMachine?.id ?? null;

    if (editRecord) {
      const { error } = await supabase.from('maintenance_records').update(toDb(data, machineDbId)).eq('id', data.id);
      if (error) {
        addToast('error', 'Could not update record', error.message);
        return;
      }
      await syncAlerts(currentProjectId);
      setRecords(prev => prev.map(r => r.id === data.id ? data : r));
      addToast('success', 'Record updated', `Maintenance record for ${data.machineName} saved`);
    } else {
      const newRecord = { ...data, id: `maint-${Date.now()}` };
      const { error } = await supabase.from('maintenance_records').insert({ ...toDb(newRecord, machineDbId), project_id: currentProjectId });
      if (error) {
        addToast('error', 'Could not create record', error.message);
        return;
      }
      await syncAlerts(currentProjectId);
      setRecords(prev => [newRecord, ...prev]);
      addToast('success', 'Record created', `New maintenance record for ${data.machineName} added`);
    }
    setFormOpen(false);
    setEditRecord(null);
  };

  const TYPE_COLORS: Record<MaintenanceType, string> = {
    Routine: 'bg-primary/10 text-primary',
    Repair: 'bg-warning/10 text-idle',
    Emergency: 'bg-danger/10 text-danger',
  };

  const STATUS_COLORS: Record<string, string> = {
    Active: 'maint-good',
    Due: 'maint-due-soon',
    Overdue: 'maint-overdue',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-end flex-wrap gap-3">
        <button
          onClick={() => { setEditRecord(null); setFormOpen(true); }}
          className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-600"
        >
          <Plus size={16} />
          Add Maintenance Record
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Records', value: stats.total, icon: Wrench, cls: 'kpi-card-completed' },
          { label: 'Active', value: stats.active, icon: CheckCircle2, cls: 'kpi-card-working' },
          { label: 'Due Soon', value: stats.due, icon: Clock, cls: 'kpi-card-due-soon' },
          { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, cls: 'kpi-card-overdue' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`rounded-xl p-4 flex items-center gap-3 ${s.cls}`}>
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <Icon size={18} className="text-white" />
              </div>
              <div>
                <div className="text-2xl font-800 text-white font-tabular">{s.value}</div>
                <div className="text-xs text-white/80 font-500">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border card-shadow p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-3 lg:col-span-1 lg:flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search machine, part..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:border-primary text-foreground"
        >
          <option value="">All Types</option>
          <option value="Routine">Routine</option>
          <option value="Repair">Repair</option>
          <option value="Emergency">Emergency</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:border-primary text-foreground"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Due">Due</option>
          <option value="Overdue">Overdue</option>
        </select>
      </div>

      {/* Records table */}
      <div className="bg-card rounded-xl border border-border card-shadow overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-700 text-foreground">Maintenance Records</h2>
          <span className="text-xs text-muted-foreground">{filtered.length} records</span>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-5 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Machine</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Part</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Technician</th>
                <th className="text-right px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Next Due (hrs)</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-600 text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                    Loading maintenance records…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                    No maintenance records found.
                  </td>
                </tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="border-b border-border table-row-hover last:border-0">
                  <td className="px-5 py-3.5">
                    <p className="font-600 text-foreground text-sm leading-none">{r.machineName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-tabular">{r.machineId}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-foreground font-tabular">{r.maintenanceDate}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-2xs font-600 px-2 py-0.5 rounded-full ${TYPE_COLORS[r.maintenanceType]}`}>
                      {r.maintenanceType}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-foreground">{r.partRepairedOrReplaced}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-foreground">{r.technicianName ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="font-tabular font-600 text-foreground">{r.recommendedHoursUntilNext}h</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-2xs font-600 px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status]}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditRecord(r); setFormOpen(true); }}
                        className="text-xs font-600 text-primary hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setHistoryMachineId(r.machineId)}
                        className="text-xs font-600 text-muted-foreground hover:text-foreground hover:underline"
                      >
                        History
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Maintenance Form Modal */}
      <MaintenanceFormModal
        open={formOpen}
        record={editRecord}
        onClose={() => { setFormOpen(false); setEditRecord(null); }}
        onSave={handleSave}
      />

      {/* History Panel */}
      {historyMachineId && (
        <MaintenanceHistoryPanel
          machineId={historyMachineId}
          records={records}
          onClose={() => setHistoryMachineId(null)}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}