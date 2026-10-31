'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

// Landing page for the "Forgot password?" email. Supabase signs the user in from the
// link (detectSessionInUrl), then they choose a new password here.
export default function ResetPasswordClient() {
  const router = useRouter();
  const [state, setState] = useState<'checking' | 'ready' | 'invalid' | 'done'>('checking');
  const [linkError, setLinkError] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
        setState(prev => (prev === 'checking' ? 'ready' : prev));
      }
    });
    // Give the client a moment to read the token from the link before giving up.
    const timeout = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // Expired or already-used links come back with the reason in the URL fragment.
        const description = new URLSearchParams(window.location.hash.slice(1)).get('error_description');
        if (description) setLinkError(description.replace(/\+/g, ' '));
      }
      setState(prev => (prev === 'checking' ? (data.session ? 'ready' : 'invalid') : prev));
    }, 1500);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setSaving(true);
    setError('');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    setState('done');
    setTimeout(() => router.push('/admin-dashboard'), 1500);
  };

  const inputCls = 'w-full px-3.5 py-2.5 text-sm bg-input border border-border rounded-md outline-none focus:border-primary text-foreground';

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
      <div className="w-full max-w-md bg-card rounded-xl border border-border card-shadow p-8">
        <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
          <KeyRound size={20} className="text-primary" />
        </div>
        <h1 className="text-2xl font-700 text-foreground mb-1.5">Set a new password</h1>

        {state === 'checking' && (
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-4"><Loader2 size={14} className="animate-spin" /> Checking your reset link…</p>
        )}

        {state === 'invalid' && (
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20">
              <AlertCircle size={16} className="text-danger flex-shrink-0 mt-0.5" />
              <p className="text-sm text-danger">{linkError || 'This reset link is invalid or has expired.'} Request a new one from the login page.</p>
            </div>
            <Link href="/sign-up-login-screen" className="btn-primary inline-block px-4 py-2 rounded-md text-sm font-600">Back to login</Link>
          </div>
        )}

        {state === 'done' && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-success/10 border border-success/20">
            <CheckCircle2 size={16} className="text-success flex-shrink-0 mt-0.5" />
            <p className="text-sm text-success">Password updated. Taking you to the dashboard…</p>
          </div>
        )}

        {state === 'ready' && (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">Choose a new password for your account.</p>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-600 text-foreground mb-1.5">New password</label>
              <input id="newPassword" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" className={inputCls} />
            </div>
            <div>
              <label htmlFor="confirmNewPassword" className="block text-sm font-600 text-foreground mb-1.5">Confirm new password</label>
              <input id="confirmNewPassword" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter the new password" className={inputCls} />
            </div>
            {error && <p className="text-sm text-danger">{error}</p>}
            <button type="submit" disabled={saving} className="w-full py-2.5 rounded-md text-sm font-700 btn-primary flex items-center justify-center gap-2 min-h-[42px]">
              {saving ? (<><Loader2 size={16} className="animate-spin" /><span>Saving…</span></>) : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
