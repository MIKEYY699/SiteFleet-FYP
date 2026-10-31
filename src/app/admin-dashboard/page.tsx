import React from 'react';
import AppLayout from '@/components/AppLayout';
import DashboardContent from './components/DashboardContent';

export default function AdminDashboardPage() {
  return (
    <AppLayout currentPath="/admin-dashboard">
      <DashboardContent />
    </AppLayout>
  );
}