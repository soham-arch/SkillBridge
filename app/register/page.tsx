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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

      // Check if user was created or duplicate (identities empty array indicates user already exists)
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        toast.error('An account with this email already exists. Please sign in instead.');
        router.push('/login');
        return;
      }

      // Automatically provision / sync profile in profiles table
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fafafa] px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand */}
        <div className="text-center">
          <Link href="/" className="inline-block text-3xl font-black tracking-tight text-[#004ac6]">
            SkillBridge
          </Link>
          <p className="mt-1 text-xs font-semibold text-gray-500">
            Student Skill Marketplace & Verification Portal
          </p>
        </div>

        <Card className="rounded-2xl border border-border bg-white shadow-md">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold text-gray-900">Create Student Account</CardTitle>
            <p className="text-xs text-gray-500">
              Register with genuine student credentials to join the verified campus network.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Google OAuth Button */}
            <Button
              type="button"
              variant="outline"
              disabled={loading || oauthLoading}
              onClick={handleGoogleSignUp}
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
              {oauthLoading ? 'Connecting to Google...' : 'Sign up with Google'}
            </Button>

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-gray-200" />
              <span className="absolute bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                or register with email
              </span>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fullName" className="text-xs font-semibold text-gray-700">
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
                    className="h-11 rounded-xl pl-9 text-xs"
                  />
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-gray-700">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@college.edu or personal email"
                    className="h-11 rounded-xl pl-9 text-xs"
                  />
                  <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                </div>
                <p className="text-[11px] text-gray-400">
                  A verification confirmation link will be delivered to this email.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="college" className="text-xs font-semibold text-gray-700">
                    College / University <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="college"
                      type="text"
                      required
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      placeholder="e.g. MIT-WPU, Pune"
                      className="h-11 rounded-xl pl-9 text-xs"
                    />
                    <GraduationCap className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="studentIdNumber" className="text-xs font-semibold text-gray-700">
                    Student ID / PRN <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="studentIdNumber"
                      type="text"
                      required
                      value={studentIdNumber}
                      onChange={(e) => setStudentIdNumber(e.target.value)}
                      placeholder="e.g. 1032210123"
                      className="h-11 rounded-xl pl-9 text-xs"
                    />
                    <BadgeAlert className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold text-gray-700">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="h-11 rounded-xl pl-9 pr-8 text-xs"
                    />
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-3.5 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-semibold text-gray-700">
                    Confirm Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="h-11 rounded-xl pl-9 text-xs"
                    />
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || oauthLoading}
                className="mt-2 h-11 rounded-xl bg-[#004ac6] text-xs font-bold text-white hover:bg-[#003b9e] shadow-sm disabled:opacity-60"
              >
                {loading ? 'Creating Account & Sending Email...' : 'Sign Up for SkillBridge'}
              </Button>
            </form>

            <div className="border-t border-gray-100 pt-3 text-center">
              <p className="text-xs text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="font-bold text-[#004ac6] hover:underline">
                  Sign In
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
