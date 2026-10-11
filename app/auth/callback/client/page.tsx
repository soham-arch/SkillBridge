'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';

export default function AuthCallbackClientPage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setErrorMsg(error.message);
          return;
        }

        if (data.session?.user) {
          await refreshProfile();
          // Check profile status
          const { data: profile } = await supabase
            .from('profiles')
            .select('verification_status, onboarding_completed, active_role')
            .eq('user_id', data.session.user.id)
            .maybeSingle();

          if (profile?.verification_status === 'verified') {
            if (!profile.onboarding_completed) {
              router.replace('/onboarding');
            } else {
              router.replace(`/dashboard?mode=${profile.active_role || 'buyer'}`);
            }
          } else if (profile?.verification_status === 'pending') {
            router.replace('/verify/pending');
          } else if (profile?.verification_status === 'rejected') {
            router.replace('/verify/rejected');
          } else {
            router.replace('/verify');
          }
        } else {
          router.replace('/login');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Authentication callback failed';
        setErrorMsg(msg);
      }
    }

    handleCallback();
  }, [router, refreshProfile]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fafafa] px-6 text-center">
      {errorMsg ? (
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-red-600">Authentication Error</h2>
          <p className="mt-2 text-xs text-gray-600">{errorMsg}</p>
          <button
            onClick={() => router.push('/login')}
            className="mt-4 rounded-xl bg-[#004ac6] px-4 py-2 text-xs font-bold text-white hover:bg-[#003b9e]"
          >
            Back to Sign In
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#004ac6] border-t-transparent" />
          <h2 className="text-base font-bold text-gray-900">Completing Secure Sign In...</h2>
          <p className="text-xs text-gray-500">Verifying session credentials and profile details.</p>
        </div>
      )}
    </div>
  );
}
