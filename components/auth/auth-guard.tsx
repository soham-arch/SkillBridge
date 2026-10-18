'use client';

import { type ReactNode, useState, useEffect } from 'react';
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
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // Failsafe timer: after 1.2s, never keep the spinner stuck
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  if (loading && !timedOut) {
    if (fallback) return <>{fallback}</>;
    return (
      <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#004ac6] border-t-transparent" />
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
