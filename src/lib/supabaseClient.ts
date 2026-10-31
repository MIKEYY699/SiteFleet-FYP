import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// "Remember me" on the login form: when on, the session lives in localStorage and
// survives closing the browser; when off, it lives in sessionStorage and ends with
// the browser session. No preference stored means remember (the previous behaviour).
const REMEMBER_KEY = 'skbequip_remember_me';

export function setRememberMe(remember: boolean) {
  localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
}

const hasWindow = () => typeof window !== 'undefined';

const rememberAwareStorage = {
  getItem: (key: string) => (hasWindow() ? sessionStorage.getItem(key) ?? localStorage.getItem(key) : null),
  setItem: (key: string, value: string) => {
    if (!hasWindow()) return;
    const remember = localStorage.getItem(REMEMBER_KEY) !== '0';
    (remember ? localStorage : sessionStorage).setItem(key, value);
    (remember ? sessionStorage : localStorage).removeItem(key);
  },
  removeItem: (key: string) => {
    if (!hasWindow()) return;
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: rememberAwareStorage },
});
