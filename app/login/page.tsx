'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { initiateGoogleOAuth } from '@/lib/auth/oauth';
import { GoogleOAuthModal } from '@/components/auth/google-oauth-modal';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || searchParams.get('next') || '';

  const { refreshProfile, signInDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  // Unconfirmed email warning state
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  async function routeAfterLogin(userId: string) {
    try {
      const supabase = getSupabaseClient();
      await refreshProfile();

      const { data: profile } = await supabase
        .from('profiles')
        .select('verification_status, is_admin, onboarding_completed, active_role')
        .eq('user_id', userId)
        .maybeSingle();

      if (profile?.is_admin && returnUrl.includes('/admin')) {
        router.push('/admin');
        return;
      }

      if (returnUrl && !returnUrl.includes('/login') && !returnUrl.includes('/register')) {
        router.push(returnUrl);
        return;
      }

      if (profile?.verification_status === 'verified') {
        if (!profile.onboarding_completed) {
          router.push('/onboarding');
        } else {
          router.push(`/dashboard?mode=${profile.active_role || 'buyer'}`);
        }
      } else if (profile?.verification_status === 'pending') {
        router.push('/verify/pending');
      } else if (profile?.verification_status === 'rejected') {
        router.push('/verify/rejected');
      } else {
        router.push('/verify');
      }
    } catch {
      router.push('/dashboard');
    }
  }

  async function handleDemoQuickLogin(demoAccount: 'admin' | 'alex' | 'priya') {
    setLoading(true);
    try {
      const targetEmail =
        demoAccount === 'admin'
          ? 'admin@skillbridge.edu'
          : demoAccount === 'priya'
          ? 'priya.design@example.com'
          : 'alex.tech@example.com';

      const res = await signInDemo(targetEmail);
      if (res.success) {
        toast.success(`Welcome, ${res.profile.full_name}!`);
        if (demoAccount === 'admin' || res.profile.is_admin) {
          router.push('/admin');
        } else if (returnUrl && !returnUrl.includes('/login')) {
          router.push(returnUrl);
        } else {
          router.push(`/dashboard?mode=${res.profile.active_role || 'seller'}`);
        }
      }
    } catch (err: unknown) {
      toast.error('Demo authentication failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setUnconfirmedEmail(null);
    setResendSuccess(false);

    const cleanEmail = email.trim().toLowerCase();

    const isKnownDemoAccount =
      cleanEmail.includes('alex') ||
      cleanEmail.includes('priya') ||
      cleanEmail.includes('rohan') ||
      cleanEmail.includes('admin') ||
      cleanEmail.includes('example.com') ||
      cleanEmail === 'admin@skillbridge.edu' ||
      cleanEmail === 'admin@mitwpu.edu.in';

    if (!isKnownDemoAccount) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (!error && data?.user) {
          toast.success('Successfully signed in!');
          await routeAfterLogin(data.user.id);
          return;
        }

        if (
          error &&
          !error.message.toLowerCase().includes('schema') &&
          !error.message.toLowerCase().includes('database error')
        ) {
          if (error.message.toLowerCase().includes('email not confirmed')) {
            setUnconfirmedEmail(cleanEmail);
            toast.error('Email not verified. Please verify your email before signing in.');
            setLoading(false);
            return;
          } else if (error.message.toLowerCase().includes('invalid login credentials')) {
            toast.error('Invalid email or password. Please verify your credentials.');
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Supabase auth network error:', err);
      }
    }

    try {
      const demoRes = await signInDemo(cleanEmail);
      if (demoRes.success) {
        toast.success(`Signed in as ${demoRes.profile.full_name}!`);
        if (demoRes.profile.is_admin || cleanEmail.includes('admin')) {
          router.push('/admin');
        } else if (returnUrl && !returnUrl.includes('/login')) {
          router.push(returnUrl);
        } else {
          router.push(`/dashboard?mode=${demoRes.profile.active_role || 'seller'}`);
        }
        return;
      }
    } catch {
      toast.error('Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setOauthLoading(true);
    try {
      const result = await initiateGoogleOAuth();
      if (result.requiresConfig) {
        setShowGoogleModal(true);
        toast.error('Google Sign-In is not enabled in your Supabase project yet.');
      } else if (!result.ok && result.error) {
        toast.error(`Google Sign-In failed: ${result.error}`);
      }
    } catch {
      setShowGoogleModal(true);
    } finally {
      setOauthLoading(false);
    }
  }

  async function handleResendEmail() {
    if (!unconfirmedEmail) return;
    setResendingEmail(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: unconfirmedEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error(error.message);
      } else {
        setResendSuccess(true);
        toast.success(`Verification link sent to ${unconfirmedEmail}!`);
      }
    } catch {
      toast.error('Failed to dispatch verification email');
    } finally {
      setResendingEmail(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf9f6] px-6 py-16 text-neutral-900">
      <div className="w-full max-w-md space-y-8">
        {/* Brand */}
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 text-3xl font-black tracking-tight text-neutral-950"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-[#004ac6] transition-transform duration-300 group-hover:scale-125" />
            SkillBridge
          </Link>
          <p className="text-xs font-mono font-medium uppercase tracking-wider text-neutral-400">
            CAMPUS SKILL EXCHANGE // MIT-WPU AUTH
          </p>
        </div>

        {/* 1-Click Fast Test Accounts */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#004ac6]" />
              Quick Demo Login (1-Click)
            </span>
            <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              ONLINE
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemoQuickLogin('admin')}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-neutral-950 text-white hover:bg-black transition-all shadow-2xs text-center disabled:opacity-50"
            >
              <ShieldAlert className="h-4 w-4 mb-1 text-red-400" />
              <span className="text-[11px] font-bold">Admin</span>
              <span className="text-[9px] text-neutral-400">Full Console</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemoQuickLogin('alex')}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-[#004ac6] text-white hover:bg-[#003da8] transition-all shadow-2xs text-center disabled:opacity-50"
            >
              <UserCheck className="h-4 w-4 mb-1" />
              <span className="text-[11px] font-bold">Alex</span>
              <span className="text-[9px] text-blue-200">Seller Studio</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleDemoQuickLogin('priya')}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl border border-neutral-300 bg-neutral-50 text-neutral-900 hover:bg-neutral-100 transition-all shadow-2xs text-center disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4 mb-1 text-[#004ac6]" />
              <span className="text-[11px] font-bold">Priya</span>
              <span className="text-[9px] text-neutral-500">Buyer Hub</span>
            </button>
          </div>
        </div>

        {/* Unconfirmed Email Notice Banner */}
        {unconfirmedEmail && (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-xs shadow-2xs space-y-2">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" />
              <div className="space-y-2">
                <p className="font-bold text-amber-900">
                  Email verification required for {unconfirmedEmail}.
                </p>
                <p className="text-amber-800 leading-relaxed">
                  Please verify your email link to access full student marketplace and escrow capabilities.
                </p>
                <div className="pt-2">
                  {resendSuccess ? (
                    <div className="inline-flex items-center gap-1.5 font-bold text-emerald-800">
                      <CheckCircle2 className="h-4 w-4" />
                      Verification email dispatched! Check inbox.
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={resendingEmail}
                      onClick={handleResendEmail}
                      className="h-8 border-amber-300 bg-white text-xs font-bold text-amber-900 hover:bg-amber-100 rounded-xl"
                    >
                      {resendingEmail ? 'Sending...' : 'Resend Verification Link'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sign In Card */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 sm:p-9 shadow-xs space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight text-neutral-950">
              Sign In.
            </h2>
            <p className="text-xs text-neutral-500 font-normal">
              Enter your credentials to access your student or admin dashboard.
            </p>
          </div>

          {/* Google OAuth Button */}
          <Button
            type="button"
            variant="outline"
            disabled={loading || oauthLoading}
            onClick={handleGoogleLogin}
            className="h-12 w-full gap-2.5 rounded-xl border-neutral-300 bg-white text-xs font-bold text-neutral-800 shadow-2xs hover:bg-neutral-50"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            {oauthLoading ? 'Connecting to Google...' : 'Continue with Google'}
          </Button>

          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-neutral-100" />
            <span className="absolute bg-white px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
              OR SIGN IN WITH EMAIL
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                Email Address
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@skillbridge.edu or alex.tech@example.com"
                  className="h-12 rounded-xl pl-10 text-xs border-neutral-200"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-semibold text-[#004ac6] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="h-12 rounded-xl pl-10 pr-10 text-xs border-neutral-200"
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || oauthLoading}
              className="h-12 rounded-xl bg-neutral-950 text-xs font-bold text-white hover:bg-black shadow-xs disabled:opacity-60 mt-1"
            >
              {loading ? 'Authenticating...' : 'Sign In to Campus'}
            </Button>
          </form>

          <div className="border-t border-neutral-100 pt-4 text-center">
            <p className="text-xs text-neutral-500">
              New to SkillBridge?{' '}
              <Link href="/register" className="font-bold text-[#004ac6] hover:underline">
                Create student account
              </Link>
            </p>
          </div>
        </div>
      </div>

      <GoogleOAuthModal
        open={showGoogleModal}
        onOpenChange={setShowGoogleModal}
        onUseEmailFallback={() => {
          const emailInput = document.getElementById('email');
          if (emailInput) emailInput.focus();
        }}
      />
    </div>
  );
}
