'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import { Activity } from 'lucide-react';

const HourlyActivityChart = dynamic(() => import('./HourlyActivityChart'), { ssr: false });

export default function DashboardCharts() {
  return (
    <div className="bg-card rounded-2xl border border-border card-shadow p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity size={15} className="text-primary" />
          </div>
          <div>
            <h2 className="text-base font-700 text-foreground">Machine Hours — Today</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Hours logged per machine so far today</p>
          </div>
        </div>
        <span className="text-xs font-500 text-muted-foreground bg-muted px-2.5 py-1 rounded-md">Today</span>
      </div>
      <HourlyActivityChart />
    </div>
  );
}