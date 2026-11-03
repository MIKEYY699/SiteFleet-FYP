import { QueryClient, isServer } from '@tanstack/react-query';

// Query keys, kept in one place so mutations can invalidate exactly what they change.
export const queryKeys = {
  machines: (projectId: string | null, timezone: string) => ['machines', projectId, timezone] as const,
  navCounts: (projectId: string | null) => ['navCounts', projectId] as const,
};

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Several widgets read the same data on one screen; within this window they
        // share one request instead of each fetching their own copy.
        staleTime: 30_000,
        // One quick retry covers a network blip without hiding a real outage for long.
        retry: 1,
      },
    },
  });
}

// One client per browser tab. On the server, a fresh one per render so cached
// data can never leak between users' requests.
let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

// Call after anything that changes machines (hours, status, maintenance status) or
// the sidebar counts: saving/deleting work or maintenance records, machine edits,
// alert recalculation. Every mounted widget using that data refetches once.
export function invalidateFleetData() {
  if (isServer) return;
  const client = getQueryClient();
  client.invalidateQueries({ queryKey: ['machines'] });
  client.invalidateQueries({ queryKey: ['navCounts'] });
  client.invalidateQueries({ queryKey: ['reports'] });
  client.invalidateQueries({ queryKey: ['maintenanceRecords'] });
  client.invalidateQueries({ queryKey: ['workRecords'] });
}
