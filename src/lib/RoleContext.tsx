'use client';
import React, { createContext, useContext } from 'react';
import type { UserRole } from './useUserRole';

// The signed-in user's role, provided by AppLayout. The database only lets
// operators write (see supabase/migrations), so pages use this to hide actions
// a viewer can't perform instead of letting them fail.
const RoleContext = createContext<UserRole | null>(null);

export function RoleProvider({ role, children }: { role: UserRole | null; children: React.ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const role = useContext(RoleContext);
  return { role, isOperator: role === 'operator' };
}
