import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (code && supabaseUrl && anonKey) {
    const supabase = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      const response = NextResponse.redirect(new URL(next, request.url));
      const maxAge = data.session.expires_in || 3600;

      response.cookies.set('sb-access-token', data.session.access_token, {
        path: '/',
        maxAge,
        sameSite: 'lax',
        httpOnly: false,
      });

      if (data.session.refresh_token) {
        response.cookies.set('sb-refresh-token', data.session.refresh_token, {
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
          sameSite: 'lax',
          httpOnly: false,
        });
      }

      return response;
    }
  }

  // Fallback to client-side callback page if exchange via server query failed or for hash fragments
  return NextResponse.redirect(new URL('/auth/callback/client', request.url));
}
