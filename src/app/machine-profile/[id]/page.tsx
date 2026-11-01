import React from 'react';
import type { Metadata } from 'next';
import AppLayout from '@/components/AppLayout';
import MachineProfileContent from '../components/MachineProfileContent';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Machine Profile' };

export default async function MachineProfilePage({ params }: Props) {
  const { id } = await params;
  return (
    <AppLayout>
      <MachineProfileContent machineId={id} />
    </AppLayout>
  );
}