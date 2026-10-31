'use client';
import React from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import type { FilterState } from './RecordsContent';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'working', label: 'Working' },
  { value: 'completed', label: 'Completed' },
  { value: 'idle', label: 'Idle' },
];

interface RecordsFiltersProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  siteOptions: string[];
}

export default function RecordsFilters({ filters, onChange, siteOptions }: RecordsFiltersProps) {
  const update = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = filters.status || filters.dateFrom || filters.dateTo || filters.site;

  const clearAll = () => {
    onChange({ search: '', status: '', dateFrom: '', dateTo: '', site: '' });
  };

  return (
    <div className="bg-card rounded-xl border border-border card-shadow p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-3 lg:items-center">
        {/* Search */}
        <div className="relative sm:col-span-2 lg:col-span-auto lg:flex-1 lg:min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search machine, operator, site, ID..."
            value={filters.search}
            onChange={e => update('search', e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-input border border-border rounded-md focus:input-focus placeholder:text-muted-foreground text-foreground outline-none transition-all"
          />
          {filters.search && (
            <button
              onClick={() => update('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={filters.status}
          onChange={e => update('status', e.target.value)}
          className="w-full lg:w-auto px-3 py-2 text-sm bg-input border border-border rounded-md focus:input-focus text-foreground outline-none transition-all lg:min-w-[140px]"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={`status-opt-${opt.value || 'all'}`} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Site filter */}
        <select
          value={filters.site}
          onChange={e => update('site', e.target.value)}
          className="w-full lg:w-auto px-3 py-2 text-sm bg-input border border-border rounded-md focus:input-focus text-foreground outline-none transition-all lg:min-w-[180px]"
        >
          <option value="">All Sites</option>
          {siteOptions.map(site => (
            <option key={`site-opt-${site}`} value={site}>{site}</option>
          ))}
        </select>

        {/* Date range */}
        <div className="sm:col-span-2 lg:col-span-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <SlidersHorizontal size={13} />
            <span className="font-500">Date:</span>
          </div>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={e => update('dateFrom', e.target.value)}
            className="flex-1 lg:flex-none px-3 py-2 text-sm bg-input border border-border rounded-md focus:input-focus text-foreground outline-none transition-all"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={e => update('dateTo', e.target.value)}
            className="flex-1 lg:flex-none px-3 py-2 text-sm bg-input border border-border rounded-md focus:input-focus text-foreground outline-none transition-all"
          />
        </div>

        {/* Clear */}
        {(hasActiveFilters || filters.search) && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          >
            <X size={14} />
            <span>Clear</span>
          </button>
        )}
      </div>
    </div>
  );
}