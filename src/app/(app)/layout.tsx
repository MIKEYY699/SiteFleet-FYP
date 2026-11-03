import React from 'react';
import AppLayout from '@/components/AppLayout';

// Shared shell for every signed-in page. A layout stays mounted across navigation,
// so the session check, sidebar state, settings, badges and weather survive moving
// between pages instead of being torn down and rebuilt on every click.
export default function SignedInLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
