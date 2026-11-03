'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import RecordsHeader from './RecordsHeader';
import RecordsFilters from './RecordsFilters';
import RecordsTable, { type SortKey, type SortDir } from './RecordsTable';
import RecordFormModal from './RecordFormModal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { friendlyError } from '@/lib/errors';
import { invalidateFleetData } from '@/lib/queryClient';
import LoadError from '@/components/ui/LoadError';
import { supabase } from '@/lib/supabaseClient';
import { fetchAllRows } from '@/lib/fetchAll';
import { loadPdfTools } from '@/lib/pdf';
import { fetchWorkRecordSites } from '@/lib/reportTotals';
import { syncAlerts } from '@/lib/alertsSync';
import { useCurrentProject } from '@/lib/ProjectContext';
import { useAppSettings } from '@/lib/AppSettingsContext';
import { formatDateTimeInTz, formatDisplayDate, todayInTz } from '@/lib/format';
import { newId } from '@/lib/ids';
import { TableCardSkeleton } from '@/components/ui/LoadingSkeleton';

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

// Finds the record's machine, creating it only when the user explicitly asked to
// (the "add as a new machine" box), so a mistyped Machine ID can't create a ghost
// machine. This must run BEFORE the record is saved: the database adds/removes a
// record's hours on its machine whenever a work record is inserted, edited or
// deleted (trigger work_records_apply_hours, see supabase/migrations), so the
// machine row has to exist first or those hours are lost.
//
// An existing machine's name, type and status are NOT changed here: they belong to
// the machine profile, and editing an old record shouldn't rename the machine.
// A new entry does update the machine's current operator and site.
async function ensureMachineForRecord(
  rec: WorkRecord,
  projectId: string | null,
  { createMachine, isNewRecord }: { createMachine: boolean; isNewRecord: boolean },
): Promise<{ error: string | null; createdMachineId: string | null }> {
  const { data: existing, error: findError } = await supabase
    .from('machines')
    .select('id')
    .eq('machine_code', rec.machineId)
    .eq('project_id', projectId)
    .maybeSingle();
  if (findError) return { error: friendlyError(findError), createdMachineId: null };

  if (existing) {
    if (!isNewRecord) return { error: null, createdMachineId: null };
    const { error } = await supabase.from('machines').update({
      operator: rec.operator,
      site: rec.projectSite,
    }).eq('id', existing.id);
    return { error: error ? friendlyError(error) : null, createdMachineId: null };
  }

  if (!createMachine) {
    // The form checks this too; this covers a machine deleted while the form was open.
    return { error: `There is no machine with ID "${rec.machineId}" in this project.`, createdMachineId: null };
  }

  const id = newId('mach');
  const { error } = await supabase.from('machines').insert({
    id,
    name: rec.machineName,
    machine_code: rec.machineId,
    type: rec.machineType || 'Other',
    operator: rec.operator,
    site: rec.projectSite,
    status: 'idle',
    start_time: '—',
    hours_today: 0,
    total_lifetime_hours: 0,
    maint_status: 'good',
    project_id: projectId,
  });
  return { error: error ? friendlyError(error) : null, createdMachineId: error ? null : id };
}

export type FilterState = {
  search: string;
  status: string;
  dateFrom: string;
  dateTo: string;
  site: string;
};

const EMPTY_FILTERS: FilterState = { search: '', status: '', dateFrom: '', dateTo: '', site: '' };

const RECORD_COLUMNS = 'id, machine_name, machine_code, machine_type, entry_date, project_site, operator, job_description, start_time, end_time, total_hours, status';

const SORT_COLUMN: Record<SortKey, string> = {
  machineName: 'machine_name',
  entryDate: 'entry_date',
  operator: 'operator',
  totalHours: 'total_hours',
  status: 'status',
};

