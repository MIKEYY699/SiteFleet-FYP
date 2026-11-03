// Turns Supabase / fetch errors into messages a site manager can act on.
//
// Supabase doesn't throw on failure: queries resolve with `{ data: null, error }`.
// A network failure comes back as an error whose message starts with "TypeError:"
// or "FetchError:" and has no code; database rule violations carry a Postgres code.

type ErrorLike = { message?: string; code?: string } | string | null | undefined;

const NETWORK_PATTERNS = ['failed to fetch', 'fetcherror', 'networkerror', 'load failed', 'network request failed'];

export function isNetworkError(err: ErrorLike | unknown): boolean {
  const message = (typeof err === 'string' ? err : (err as { message?: string } | null)?.message ?? '').toLowerCase();
  return NETWORK_PATTERNS.some(p => message.includes(p));
}

export function friendlyError(err: ErrorLike | unknown): string {
  if (!err) return 'Something went wrong. Please try again.';
  const message = typeof err === 'string' ? err : (err as { message?: string }).message ?? '';
  const code = typeof err === 'string' ? '' : (err as { code?: string }).code ?? '';
  const lower = message.toLowerCase();

  if (isNetworkError(err)) return "Can't reach the server. Check your internet connection and try again.";
  if (code === '42501' || lower.includes('row-level security') || lower.includes('permission denied')) {
    return "You don't have permission to do this. Only operators can make changes.";
  }
  if (code === 'PGRST301' || code === 'PGRST303' || lower.includes('jwt expired')) {
    return 'Your session has expired. Please sign in again.';
  }
  if (code === 'PGRST202' || code === '42883') {
    return 'The database is missing an update. Run the newest file in supabase/migrations (see supabase/README.md).';
  }
  if (code === '23505') return 'A record with these details already exists (for example, the same machine code in this project).';
  if (code === '23503') return 'This item is still linked to other records, so it cannot be changed or removed.';
  if (code === '23502' || code === '23514' || code === '22P02') return "Some of the values aren't allowed. Check the form and try again.";

  return message || 'Something went wrong. Please try again.';
}
