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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { initiateGoogleOAuth } from '@/lib/auth/oauth';
import { GoogleOAuthModal } from '@/components/auth/google-oauth-modal';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || searchParams.get('next') || '';

  const { refreshProfile } = useAuth();
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setUnconfirmedEmail(null);
    setResendSuccess(false);

    try {
      const supabase = getSupabaseClient();
      const cleanEmail = email.trim();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setUnconfirmedEmail(cleanEmail);
          toast.error('Email not verified. Please verify your email before signing in.');
        } else if (error.message.toLowerCase().includes('invalid login credentials')) {
          toast.error('Invalid email or password. Please verify your credentials.');
        } else {
          toast.error(error.message || 'Login failed. Please check your credentials.');
        }
        return;
      }

      if (data.user) {
        // Check if email is verified
        if (!data.user.email_confirmed_at) {
          setUnconfirmedEmail(cleanEmail);
          toast.warning('Please confirm your email address to continue.');
          router.push(`/auth/verify-email?email=${encodeURIComponent(cleanEmail)}`);
          return;
        }

        toast.success('Successfully signed in!');
        await routeAfterLogin(data.user.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error occurred during login';
      toast.error(msg);
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initialize Google login';
      toast.error(msg);
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fafafa] px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center">
          <Link href="/" className="inline-block text-3xl font-black tracking-tight text-[#004ac6]">
            SkillBridge
          </Link>
          <p className="mt-1 text-xs font-semibold text-gray-500">
            Student Skill Marketplace & College Verification
          </p>
        </div>

        {/* Unconfirmed Email Notice Banner */}
        {unconfirmedEmail && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs shadow-sm">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="font-semibold text-amber-900">
                  Email verification required for <strong>{unconfirmedEmail}</strong>.
                </p>
                <p className="text-amber-700">
                  You must confirm your email before you can proceed to student verification or access marketplace features.
                </p>
                <div className="pt-1">
                  {resendSuccess ? (
                    <div className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Verification email resent! Check your inbox.
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={resendingEmail}
                      onClick={handleResendEmail}
                      className="h-8 border-amber-300 bg-white text-xs font-bold text-amber-900 hover:bg-amber-100"
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
        <Card className="rounded-2xl border border-border bg-white shadow-md">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold text-gray-900">Sign In with Supabase Auth</CardTitle>
            <p className="text-xs text-gray-500">
              Enter your credentials to securely access your student account.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google OAuth Button */}
            <Button
              type="button"
              variant="outline"
              disabled={loading || oauthLoading}
              onClick={handleGoogleLogin}
              className="h-11 w-full gap-2.5 rounded-xl border-gray-200 bg-white text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50"
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
              <div className="w-full border-t border-gray-200" />
              <span className="absolute bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                or sign in with email
              </span>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-gray-700">
                  Student Email
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@college.edu or name@gmail.com"
                    className="h-11 rounded-xl pl-9 text-xs"
                  />
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-gray-700">
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
                    className="h-11 rounded-xl pl-9 pr-9 text-xs"
                  />
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || oauthLoading}
                className="h-11 rounded-xl bg-[#004ac6] text-xs font-bold text-white hover:bg-[#003b9e] shadow-sm disabled:opacity-60"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </Button>
            </form>

            <div className="border-t border-gray-100 pt-3 text-center">
              <p className="text-xs text-gray-600">
                New to SkillBridge?{' '}
                <Link href="/register" className="font-bold text-[#004ac6] hover:underline">
                  Create student account
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
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
