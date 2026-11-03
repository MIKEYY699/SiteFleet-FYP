import React from 'react';
import type { Metadata } from 'next';
import DashboardContent from './components/DashboardContent';

export const metadata: Metadata = { title: 'Dashboard' };

export default function AdminDashboardPage() {
  return <DashboardContent />;
}