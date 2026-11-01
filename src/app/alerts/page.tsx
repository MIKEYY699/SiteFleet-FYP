import React from 'react';
import type { Metadata } from 'next';
import AppLayout from '@/components/AppLayout';
import AlertsContent from './components/AlertsContent';

export const metadata: Metadata = { title: 'Alerts' };

export default function AlertsPage() {
  return (
    <AppLayout>
      <AlertsContent />
    </AppLayout>
  );
}
