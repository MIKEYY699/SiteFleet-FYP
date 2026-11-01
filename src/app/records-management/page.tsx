import React from 'react';
import type { Metadata } from 'next';
import AppLayout from '@/components/AppLayout';
import RecordsContent from './components/RecordsContent';

export const metadata: Metadata = { title: 'Work Records' };

export default function RecordsManagementPage() {
  return (
    <AppLayout currentPath="/records-management">
      <RecordsContent />
    </AppLayout>
  );
}