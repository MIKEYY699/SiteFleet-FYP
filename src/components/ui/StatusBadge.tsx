import React from 'react';

type StatusType = 'working' | 'completed' | 'idle' | 'maintenance';
type MaintStatusType = 'good' | 'due-soon' | 'overdue';

interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md';
}

interface MaintBadgeProps {
  status: MaintStatusType;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<StatusType, { label: string; dot: string; cls: string }> = {
  working: { label: 'Working', dot: 'bg-working', cls: 'status-working' },
  completed: { label: 'Completed', dot: 'bg-completed', cls: 'status-completed' },
  idle: { label: 'Idle', dot: 'bg-idle', cls: 'status-idle' },
  maintenance: { label: 'Maintenance', dot: 'bg-danger', cls: 'status-maintenance' },
};

const MAINT_CONFIG: Record<MaintStatusType, { label: string; cls: string }> = {
  good: { label: 'Good', cls: 'maint-good' },
  'due-soon': { label: 'Due Soon', cls: 'maint-due-soon' },
  overdue: { label: 'Overdue', cls: 'maint-overdue' },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];
  const textSize = size === 'sm' ? 'text-2xs' : 'text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-600 ${textSize} ${size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1'} ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
      {cfg.label}
    </span>
  );
}

export function MaintStatusBadge({ status, size = 'md' }: MaintBadgeProps) {
  const cfg = MAINT_CONFIG[status];
  const textSize = size === 'sm' ? 'text-2xs' : 'text-xs';
  return (
    <span className={`inline-flex items-center rounded-full font-600 ${textSize} ${size === 'sm' ? 'px-2 py-0.5' : 'px-2.5 py-1'} ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}