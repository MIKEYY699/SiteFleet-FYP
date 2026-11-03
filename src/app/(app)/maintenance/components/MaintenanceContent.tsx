'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Wrench, Clock, CheckCircle2, AlertTriangle, Search } from 'lucide-react';
import { MaintenanceRecord, MaintenanceType, maintenanceFromDb as fromDb, maintenanceToDb as toDb, type DbMaintenanceRecord } from '@/lib/maintenanceTypes';
import { fetchMaintenanceSummary } from '@/lib/reportTotals';
import { useMachines } from '@/lib/useMachines';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentProject } from '@/lib/ProjectContext';
import { syncAlerts } from '@/lib/alertsSync';
import { newId } from '@/lib/ids';
import { formatDisplayDate } from '@/lib/format';

import { ToastContainer, useToast } from '@/components/ui/Toast';
import { friendlyError } from '@/lib/errors';
import LoadError from '@/components/ui/LoadError';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { invalidateFleetData } from '@/lib/queryClient';
import MaintenanceFormModal from './MaintenanceFormModal';
import MaintenanceHistoryPanel from './MaintenanceHistoryPanel';
import { TableRowSkeleton } from '@/components/ui/LoadingSkeleton';

const PER_PAGE = 20;

// Characters with a meaning in Supabase's filter syntax are dropped from searches.
function cleanSearch(text: string): string {
  return text.replace(/[,()%*\\"]/g, ' ').trim();
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function MaintenanceContent() {
  const { machines } = useMachines();
  const { currentProjectId, ready } = useCurrentProject();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<MaintenanceRecord | null>(null);
  const [historyMachineId, setHistoryMachineId] = useState<string | null>(null);
  const { toasts, addToast, removeToast } = useToast();
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const [syncedProject, setSyncedProject] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Record status (Active / Due / Overdue) is computed by syncAlerts from machine
  // hours, so sync once when the page opens and only then read the records.
  useEffect(() => {
    if (!ready || !currentProjectId) return;
    let cancelled = false;
    syncAlerts(currentProjectId).then(warning => {
      if (cancelled) return;
      setSyncWarning(warning);
      setSyncedProject(currentProjectId);
    });
    return () => { cancelled = true; };
  }, [currentProjectId, ready]);

  const debouncedSearch = useDebounced(search, 300);
  const filters = useMemo(() => ({ search: debouncedSearch, type: typeFilter, status: statusFilter }), [debouncedSearch, typeFilter, statusFilter]);
  const enabled = ready && !!currentProjectId && syncedProject === currentProjectId;

  // One page of matching records (filtered and paged by the database).
  const pageQuery = useQuery({
    queryKey: ['maintenanceRecords', currentProjectId, 'page', filters, page],
    queryFn: async () => {
      let q = supabase.from('maintenance_records').select('*', { count: 'exact' }).eq('project_id', currentProjectId!);
      if (filters.type) q = q.eq('maintenance_type', filters.type);
      if (filters.status) q = q.eq('status', filters.status);
      const term = cleanSearch(filters.search);
      if (term) q = q.or(['machine_name', 'machine_code', 'part_repaired_or_replaced'].map(c => `${c}.ilike."%${term}%"`).join(','));
      const from = (page - 1) * PER_PAGE;
      const { data, error, count } = await q
        .order('maintenance_date', { ascending: false })
        .order('id')
        .range(from, from + PER_PAGE - 1);
      if (error) throw new Error(friendlyError(error));
      return { rows: ((data || []) as DbMaintenanceRecord[]).map(fromDb), total: count ?? 0 };
    },
    enabled,
    placeholderData: keepPreviousData,
  });

  // The four counters at the top, added up in the database (whole project).
  const summaryQuery = useQuery({
    queryKey: ['maintenanceRecords', currentProjectId, 'summary'],
    queryFn: () => fetchMaintenanceSummary(currentProjectId!),
    enabled,
  });

  const rows = pageQuery.data?.rows ?? [];
  const totalFiltered = pageQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PER_PAGE));
  const loading = !ready || (!!currentProjectId && (!enabled || pageQuery.isPending) && !pageQuery.error);
  const loadError = pageQuery.error?.message ?? null;

  // After deleting the last record on the last page, step back to a page that exists.
  if (pageQuery.data && !pageQuery.isFetching && page > totalPages) {
    setPage(totalPages);
  }

  const stats = {
    total: summaryQuery.data?.recordCount,
    active: summaryQuery.data?.activeCount,
    due: summaryQuery.data?.dueCount,
    overdue: summaryQuery.data?.overdueCount,
  };

  // After a change: recalculate statuses, then reload the page and the counters.
  const syncAndLoad = async () => {
    if (!currentProjectId) return;
    setSyncWarning(await syncAlerts(currentProjectId));
    invalidateFleetData();
    await queryClient.invalidateQueries({ queryKey: ['maintenanceRecords', currentProjectId] });
  };

  const handleSave = async (data: MaintenanceRecord) => {
    const matchedMachine = machines.find(m => m.machineId === data.machineId);
    const machineDbId = matchedMachine?.id ?? null;

    if (editRecord) {
      const { error } = await supabase.from('maintenance_records').update(toDb(data, machineDbId)).eq('id', data.id);
      if (error) {
        addToast('error', 'Could not update record', friendlyError(error));
        return;
      }
      await syncAndLoad();
      addToast('success', 'Record updated', `Maintenance record for ${data.machineName} saved`);
    } else {
      const newRecord = { ...data, id: newId('maint') };
      const { error } = await supabase.from('maintenance_records').insert({ ...toDb(newRecord, machineDbId), project_id: currentProjectId });
      if (error) {
        addToast('error', 'Could not create record', friendlyError(error));
        return;
      }
      await syncAndLoad();
      addToast('success', 'Record created', `New maintenance record for ${data.machineName} added`);
    }
    setFormOpen(false);
    setEditRecord(null);
  };

  // Removing a service entry changes that part's countdown (an older service, or none,
  // now governs it), so alerts are recalculated straight after.
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('maintenance_records').delete().eq('id', deleteTarget.id);
    if (error) {
      setDeleting(false);
      addToast('error', 'Could not delete record', friendlyError(error));
      return;
    }
    await syncAndLoad();
    setDeleting(false);
    addToast('success', 'Record deleted', `${deleteTarget.partRepairedOrReplaced} on ${deleteTarget.machineName} removed`);
    setDeleteTarget(null);
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

  const retryLoad = () => { pageQuery.refetch(); summaryQuery.refetch(); };

  return (
    <div className="space-y-6">
      {loadError && (
        <LoadError title="Could not load maintenance records" message={loadError} onRetry={retryLoad} />
      )}
      {!loadError && syncWarning && (
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/25 text-sm text-foreground">
          Due / Overdue statuses may be out of date: they could not be recalculated. {syncWarning}
        </div>
      )}
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
                <div className="text-2xl font-800 text-white font-tabular">{s.value ?? '—'}</div>
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
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:border-primary text-foreground"
        >
          <option value="">All Types</option>
          <option value="Routine">Routine</option>
          <option value="Repair">Repair</option>
          <option value="Emergency">Emergency</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
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
          <span className="text-xs text-muted-foreground">{totalFiltered} records</span>
        </div>
        <div className={`overflow-x-auto scrollbar-thin transition-opacity ${pageQuery.isPlaceholderData ? 'opacity-60' : ''}`}>
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
                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={`maint-skel-${i}`} cols={8} />)
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                    {loadError ? 'Records could not be loaded.' : 'No maintenance records found.'}
                  </td>
                </tr>
              ) : rows.map(r => (
                <tr key={r.id} className="border-b border-border table-row-hover last:border-0">
                  <td className="px-5 py-3.5">
                    <p className="font-600 text-foreground text-sm leading-none">{r.machineName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-tabular">{r.machineId}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-sm text-foreground font-tabular">{formatDisplayDate(r.maintenanceDate)}</span>
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
                      <button
                        onClick={() => setDeleteTarget(r)}
                        className="text-xs font-600 text-danger hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalFiltered > PER_PAGE && (
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-border text-xs text-muted-foreground">
            <span>
              {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, totalFiltered)} of <span className="font-600 text-foreground">{totalFiltered}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-md border border-border bg-card font-600 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded-md border border-border bg-card font-600 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
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
          projectId={currentProjectId}
          onClose={() => setHistoryMachineId(null)}
        />
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete maintenance record?"
        message={deleteTarget
          ? `This removes the ${deleteTarget.partRepairedOrReplaced} service on ${deleteTarget.machineName} (${formatDisplayDate(deleteTarget.maintenanceDate)}). Its cost leaves the reports, and that part's next-service countdown falls back to the previous service, if there is one. This cannot be undone.`
          : ''}
        confirmLabel="Delete record"
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}