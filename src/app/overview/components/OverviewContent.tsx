'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, HardHat, Timer, AlertTriangle, BarChart3, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentProject } from '@/lib/ProjectContext';
import { useAppSettings } from '@/lib/AppSettingsContext';
import { todayInTz } from '@/lib/format';

interface ProjectRow {
  id: string;
  name: string;
  location: string | null;
  status: string;
}

interface ProjectStats {
  machines: number;
  hoursToday: number;
  alerts: number;
  maintCost: number;
}

function OverviewKpi({ icon: Icon, label, value, tint }: { icon: React.ElementType; label: string; value: string; tint: string }) {
  return (
    <div className="bg-card rounded-2xl border border-border card-shadow p-5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${tint}`}>
        <Icon size={17} />
      </div>
      <p className="text-2xl font-700 text-foreground font-tabular">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

export default function OverviewContent() {
  const router = useRouter();
  const { setCurrentProject } = useCurrentProject();
  const { timezone, money } = useAppSettings();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [stats, setStats] = useState<Record<string, ProjectStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const todayStr = todayInTz(timezone);

      const [{ data: projectRows }, { data: machineRows }, { data: workRows }, { data: maintRows }, { data: alertRows }] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: true }),
        supabase.from('machines').select('project_id'),
        supabase.from('work_records').select('project_id, total_hours').eq('entry_date', todayStr),
        supabase.from('maintenance_records').select('project_id, cost_of_maintenance'),
        supabase.from('alerts').select('project_id'),
      ]);

      const byProject: Record<string, ProjectStats> = {};
      (projectRows || []).forEach(p => { byProject[p.id] = { machines: 0, hoursToday: 0, alerts: 0, maintCost: 0 }; });

      (machineRows || []).forEach(m => {
        if (m.project_id && byProject[m.project_id]) byProject[m.project_id].machines += 1;
      });
      (workRows || []).forEach(w => {
        if (w.project_id && byProject[w.project_id]) byProject[w.project_id].hoursToday += (w.total_hours || 0);
      });
      (maintRows || []).forEach(r => {
        if (r.project_id && byProject[r.project_id]) byProject[r.project_id].maintCost += (r.cost_of_maintenance || 0);
      });
      (alertRows || []).forEach(a => {
        if (a.project_id && byProject[a.project_id]) byProject[a.project_id].alerts += 1;
      });

      setProjects(projectRows || []);
      setStats(byProject);
      setLoading(false);
    };
    load();
  }, [timezone]);

  const totals = Object.values(stats).reduce(
    (acc, s) => ({
      machines: acc.machines + s.machines,
      hoursToday: acc.hoursToday + s.hoursToday,
      alerts: acc.alerts + s.alerts,
      maintCost: acc.maintCost + s.maintCost,
    }),
    { machines: 0, hoursToday: 0, alerts: 0, maintCost: 0 }
  );

  const enterProject = (project: ProjectRow) => {
    setCurrentProject(project.id, project.name);
    router.push('/admin-dashboard');
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground py-10 text-center">Loading company-wide data…</p>;
  }

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <OverviewKpi icon={Building2} label={`Active Projects (${projects.length} total)`} value={String(projects.filter(p => p.status === 'active').length)} tint="bg-primary/10 text-primary" />
        <OverviewKpi icon={HardHat} label="Total Machines" value={String(totals.machines)} tint="bg-earth/10 text-earth" />
        <OverviewKpi icon={Timer} label="Hours Logged Today" value={totals.hoursToday.toFixed(1)} tint="bg-success/10 text-success" />
        <OverviewKpi icon={AlertTriangle} label="Active Alerts" value={String(totals.alerts)} tint="bg-danger/10 text-danger" />
      </div>

      <div className="bg-card rounded-2xl border border-border card-shadow overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-700 text-foreground">By Project</h2>
          <span className="flex items-center gap-1.5 text-xs font-600 text-muted-foreground">
            <BarChart3 size={13} /> All-time maintenance cost: {money(totals.maintCost)}
          </span>
        </div>

        {projects.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No projects yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-2xs uppercase tracking-wide text-muted-foreground">
                  <th className="text-left px-5 py-3 font-700">Project</th>
                  <th className="text-left px-3 py-3 font-700">Status</th>
                  <th className="text-right px-3 py-3 font-700">Machines</th>
                  <th className="text-right px-3 py-3 font-700">Hours Today</th>
                  <th className="text-right px-3 py-3 font-700">Alerts</th>
                  <th className="text-right px-3 py-3 font-700">Maint. Cost</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {projects.map(project => {
                  const s = stats[project.id] || { machines: 0, hoursToday: 0, alerts: 0, maintCost: 0 };
                  return (
                    <tr key={project.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Building2 size={13} className="text-primary" />
                          </div>
                          <div>
                            <p className="font-600 text-foreground">{project.name}</p>
                            {project.location && <p className="text-2xs text-muted-foreground">{project.location}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-2xs font-700 px-2 py-0.5 rounded-full ${project.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                          {project.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-tabular text-foreground">{s.machines}</td>
                      <td className="px-3 py-3 text-right font-tabular text-foreground">{s.hoursToday.toFixed(1)}</td>
                      <td className="px-3 py-3 text-right font-tabular">
                        {s.alerts > 0 ? <span className="text-danger font-700">{s.alerts}</span> : <span className="text-muted-foreground">0</span>}
                      </td>
                      <td className="px-3 py-3 text-right font-tabular text-foreground">{money(s.maintCost)}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => enterProject(project)}
                          className="inline-flex items-center gap-1 text-xs font-600 text-primary hover:underline"
                        >
                          Open <ArrowRight size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-2xs text-muted-foreground mt-3">
        Looking for a specific site's own dashboard? Visit <Link href="/projects" className="text-primary hover:underline">Projects</Link> to switch.
      </p>
    </div>
  );
}
