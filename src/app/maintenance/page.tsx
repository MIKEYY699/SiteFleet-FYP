import React from 'react';
import type { Metadata } from 'next';
import AppLayout from '@/components/AppLayout';
import MaintenanceContent from './components/MaintenanceContent';

export const metadata: Metadata = { title: 'Maintenance' };

export default function MaintenancePage() {
  return (
    <AppLayout>
      <MaintenanceContent />
    </AppLayout>
  );
}
