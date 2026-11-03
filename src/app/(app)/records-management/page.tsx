import React from 'react';
import type { Metadata } from 'next';
import RecordsContent from './components/RecordsContent';

export const metadata: Metadata = { title: 'Work Records' };

export default function RecordsManagementPage() {
  return <RecordsContent />;
}