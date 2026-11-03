import type { PostgrestError } from '@supabase/supabase-js';

// Supabase returns at most 1,000 rows per request (Project Settings -> API -> Max rows)
// and says nothing when it cuts a result short. Use this when you really need every
// row (exports, alert calculation): it asks for one batch at a time until done.
//
// `page(from, to)` must build the query with a stable order (end with .order('id')),
// otherwise rows can shift between batches.
const BATCH = 1000;

type PageResult<T> = PromiseLike<{ data: T[] | null; error: PostgrestError | null }>;

export async function fetchAllRows<T>(page: (from: number, to: number) => PageResult<T>): Promise<{ data: T[]; error: PostgrestError | null }> {
  const all: T[] = [];
  for (let from = 0; ; from += BATCH) {
    const { data, error } = await page(from, from + BATCH - 1);
    if (error) return { data: all, error };
    all.push(...(data || []));
    if (!data || data.length < BATCH) return { data: all, error: null };
  }
}
