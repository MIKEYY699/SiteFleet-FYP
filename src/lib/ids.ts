// Collision-safe IDs for new rows, e.g. newId('rec') -> "rec-3f2a…".
// crypto.randomUUID only exists in secure contexts (https / localhost), so opening
// the dev server over a LAN IP falls back to getRandomValues, which works everywhere.
export function newId(prefix: string): string {
  if (typeof crypto.randomUUID === 'function') return `${prefix}-${crypto.randomUUID()}`;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `${prefix}-${Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')}`;
}
