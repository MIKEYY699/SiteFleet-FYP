'use client';
import React, { useEffect, useState } from 'react';
import { ClipboardList, CheckCircle2, Wrench, Play, StopCircle, History, Inbox } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentProject } from '@/lib/ProjectContext';

type FeedItem = {
  id: string;
  icon: typeof CheckCircle2;
  iconCls: string;
  text: string;
  sub: string;
  createdAt: string;
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function RecentActivity() {
  const { currentProjectId, ready } = useCurrentProject();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!currentProjectId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const load = async () => {
      setLoading(true);
      const [{ data: records }, { data: maint }] = await Promise.all([
        supabase.from('work_records').select('id, machine_name, machine_code, project_site, status, created_at').eq('project_id', currentProjectId).order('created_at', { ascending: false }).limit(6),
        supabase.from('maintenance_records').select('id, machine_name, part_repaired_or_replaced, created_at').eq('project_id', currentProjectId).order('created_at', { ascending: false }).limit(6),
      ]);

      const recordItems: FeedItem[] = (records || []).map(r => {
        const statusMap: Record<string, { icon: typeof CheckCircle2; iconCls: string; verb: string }> = {
          completed: { icon: CheckCircle2, iconCls: 'bg-completed/10 text-completed', verb: 'job completed' },
          working: { icon: Play, iconCls: 'bg-working/10 text-working', verb: 'started' },
          idle: { icon: StopCircle, iconCls: 'bg-muted text-muted-foreground', verb: 'logged as idle' },
        };
        const cfg = statusMap[r.status] || { icon: ClipboardList, iconCls: 'bg-primary/10 text-primary', verb: 'entry logged' };
        return {
          id: `wr-${r.id}`,
          icon: cfg.icon,
          iconCls: cfg.iconCls,
          text: `${r.machine_name} (${r.machine_code}) ${cfg.verb}`,
          sub: r.project_site,
          createdAt: r.created_at,
        };
      });

      const maintItems: FeedItem[] = (maint || []).map(m => ({
        id: `mt-${m.id}`,
        icon: Wrench,
        iconCls: 'bg-warning/10 text-warning',
        text: `Maintenance logged — ${m.machine_name}`,
        sub: m.part_repaired_or_replaced,
        createdAt: m.created_at,
      }));

      const merged = [...recordItems, ...maintItems]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6);

      setItems(merged);
      setLoading(false);
    };
    load();
  }, [currentProjectId, ready]);

  return (
    <div className="bg-card rounded-2xl border border-border card-shadow">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center">
          <History size={15} className="text-success" />
        </div>
        <div>
          <h2 className="text-sm font-700 text-foreground">Recent Activity</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Latest updates across your fleet</p>
        </div>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={`ra-skel-${i}`} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-1.5 pt-1">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-2.5 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <Inbox size={28} className="opacity-40" />
            <p className="text-xs">No activity logged yet.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {items.map((act) => {
              const Icon = act.icon;
              return (
                <li key={act.id} className="flex gap-3 p-3 rounded-xl bg-muted/40 border border-border">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${act.iconCls}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs font-600 text-foreground leading-snug">{act.text}</p>
                      <span className="text-2xs font-tabular text-muted-foreground flex-shrink-0">{timeAgo(act.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{act.sub}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}