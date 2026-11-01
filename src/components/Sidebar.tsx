'use client';
import React from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import {
  LayoutDashboard, ClipboardList, Wrench, Bell, FileBarChart2, Settings,
  ChevronLeft, ChevronRight, X, HardHat, Building2, LayoutGrid,
} from 'lucide-react';
import type { UserRole } from '@/lib/useUserRole';
import { useNavCounts } from '@/lib/useNavCounts';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  currentPath: string;
  role: UserRole | null;
  onToggleCollapse: () => void;
  onMobileClose: () => void;
}

const NAV_GROUPS = [
  {
    label: 'Sites',
    items: [
      { href: '/overview', label: 'Overview', icon: LayoutGrid, operatorOnly: false },
      { href: '/projects', label: 'Projects', icon: Building2, operatorOnly: false },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/admin-dashboard', label: 'Dashboard', icon: LayoutDashboard, operatorOnly: false },
      { href: '/records-management', label: 'Work Records', icon: ClipboardList, operatorOnly: true },
      { href: '/machine-profile', label: 'Machine Profiles', icon: HardHat, operatorOnly: true },
    ],
  },
  {
    label: 'Maintenance',
    items: [
      { href: '/maintenance', label: 'Maintenance', icon: Wrench, operatorOnly: true },
      { href: '/alerts', label: 'Alerts', icon: Bell, operatorOnly: true },
    ],
  },
  {
    label: 'Reports',
    items: [
      { href: '/reports', label: 'Reports', icon: FileBarChart2, operatorOnly: false },
      { href: '/settings', label: 'Settings', icon: Settings, operatorOnly: true },
    ],
  },
];

export default function Sidebar({ collapsed, mobileOpen, currentPath, role, onToggleCollapse, onMobileClose }: SidebarProps) {
  const { workRecordsInProgress, maintenanceDue, alertsCount } = useNavCounts();

  const BADGE_MAP: Record<string, number> = {
    '/records-management': workRecordsInProgress,
    '/maintenance': maintenanceDue,
    '/alerts': alertsCount,
  };

  const isActive = (href: string) => {
    if (href === '/' && currentPath === '/') return true;
    if (href !== '/' && currentPath.startsWith(href)) return true;
    return false;
  };

  const visibleGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => role === 'operator' || !item.operatorOnly),
  })).filter(group => group.items.length > 0);

  return (
    <>
      <aside className={`hidden lg:flex flex-col bg-slate-900 border-r border-slate-800 sidebar-transition flex-shrink-0 relative z-30 ${collapsed ? 'w-16' : 'w-60'}`}>
        <div className={`flex items-center h-16 border-b border-slate-800 flex-shrink-0 ${collapsed ? 'justify-center px-2' : 'px-4 gap-3'}`}>
          <div className="flex-shrink-0"><AppLogo src="/assets/images/SKBlogo-1785779727587.jpeg" size={32} /></div>
          {!collapsed && <span className="font-bold text-base text-white tracking-tight leading-tight">SKBEquip</span>}
        </div>

        {!collapsed && role && (
          <div className="px-4 py-2 border-b border-slate-800">
            <span className={`text-2xs font-700 px-2 py-0.5 rounded-full ${role === 'operator' ? 'bg-sky-600/20 text-sky-400' : 'bg-slate-800 text-slate-400'}`}>
              {role === 'operator' ? 'Operator Access' : 'Viewer Access'}
            </span>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2">
          {visibleGroups.map((group) => (
            <div key={`group-${group.label}`} className="mb-4">
              {!collapsed && <p className="text-2xs font-600 uppercase tracking-widest text-slate-500 px-3 mb-1.5">{group.label}</p>}
              {collapsed && <div className="h-px bg-slate-800 mx-2 mb-2" />}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  const badgeCount = BADGE_MAP[item.href] || 0;
                  return (
                    <li key={`nav-${item.label}`}>
                      <div className="relative group">
                        <Link href={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'} ${collapsed ? 'justify-center px-2' : ''}`}>
                          <Icon size={18} className="flex-shrink-0" />
                          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                          {!collapsed && badgeCount > 0 && (
                            <span className={`text-2xs font-700 rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${active ? 'bg-white text-sky-600' : 'bg-sky-600 text-white'}`}>{badgeCount}</span>
                          )}
                        </Link>
                        {collapsed && <span className="tooltip-base left-full ml-2 top-1/2 -translate-y-1/2">{item.label}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-800 p-2">
          <button onClick={onToggleCollapse} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : undefined} className="w-full flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs font-500 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            {collapsed ? <ChevronRight size={16} /> : (<><ChevronLeft size={16} /><span>Collapse</span></>)}
          </button>
        </div>
      </aside>

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col lg:hidden sidebar-transition ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 border-b border-slate-800 px-4">
          <div className="flex items-center gap-3">
            <AppLogo src="/assets/images/SKBlogo-1785779727587.jpeg" size={32} />
            <span className="font-bold text-base text-white">SKBEquip</span>
          </div>
          <button onClick={onMobileClose} aria-label="Close menu" className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"><X size={18} /></button>
        </div>
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2">
          {visibleGroups.map((group) => (
            <div key={`mob-group-${group.label}`} className="mb-4">
              <p className="text-2xs font-600 uppercase tracking-widest text-slate-500 px-3 mb-1.5">{group.label}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  const badgeCount = BADGE_MAP[item.href] || 0;
                  return (
                    <li key={`mob-nav-${item.label}`}>
                      <Link href={item.href} onClick={onMobileClose} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                        <Icon size={18} className="flex-shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {badgeCount > 0 && <span className={`text-2xs font-700 rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${active ? 'bg-white text-sky-600' : 'bg-sky-600 text-white'}`}>{badgeCount}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}