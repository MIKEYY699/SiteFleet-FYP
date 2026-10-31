'use client';
import React, { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useCurrentProject } from '@/lib/ProjectContext';

export default function TotalMaintCostCard() {
  const { currentProjectId, ready } = useCurrentProject();
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!currentProjectId) {
      setTotal(0);
      return;
    }
    const load = async () => {
      const { data } = await supabase
        .from('maintenance_records')
        .select('cost_of_maintenance')
        .eq('project_id', currentProjectId);
      const sum = (data || []).reduce((s, r) => s + (r.cost_of_maintenance || 0), 0);
      setTotal(sum);
    };
    load();
  }, [currentProjectId, ready]);

  const display = total === null ? '—' : total >= 1000 ? `Rs. ${(total / 1000).toFixed(0)}K` : `Rs. ${total}`;

  return (
    <div className="kpi-card-hours rounded-xl p-4 flex items-center gap-3 flex-shrink-0 min-h-[120px]">
      <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
        <BarChart3 size={20} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-800 text-white font-tabular">{display}</div>
        <div className="text-xs text-white/80 font-500">Total Maint. Cost</div>
      </div>
    </div>
  );
}