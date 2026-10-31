'use client';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface ProjectContextValue {
  currentProjectId: string | null;
  currentProjectName: string | null;
  ready: boolean;
  setCurrentProject: (id: string, name: string) => void;
  clearCurrentProject: () => void;
}

const STORAGE_KEY = 'skbequip_current_project';

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentProjectName, setCurrentProjectName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCurrentProjectId(parsed.id ?? null);
        setCurrentProjectName(parsed.name ?? null);
      } catch {
        // ignore malformed storage
      }
    }
    setReady(true);
  }, []);

  const setCurrentProject = useCallback((id: string, name: string) => {
    setCurrentProjectId(id);
    setCurrentProjectName(name);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, name }));
  }, []);

  const clearCurrentProject = useCallback(() => {
    setCurrentProjectId(null);
    setCurrentProjectName(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ProjectContext.Provider value={{ currentProjectId, currentProjectName, ready, setCurrentProject, clearCurrentProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useCurrentProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useCurrentProject must be used within a ProjectProvider');
  return ctx;
}
