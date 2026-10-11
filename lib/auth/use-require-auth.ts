'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

export interface RequireAuthOptions {
  redirectTo?: string;
  requireEmailVerified?: boolean;
  requireStudentVerified?: boolean;
  requireAdmin?: boolean;
}

export function useRequireAuth(options: RequireAuthOptions = {}) {
  const {
    redirectTo = '/login',
    requireEmailVerified = true,
    requireStudentVerified = true,
    requireAdmin = false,
  } = options;

  const {
    session,
    user,
    profile,
    loading,
    isEmailVerified,
    isStudentVerified,
    isPendingVerification,
    isRejectedVerification,
    isAdmin,
    isBuyer,
    isSeller,
    canSell,
    activeRole,
    hasCompletedOnboarding,
    hasCompletedSellerOnboarding,
    switchRole,
    refreshProfile,
    signOut,
  } = useAuth();

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // 1. Must be logged in
    if (!session || !user) {
      const returnUrl = encodeURIComponent(pathname);
      router.replace(`${redirectTo}?returnUrl=${returnUrl}`);
      return;
    }

    // 2. Must be email verified if requested
    if (requireEmailVerified && !isEmailVerified) {
      router.replace('/auth/verify-email');
      return;
    }

    // 3. Must have completed college student verification if requested
    if (requireStudentVerified && !isStudentVerified && !isAdmin) {
      if (isPendingVerification) {
        router.replace('/verify/pending');
        return;
      }
      if (isRejectedVerification) {
        router.replace('/verify/rejected');
        return;
      }
      // 'not_verified' or no verification request yet
      router.replace('/verify');
      return;
    }

    // 4. Must be an administrator if requested
    if (requireAdmin && !isAdmin) {
      router.replace('/dashboard');
      return;
    }
  }, [
    loading,
    session,
    user,
    profile,
    isEmailVerified,
    isStudentVerified,
    isPendingVerification,
    isRejectedVerification,
    isAdmin,
    pathname,
    router,
    redirectTo,
    requireEmailVerified,
    requireStudentVerified,
    requireAdmin,
  ]);

  return {
    session,
    user,
    profile,
    loading,
    isEmailVerified,
    isStudentVerified,
    isPendingVerification,
    isRejectedVerification,
    isAdmin,
    isBuyer,
    isSeller,
    canSell,
    activeRole,
    hasCompletedOnboarding,
    hasCompletedSellerOnboarding,
    switchRole,
    refreshProfile,
    signOut,
  };
}
