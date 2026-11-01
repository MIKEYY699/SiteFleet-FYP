import React from 'react';
import type { Metadata } from 'next';
import AppLayout from '@/components/AppLayout';
import ProjectsContent from './components/ProjectsContent';

export const metadata: Metadata = { title: 'Projects' };

export default function ProjectsPage() {
  return (
    <AppLayout currentPath="/projects">
      <ProjectsContent />
    </AppLayout>
  );
}
