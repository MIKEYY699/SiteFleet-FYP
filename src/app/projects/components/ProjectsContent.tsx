'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Building2, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentProject } from '@/lib/ProjectContext';
import Modal from '@/components/ui/Modal';

interface ProjectRow {
  id: string;
  name: string;
  location: string | null;
  status: string;
  created_at: string;
}

export default function ProjectsContent() {
  const router = useRouter();
  const { setCurrentProject } = useCurrentProject();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [machineCounts, setMachineCounts] = useState<Record<string, number>>({});
  const [activeCounts, setActiveCounts] = useState<Record<string, number>>({});
  const [overdueCounts, setOverdueCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadProjects = async () => {
    setLoading(true);
    const { data: projectRows } = await supabase.from('projects').select('*').order('created_at', { ascending: true });
    const { data: machineRows } = await supabase.from('machines').select('project_id, status, maint_status');

    const counts: Record<string, number> = {};
    const active: Record<string, number> = {};
    const overdue: Record<string, number> = {};
    (machineRows || []).forEach((m: { project_id: string | null; status: string; maint_status: string }) => {
      if (!m.project_id) return;
      counts[m.project_id] = (counts[m.project_id] || 0) + 1;
      if (m.status === 'working') active[m.project_id] = (active[m.project_id] || 0) + 1;
      if (m.maint_status === 'overdue') overdue[m.project_id] = (overdue[m.project_id] || 0) + 1;
    });

    setProjects(projectRows || []);
    setMachineCounts(counts);
    setActiveCounts(active);
    setOverdueCounts(overdue);
    setLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const enterProject = (project: ProjectRow) => {
    setCurrentProject(project.id, project.name);
    router.push('/admin-dashboard');
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      setError('Project name is required.');
      return;
    }
    setSaving(true);
    setError('');
    const { data, error: insertError } = await supabase
      .from('projects')
      .insert({ name: newName.trim(), location: newLocation.trim() || null, status: 'active' })
      .select()
      .single();

    setSaving(false);
    if (insertError || !data) {
      setError('Could not create project. Please try again.');
      return;
    }
    setCreateOpen(false);
    setNewName('');
    setNewLocation('');
    setCurrentProject(data.id, data.name);
    router.push('/admin-dashboard');
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-10 text-center">Loading projects…</p>;
  }

  return (
    <div>
      <div className="flex justify-end mb-6 flex-wrap gap-3">
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-600 rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> Create New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <Building2 size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No projects yet. Create your first one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <button
              key={project.id}
              onClick={() => enterProject(project)}
              className="text-left bg-card border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 size={18} className="text-primary" />
                </div>
                <span className={`text-2xs font-700 px-2 py-0.5 rounded-full ${project.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                  {project.status}
                </span>
              </div>
              <h3 className="text-sm font-700 text-foreground truncate">{project.name}</h3>
              {project.location && <p className="text-xs text-muted-foreground mt-0.5 truncate">{project.location}</p>}
              <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border text-xs">
                <span className="text-muted-foreground">{machineCounts[project.id] || 0} Machines</span>
                <span className="text-success">{activeCounts[project.id] || 0} Active</span>
                {(overdueCounts[project.id] || 0) > 0 && (
                  <span className="text-danger font-600">{overdueCounts[project.id]} Overdue</span>
                )}
                <span className="flex items-center gap-1 font-600 text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                  Open <ArrowRight size={12} />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Project" subtitle="Add a new construction site to SKBEquip.">
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-600 text-foreground mb-1.5 block">Project Name *</label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="e.g. Riverside Housing Phase 2"
              className="w-full px-3 py-2.5 text-sm bg-muted border border-transparent rounded-lg outline-none focus:bg-card focus:border-primary/40"
            />
          </div>
          <div>
            <label className="text-xs font-600 text-foreground mb-1.5 block">Location (optional)</label>
            <input
              type="text"
              value={newLocation}
              onChange={e => setNewLocation(e.target.value)}
              placeholder="e.g. Lahore, Punjab"
              className="w-full px-3 py-2.5 text-sm bg-muted border border-transparent rounded-lg outline-none focus:bg-card focus:border-primary/40"
            />
          </div>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
          <button onClick={() => setCreateOpen(false)} className="px-4 py-2 text-sm font-600 text-muted-foreground hover:bg-muted rounded-lg transition-colors">Cancel</button>
          <button onClick={handleCreate} disabled={saving} className="px-4 py-2 text-sm font-600 text-white bg-primary rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60">
            {saving ? 'Creating…' : 'Create & Open'}
          </button>
        </div>
      </Modal>
    </div>
  );
}