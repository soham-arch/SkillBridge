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
import { getMarketplaceState, saveMarketplaceState } from '@/lib/store/marketplace-store';
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
  signInDemo: (emailOrRole: string) => Promise<{ success: boolean; profile: Profile }>;
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

function getCachedProfile(userId: string): Profile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`sb_profile_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignore JSON errors
  }
  return null;
}

function setCachedProfile(userId: string, profile: Profile) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`sb_profile_${userId}`, JSON.stringify(profile));
  } catch {
    // Ignore storage quota
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const signInDemo = useCallback(async (emailOrRole: string) => {
    const clean = emailOrRole.toLowerCase().trim();
    const state = getMarketplaceState();

    let targetProfile = state.profiles.find(
      (p) => p.email?.toLowerCase() === clean || (clean === 'admin' && p.is_admin)
    );

    if (!targetProfile) {
      if (clean.includes('admin') || clean === 'admin') {
        targetProfile = {
          id: '00000000-0000-0000-0000-000000000001',
          user_id: '00000000-0000-0000-0000-000000000001',
          email: 'admin@skillbridge.edu',
          full_name: 'Platform Administrator',
          avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&auto=format&fit=crop&q=80',
          college: 'SkillBridge Campus Governance',
          student_id_number: 'ADMIN-2024-001',
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
          bio: 'Platform governance, trust & safety officer.',
          location: 'Pune',
          skills: ['Governance', 'Safety', 'Moderation'],
          capabilities: ['find', 'offer'],
          is_admin: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Profile;
      } else {
        targetProfile = {
          id: '10000000-0000-0000-0000-000000000001',
          user_id: '10000000-0000-0000-0000-000000000001',
          email: clean || 'alex.tech@example.com',
          full_name: 'Alex Sharma',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
          college: 'MIT World Peace University',
          student_id_number: 'MITWPU-2023-CS-042',
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
          bio: 'Full stack web developer and student seller.',
          location: 'Pune',
          skills: ['Next.js', 'React', 'Node.js'],
          capabilities: ['find', 'offer'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Profile;
      }
    }

    const demoUser: User = {
      id: targetProfile.user_id,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: {
        full_name: targetProfile.full_name,
        is_admin: targetProfile.is_admin,
      },
      aud: 'authenticated',
      confirmation_sent_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
      email_confirmed_at: new Date().toISOString(),
      created_at: targetProfile.created_at || new Date().toISOString(),
      email: targetProfile.email || undefined,
      phone: '',
      role: 'authenticated',
      updated_at: new Date().toISOString(),
    };

    const demoSession: Session = {
      access_token: 'demo-token-' + targetProfile.user_id,
      token_type: 'bearer',
      expires_in: 86400 * 30,
      refresh_token: 'demo-refresh-' + targetProfile.user_id,
      user: demoUser,
    };

    setSession(demoSession);
    setUser(demoUser);
    setProfile(targetProfile);
    syncSessionCookie(demoSession);
    setCachedProfile(targetProfile.user_id, targetProfile);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sb_demo_session', JSON.stringify(demoSession));
      localStorage.setItem('sb_demo_profile', JSON.stringify(targetProfile));
    }
    setLoading(false);

    return { success: true, profile: targetProfile };
  }, []);

  const fetchProfile = useCallback(async (targetUser: User): Promise<Profile | null> => {
    // 1. Immediately hydrate from local cache if present
    const cached = getCachedProfile(targetUser.id);
    if (cached) {
      setProfile(cached);
    }

    // 2. Fetch from Supabase with 2-second timeout to prevent stalling
    try {
      const supabase = getSupabaseClient();
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetUser.id)
        .maybeSingle();

      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('Profile query timeout') }), 2000)
      );

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]);

      if (!error && data) {
        const found = data as Profile;
        setProfile(found);
        setCachedProfile(targetUser.id, found);
        return found;
      }

      // If user row does not exist yet, check local marketplace store
      const state = getMarketplaceState();
      const storeProfile = state.profiles.find(
        (p) => p.user_id === targetUser.id || p.email?.toLowerCase() === targetUser.email?.toLowerCase()
      );
      if (storeProfile) {
        setProfile(storeProfile);
        setCachedProfile(targetUser.id, storeProfile);
        return storeProfile;
      }

      // Synthesize fallback profile from user metadata so student is never stuck
      const initialName =
        (targetUser.user_metadata?.full_name as string) ||
        (targetUser.user_metadata?.name as string) ||
        targetUser.email?.split('@')[0] ||
        'Student';

      const initialCollege = (targetUser.user_metadata?.college as string) || 'MIT World Peace University';
      const initialStudentId = (targetUser.user_metadata?.student_id_number as string) || null;

      const fallbackProfile: Profile = {
        id: targetUser.id,
        user_id: targetUser.id,
        email: targetUser.email || '',
        full_name: initialName,
        avatar_url: null,
        bio: 'Campus student',
        location: 'Pune',
        college: initialCollege,
        student_id_number: initialStudentId,
        verification_status: 'verified',
        capabilities: ['find', 'offer'],
        onboarding_completed: true,
        seller_onboarding_completed: true,
        is_admin: Boolean(targetUser.user_metadata?.is_admin),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setProfile(fallbackProfile);
      setCachedProfile(targetUser.id, fallbackProfile);

      // Attempt background insert without blocking UI
      (async () => {
        try {
          const { data: ins } = await supabase
            .from('profiles')
            .insert({
              user_id: targetUser.id,
              email: targetUser.email,
              full_name: initialName,
              college: initialCollege,
              student_id_number: initialStudentId,
              verification_status: 'verified',
            })
            .select('*')
            .maybeSingle();

          if (ins) {
            setProfile(ins as Profile);
            setCachedProfile(targetUser.id, ins as Profile);
          }
        } catch {
          // Non-blocking fallback
        }
      })();

      return fallbackProfile;
    } catch (err) {
      console.warn('Error fetching profile, using fallback:', err);
      if (cached) return cached;
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
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sb_demo_session');
        localStorage.removeItem('sb_demo_profile');
        if (user?.id) localStorage.removeItem(`sb_profile_${user.id}`);
      }
      syncSessionCookie(null);
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  }, [user]);

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

    // Safety timeout to guarantee loading NEVER hangs more than 1.5s
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 1500);

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
            const cached = getCachedProfile(initialSession.user.id);
            if (cached) setProfile(cached);
            setLoading(false);
            fetchProfile(initialSession.user);
          } else {
            // Check if active demo session is stored
            if (typeof window !== 'undefined') {
              const demoRaw = localStorage.getItem('sb_demo_session');
              const demoProfRaw = localStorage.getItem('sb_demo_profile');
              if (demoRaw && demoProfRaw) {
                try {
                  const demoS = JSON.parse(demoRaw);
                  const demoP = JSON.parse(demoProfRaw);
                  setSession(demoS);
                  setUser(demoS.user);
                  setProfile(demoP);
                  syncSessionCookie(demoS);
                  setLoading(false);
                  return;
                } catch {
                  // Fall through
                }
              }
            }
            setSession(null);
            setUser(null);
            setProfile(null);
            syncSessionCookie(null);
            setLoading(false);
          }
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
        if (typeof window !== 'undefined') {
          localStorage.removeItem('sb_demo_session');
          localStorage.removeItem('sb_demo_profile');
        }
        setSession(null);
        setUser(null);
        setProfile(null);
        syncSessionCookie(null);
        setLoading(false);
      } else if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);
        syncSessionCookie(currentSession);
        const cached = getCachedProfile(currentSession.user.id);
        if (cached) setProfile(cached);
        setLoading(false);
        fetchProfile(currentSession.user);
      } else {
        if (typeof window !== 'undefined' && localStorage.getItem('sb_demo_session')) {
          return; // preserve active demo session
        }
        setSession(null);
        setUser(null);
        setProfile(null);
        syncSessionCookie(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const isEmailVerified = Boolean(
    user?.email_confirmed_at ||
    user?.confirmed_at ||
    user?.app_metadata?.provider === 'google' ||
    profile?.is_admin ||
    profile?.verification_status === 'verified' ||
    Boolean(user)
  );
  const isStudentVerified = profile?.verification_status === 'verified' || Boolean(profile?.is_admin);
  const isPendingVerification = profile?.verification_status === 'pending';
  const isRejectedVerification = profile?.verification_status === 'rejected';
  const isAdmin = Boolean(profile?.is_admin);

  const isBuyer = profile?.capabilities?.some((c) => c === 'find' || c === 'buyer') ?? true;
  const isSeller = profile?.capabilities?.some((c) => c === 'offer' || c === 'seller') ?? false;
  const canSell = isSeller && (isStudentVerified || isAdmin);
  const activeRole = profile?.active_role || (isSeller && !isBuyer ? 'seller' : 'buyer');
  const hasCompletedOnboarding = Boolean(profile?.onboarding_completed ?? true);
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
        signInDemo,
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
