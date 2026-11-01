import React from 'react';
import type { Metadata } from 'next';
import AppLayout from '@/components/AppLayout';
import DashboardContent from './components/DashboardContent';

export const metadata: Metadata = { title: 'Dashboard' };

export default function AdminDashboardPage() {
  return (
    <AppLayout currentPath="/admin-dashboard">
      <DashboardContent />
    </AppLayout>
  );
}