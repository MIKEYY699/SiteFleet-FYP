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
import { useAppSettings } from '@/lib/AppSettingsContext';
import { formatDateTimeInTz, todayInTz } from '@/lib/format';
import { newId } from '@/lib/ids';

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

// Makes sure the record's machine exists and carries the record's latest details.
// Lifetime hours are NOT touched here: the database adds/removes a record's hours
// itself whenever a work record is inserted, edited or deleted (trigger
// work_records_apply_hours, see supabase/migrations). So this must run BEFORE the
// record is saved, so there is a machine row for those hours to land on.
async function ensureMachineForRecord(rec: WorkRecord, projectId: string | null): Promise<string | null> {
  if (!rec.machineId) return null;
  const { data: existing, error: findError } = await supabase
    .from('machines')
    .select('id, type, status')
    .eq('machine_code', rec.machineId)
    .eq('project_id', projectId)
    .maybeSingle();
  if (findError) return findError.message;

  if (existing) {
    const { error } = await supabase.from('machines').update({
      name: rec.machineName,
      type: rec.machineType || existing.type,
      operator: rec.operator,
      site: rec.projectSite,
      // A machine marked out of service stays that way until someone clears it.
      status: existing.status === 'maintenance' ? 'maintenance' : rec.status,
      start_time: rec.startTime,
    }).eq('id', existing.id);
    return error?.message ?? null;
  }

  const { error } = await supabase.from('machines').insert({
    id: newId('mach'),
    name: rec.machineName,
    machine_code: rec.machineId,
    type: rec.machineType || 'Other',
    operator: rec.operator,
    site: rec.projectSite,
    status: rec.status,
    start_time: rec.startTime,
    hours_today: 0,
    total_lifetime_hours: 0,
    maint_status: 'good',
    project_id: projectId,
  });
  return error?.message ?? null;
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
  const { timezone } = useAppSettings();
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
    doc.text(`Generated: ${formatDateTimeInTz(new Date(), timezone)} (${timezone}) — ${filtered.length} records`, 14, 25);
    autoTable(doc, {
      startY: 32,
      head: [['Machine', 'Code', 'Date', 'Site', 'Operator', 'Start', 'End', 'Hours', 'Status']],
      body: filtered.map(r => [
        r.machineName, r.machineId, r.entryDate, r.projectSite, r.operator, r.startTime, r.endTime || '—',
        r.totalHours != null ? `${r.totalHours}h` : '—', r.status,
      ]),
      styles: { fontSize: 8 },
    });
    doc.save(`work-records-${todayInTz(timezone)}.pdf`);
  };
  
  const siteOptions = Array.from(new Set(records.map(r => r.projectSite).filter(Boolean))).sort();
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleSave = async (data: WorkRecord) => {
    // Machine first, so the database has a machine to add this record's hours to.
    // Hours (including moving them when the machine is switched) are handled by the
    // database when the record below is saved.
    const machineError = await ensureMachineForRecord(data, currentProjectId);
    if (machineError) addToast('error', 'Machine details not saved', machineError);

    if (editRecord) {
      const { error } = await supabase.from('work_records').update(toDb(data)).eq('id', data.id);
      if (error) {
        addToast('error', 'Could not update record', error.message);
        return;
      }
      await syncAlerts(currentProjectId);
      setRecords(prev => prev.map(r => r.id === data.id ? data : r));
      addToast('success', 'Record updated', `${data.machineName} entry saved successfully`);
    } else {
      const newRecord = { ...data, id: newId('rec') };
      const { error } = await supabase.from('work_records').insert({ ...toDb(newRecord), project_id: currentProjectId });
      if (error) {
        addToast('error', 'Could not create record', error.message);
        return;
      }
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
    // The database takes this record's hours off the machine.
    await syncAlerts(currentProjectId);
    setDeleteLoading(false);
    setRecords(prev => prev.filter(r => r.id !== deleteTarget));
    setDeleteTarget(null);
    addToast('success', 'Record deleted', `${rec?.machineName} entry removed`);
  };

  const handleBulkDelete = async () => {
    setDeleteLoading(true);
    const count = selectedIds.size;
    const { error } = await supabase.from('work_records').delete().in('id', Array.from(selectedIds));
    if (error) {
      setDeleteLoading(false);
      addToast('error', 'Could not delete records', error.message);
      return;
    }
    // The database takes each deleted record's hours off its machine.
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