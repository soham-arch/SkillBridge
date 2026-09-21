'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

export function useRequireAuth(redirectTo = '/login') {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      router.replace(redirectTo);
    }
  }, [loading, session, router, redirectTo]);

  return { session, loading };
}
