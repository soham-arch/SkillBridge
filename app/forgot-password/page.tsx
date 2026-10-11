'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const redirectUri = typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : undefined;

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: redirectUri,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setSubmitted(true);
      toast.success('Password reset link sent to your email!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send password reset request';
      toast.error(msg);
    } finally {
      setLoading(false);
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
            Account Recovery & Password Reset
          </p>
        </div>

        <Card className="rounded-2xl border border-border bg-white shadow-md">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold text-gray-900">Forgot Password</CardTitle>
            <p className="text-xs text-gray-500">
              Enter your student email address and we'll send you a secure password reset link.
            </p>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="space-y-4 py-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Check Your Email</h3>
                <p className="text-xs text-gray-600">
                  We have dispatched a password recovery link to <strong>{email}</strong>.
                  Please click the link in your inbox to establish a new password.
                </p>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setSubmitted(false)}
                    className="h-10 text-xs font-semibold text-gray-700"
                  >
                    Resend link or use different email
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-gray-700">
                    Registered Email Address
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

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-11 rounded-xl bg-[#004ac6] text-xs font-bold text-white hover:bg-[#003b9e] shadow-sm disabled:opacity-60"
                >
                  {loading ? 'Sending Reset Link...' : 'Send Password Reset Link'}
                </Button>
              </form>
            )}

            <div className="border-t border-gray-100 pt-4 mt-4 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-[#004ac6]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
