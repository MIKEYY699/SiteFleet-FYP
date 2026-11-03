import React from 'react';
import type { Metadata } from 'next';
import AlertsContent from './components/AlertsContent';

export const metadata: Metadata = { title: 'Alerts' };

export default function AlertsPage() {
  return <AlertsContent />;
}
