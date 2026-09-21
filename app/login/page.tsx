'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, UserCheck, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/auth-context';
import { getMarketplaceState } from '@/lib/store/marketplace-store';

const DEMO_ACCOUNTS = [
  {
    id: '10000000-0000-0000-0000-000000000001',
    name: 'Alex Sharma',
    email: 'alex.tech@example.com',
    role: 'Seller (Full Stack Dev)',
    college: 'MIT World Peace University',
    verified: true,
  },
  {
    id: '10000000-0000-0000-0000-000000000002',
    name: 'Priya Verma',
    email: 'priya.design@example.com',
    role: 'Seller (UI/UX Design)',
    college: 'COEP Technological University',
    verified: true,
  },
  {
    id: '10000000-0000-0000-0000-000000000003',
    name: 'Rohan Kulkarni',
    email: 'rohan.student@example.com',
    role: 'Buyer (DSA Student)',
    college: 'PICT, Pune',
    verified: true,
  },
  {
    id: '10000000-0000-0000-0000-000000000004',
    name: 'Sneha Patil',
    email: 'sneha.video@example.com',
    role: 'Seller (Video Editor)',
    college: 'Symbiosis SCMC',
    verified: true,
  },
  {
    id: 'admin-user-0000-0000-000000000001',
    name: 'Campus Admin',
    email: 'admin@skillbridge.edu',
    role: 'Platform Administrator',
    college: 'SkillBridge Directorate',
    verified: true,
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { loginAsDemoUser } = useAuth();
  const [email, setEmail] = useState('alex.tech@example.com');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);

  async function handleDemoLogin(userId: string, name: string) {
    setLoading(true);
    try {
      await loginAsDemoUser(userId);
      toast.success(`Logged in as ${name}!`);
      if (userId === 'admin-user-0000-0000-000000000001') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch {
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Find matching demo account by email
    const state = getMarketplaceState();
    const matched = state.profiles.find((p) => p.email?.toLowerCase() === email.toLowerCase().trim());

    if (matched) {
      await loginAsDemoUser(matched.user_id);
      toast.success(`Welcome back, ${matched.full_name}!`);
      router.push('/dashboard');
    } else {
      // Default to Alex if unknown
      await loginAsDemoUser('10000000-0000-0000-0000-000000000001');
      toast.success('Welcome back!');
      router.push('/dashboard');
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fafafa] px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center">
          <Link href="/" className="text-3xl font-black tracking-tight text-[#004ac6]">
            SkillBridge
          </Link>
          <p className="mt-1 text-xs text-gray-500 font-medium">
            Student Skill Marketplace & Escrow Platform
          </p>
        </div>

        {/* 1-Click Demo Logins */}
        <Card className="rounded-2xl border-2 border-[#004ac6]/20 bg-white p-5 shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-[#004ac6]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#004ac6]">
              1-Click Student & Admin Login
            </h2>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Select any pre-configured student persona to explore the marketplace immediately:
          </p>

          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => handleDemoLogin(acc.id, acc.name)}
                disabled={loading}
                className="w-full flex items-center justify-between rounded-xl border border-gray-100 bg-[#f8faff] p-3 text-left transition-all hover:border-[#004ac6]/40 hover:bg-[#f0f4ff] hover:shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-gray-900">{acc.name}</p>
                    <span className="text-[10px] text-gray-400">({acc.role})</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">{acc.email}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-[#004ac6]" />
              </button>
            ))}
          </div>
        </Card>

        {/* Or Standard Form */}
        <Card className="rounded-2xl border border-border bg-white shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg font-bold text-gray-900">Sign In with Credentials</CardTitle>
            <p className="text-xs text-gray-500">
              Default password for all demo student accounts: <code>Password123!</code>
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-gray-700">
                  Student Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.tech@example.com"
                  className="h-11 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-gray-700">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 text-xs"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-11 bg-[#004ac6] text-white hover:bg-[#003b9e] font-bold text-xs"
              >
                {loading ? 'Signing in...' : 'Sign In to Dashboard'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
