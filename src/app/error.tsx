'use client'; // Error boundaries must be Client Components

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // TODO: report to an error-tracking service (e.g. Sentry) once one is set up.
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div role="alert" className="text-center max-w-md">
        <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle size={26} className="text-red-600" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Something went wrong</h1>
        <p className="text-muted-foreground mb-8">
          This page hit an unexpected error. Your data is safe. Try again, or head back to the dashboard.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground mb-6">Reference: <code>{error.digest}</code></p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => retry()}
            className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <RotateCcw size={16} />
            Try again
          </button>
          <Link
            href="/admin-dashboard"
            className="inline-flex items-center justify-center gap-2 border border-border bg-background text-foreground px-5 py-2.5 rounded-lg font-medium hover:bg-accent transition-colors"
          >
            <Home size={16} />
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
