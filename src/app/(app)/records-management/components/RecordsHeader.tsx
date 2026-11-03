import React from 'react';
import { Plus, FileText, Loader2 } from 'lucide-react';

interface RecordsHeaderProps {
  totalCount: number;
  filteredCount: number;
  exporting?: boolean;
  onAddNew: () => void;
  onExportPDF: () => void;
}

export default function RecordsHeader({ totalCount, filteredCount, exporting = false, onAddNew, onExportPDF }: RecordsHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <p className="text-sm text-muted-foreground">
        {filteredCount === totalCount
          ? `${totalCount} total entries`
          : `${filteredCount} of ${totalCount} entries`}
      </p>
      <div className="flex items-center gap-2">
        <div className="relative group">
          <button
            onClick={onExportPDF}
            disabled={exporting}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-600 text-muted-foreground border border-border rounded-lg bg-card hover:bg-muted transition-colors disabled:opacity-60"
          >
            {exporting ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
            <span className="hidden sm:inline">Report</span>
          </button>
          <span className="tooltip-base -bottom-8 left-1/2 -translate-x-1/2">Download PDF report</span>
        </div>
        <button
          onClick={onAddNew}
          className="flex items-center gap-2 px-4 py-2 text-sm font-700 btn-primary rounded-lg"
        >
          <Plus size={16} />
          <span>New Entry</span>
        </button>
      </div>
    </div>
  );
}