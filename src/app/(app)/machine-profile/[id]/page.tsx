import React from 'react';
import type { Metadata } from 'next';
import MachineProfileContent from '../components/MachineProfileContent';

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = { title: 'Machine Profile' };

export default async function MachineProfilePage({ params }: Props) {
  const { id } = await params;
  return <MachineProfileContent machineId={id} />;
}