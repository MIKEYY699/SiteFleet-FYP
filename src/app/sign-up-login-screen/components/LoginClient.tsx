'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Eye, EyeOff, Loader2, HardHat, AlertCircle, CheckCircle2, ClipboardList, Wrench, BarChart3 } from 'lucide-react';
import { supabase, setRememberMe } from '@/lib/supabaseClient';

interface FormData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  rememberMe: boolean;
}

const FEATURES = [
  { icon: ClipboardList, text: 'Real-time machine work entry tracking' },
  { icon: Wrench, text: 'Automated maintenance scheduling & alerts' },
  { icon: BarChart3, text: 'Daily, weekly & monthly hour reports' },
];

export default function LoginClient() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  const { register, handleSubmit, getValues, watch, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '', rememberMe: true },
  });

  const switchMode = (next: 'login' | 'signup') => {
    setMode(next);
    setFormError('');
    setResetSent(false);
    setSignupDone(false);
    reset();
  };

  const onLogin = async (data: FormData) => {
    setIsLoading(true);
    setFormError('');
    setRememberMe(data.rememberMe);
    const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
    if (error) {
      setFormError(error.message);
      setIsLoading(false);
      return;
    }
    router.push('/admin-dashboard');
  };

  const onSignup = async (data: FormData) => {
    setIsLoading(true);
    setFormError('');
    setRememberMe(true);
    const { data: signupData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.fullName } },
    });
    if (error) {
      setFormError(error.message);
      setIsLoading(false);
      return;
    }
    setIsLoading(false);
    if (signupData.session) {
      // Email confirmation is off — logged in immediately.
      router.push('/admin-dashboard');
    } else {
      // Email confirmation is required.
      setSignupDone(true);
    }
  };

  const handleForgotPassword = async () => {
    const email = getValues('email');
    if (!email) {
      setFormError('Enter your email above first, then click "Forgot password?"');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setFormError(error.message);
      return;
    }
    setFormError('');
    setResetSent(true);
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] gradient-auth-panel flex-col justify-between p-10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center overflow-hidden">
            <Image priority src="/assets/images/SKBlogo-1785779727587.jpeg" alt="SKBEquip logo" width={40} height={40} className="w-full h-full object-cover" />
          </div>
          <span className="text-xl font-800 text-white tracking-tight">SKBEquip</span>
        </div>
        <div>
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-3 py-1.5 mb-6">
              <HardHat size={14} className="text-white/90" />
              <span className="text-xs font-600 text-white/90">Construction Fleet Management</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-800 text-white leading-tight mb-4">Manage your entire fleet from one dashboard</h1>
            <p className="text-base text-white/70 leading-relaxed">Track machine hours, schedule maintenance, and generate reports — all in one place designed for construction professionals.</p>
          </div>
          <ul className="space-y-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <li key={`feat-${f.text.slice(0, 20)}`} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0"><Icon size={16} className="text-white" /></div>
                  <span className="text-sm text-white/80">{f.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="text-xs text-white/50 font-500">© 2026 SKBEquip. Built for construction professionals.</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-lg overflow-hidden"><Image priority src="/assets/images/SKBlogo-1785779727587.jpeg" alt="SKBEquip logo" width={36} height={36} className="w-full h-full object-cover" /></div>
            <span className="text-lg font-800 text-foreground">SKBEquip</span>
          </div>

          {/* Mode toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1 mb-7">
            <button onClick={() => switchMode('login')} className={`flex-1 py-2 text-sm font-600 rounded-md transition-all ${mode === 'login' ? 'bg-card text-foreground card-shadow' : 'text-muted-foreground'}`}>Log In</button>
            <button onClick={() => switchMode('signup')} className={`flex-1 py-2 text-sm font-600 rounded-md transition-all ${mode === 'signup' ? 'bg-card text-foreground card-shadow' : 'text-muted-foreground'}`}>Sign Up</button>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-700 text-foreground mb-1.5">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
            <p className="text-sm text-muted-foreground">
              {mode === 'login' ? 'Sign in to continue' : 'New accounts start with Viewer access — an admin will upgrade you if needed.'}
            </p>
          </div>

          {formError && (
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-danger/8 border border-danger/20 mb-5 fade-in">
              <AlertCircle size={16} className="text-danger flex-shrink-0 mt-0.5" />
              <p className="text-sm text-danger font-500">{formError}</p>
            </div>
          )}
          {resetSent && (
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-success/8 border border-success/20 mb-5 fade-in">
              <p className="text-sm text-success font-500">Password reset email sent — check your inbox.</p>
            </div>
          )}
          {signupDone && (
            <div className="flex items-start gap-3 p-3.5 rounded-lg bg-success/8 border border-success/20 mb-5 fade-in">
              <CheckCircle2 size={16} className="text-success flex-shrink-0 mt-0.5" />
              <p className="text-sm text-success font-500">Account created! Check your email to confirm it, then log in.</p>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleSubmit(onLogin)} noValidate className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-600 text-foreground mb-1.5">Email Address</label>
                <input
                  id="email" type="email" placeholder="you@example.com"
                  className={`w-full px-4 py-2.5 text-sm bg-input border rounded-md transition-all outline-none placeholder:text-muted-foreground text-foreground ${errors.email ? 'border-danger' : 'border-border focus:input-focus'}`}
                  {...register('email', { required: 'Email address is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' } })}
                />
                {errors.email && <p className="mt-1.5 text-xs text-danger font-500">{errors.email.message}</p>}
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-600 text-foreground mb-1.5">Password</label>
                <div className="relative">
                  <input
                    id="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password"
                    className={`w-full px-4 py-2.5 pr-11 text-sm bg-input border rounded-md transition-all outline-none placeholder:text-muted-foreground text-foreground ${errors.password ? 'border-danger' : 'border-border focus:input-focus'}`}
                    {...register('password', { required: 'Password is required' })}
                  />
                  <button type="button" onClick={() => setShowPassword(p => !p)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="mt-1.5 text-xs text-danger font-500">{errors.password.message}</p>}
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-border text-primary accent-primary" {...register('rememberMe')} />
                  <span className="text-sm text-muted-foreground font-500">Remember me</span>
                </label>
                <button type="button" onClick={handleForgotPassword} className="text-sm font-600 text-primary hover:text-primary/80 transition-colors">Forgot password?</button>
              </div>
              <button type="submit" disabled={isLoading} className="w-full py-2.5 rounded-md text-sm font-700 btn-primary flex items-center justify-center gap-2 min-h-[42px]">
                {isLoading ? (<><Loader2 size={16} className="animate-spin" /><span>Signing in...</span></>) : 'Sign In'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit(onSignup)} noValidate className="space-y-5">
              <div>
                <label htmlFor="fullName" className="block text-sm font-600 text-foreground mb-1.5">Full Name</label>
                <input
                  id="fullName" type="text" placeholder="Your name"
                  className={`w-full px-4 py-2.5 text-sm bg-input border rounded-md transition-all outline-none placeholder:text-muted-foreground text-foreground ${errors.fullName ? 'border-danger' : 'border-border focus:input-focus'}`}
                  {...register('fullName', { required: 'Full name is required' })}
                />
                {errors.fullName && <p className="mt-1.5 text-xs text-danger font-500">{errors.fullName.message}</p>}
              </div>
              <div>
                <label htmlFor="signupEmail" className="block text-sm font-600 text-foreground mb-1.5">Email Address</label>
                <input
                  id="signupEmail" type="email" placeholder="you@example.com"
                  className={`w-full px-4 py-2.5 text-sm bg-input border rounded-md transition-all outline-none placeholder:text-muted-foreground text-foreground ${errors.email ? 'border-danger' : 'border-border focus:input-focus'}`}
                  {...register('email', { required: 'Email address is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' } })}
                />
                {errors.email && <p className="mt-1.5 text-xs text-danger font-500">{errors.email.message}</p>}
              </div>
              <div>
                <label htmlFor="signupPassword" className="block text-sm font-600 text-foreground mb-1.5">Password</label>
                <input
                  id="signupPassword" type={showPassword ? 'text' : 'password'} placeholder="At least 6 characters"
                  className={`w-full px-4 py-2.5 text-sm bg-input border rounded-md transition-all outline-none placeholder:text-muted-foreground text-foreground ${errors.password ? 'border-danger' : 'border-border focus:input-focus'}`}
                  {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })}
                />
                {errors.password && <p className="mt-1.5 text-xs text-danger font-500">{errors.password.message}</p>}
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-600 text-foreground mb-1.5">Confirm Password</label>
                <input
                  id="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="Re-enter your password"
                  className={`w-full px-4 py-2.5 text-sm bg-input border rounded-md transition-all outline-none placeholder:text-muted-foreground text-foreground ${errors.confirmPassword ? 'border-danger' : 'border-border focus:input-focus'}`}
                  {...register('confirmPassword', { required: 'Please confirm your password', validate: (v) => v === watch('password') || 'Passwords do not match' })}
                />
                {errors.confirmPassword && <p className="mt-1.5 text-xs text-danger font-500">{errors.confirmPassword.message}</p>}
              </div>
              <button type="submit" disabled={isLoading} className="w-full py-2.5 rounded-md text-sm font-700 btn-primary flex items-center justify-center gap-2 min-h-[42px]">
                {isLoading ? (<><Loader2 size={16} className="animate-spin" /><span>Creating account...</span></>) : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}