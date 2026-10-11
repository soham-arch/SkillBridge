'use client';

import { type ReactNode } from 'react';
import { useRequireAuth, type RequireAuthOptions } from '@/lib/auth/use-require-auth';

interface AuthGuardProps extends RequireAuthOptions {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthGuard({
  children,
  fallback,
  ...options
}: AuthGuardProps) {
  const { loading, session, isEmailVerified, isStudentVerified, isAdmin } = useRequireAuth(options);

  if (loading) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-3">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#004ac6] border-t-transparent" />
        <p className="text-xs font-semibold text-gray-500">Checking authorization...</p>
      </div>
    );
  }

  if (!session) return null;
  if (options.requireEmailVerified !== false && !isEmailVerified) return null;
  if (options.requireStudentVerified !== false && !isStudentVerified && !isAdmin) return null;
  if (options.requireAdmin && !isAdmin) return null;

  return <>{children}</>;
}
