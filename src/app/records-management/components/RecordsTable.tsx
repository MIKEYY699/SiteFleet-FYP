'use client';
import React, { useState } from 'react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import { ClipboardList, Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import type { WorkRecord } from './RecordsContent';

type SortKey = 'machineName' | 'entryDate' | 'operator' | 'totalHours' | 'status';
type SortDir = 'asc' | 'desc';

interface RecordsTableProps {
  records: WorkRecord[];
  selectedIds: Set<string>;
  allSelected: boolean;
  someSelected: boolean;
  currentPage: number;
  totalPages: number;
  perPage: number;
  totalFiltered: number;
  onSelectAll: (checked: boolean) => void;
  onSelectRow: (id: string, checked: boolean) => void;
  onEdit: (r: WorkRecord) => void;
  onDelete: (id: string) => void;
  onPageChange: (p: number) => void;
  onPerPageChange: (v: number) => void;
  onBulkDelete: () => void;
}

const PER_PAGE_OPTIONS = [5, 10, 20, 50];

function formatDate(d: string) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

function endTimeDisplay(status: WorkRecord['status'], endTime: string) {
  if (endTime) return endTime;
  if (status === 'working') return <span className="text-muted-foreground text-xs italic">In progress</span>;
  return <span className="text-muted-foreground text-xs">—</span>;
}

function hoursDisplay(status: WorkRecord['status'], totalHours: number | null) {
  if (totalHours !== null) return <span className="font-tabular font-700 text-foreground text-sm">{totalHours}h</span>;
  if (status === 'working') return <span className="text-xs text-muted-foreground italic">Ongoing</span>;
  return <span className="text-xs text-muted-foreground">—</span>;
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey | null; sortDir: SortDir }) {
  if (sortKey !== col) return <ChevronsUpDown size={13} className="text-muted-foreground/50 ml-1 inline" />;
  return sortDir === 'asc'
    ? <ChevronUp size={13} className="text-primary ml-1 inline" />
    : <ChevronDown size={13} className="text-primary ml-1 inline" />;
}

