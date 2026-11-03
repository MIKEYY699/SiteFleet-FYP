import React from 'react';
import type { Metadata } from 'next';
import ReportsContent from './components/ReportsContent';

export const metadata: Metadata = { title: 'Reports' };

export default function ReportsPage() {
  return <ReportsContent />;
}
