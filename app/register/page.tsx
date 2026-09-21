'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = getSupabaseClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      toast.success('Account created! Let&apos;s set up your profile.');
      router.push('/onboarding');
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] px-6">
      <Card className="w-full max-w-md rounded-xl border-border bg-white shadow-sm">
        <CardHeader className="space-y-3">
          <Link href="/" className="text-2xl font-bold text-[#004ac6]">
            SkillBridge
          </Link>
          <CardTitle className="text-2xl font-bold text-gray-900">Create your account</CardTitle>
          <p className="text-sm text-gray-600">Join SkillBridge to find and offer skills.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-900">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                className="h-[50px] rounded-lg border-[#c3c6d7] bg-white px-4 text-base text-gray-900 placeholder:text-[#737686] focus-visible:ring-1 focus-visible:ring-[#004ac6]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-900">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="h-[50px] rounded-lg border-[#c3c6d7] bg-white px-4 text-base text-gray-900 placeholder:text-[#737686] focus-visible:ring-1 focus-visible:ring-[#004ac6]"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="h-[50px] gap-2 rounded-lg bg-[#004ac6] px-8 py-3 text-sm font-bold text-white hover:bg-[#003ca3] disabled:opacity-60"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </Button>
            <p className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-[#004ac6] hover:underline">
                Log in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
