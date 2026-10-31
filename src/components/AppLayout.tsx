'use client';
import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { supabase } from '@/lib/supabaseClient';
import { useUserRole } from '@/lib/useUserRole';
import { ProjectProvider } from '@/lib/ProjectContext';
import { AppSettingsProvider } from '@/lib/AppSettingsContext';
import { RoleProvider } from '@/lib/RoleContext';
import RouteLoadingBar from './RouteLoadingBar';
import type { Session } from '@supabase/supabase-js';

interface AppLayoutProps {
  children: React.ReactNode;
  currentPath?: string;
}

export default function AppLayout({ children, currentPath }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const resolvedPath = currentPath ?? pathname ?? '/';
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  // Bumping refreshKey remounts the page so every widget refetches; lastLoadedAt
  // records when that happened so the topbar's "Updated" time is truthful.
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastLoadedAt, setLastLoadedAt] = useState(() => new Date());
  const { role, loading: roleLoading } = useUserRole(session?.user?.id);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingAuth(false);
      if (!data.session) router.replace('/sign-up-login-screen');
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) router.replace('/sign-up-login-screen');
    });

    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const viewerAllowedPaths = ['/admin-dashboard', '/reports', '/overview', '/projects'];
    if (!roleLoading && role === 'viewer' && !viewerAllowedPaths.some(p => resolvedPath.startsWith(p))) {
      router.replace('/admin-dashboard');
    }
  }, [role, roleLoading, resolvedPath, router]);

  if (checkingAuth || !session || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <p className="text-sm text-muted-foreground">Checking your session…</p>
      </div>
    );
  }

  return (
    <RoleProvider role={role}>
    <AppSettingsProvider>
    <ProjectProvider>
      <div key={refreshKey} className="flex h-screen overflow-hidden bg-[#F8FAFC]">
        <RouteLoadingBar />
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-40 modal-overlay lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
        )}

        <Sidebar
          collapsed={sidebarCollapsed}
          mobileOpen={mobileSidebarOpen}
          currentPath={resolvedPath}
          role={role}
          onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        <div className="flex flex-col flex-1 min-w-0 content-transition" style={{ marginLeft: 0 }}>
          <Topbar
            onMobileMenuToggle={() => setMobileSidebarOpen(prev => !prev)}
            sidebarCollapsed={sidebarCollapsed}
            role={role}
            currentPath={resolvedPath}
            lastUpdated={lastLoadedAt}
            onRefresh={() => { setRefreshKey(k => k + 1); setLastLoadedAt(new Date()); }}
          />
          <main className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="px-4 py-6 lg:px-6 xl:px-8 2xl:px-10 max-w-screen-2xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProjectProvider>
    </AppSettingsProvider>
    </RoleProvider>
  );
}