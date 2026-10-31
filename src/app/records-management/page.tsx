import React from 'react';
import AppLayout from '@/components/AppLayout';
import RecordsContent from './components/RecordsContent';

export default function RecordsManagementPage() {
  return (
    <AppLayout currentPath="/records-management">
      <RecordsContent />
    </AppLayout>
  );
}