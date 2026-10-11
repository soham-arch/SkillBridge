'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkRecoverySession() {
      try {
        const supabase = getSupabaseClient();
        const { data: { session } } = await supabase.auth.getSession();
        setHasSession(Boolean(session));
      } catch {
        setHasSession(false);
      }
    }

    checkRecoverySession();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        if (error.message.toLowerCase().includes('expired')) {
          toast.error('Password reset link has expired. Please request a new one.');
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success('Password updated successfully! Please sign in with your new password.');
      await supabase.auth.signOut();
      router.push('/login');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password';
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
            Set Your New Password
          </p>
        </div>

        <Card className="rounded-2xl border border-border bg-white shadow-md">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold text-gray-900">Reset Password</CardTitle>
            <p className="text-xs text-gray-500">
              Enter and confirm your new account password below.
            </p>
          </CardHeader>
          <CardContent>
            {hasSession === false ? (
              <div className="space-y-4 py-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <AlertCircle className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-gray-900">Invalid or Expired Link</h3>
                <p className="text-xs text-gray-600">
                  Your password recovery session could not be verified or the link has expired.
                </p>
                <div className="pt-2">
                  <Link href="/forgot-password">
                    <Button className="h-10 rounded-xl bg-[#004ac6] text-xs font-bold text-white hover:bg-[#003b9e]">
                      Request New Reset Link
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold text-gray-700">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
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
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="h-11 rounded-xl pl-9 text-xs"
                    />
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="mt-2 h-11 rounded-xl bg-[#004ac6] text-xs font-bold text-white hover:bg-[#003b9e] shadow-sm disabled:opacity-60"
                >
                  {loading ? 'Updating Password...' : 'Update Password'}
                </Button>
              </form>
            )}

            <div className="border-t border-gray-100 pt-4 mt-4 text-center">
              <Link
                href="/login"
                className="text-xs font-semibold text-gray-600 hover:text-[#004ac6]"
              >
                Cancel and return to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
