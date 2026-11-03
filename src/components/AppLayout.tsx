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
import LoadError from './ui/LoadError';
import { Loader2 } from 'lucide-react';
import { QueryClientProvider } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/queryClient';
import type { Session } from '@supabase/supabase-js';

interface AppLayoutProps {
  children: React.ReactNode;
}

// The signed-in app shell (auth check, sidebar, topbar, providers). Rendered once by
// app/(app)/layout.tsx, so it stays mounted while moving between pages: no session
// re-check, sidebar state is kept, and settings/badges/weather aren't refetched.
export default function AppLayout({ children }: AppLayoutProps) {
  const queryClient = getQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell>{children}</AppShell>
    </QueryClientProvider>
  );
}

function AppShell({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = getQueryClient();
  const resolvedPath = pathname ?? '/';
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  // Refresh in the topbar: drop cached queries and remount the shell so every widget
  // refetches; lastLoadedAt records when, so the topbar's "Updated" time is truthful.
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastLoadedAt, setLastLoadedAt] = useState(() => new Date());
  const { role, loading: roleLoading, error: roleError, retry: retryRole } = useUserRole(session?.user?.id);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => {
        setSession(data.session);
        if (!data.session) router.replace('/sign-up-login-screen');
      })
      .catch(err => {
        // Unreadable stored session: treat as signed out rather than spinning forever.
        console.error('AppLayout: could not read session', err);
        router.replace('/sign-up-login-screen');
      })
      .finally(() => setCheckingAuth(false));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        // Don't keep one user's cached data around for whoever signs in next.
        queryClient.clear();
        router.replace('/sign-up-login-screen');
      }
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

  if (session && roleError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
        <div className="w-full max-w-md space-y-3">
          <LoadError title="Could not load your account" message={roleError} onRetry={retryRole} />
          <button
            onClick={() => supabase.auth.signOut()}
            className="w-full text-center text-xs font-600 text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (checkingAuth || !session || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div role="status" className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <Loader2 size={18} className="animate-spin text-primary" />
          Checking your session…
        </div>
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
            onRefresh={() => {
              queryClient.invalidateQueries();
              setRefreshKey(k => k + 1);
              setLastLoadedAt(new Date());
            }}
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