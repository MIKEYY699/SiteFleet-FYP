'use client';
import React, { useState, useEffect } from 'react';
import RecordsHeader from './RecordsHeader';
import RecordsFilters from './RecordsFilters';
import RecordsTable from './RecordsTable';
import RecordFormModal from './RecordFormModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { syncAlerts } from '@/lib/alertsSync';
import { useCurrentProject } from '@/lib/ProjectContext';

export type WorkRecord = {
  id: string;
  machineName: string;
  machineId: string;
  machineType: string;
  entryDate: string;
  projectSite: string;
  operator: string;
  jobDescription: string;
  startTime: string;
  endTime: string;
  totalHours: number | null;
  status: 'working' | 'completed' | 'idle';
};

type DbWorkRecord = {
  id: string;
  machine_name: string;
  machine_code: string;
  machine_type: string;
  entry_date: string;
  project_site: string;
  operator: string;
  job_description: string;
  start_time: string;
  end_time: string;
  total_hours: number | null;
  status: string;
};

function fromDb(row: DbWorkRecord): WorkRecord {
  return {
    id: row.id,
    machineName: row.machine_name,
    machineId: row.machine_code,
    machineType: row.machine_type,
    entryDate: row.entry_date,
    projectSite: row.project_site,
    operator: row.operator,
    jobDescription: row.job_description,
    startTime: row.start_time,
    endTime: row.end_time || '',
    totalHours: row.total_hours,
    status: row.status as WorkRecord['status'],
  };
}

function toDb(rec: WorkRecord): DbWorkRecord {
  return {
    id: rec.id,
    machine_name: rec.machineName,
    machine_code: rec.machineId,
    machine_type: rec.machineType,
    entry_date: rec.entryDate,
    project_site: rec.projectSite,
    operator: rec.operator,
    job_description: rec.jobDescription,
    start_time: rec.startTime,
    end_time: rec.endTime,
    total_hours: rec.totalHours,
    status: rec.status,
  };
}

