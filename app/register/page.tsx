'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Lock,
  GraduationCap,
  BadgeAlert,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';
import { initiateGoogleOAuth } from '@/lib/auth/oauth';
import { GoogleOAuthModal } from '@/components/auth/google-oauth-modal';

export default function RegisterPage() {
  const router = useRouter();

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [college, setCollege] = useState('');
  const [studentIdNumber, setStudentIdNumber] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  async function handleGoogleSignUp() {
    setOauthLoading(true);
    try {
      const result = await initiateGoogleOAuth();
      if (result.requiresConfig) {
        setShowGoogleModal(true);
        toast.error('Google Sign-Up is not enabled in your Supabase project yet.');
      } else if (!result.ok && result.error) {
        toast.error(`Google Sign-Up failed: ${result.error}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google OAuth failed';
      toast.error(msg);
    } finally {
      setOauthLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    if (!fullName.trim()) {
      toast.error('Please enter your full name.');
      return;
    }

    if (!college.trim()) {
      toast.error('Please enter your college or university.');
      return;
    }

    if (!studentIdNumber.trim()) {
      toast.error('Please enter your student ID or enrollment number.');
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const cleanEmail = email.trim().toLowerCase();

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            college: college.trim(),
            student_id_number: studentIdNumber.trim(),
          },
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        },
      });

      if (error) {
        if (
          error.message.toLowerCase().includes('already registered') ||
          error.message.toLowerCase().includes('already exists')
        ) {
          toast.error('An account with this email already exists. Please sign in instead.');
          return;
        }
        if (error.message.toLowerCase().includes('rate limit')) {
          toast.error('Rate limit reached. Please wait a moment before trying again.');
          return;
        }
        toast.error(error.message);
        return;
      }

      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        toast.error('An account with this email already exists. Please sign in instead.');
        router.push('/login');
        return;
      }

      if (data.user) {
        try {
          await supabase.from('profiles').upsert({
            user_id: data.user.id,
            email: cleanEmail,
            full_name: fullName.trim(),
            college: college.trim(),
            student_id_number: studentIdNumber.trim(),
            verification_status: 'not_verified',
          });
        } catch (profileErr) {
          console.warn('Could not insert initial profile directly; trigger will handle:', profileErr);
        }

        toast.success('Account created! Verification link sent to your email.');
        router.push(`/auth/verify-email?email=${encodeURIComponent(cleanEmail)}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please check your network connection.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf9f6] px-6 py-16 text-neutral-900">
      <div className="w-full max-w-lg space-y-8">
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
            STUDENT ONBOARDING // MIT-WPU NETWORK
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 sm:p-10 shadow-xs space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight text-neutral-950">
              Create Student Account.
            </h2>
            <p className="text-xs text-neutral-500 font-normal">
              Register with verified campus credentials to offer or book services.
            </p>
          </div>

          {/* Google OAuth Button */}
          <Button
            type="button"
            variant="outline"
            disabled={loading || oauthLoading}
            onClick={handleGoogleSignUp}
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
            {oauthLoading ? 'Connecting to Google...' : 'Sign up with Google'}
          </Button>

          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-neutral-100" />
            <span className="absolute bg-white px-3 text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">
              OR REGISTER WITH COLLEGE CREDENTIALS
            </span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName" className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                Full Legal Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Sharma"
                  className="h-12 rounded-xl pl-10 text-xs border-neutral-200"
                />
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                College / Institutional Email <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.sharma@mitwpu.edu.in"
                  className="h-12 rounded-xl pl-10 text-xs border-neutral-200"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="college" className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                  College / Campus <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="college"
                    type="text"
                    required
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="MIT-WPU Pune"
                    className="h-12 rounded-xl pl-10 text-xs border-neutral-200"
                  />
                  <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="studentIdNumber" className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                  PRN / Student ID <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="studentIdNumber"
                    type="text"
                    required
                    value={studentIdNumber}
                    onChange={(e) => setStudentIdNumber(e.target.value)}
                    placeholder="1032210123"
                    className="h-12 rounded-xl pl-10 text-xs border-neutral-200 font-mono"
                  />
                  <BadgeAlert className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password" className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                  Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="h-12 rounded-xl pl-10 pr-9 text-xs border-neutral-200"
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

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="h-12 rounded-xl pl-10 text-xs border-neutral-200"
                  />
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || oauthLoading}
              className="h-12 rounded-xl bg-neutral-950 text-xs font-bold text-white hover:bg-black shadow-xs disabled:opacity-60 mt-2"
            >
              {loading ? 'Creating Student Account...' : 'Complete Registration'}
            </Button>
          </form>

          <div className="border-t border-neutral-100 pt-4 text-center">
            <p className="text-xs text-neutral-500">
              Already registered?{' '}
              <Link href="/login" className="font-bold text-[#004ac6] hover:underline">
                Sign in to your account
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
