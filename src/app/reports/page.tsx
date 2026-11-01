import React from 'react';
import type { Metadata } from 'next';
import AppLayout from '@/components/AppLayout';
import ReportsContent from './components/ReportsContent';

export const metadata: Metadata = { title: 'Reports' };

export default function ReportsPage() {
  return (
    <AppLayout>
      <ReportsContent />
    </AppLayout>
  );
}
