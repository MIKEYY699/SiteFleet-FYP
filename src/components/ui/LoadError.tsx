import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface LoadErrorProps {
  /** What failed, e.g. "Could not load alerts". */
  title: string;
  /** Already-friendly detail (see friendlyError). */
  message?: string | null;
  onRetry?: () => void;
  /** Smaller layout for dashboard cards and charts. */
  compact?: boolean;
}

// Shown in place of data that failed to load, so a failure never looks like
// "no data" (an empty table, a zero count, "no alerts").
export default function LoadError({ title, message, onRetry, compact = false }: LoadErrorProps) {
  if (compact) {
    return (
      <div role="alert" className="flex flex-col items-center justify-center gap-2 py-6 px-3 text-center">
        <AlertCircle size={18} className="text-danger" />
        <p className="text-xs font-600 text-foreground">{title}</p>
        {message && <p className="text-2xs text-muted-foreground max-w-xs">{message}</p>}
        {onRetry && (
          <button onClick={onRetry} className="inline-flex items-center gap-1 text-xs font-600 text-primary hover:underline">
            <RotateCcw size={11} /> Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div role="alert" className="flex items-start gap-3 p-4 rounded-lg bg-danger/10 border border-danger/20">
      <AlertCircle size={18} className="text-danger flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-600 text-danger">{title}</p>
        {message && <p className="text-sm text-danger/90 mt-0.5">{message}</p>}
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 rounded-md bg-card border border-danger/30 text-danger hover:bg-danger/5 flex-shrink-0"
        >
          <RotateCcw size={12} /> Try again
        </button>
      )}
    </div>
  );
}