export default function RecordsTable({
  records, selectedIds, allSelected, someSelected,
  currentPage, totalPages, perPage, totalFiltered,
  onSelectAll, onSelectRow, onEdit, onDelete,
  onPageChange, onPerPageChange, onBulkDelete,
}: RecordsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = [...records].sort((a, b) => {
    if (!sortKey) return 0;
    let av: string | number = a[sortKey] ?? '';
    let bv: string | number = b[sortKey] ?? '';
    if (sortKey === 'totalHours') { av = a.totalHours ?? -1; bv = b.totalHours ?? -1; }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const thCls = 'px-2.5 py-3 text-left text-xs font-600 text-muted-foreground uppercase tracking-wide whitespace-nowrap cursor-pointer select-none hover:text-foreground transition-colors';

  const pageNumbers: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);
  for (let i = start; i <= end; i++) pageNumbers.push(i);

  return (
    <div className="bg-card rounded-xl border border-border card-shadow">
      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center justify-between px-5 py-3 bg-secondary border-b border-border rounded-t-xl slide-up">
          <p className="text-sm font-600 text-secondary-foreground">
            {selectedIds.size} record{selectedIds.size > 1 ? 's' : ''} selected
          </p>
          <button
            onClick={onBulkDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-700 btn-danger rounded-md"
          >
            <Trash2 size={13} />
            Delete Selected
          </button>
        </div>
      )}

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-2.5 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                  onChange={e => onSelectAll(e.target.checked)}
                  className="w-4 h-4 rounded border-border accent-primary"
                />
              </th>
              <th className={thCls} onClick={() => handleSort('machineName')}>
                Machine <SortIcon col="machineName" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={`${thCls} hidden md:table-cell`}>ID / Type</th>
              <th className={thCls} onClick={() => handleSort('entryDate')}>
                Date <SortIcon col="entryDate" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={`${thCls} hidden lg:table-cell`}>Project Site</th>
              <th className={thCls} onClick={() => handleSort('operator')}>
                Operator <SortIcon col="operator" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={`${thCls} hidden xl:table-cell`}>Start</th>
              <th className={`${thCls} hidden xl:table-cell`}>End</th>
              <th className={thCls} onClick={() => handleSort('totalHours')}>
                Hours <SortIcon col="totalHours" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className={thCls} onClick={() => handleSort('status')}>
                Status <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} />
              </th>
              <th className="px-2.5 py-3 text-right text-xs font-600 text-muted-foreground uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={11}>
                  <EmptyState
                    icon={<ClipboardList size={24} className="text-primary" />}
                    title="No work records found"
                    description="No entries match your current filters. Try adjusting the search or date range, or create a new machine work entry."
                    action={null}
                  />
                </td>
              </tr>
            ) : (
              sorted.map(record => (
                <tr
                  key={record.id}
                  className={`border-b border-border table-row-hover last:border-0 transition-colors ${selectedIds.has(record.id) ? 'bg-secondary/40' : ''}`}
                >
                  <td className="px-2.5 py-2.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(record.id)}
                      onChange={e => onSelectRow(record.id, e.target.checked)}
                      className="w-4 h-4 rounded border-border accent-primary"
                    />
                  </td>
                  <td className="px-2.5 py-2.5">
                    <p className="font-600 text-foreground text-sm leading-none">{record.machineName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 md:hidden">{record.machineId}</p>
                  </td>
                  <td className="px-2.5 py-2.5 hidden md:table-cell">
                    <p className="text-xs font-tabular font-600 text-foreground">{record.machineId}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{record.machineType}</p>
                  </td>
                  <td className="px-2.5 py-2.5 font-tabular text-sm text-foreground whitespace-nowrap">
                    {formatDate(record.entryDate)}
                  </td>
                  <td className="px-2.5 py-2.5 hidden lg:table-cell">
                    <span className="text-sm text-foreground truncate max-w-[160px] block">{record.projectSite}</span>
                  </td>
                  <td className="px-2.5 py-2.5 text-sm text-foreground">{record.operator}</td>
                  <td className="px-2.5 py-2.5 hidden xl:table-cell font-tabular text-sm text-foreground">
                    {record.startTime || '—'}
                  </td>
                  <td className="px-2.5 py-2.5 hidden xl:table-cell font-tabular text-sm text-foreground">
                    {endTimeDisplay(record.status, record.endTime)}
                  </td>
                  <td className="px-2.5 py-2.5">
                    {hoursDisplay(record.status, record.totalHours)}
                  </td>
                  <td className="px-2.5 py-2.5">
                    <StatusBadge status={record.status} size="sm" />
                  </td>
                  <td className="px-2.5 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <div className="relative group">
                        <button
                          onClick={() => onEdit(record)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <span className="tooltip-base -top-8 left-1/2 -translate-x-1/2">Edit record</span>
                      </div>
                      <div className="relative group">
                        <button
                          onClick={() => onDelete(record.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                        <span className="tooltip-base -top-8 left-1/2 -translate-x-1/2">Delete record — cannot be undone</span>
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalFiltered > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-t border-border">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Show</span>
            <select
              value={perPage}
              onChange={e => onPerPageChange(Number(e.target.value))}
              className="px-2.5 py-1 text-sm bg-input border border-border rounded-md focus:input-focus text-foreground outline-none"
            >
              {PER_PAGE_OPTIONS.map(v => (
                <option key={`pp-${v}`} value={v}>{v}</option>
              ))}
            </select>
            <span>of <span className="font-600 text-foreground">{totalFiltered}</span> entries</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 text-xs font-600 rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              «
            </button>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 text-xs font-600 rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ‹
            </button>
            {pageNumbers.map(p => (
              <button
                key={`page-${p}`}
                onClick={() => onPageChange(p)}
                className={`px-3 py-1.5 text-xs font-600 rounded-md border transition-colors
                  ${p === currentPage
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 text-xs font-600 rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ›
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 text-xs font-600 rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              »
            </button>
          </div>
        </div>
      )}
    </div>
  );
}