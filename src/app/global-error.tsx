'use client'; // Error boundaries must be Client Components

import React, { useEffect } from 'react';

// Replaces the root layout when it crashes, so it can't rely on the app's global
// CSS or fonts — styles are inline on purpose.
export default function GlobalError({
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
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#F8FAFC', color: '#0F172A' }}>
        <title>Something went wrong — SKBEquip</title>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div role="alert" style={{ textAlign: 'center', maxWidth: 420 }}>
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: '0 0 8px' }}>Something went wrong</h1>
            <p style={{ color: '#64748B', margin: '0 0 24px' }}>
              SKBEquip couldn&apos;t load. Please try again.
            </p>
            <button
              onClick={() => retry()}
              style={{ background: '#0B5FCE', color: '#fff', border: 0, borderRadius: 8, padding: '10px 20px', fontSize: 15, fontWeight: 500, cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