// Characters that have a meaning in Supabase's filter syntax are dropped from the
// search text, so a search can never break (or change) the query.
function cleanSearch(text: string): string {
  return text.replace(/[,()%*\\"]/g, ' ').trim();
}

// All filtering happens in the database, so it covers every record, not just the
// ones that happen to be loaded.
function filteredRecordsQuery(projectId: string, f: FilterState, withCount: boolean) {
  let q = supabase
    .from('work_records')
    .select(RECORD_COLUMNS, withCount ? { count: 'exact' } : undefined)
    .eq('project_id', projectId);
  if (f.status) q = q.eq('status', f.status);
  if (f.site) q = q.eq('project_site', f.site);
  if (f.dateFrom) q = q.gte('entry_date', f.dateFrom);
  if (f.dateTo) q = q.lte('entry_date', f.dateTo);
  const term = cleanSearch(f.search);
  if (term) {
    q = q.or(['machine_name', 'operator', 'project_site', 'machine_code'].map(c => `${c}.ilike."%${term}%"`).join(','));
  }
  return q;
}

// Waits until the user stops typing before searching, instead of querying per key.
function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function RecordsContent() {
  const { currentProjectId, ready } = useCurrentProject();
  const { timezone } = useAppSettings();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>('entryDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<WorkRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkRecord | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const { toasts, addToast, removeToast } = useToast();

  // Only the search box is debounced; dropdowns and dates apply immediately.
  const debouncedSearch = useDebounced(filters.search, 300);
  const activeFilters = useMemo(() => ({ ...filters, search: debouncedSearch }), [filters, debouncedSearch]);
  const enabled = ready && !!currentProjectId;

  // One page of matching records, plus how many match in total.
  const pageQuery = useQuery({
    queryKey: ['workRecords', currentProjectId, 'page', activeFilters, sortKey, sortDir, currentPage, perPage],
    queryFn: async () => {
      const from = (currentPage - 1) * perPage;
      const { data, error, count } = await filteredRecordsQuery(currentProjectId!, activeFilters, true)
        .order(SORT_COLUMN[sortKey], { ascending: sortDir === 'asc', nullsFirst: false })
        .order('id')
        .range(from, from + perPage - 1);
      if (error) throw new Error(friendlyError(error));
      return { rows: ((data || []) as DbWorkRecord[]).map(fromDb), total: count ?? 0 };
    },
    enabled,
    // Keep showing the current page while the next one loads.
    placeholderData: keepPreviousData,
  });

  // Total for the project (for "12 of 340 entries") and the Site filter's options.
  const totalQuery = useQuery({
    queryKey: ['workRecords', currentProjectId, 'total'],
    queryFn: async () => {
      const { count, error } = await supabase.from('work_records').select('id', { count: 'exact', head: true }).eq('project_id', currentProjectId!);
      if (error) throw new Error(friendlyError(error));
      return count ?? 0;
    },
    enabled,
  });
  const sitesQuery = useQuery({
    queryKey: ['workRecords', currentProjectId, 'sites'],
    queryFn: () => fetchWorkRecordSites(currentProjectId!),
    enabled,
  });

  const pageRows = pageQuery.data?.rows ?? [];
  const totalFiltered = pageQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / perPage));

  // After deleting the last rows of the last page, step back to a page that exists.
  if (pageQuery.data && !pageQuery.isFetching && currentPage > totalPages) {
    setCurrentPage(totalPages);
  }

  const refreshRecords = () => queryClient.invalidateQueries({ queryKey: ['workRecords', currentProjectId] });

  // Anything that changes which rows are shown also clears the selection.
  const changeView = (apply: () => void) => {
    apply();
    setSelectedIds(new Set());
  };

  // Alerts depend on machine hours, which every save/delete here changes.
  const syncAlertsAfterChange = async () => {
    const syncError = await syncAlerts(currentProjectId);
    if (syncError) addToast('error', 'Maintenance alerts not updated', `The change was saved, but alerts could not be recalculated. ${syncError}`);
  };

  // The PDF covers every record matching the filters, so it fetches them all
  // (in batches) at click time rather than relying on the current page.
  const handleExportPDF = async () => {
    if (!currentProjectId || exporting) return;
    setExporting(true);
    try {
      const [{ data, error }, { jsPDF, autoTable }] = await Promise.all([
        fetchAllRows<DbWorkRecord>((from, to) => filteredRecordsQuery(currentProjectId, activeFilters, false)
          .order(SORT_COLUMN[sortKey], { ascending: sortDir === 'asc', nullsFirst: false })
          .order('id')
          .range(from, to)),
        loadPdfTools(),
      ]);
      if (error) {
        addToast('error', 'Could not create the report', friendlyError(error));
        return;
      }
      const rows = data.map(fromDb);
      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(16);
      doc.text('SKBEquip — Work Records Report', 14, 18);
      doc.setFontSize(10);
      doc.text(`Generated: ${formatDateTimeInTz(new Date(), timezone)} (${timezone}) — ${rows.length} records`, 14, 25);
      autoTable(doc, {
        startY: 32,
        head: [['Machine', 'Code', 'Date', 'Site', 'Operator', 'Start', 'End', 'Hours', 'Status']],
        body: rows.map(r => [
          r.machineName, r.machineId, formatDisplayDate(r.entryDate), r.projectSite, r.operator, r.startTime, r.endTime || '—',
          r.totalHours != null ? `${r.totalHours}h` : '—', r.status,
        ]),
        styles: { fontSize: 8 },
      });
      doc.save(`work-records-${todayInTz(timezone)}.pdf`);
    } catch (err) {
      console.error('PDF export failed', err);
      addToast('error', 'Could not create the report', friendlyError(err));
    } finally {
      setExporting(false);
    }
  };

  const handleSave = async (data: WorkRecord, { createMachine }: { createMachine: boolean }) => {
    // Machine first, so the database has a machine to add this record's hours to.
    // If that fails, stop: saving the record anyway would lose its hours.
    const machine = await ensureMachineForRecord(data, currentProjectId, { createMachine, isNewRecord: !editRecord });
    if (machine.error) {
      addToast('error', 'Record not saved', `Problem with the machine: ${machine.error}`);
      return;
    }

    const newRecord = editRecord ? data : { ...data, id: newId('rec') };
    const { error } = editRecord
      ? await supabase.from('work_records').update(toDb(data)).eq('id', data.id)
      : await supabase.from('work_records').insert({ ...toDb(newRecord), project_id: currentProjectId });

    if (error) {
      // Don't leave behind a machine that was only created for this record.
      if (machine.createdMachineId) {
        const { error: cleanupError } = await supabase.from('machines').delete().eq('id', machine.createdMachineId);
        if (cleanupError) console.error('Could not remove machine created for a failed record', cleanupError);
      }
      addToast('error', editRecord ? 'Could not update record' : 'Could not create record', friendlyError(error));
      return;
    }

    // Hours changed on the machine (database trigger) and maybe a new machine exists.
    invalidateFleetData();
    refreshRecords();
    await syncAlertsAfterChange();
    if (editRecord) {
      addToast('success', 'Record updated', `${data.machineName} entry saved successfully`);
    } else {
      addToast('success', 'Record created', machine.createdMachineId
        ? `New entry for ${data.machineName} added, and ${data.machineId} added as a new machine`
        : `New entry for ${data.machineName} added`);
    }
    setModalOpen(false);
    setEditRecord(null);
  };

  const handleDeleteSingle = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const { error } = await supabase.from('work_records').delete().eq('id', deleteTarget.id);
    if (error) {
      setDeleteLoading(false);
      addToast('error', 'Could not delete record', friendlyError(error));
      return;
    }
    // The database takes this record's hours off the machine.
    invalidateFleetData();
    refreshRecords();
    await syncAlertsAfterChange();
    setDeleteLoading(false);
    setSelectedIds(prev => { const next = new Set(prev); next.delete(deleteTarget.id); return next; });
    setDeleteTarget(null);
    addToast('success', 'Record deleted', `${deleteTarget.machineName} entry removed`);
  };

  const handleBulkDelete = async () => {
    setDeleteLoading(true);
    const count = selectedIds.size;
    const { error } = await supabase.from('work_records').delete().in('id', Array.from(selectedIds));
    if (error) {
      setDeleteLoading(false);
      addToast('error', 'Could not delete records', friendlyError(error));
      return;
    }
    // The database takes each deleted record's hours off its machine.
    invalidateFleetData();
    refreshRecords();
    await syncAlertsAfterChange();
    setDeleteLoading(false);
    setSelectedIds(new Set());
    setBulkDeleteOpen(false);
    addToast('success', `${count} records deleted`, 'Selected entries have been removed');
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(pageRows.map(r => r.id)) : new Set());
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  if (!ready || (enabled && pageQuery.isPending && !pageQuery.error)) {
    return <TableCardSkeleton rows={8} cols={7} />;
  }

  return (
    <div className="space-y-5">
      <RecordsHeader
        totalCount={totalQuery.data ?? totalFiltered}
        filteredCount={totalFiltered}
        exporting={exporting}
        onAddNew={() => { setEditRecord(null); setModalOpen(true); }}
        onExportPDF={handleExportPDF}
      />

      <RecordsFilters
        filters={filters}
        onChange={(f) => changeView(() => { setFilters(f); setCurrentPage(1); })}
        siteOptions={sitesQuery.data ?? []}
      />

      {/* Without this a failed load would look like "no records" and invite duplicates. */}
      {pageQuery.error ? (
        <LoadError title="Could not load work records" message={pageQuery.error.message} onRetry={() => pageQuery.refetch()} />
      ) : (
        <div className={pageQuery.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <RecordsTable
            records={pageRows}
            selectedIds={selectedIds}
            allSelected={pageRows.length > 0 && pageRows.every(r => selectedIds.has(r.id))}
            someSelected={selectedIds.size > 0}
            currentPage={currentPage}
            totalPages={totalPages}
            perPage={perPage}
            totalFiltered={totalFiltered}
            sortKey={sortKey}
            sortDir={sortDir}
            onSortChange={(key, dir) => changeView(() => { setSortKey(key); setSortDir(dir); setCurrentPage(1); })}
            onSelectAll={handleSelectAll}
            onSelectRow={handleSelectRow}
            onEdit={(r) => { setEditRecord(r); setModalOpen(true); }}
            onDelete={(id) => setDeleteTarget(pageRows.find(r => r.id === id) ?? null)}
            onPageChange={(p) => changeView(() => setCurrentPage(p))}
            onPerPageChange={(v) => changeView(() => { setPerPage(v); setCurrentPage(1); })}
            onBulkDelete={() => setBulkDeleteOpen(true)}
          />
        </div>
      )}

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
