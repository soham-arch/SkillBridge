'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getMarketplaceState } from '@/lib/store/marketplace-store';
import type { Profile } from '@/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  loginAsDemoUser: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const LOCAL_USER_KEY = 'skillbridge_active_user_id';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    // Check local store first (resilient fallback)
    const state = getMarketplaceState();
    const localProf = state.profiles.find((p) => p.user_id === userId || p.id === userId);
    if (localProf) {
      setProfile(localProf);
    }

    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as Profile);
      }
    } catch {
      // Offline fallback: keep localProf
    }
  }, []);

  const loginAsDemoUser = useCallback(async (userId: string) => {
    setLoading(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_USER_KEY, userId);
    }

    const state = getMarketplaceState();
    const target = state.profiles.find((p) => p.user_id === userId || p.id === userId);

    if (target) {
      const mockUser: User = {
        id: target.user_id,
        app_metadata: {},
        user_metadata: { full_name: target.full_name },
        aud: 'authenticated',
        created_at: target.created_at,
        email: target.email ?? `${target.full_name.toLowerCase().replace(' ', '.')}@example.com`,
      };

      const mockSession: Session = {
        access_token: 'mock-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh',
        user: mockUser,
      };

      setSession(mockSession);
      setProfile(target);
    }
    setLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
      await loadProfile(session.user.id);
    }
  }, [session, loadProfile]);

  useEffect(() => {
    let mounted = true;

    // 1. Check local storage for active demo user
    const storedUserId = typeof window !== 'undefined' ? localStorage.getItem(LOCAL_USER_KEY) : null;
    const initialUserId = storedUserId || '10000000-0000-0000-0000-000000000001'; // Alex Sharma by default

    // Attempt Supabase
    try {
      const supabase = getSupabaseClient();
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        if (!mounted) return;
        if (s?.user?.id) {
          setSession(s);
          loadProfile(s.user.id).finally(() => setLoading(false));
        } else {
          loginAsDemoUser(initialUserId).finally(() => setLoading(false));
        }
      }).catch(() => {
        if (!mounted) return;
        loginAsDemoUser(initialUserId).finally(() => setLoading(false));
      });
    } catch {
      if (mounted) {
        loginAsDemoUser(initialUserId).finally(() => setLoading(false));
      }
    }

    return () => {
      mounted = false;
    };
  }, [loadProfile, loginAsDemoUser]);

  const signOut = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_USER_KEY);
    }
    setSession(null);
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        refreshProfile,
        signOut,
        loginAsDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
