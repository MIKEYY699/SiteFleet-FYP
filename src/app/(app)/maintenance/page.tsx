import React from 'react';
import type { Metadata } from 'next';
import MaintenanceContent from './components/MaintenanceContent';

export const metadata: Metadata = { title: 'Maintenance' };

export default function MaintenancePage() {
  return <MaintenanceContent />;
}
