import React from 'react';
import AppLayout from '@/components/AppLayout';
import ProjectsContent from './components/ProjectsContent';

export default function ProjectsPage() {
  return (
    <AppLayout currentPath="/projects">
      <ProjectsContent />
    </AppLayout>
  );
}
