import React from 'react';
import type { Metadata } from 'next';
import AppLayout from '@/components/AppLayout';
import SettingsContent from './components/SettingsContent';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <AppLayout>
      <SettingsContent />
    </AppLayout>
  );
}
