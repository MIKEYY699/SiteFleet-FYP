import React from 'react';
import type { Metadata } from 'next';
import AppLayout from '@/components/AppLayout';
import MachineProfilesListContent from './components/MachineProfilesListContent';

export const metadata: Metadata = { title: 'Machine Profiles' };

export default function MachineProfilesPage() {
  return (
    <AppLayout>
      <MachineProfilesListContent />
    </AppLayout>
  );
}
