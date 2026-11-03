import React from 'react';
import type { Metadata } from 'next';
import SettingsContent from './components/SettingsContent';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return <SettingsContent />;
}
