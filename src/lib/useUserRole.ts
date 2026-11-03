'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { friendlyError } from './errors';

export type UserRole = 'operator' | 'viewer';

export function useUserRole(userId: string | undefined) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const retry = useCallback(() => setReloadKey(k => k + 1), []);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      const { data, error: loadError } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
      if (loadError) {
        // Don't fall back to "viewer" here: that would quietly hide every action
        // from an operator. Report it so the layout can offer a retry.
        console.error('useUserRole: could not load role', loadError);
        setError(friendlyError(loadError));
      } else {
        setError(null);
        // No profile row yet means a new sign-up, which starts as a viewer.
        setRole((data?.role as UserRole) || 'viewer');
      }
      setLoading(false);
    };
    load();
  }, [userId, reloadKey]);

  return { role, loading, error, retry };
}
