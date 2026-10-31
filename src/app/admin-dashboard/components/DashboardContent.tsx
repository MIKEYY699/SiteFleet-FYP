'use client';
import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import KpiBentoGrid from './KpiBentoGrid';
import WeeklyHoursChart from './WeeklyHoursChart';
import FleetStatusChart from './FleetStatusChart';
import ActiveMachinesTable from './ActiveMachinesTable';
import MaintenanceAlertsPanel from './MaintenanceAlertsPanel';
import RecentActivity from './RecentActivity';
import DrillDownModal from './DrillDownModal';
import { BarChart3, Activity, AlertCircle } from 'lucide-react';
import { useMachines } from '@/lib/useMachines';

const HourlyActivityChart = dynamic(() => import('./HourlyActivityChart'), { ssr: false });

function SectionLabel({ text }: { text: string }) {
  return <p className="text-2xs font-700 uppercase tracking-widest text-muted-foreground/70">{text}</p>;
}

function ChartCard({ icon: Icon, title, subtitle, badge, children }: { icon: React.ElementType; title: string; subtitle: string; badge: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl border border-border card-shadow p-5 flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon size={15} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-700 text-foreground truncate">{title}</h2>
            <p className="text-2xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
          </div>
        </div>
        <span className="text-2xs font-500 text-muted-foreground bg-muted px-2 py-1 rounded-md flex-shrink-0">{badge}</span>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

export default function DashboardContent() {
  const [drillFilter, setDrillFilter] = useState<string | null>(null);
  const { error: machinesError } = useMachines();

  return (
    <div className="space-y-7">
      {machinesError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>Could not load machine data, so the numbers below may be incomplete. Use Refresh in the top bar to try again. ({machinesError})</span>
        </div>
      )}
      <div className="space-y-3">
        <SectionLabel text="Fleet Overview" />
        <KpiBentoGrid onCardClick={(f) => setDrillFilter(f)} />
      </div>

      <div className="space-y-3">
        <SectionLabel text="Performance & Distribution" />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-stretch">
          <ChartCard icon={BarChart3} title="Weekly Working Hours" subtitle="Total fleet hours — last 7 days" badge="7 Days">
            <WeeklyHoursChart />
          </ChartCard>
          <ChartCard icon={Activity} title="Machine Hours" subtitle="Logged per machine today" badge="Today">
            <HourlyActivityChart />
          </ChartCard>
          <FleetStatusChart />
        </div>
      </div>

      <div className="space-y-3">
        <SectionLabel text="Live Operations" />
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <div className="xl:col-span-2">
            <ActiveMachinesTable />
          </div>
          <MaintenanceAlertsPanel />
        </div>
      </div>

      <div className="space-y-3">
        <SectionLabel text="Recent Operations" />
        <RecentActivity />
      </div>

      <DrillDownModal filter={drillFilter} onClose={() => setDrillFilter(null)} />
    </div>
  );
}