function slugifyMachineCode(code: string): string {
  return `mach-${code.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Recomputes hours_today for a machine by summing ALL of today's records for it,
// instead of trusting whichever record was saved last.
async function refreshHoursToday(machineCode: string, projectId: string | null) {
  const todayStr = getTodayStr();
  const { data } = await supabase
    .from('work_records')
    .select('total_hours')
    .eq('machine_code', machineCode)
    .eq('project_id', projectId)
    .eq('entry_date', todayStr);
  const sum = (data || []).reduce((s, r) => s + (r.total_hours || 0), 0);
  await supabase.from('machines').update({ hours_today: sum }).eq('machine_code', machineCode).eq('project_id', projectId);
}

// Adds (or subtracts, if delta is negative) hours to a machine's lifetime total,
// used for edits, deletes, and machine reassignment. Never lets it go below 0.
async function adjustMachineLifetimeHours(machineCode: string, projectId: string | null, delta: number) {
  if (!machineCode || !delta) return;
  const { data: existing } = await supabase.from('machines').select('*').eq('machine_code', machineCode).eq('project_id', projectId).maybeSingle();
  if (!existing) return;
  const newTotal = Math.max(0, (existing.total_lifetime_hours || 0) + delta);
  await supabase.from('machines').update({ total_lifetime_hours: newTotal }).eq('id', existing.id);
  await refreshHoursToday(machineCode, projectId);
}

async function upsertMachineFromRecord(rec: WorkRecord, previousHours: number | null = null, projectId: string | null = null) {
  if (!rec.machineId) return;
  const { data: existing } = await supabase
    .from('machines')
    .select('*')
    .eq('machine_code', rec.machineId)
    .eq('project_id', projectId)
    .maybeSingle();

  // When editing an existing record, only add the *change* in hours, not the
  // full total again — otherwise lifetime hours double up every time a record is edited.
  const hoursDelta = (rec.totalHours ?? 0) - (previousHours ?? 0);

  if (existing) {
    await supabase.from('machines').update({
      name: rec.machineName,
      type: rec.machineType || existing.type,
      operator: rec.operator,
      site: rec.projectSite,
      status: rec.status,
      start_time: rec.startTime,
      total_lifetime_hours: Math.max(0, (existing.total_lifetime_hours || 0) + hoursDelta),
    }).eq('id', existing.id);
  } else {
    const machineDbId = `mach-${(projectId || 'none').slice(0, 8)}-${slugifyMachineCode(rec.machineId).replace(/^mach-/, '')}`;
    await supabase.from('machines').insert({
      id: machineDbId,
      name: rec.machineName,
      machine_code: rec.machineId,
      type: rec.machineType || 'Other',
      operator: rec.operator,
      site: rec.projectSite,
      status: rec.status,
      start_time: rec.startTime,
      hours_today: 0,
      total_lifetime_hours: Math.max(0, rec.totalHours ?? 0),
      maint_status: 'good',
      project_id: projectId,
    });
  }
  await refreshHoursToday(rec.machineId, projectId);
}

export type FilterState = {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  site: string;
};

export default function RecordsContent() {
  const { currentProjectId, ready } = useCurrentProject();
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({ search: '', status: '', dateFrom: '', dateTo: '', site: '' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<WorkRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    if (!ready) return;
    if (!currentProjectId) {
      setRecords([]);
      setLoading(false);
      return;
    }
    const loadRecords = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('work_records')
        .select('*')
        .eq('project_id', currentProjectId)
        .order('entry_date', { ascending: false });
      if (error) {
        addToast('error', 'Could not load records', error.message);
      } else if (data) {
        setRecords(data.map(fromDb));
      }
      setLoading(false);
    };
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId, ready]);

  const filtered = records.filter(r => {
    const q = filters.search.toLowerCase();
    const matchSearch = !q || r.machineName.toLowerCase().includes(q) || r.operator.toLowerCase().includes(q) || r.projectSite.toLowerCase().includes(q) || r.machineId.toLowerCase().includes(q);
    const matchStatus = !filters.status || r.status === filters.status;
    const matchDateFrom = !filters.dateFrom || r.entryDate >= filters.dateFrom;
    const matchDateTo = !filters.dateTo || r.entryDate <= filters.dateTo;
    const matchSite = !filters.site || r.projectSite.toLowerCase().includes(filters.site.toLowerCase());
    return matchSearch && matchStatus && matchDateFrom && matchDateTo && matchSite;
  });
  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('SKBEquip — Work Records Report', 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()} — ${filtered.length} records`, 14, 25);
    autoTable(doc, {
      startY: 32,
      head: [['Machine', 'Code', 'Date', 'Site', 'Operator', 'Start', 'End', 'Hours', 'Status']],
      body: filtered.map(r => [
        r.machineName, r.machineId, r.entryDate, r.projectSite, r.operator, r.startTime, r.endTime || '—',
        r.totalHours != null ? `${r.totalHours}h` : '—', r.status,
      ]),
      styles: { fontSize: 8 },
    });
    doc.save(`work-records-${new Date().toISOString().slice(0, 10)}.pdf`);
  };
  
  const siteOptions = Array.from(new Set(records.map(r => r.projectSite).filter(Boolean))).sort();
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleSave = async (data: WorkRecord) => {
    if (editRecord) {
      const { error } = await supabase.from('work_records').update(toDb(data)).eq('id', data.id);
      if (error) {
        addToast('error', 'Could not update record', error.message);
        return;
      }
      if (editRecord.machineId !== data.machineId) {
        // Machine was switched — fully reverse the old machine's contribution,
        // then fully apply the new machine's contribution, instead of a partial delta.
        await adjustMachineLifetimeHours(editRecord.machineId, currentProjectId, -(editRecord.totalHours ?? 0));
        await upsertMachineFromRecord(data, null, currentProjectId);
      } else {
        await upsertMachineFromRecord(data, editRecord.totalHours, currentProjectId);
      }
      await syncAlerts(currentProjectId);
      setRecords(prev => prev.map(r => r.id === data.id ? data : r));
      addToast('success', 'Record updated', `${data.machineName} entry saved successfully`);
    } else {
      const newRecord = { ...data, id: `rec-${Date.now()}` };
      const { error } = await supabase.from('work_records').insert({ ...toDb(newRecord), project_id: currentProjectId });
      if (error) {
        addToast('error', 'Could not create record', error.message);
        return;
      }
      await upsertMachineFromRecord(newRecord, null, currentProjectId);
      await syncAlerts(currentProjectId);
      setRecords(prev => [newRecord, ...prev]);
      addToast('success', 'Record created', `New entry for ${data.machineName} added`);
    }
    setModalOpen(false);
    setEditRecord(null);
  };

  const handleDeleteSingle = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const rec = records.find(r => r.id === deleteTarget);
    const { error } = await supabase.from('work_records').delete().eq('id', deleteTarget);
    if (error) {
      setDeleteLoading(false);
      addToast('error', 'Could not delete record', error.message);
      return;
    }
    if (rec) {
      await adjustMachineLifetimeHours(rec.machineId, currentProjectId, -(rec.totalHours ?? 0));
      await syncAlerts(currentProjectId);
    }
    setDeleteLoading(false);
    setRecords(prev => prev.filter(r => r.id !== deleteTarget));
    setDeleteTarget(null);
    addToast('success', 'Record deleted', `${rec?.machineName} entry removed`);
  };

  const handleBulkDelete = async () => {
    setDeleteLoading(true);
    const count = selectedIds.size;
    const toDelete = records.filter(r => selectedIds.has(r.id));
    const { error } = await supabase.from('work_records').delete().in('id', Array.from(selectedIds));
    if (error) {
      setDeleteLoading(false);
      addToast('error', 'Could not delete records', error.message);
      return;
    }
    // Sum hours per machine so each machine only gets one update, not one per record.
    const hoursByMachine = new Map<string, number>();
    toDelete.forEach(r => {
      if (!r.machineId) return;
      hoursByMachine.set(r.machineId, (hoursByMachine.get(r.machineId) || 0) + (r.totalHours ?? 0));
    });
    for (const [machineId, hours] of hoursByMachine) {
      await adjustMachineLifetimeHours(machineId, currentProjectId, -hours);
    }
    await syncAlerts(currentProjectId);
    setDeleteLoading(false);
    setRecords(prev => prev.filter(r => !selectedIds.has(r.id)));
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
    addToast('success', `${count} records deleted`, 'Selected entries have been removed');
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(paginated.map(r => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  if (loading) {
    return <div className="text-center py-16 text-muted-foreground text-sm">Loading records…</div>;
  }

  return (
    <div className="space-y-5">
      <RecordsHeader
        totalCount={records.length}
        filteredCount={filtered.length}
        onAddNew={() => { setEditRecord(null); setModalOpen(true); }}
        onExportPDF={handleExportPDF}
      />

      <RecordsFilters
        filters={filters}
        onChange={(f) => { setFilters(f); setCurrentPage(1); }}
        siteOptions={siteOptions}
      />

      <RecordsTable
        records={paginated}
        selectedIds={selectedIds}
        allSelected={paginated.length > 0 && paginated.every(r => selectedIds.has(r.id))}
        someSelected={selectedIds.size > 0}
        currentPage={currentPage}
        totalPages={totalPages}
        perPage={perPage}
        totalFiltered={filtered.length}
        onSelectAll={handleSelectAll}
        onSelectRow={handleSelectRow}
        onEdit={(r) => { setEditRecord(r); setModalOpen(true); }}
        onDelete={(id) => setDeleteTarget(id)}
        onPageChange={setCurrentPage}
        onPerPageChange={(v) => { setPerPage(v); setCurrentPage(1); }}
        onBulkDelete={() => setBulkDeleteOpen(true)}
      />

      <RecordFormModal
        open={modalOpen}
        record={editRecord}
        onClose={() => { setModalOpen(false); setEditRecord(null); }}
        onSave={handleSave}
      />

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteSingle}
        title="Delete Work Record"
        message="This work entry will be permanently removed from the system. This action cannot be undone."
        confirmLabel="Delete Record"
        loading={deleteLoading}
      />

      <ConfirmModal
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title={`Delete ${selectedIds.size} Records`}
        message={`You are about to permanently delete ${selectedIds.size} work entries. This action cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.size} Records`}
        loading={deleteLoading}
      />

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}