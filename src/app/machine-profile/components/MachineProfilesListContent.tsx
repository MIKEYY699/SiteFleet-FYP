'use client';
import React, { useState } from 'react';
import { HardHat, Search, MapPin, User, TrendingUp, ExternalLink, Plus } from 'lucide-react';
import Link from 'next/link';
import { useMachines } from '@/lib/useMachines';
import { StatusBadge, MaintStatusBadge } from '@/components/ui/StatusBadge';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { useCurrentProject } from '@/lib/ProjectContext';
import MachineFormModal from './MachineFormModal';

export default function MachineProfilesListContent() {
  const { machines, loading, error, reload } = useMachines();
  const { currentProjectId } = useCurrentProject();
  const [formOpen, setFormOpen] = useState(false);
  const { toasts, addToast, removeToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [maintFilter, setMaintFilter] = useState('');

  const filtered = machines.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.name.toLowerCase().includes(q) || m.machineId.toLowerCase().includes(q) || m.operator.toLowerCase().includes(q);
    const matchStatus = !statusFilter || m.status === statusFilter;
    const matchMaint = !maintFilter || m.maintStatus === maintFilter;
    return matchSearch && matchStatus && matchMaint;
  });

  const MAINT_INDICATOR: Record<string, string> = {
    good: '🟢',
    'due-soon': '🟡',
    overdue: '🔴',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{machines.length} machine{machines.length === 1 ? '' : 's'} in this project</p>
        <button
          onClick={() => setFormOpen(true)}
          disabled={!currentProjectId}
          className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-600"
        >
          <Plus size={16} /> Add Machine
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">
          Could not load machines: {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-card rounded-xl border border-border card-shadow p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-3 lg:col-span-1 lg:flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search machine, operator..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:border-primary text-foreground" 
        >
          <option value="">All Statuses</option>
          <option value="working">Working</option>
          <option value="idle">Idle</option>
          <option value="maintenance">Maintenance</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={maintFilter}
          onChange={e => setMaintFilter(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:border-primary text-foreground"
        >
          <option value="">All Maint. Status</option>
          <option value="good">Good</option>
          <option value="due-soon">Due Soon</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Machine cards grid */}
      {loading && (
        <div className="text-center py-12 text-sm text-muted-foreground">Loading machines…</div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(m => (
          <Link
            key={m.id}
            href={`/machine-profile/${m.id}`}
            className="bg-card rounded-xl border border-border card-shadow p-5 hover:card-shadow-md transition-all hover:border-primary/30 group block"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${m.maintStatus === 'overdue' ? 'bg-danger/10' : m.maintStatus === 'due-soon' ? 'bg-warning/10' : 'bg-success/10'}`}>
                  <HardHat size={18} className={m.maintStatus === 'overdue' ? 'text-danger' : m.maintStatus === 'due-soon' ? 'text-warning' : 'text-success'} />
                </div>
                <div>
                  <p className="font-700 text-sm text-foreground leading-none">{m.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 font-tabular">{m.machineId} · {m.type}</p>
                </div>
              </div>
              <ExternalLink size={14} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User size={11} />
                <span>{m.operator}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin size={11} />
                <span className="truncate">{m.site}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingUp size={11} />
                <span>{m.totalLifetimeHours.toLocaleString()}h total lifetime</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <StatusBadge status={m.status} size="sm" />
              <div className="flex items-center gap-1.5">
                <span className="text-xs">{MAINT_INDICATOR[m.maintStatus]}</span>
                <MaintStatusBadge status={m.maintStatus} size="sm" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <HardHat size={32} className="mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No machines found matching your filters.</p>
        </div>
      )}

      {formOpen && <MachineFormModal
        machine={null}
        projectId={currentProjectId}
        existingCodes={machines.map(m => m.machineId)}
        onClose={() => setFormOpen(false)}
        onSaved={(msg) => { setFormOpen(false); reload(); addToast('success', 'Machine saved', msg); }}
      />}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
