'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  LogOut,
  ArrowRight,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email');

  const { user, isEmailVerified, signOut, refreshProfile } = useAuth();
  const displayEmail = emailParam || user?.email || 'your email';

  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // If already verified, route to college verification
  useEffect(() => {
    if (isEmailVerified) {
      router.replace('/verify');
    }
  }, [isEmailVerified, router]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleCheckVerification() {
    setChecking(true);
    try {
      const supabase = getSupabaseClient();
      const { data: { user: refreshedUser }, error } = await supabase.auth.getUser();

      if (error) {
        toast.error(error.message);
        return;
      }

      if (refreshedUser?.email_confirmed_at) {
        await refreshProfile();
        toast.success('Email confirmed! Proceeding to College Student Verification.');
        router.replace('/verify');
      } else {
        toast.info('Email not confirmed yet. Please check your inbox and click the verification link.');
      }
    } catch {
      toast.error('Unable to check verification status.');
    } finally {
      setChecking(false);
    }
  }

  async function handleResendEmail() {
    if (cooldown > 0) return;
    setResending(true);

    try {
      const supabase = getSupabaseClient();
      const targetEmail = user?.email || emailParam;

      if (!targetEmail) {
        toast.error('No email address found to resend to.');
        return;
      }

      const redirectUri = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined;

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
        options: {
          emailRedirectTo: redirectUri,
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes('rate limit') || error.message.toLowerCase().includes('seconds')) {
          toast.error('Please wait a few seconds before requesting another email.');
          setCooldown(30);
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success(`Verification link resent to ${targetEmail}!`);
      setCooldown(60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend confirmation email';
      toast.error(msg);
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fafafa] px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-block text-3xl font-black tracking-tight text-[#004ac6]">
            SkillBridge
          </Link>
          <p className="mt-1 text-xs font-semibold text-gray-500">
            Student Identity & Verification Gateway
          </p>
        </div>

        {/* Multi-step progress indicator */}
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-[#004ac6]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#004ac6] text-[10px] text-white">
                1
              </span>
              Email Verification
            </span>
            <span className="text-gray-300">───</span>
            <span className="flex items-center gap-1.5 text-gray-400">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-[10px]">
                2
              </span>
              College ID
            </span>
            <span className="text-gray-300">───</span>
            <span className="flex items-center gap-1.5 text-gray-400">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-[10px]">
                3
              </span>
              Admin Approval
            </span>
          </div>
        </div>

        <Card className="rounded-2xl border border-border bg-white shadow-md">
          <CardHeader className="space-y-2 text-center pb-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#004ac6]/10 text-[#004ac6]">
              <Mail className="h-8 w-8" />
            </div>
            <CardTitle className="text-xl font-bold text-gray-900">
              Verify Your Email Address
            </CardTitle>
            <p className="text-xs text-gray-600">
              We sent a verification link to{' '}
              <strong className="text-gray-900">{displayEmail}</strong>.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-900 space-y-1.5">
              <p className="font-semibold flex items-center gap-1.5 text-blue-950">
                <Lock className="h-3.5 w-3.5" />
                Marketplace Access Locked
              </p>
              <p className="text-[11px] text-blue-800">
                SkillBridge requires all students to verify their email before uploading student credentials or accessing listings, orders, and services.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <Button
                onClick={handleCheckVerification}
                disabled={checking}
                className="h-11 w-full gap-2 rounded-xl bg-[#004ac6] text-xs font-bold text-white hover:bg-[#003b9e] shadow-sm"
              >
                <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
                {checking ? 'Checking Status...' : "I've Clicked the Verification Link"}
              </Button>

              <Button
                variant="outline"
                onClick={handleResendEmail}
                disabled={resending || cooldown > 0}
                className="h-11 w-full text-xs font-semibold text-gray-700 border-gray-200 hover:bg-gray-50"
              >
                {resending
                  ? 'Resending Email...'
                  : cooldown > 0
                  ? `Resend Link in ${cooldown}s`
                  : 'Resend Verification Email'}
              </Button>
            </div>

            <div className="border-t border-gray-100 pt-3 flex items-center justify-between text-xs text-gray-500">
              <button
                type="button"
                onClick={() => signOut().then(() => router.push('/login'))}
                className="inline-flex items-center gap-1 hover:text-red-600 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign in with another email
              </button>
              <Link href="/login" className="hover:text-[#004ac6] font-semibold">
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
