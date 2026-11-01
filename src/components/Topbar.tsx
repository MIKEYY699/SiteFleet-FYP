'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Menu, Bell, RefreshCw, LogOut, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useNavCounts } from '@/lib/useNavCounts';
import TemperatureWidget from '@/app/admin-dashboard/components/TemperatureWidget';
import type { UserRole } from '@/lib/useUserRole';
import { useAppSettings } from '@/lib/AppSettingsContext';
import { formatLongDateInTz, formatTimeInTz } from '@/lib/format';

interface TopbarProps {
  onMobileMenuToggle: () => void;
  sidebarCollapsed: boolean;
  role: UserRole | null;
  currentPath?: string;
  lastUpdated: Date;
  onRefresh: () => void;
}

const PAGE_META: { match: string; title: string; subtitle: string }[] = [
  { match: '/overview', title: 'Overview', subtitle: 'Combined totals across every construction site' },
  { match: '/projects', title: 'Projects', subtitle: 'All construction sites currently managed in SKBEquip' },
  { match: '/admin-dashboard', title: 'Operations Dashboard', subtitle: 'Fleet status overview' },
  { match: '/records-management', title: 'Work Records', subtitle: 'Log and track daily equipment usage' },
  { match: '/machine-profile', title: 'Machine Profiles', subtitle: 'View detailed profiles for all fleet machines' },
  { match: '/maintenance', title: 'Maintenance', subtitle: 'Track repairs, parts, and maintenance schedules' },
  { match: '/alerts', title: 'Alerts', subtitle: 'Smart notifications for overdue and upcoming maintenance' },
  { match: '/reports', title: 'Reports', subtitle: 'Fleet performance, working hours, and maintenance cost analysis' },
  { match: '/settings', title: 'Settings', subtitle: 'Project details apply only to the currently selected project' },
];

function metaFor(path: string) {
  return PAGE_META.find(p => path.startsWith(p.match)) || { title: 'SKBEquip', subtitle: '' };
}

export default function Topbar({ onMobileMenuToggle, role, currentPath, lastUpdated, onRefresh }: TopbarProps) {
  const router = useRouter();
  const { alertsCount } = useNavCounts();
  const { timezone } = useAppSettings();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/sign-up-login-screen');
  };

  const meta = metaFor(currentPath || '');
  const isDashboard = (currentPath || '').startsWith('/admin-dashboard');
  const todayStr = formatLongDateInTz(new Date(), timezone);

  return (
    <header className="min-h-[64px] py-2 bg-card border-b border-border flex items-center px-4 lg:px-6 gap-4 flex-shrink-0 z-20">
      <button onClick={onMobileMenuToggle} aria-label="Open menu" className="lg:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Menu size={20} /></button>

      <div className="min-w-0">
        <h1 className="text-sm font-700 text-foreground truncate leading-tight">{meta.title}</h1>
        {isDashboard ? (
          <p className="text-2xs text-muted-foreground truncate leading-tight mt-0.5 flex items-center gap-1.5">
            <span className="hidden sm:inline">{todayStr} — </span>{meta.subtitle}
          </p>
        ) : (
          meta.subtitle && <p className="text-2xs text-muted-foreground truncate leading-tight mt-0.5 hidden sm:block">{meta.subtitle}</p>
        )}
      </div>

      <div className="flex-1" />

      <button
        onClick={onRefresh}
        title="Reload this page's data"
        aria-label={`Refresh data (last updated ${formatTimeInTz(lastUpdated, timezone)})`}
        className="flex items-center gap-1.5 p-2 sm:px-2 sm:py-1 rounded-md text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        <RefreshCw size={14} className="sm:w-3 sm:h-3" />
        <span className="hidden sm:inline">Updated {formatTimeInTz(lastUpdated, timezone)}</span>
      </button>

      <TemperatureWidget />

      <Link
        href="/alerts"
        aria-label={`Alerts: ${alertsCount}`}
        className="relative group p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Bell size={20} />
        {alertsCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full ring-2 ring-card" />
        )}
        <span className="tooltip-base -bottom-8 left-1/2 -translate-x-1/2">{alertsCount} Alert{alertsCount === 1 ? '' : 's'}</span>
      </Link>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(prev => !prev)}
          aria-label="Account menu"
          aria-expanded={menuOpen}
          className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
        >
          <User size={16} className="text-primary" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-xl card-shadow-md z-30 py-2">
            <div className="px-3.5 py-1.5 border-b border-border mb-1">
              <p className="text-xs font-600 text-foreground">{role === 'operator' ? 'Operator' : 'Viewer'}</p>
              <p className="text-2xs text-muted-foreground mt-0.5">{role === 'operator' ? 'Full access' : 'Dashboard only'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut size={13} /> Log Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}