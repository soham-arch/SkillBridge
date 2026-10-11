'use client';

import { getSupabaseClient } from '@/lib/supabase/client';

export interface OAuthInitiateResult {
  ok: boolean;
  requiresConfig?: boolean;
  error?: string;
  projectRef?: string;
  callbackUrl?: string;
  dashboardUrl?: string;
}

/**
 * Extracts the Supabase project reference from the public URL.
 */
export function getSupabaseProjectDetails() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  let projectRef = 'eldmwjkolqqdhfqcawvg';
  try {
    const url = new URL(supabaseUrl);
    const hostParts = url.hostname.split('.');
    if (hostParts.length > 0 && hostParts[0]) {
      projectRef = hostParts[0];
    }
  } catch {
    // fallback to default
  }

  return {
    projectRef,
    dashboardUrl: `https://supabase.com/dashboard/project/${projectRef}/auth/providers`,
    callbackUrl: `https://${projectRef}.supabase.co/auth/v1/callback`,
  };
}

/**
 * Initiates Google OAuth with a preflight validation check.
 * Prevents the browser from blindly navigating to an unconfigured Supabase OAuth URL,
 * which would otherwise display a raw JSON 'Unsupported provider: provider is not enabled' error.
 */
export async function initiateGoogleOAuth(): Promise<OAuthInitiateResult> {
  const details = getSupabaseProjectDetails();
  const supabase = getSupabaseClient();
  const redirectUri = typeof window !== 'undefined'
    ? `${window.location.origin}/auth/callback`
    : undefined;

  try {
    // 1. Request OAuth authorization URL with skipBrowserRedirect to inspect viability
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      return {
        ok: false,
        error: error.message,
        ...details,
      };
    }

    if (!data?.url) {
      return {
        ok: false,
        error: 'No authorization URL returned from Supabase.',
        ...details,
      };
    }

    // 2. Preflight the authorization URL to verify that Google is enabled in Supabase GoTrue
    try {
      const preflight = await fetch(data.url, { method: 'GET', redirect: 'manual' });
      if (preflight.status === 400) {
        const body = await preflight.json().catch(() => null);
        if (
          body?.msg?.includes('provider is not enabled') ||
          body?.error_code === 'validation_failed'
        ) {
          return {
            ok: false,
            requiresConfig: true,
            error: 'Google OAuth provider is not enabled in your Supabase project.',
            ...details,
          };
        }
      }
    } catch {
      // If client preflight is blocked by network or CORS, continue to standard redirect
    }

    // 3. Provider is enabled! Navigate safely to Google consent screen
    if (typeof window !== 'undefined') {
      window.location.href = data.url;
    }

    return { ok: true, ...details };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Google OAuth initialization failed';
    return {
      ok: false,
      error: msg,
      ...details,
    };
  }
}
