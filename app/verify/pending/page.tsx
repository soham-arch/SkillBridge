'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock,
  ShieldCheck,
  RefreshCw,
  LogOut,
  CheckCircle2,
  Lock,
  Building,
  User,
  BadgeAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/auth-context';
import { useRequireAuth } from '@/lib/auth/use-require-auth';
import { fetchUserVerificationStatus } from '@/lib/services/verification';
import type { VerificationRequest } from '@/types';

export default function PendingApprovalPage() {
  const router = useRouter();
  const { session, profile, refreshProfile, signOut, loading: authLoading } = useRequireAuth({
    requireStudentVerified: false,
  });

  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    async function loadRequest() {
      if (!session?.user?.id) return;
      const req = await fetchUserVerificationStatus(session.user.id);
      setRequest(req);

      // If already verified, route to dashboard
      if (profile?.verification_status === 'verified') {
        router.replace('/dashboard');
      } else if (profile?.verification_status === 'rejected') {
        router.replace('/verify/rejected');
      }
    }

    loadRequest();
  }, [session, profile, router]);

  async function handleCheckStatus() {
    setChecking(true);
    try {
      await refreshProfile();
      if (!session?.user?.id) return;

      const req = await fetchUserVerificationStatus(session.user.id);
      setRequest(req);

      if (req?.status === 'verified' || profile?.verification_status === 'verified') {
        toast.success('Congratulations! Your verification has been approved.');
        router.replace('/dashboard');
      } else if (req?.status === 'rejected' || profile?.verification_status === 'rejected') {
        toast.info('Your verification request has been reviewed with feedback.');
        router.replace('/verify/rejected');
      } else {
        toast.info('Your verification is currently in the review queue. Please check back shortly.');
      }
    } catch {
      toast.error('Could not refresh status at this time.');
    } finally {
      setChecking(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#004ac6] border-t-transparent" />
      </div>
    );
  }

  const maskedStudentId = profile?.student_id_number
    ? profile.student_id_number.slice(0, 3) + '••••' + profile.student_id_number.slice(-2)
    : '••••••••';

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-12">
      <div className="text-center mb-6 space-y-1">
        <Link href="/" className="inline-block text-3xl font-black tracking-tight text-[#004ac6]">
          SkillBridge
        </Link>
        <p className="text-xs font-semibold text-gray-500">
          Campus Verification Status Center
        </p>
      </div>

      <Card className="rounded-2xl border border-amber-200 bg-white shadow-md overflow-hidden">
        {/* Top amber banner */}
        <div className="bg-amber-500 px-6 py-2.5 text-center text-xs font-bold text-white flex items-center justify-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Pending Administrator Review
        </div>

        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
              <Clock className="h-8 w-8 animate-pulse" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              Verification Under Review
            </h1>
            <p className="text-xs text-gray-600 max-w-sm mx-auto leading-relaxed">
              Your college ID credentials have been securely submitted. An authorized platform administrator is currently reviewing your documents.
            </p>
          </div>

          {/* Submission Details */}
          <div className="rounded-2xl border border-gray-100 bg-[#f9fafb] p-4 text-xs space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block pb-1 border-b border-gray-200/60">
              Submitted Credentials
            </span>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-gray-400" />
                Student Name:
              </span>
              <strong className="text-gray-900">{profile?.full_name || 'Student'}</strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-gray-400" />
                College / University:
              </span>
              <strong className="text-gray-900 text-right max-w-[200px] truncate">
                {profile?.college || request?.college_name || 'College'}
              </strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500 flex items-center gap-1.5">
                <BadgeAlert className="h-3.5 w-3.5 text-gray-400" />
                Student ID / PRN:
              </span>
              <code className="text-gray-900 bg-gray-100 px-2 py-0.5 rounded font-mono">
                {maskedStudentId}
              </code>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500">Submitted At:</span>
              <span className="text-gray-700">
                {request?.submitted_at
                  ? new Date(request.submitted_at).toLocaleDateString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : 'Recent'}
              </span>
            </div>
          </div>

          {/* Access notice */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-900 space-y-1">
            <p className="font-semibold flex items-center gap-1.5 text-blue-950">
              <Lock className="h-3.5 w-3.5" />
              Marketplace Restrictions in Effect
            </p>
            <p className="text-[11px] text-blue-800 leading-normal">
              Marketplace routes, listing creation, bookings, and escrow transactions remain strictly locked until college approval is granted by an administrator.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <Button
              onClick={handleCheckStatus}
              disabled={checking}
              className="h-11 w-full gap-2 rounded-xl bg-[#004ac6] text-xs font-bold text-white hover:bg-[#003b9e] shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
              {checking ? 'Checking Review Queue...' : 'Check Approval Status'}
            </Button>

            <Button
              variant="outline"
              onClick={() => signOut().then(() => router.push('/login'))}
              className="h-10 text-xs font-semibold text-gray-600 border-gray-200 hover:bg-gray-50"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
