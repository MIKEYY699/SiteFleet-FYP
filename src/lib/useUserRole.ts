'use client';
import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export type UserRole = 'operator' | 'viewer';

export function useUserRole(userId: string | undefined) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const load = async () => {
      const { data } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
      setRole((data?.role as UserRole) || 'viewer');
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return { role, loading };
}