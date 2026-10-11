'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isEmailVerified: boolean;
  isStudentVerified: boolean;
  isPendingVerification: boolean;
  isRejectedVerification: boolean;
  isAdmin: boolean;
  isBuyer: boolean;
  isSeller: boolean;
  canSell: boolean;
  activeRole: 'buyer' | 'seller';
  hasCompletedOnboarding: boolean;
  hasCompletedSellerOnboarding: boolean;
  switchRole: (role: 'buyer' | 'seller') => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  resendVerificationEmail: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function syncSessionCookie(session: Session | null) {
  if (typeof document === 'undefined') return;
  if (session?.access_token) {
    const maxAge = session.expires_in || 3600;
    document.cookie = `sb-access-token=${encodeURIComponent(session.access_token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    if (session.refresh_token) {
      document.cookie = `sb-refresh-token=${encodeURIComponent(session.refresh_token)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    }
  } else {
    document.cookie = 'sb-access-token=; path=/; max-age=0; SameSite=Lax';
    document.cookie = 'sb-refresh-token=; path=/; max-age=0; SameSite=Lax';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (targetUser: User): Promise<Profile | null> => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetUser.id)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as Profile);
        return data as Profile;
      }

      // If user row does not exist yet (e.g. freshly verified OAuth or direct signup),
      // create initial profile row automatically.
      const initialName =
        (targetUser.user_metadata?.full_name as string) ||
        (targetUser.user_metadata?.name as string) ||
        targetUser.email?.split('@')[0] ||
        'Student';

      const initialCollege = (targetUser.user_metadata?.college as string) || null;
      const initialStudentId = (targetUser.user_metadata?.student_id_number as string) || null;

      const { data: inserted, error: insertError } = await supabase
        .from('profiles')
        .insert({
          user_id: targetUser.id,
          email: targetUser.email,
          full_name: initialName,
          college: initialCollege,
          student_id_number: initialStudentId,
          verification_status: 'not_verified',
        })
        .select('*')
        .maybeSingle();

      if (!insertError && inserted) {
        setProfile(inserted as Profile);
        return inserted as Profile;
      }

      return null;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user);
    }
  }, [user, fetchProfile]);

  const signOut = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Error signing out from Supabase:', err);
    } finally {
      syncSessionCookie(null);
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!user?.email) {
      return { success: false, error: 'No email address associated with this account' };
    }
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        },
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resend confirmation email';
      return { success: false, error: message };
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const supabase = getSupabaseClient();
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        if (error) {
          console.warn('Supabase getSession error:', error.message);
        }

        if (mounted) {
          if (initialSession?.user) {
            setSession(initialSession);
            setUser(initialSession.user);
            syncSessionCookie(initialSession);
            await fetchProfile(initialSession.user);
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
            syncSessionCookie(null);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to initialize Supabase session:', err);
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          syncSessionCookie(null);
          setLoading(false);
        }
      }
    }

    initAuth();

    const supabase = getSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        syncSessionCookie(null);
        setLoading(false);
      } else if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);
        syncSessionCookie(currentSession);
        await fetchProfile(currentSession.user);
        setLoading(false);
      } else {
        setSession(null);
        setUser(null);
        setProfile(null);
        syncSessionCookie(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const isEmailVerified = Boolean(user?.email_confirmed_at);
  const isStudentVerified = profile?.verification_status === 'verified';
  const isPendingVerification = profile?.verification_status === 'pending';
  const isRejectedVerification = profile?.verification_status === 'rejected';
  const isAdmin = Boolean(profile?.is_admin);

  const isBuyer = profile?.capabilities?.some((c) => c === 'find' || c === 'buyer') ?? true;
  const isSeller = profile?.capabilities?.some((c) => c === 'offer' || c === 'seller') ?? false;
  const canSell = isSeller && (isStudentVerified || isAdmin);
  const activeRole = profile?.active_role || (isSeller && !isBuyer ? 'seller' : 'buyer');
  const hasCompletedOnboarding = Boolean(profile?.onboarding_completed);
  const hasCompletedSellerOnboarding = Boolean(profile?.seller_onboarding_completed);

  const switchRole = useCallback(
    async (newRole: 'buyer' | 'seller') => {
      if (!user?.id) return;
      const supabase = getSupabaseClient();
      await supabase
        .from('profiles')
        .update({ active_role: newRole, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      setProfile((prev) => (prev ? { ...prev, active_role: newRole } : null));
    },
    [user?.id]
  );

  return (
    <AuthContext.Provider
      value={{
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
        resendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
