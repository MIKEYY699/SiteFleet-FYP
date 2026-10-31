import React from 'react';
import { ClipboardList } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center mb-4">
        {icon || <ClipboardList size={24} className="text-primary" />}
      </div>
      <h3 className="text-sm font-700 text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-4">{description}</p>
      {action}
    </div>
  );
}