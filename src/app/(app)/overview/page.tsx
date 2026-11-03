import React from 'react';
import type { Metadata } from 'next';
import OverviewContent from './components/OverviewContent';

export const metadata: Metadata = { title: 'Overview' };

export default function OverviewPage() {
  return <OverviewContent />;
}
