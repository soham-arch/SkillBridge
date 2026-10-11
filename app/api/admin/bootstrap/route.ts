import { NextResponse } from 'next/server';
import { getAdminSupabaseClient, logAdminAuditEvent } from '@/lib/auth/server-admin';
import { getMarketplaceState, saveMarketplaceState } from '@/lib/store/marketplace-store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { targetEmail, targetUserId, bootstrapSecret } = body;

    if (!targetEmail && !targetUserId) {
      return NextResponse.json(
        { error: 'Target user email or user_id must be provided.' },
        { status: 400 }
      );
    }

    const envSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
    const providedSecret = bootstrapSecret || req.headers.get('x-admin-bootstrap-secret');

    const supabase = getAdminSupabaseClient();

    // Check count of existing active administrators
    let existingAdminCount = 0;
    try {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_admin', true);

      existingAdminCount = count || 0;
    } catch {
      // Local store check
      const state = getMarketplaceState();
      existingAdminCount = state.profiles.filter((p) => p.is_admin).length;
    }

    // Security Gate:
    // If existing administrators exist, requiring explicit matching ADMIN_BOOTSTRAP_SECRET.
    // If no administrators exist (initial bootstrap), allow if valid bootstrap token provided.
    if (existingAdminCount > 0) {
      if (!envSecret || providedSecret !== envSecret) {
        return NextResponse.json(
          {
            error:
              'Forbidden: Platform already has active administrators. Role modifications must be performed by an existing administrator or with the verified ADMIN_BOOTSTRAP_SECRET.',
          },
          { status: 403 }
        );
      }
    } else {
      // Even if 0 admins exist, require secret if configured in env
      if (envSecret && providedSecret !== envSecret) {
        return NextResponse.json(
          { error: 'Unauthorized: Invalid bootstrap secret.' },
          { status: 401 }
        );
      }
    }

    // Locate the profile
    let query = supabase.from('profiles').select('*');
    if (targetUserId) {
      query = query.eq('user_id', targetUserId);
    } else {
      query = query.eq('email', targetEmail.toLowerCase().trim());
    }

    const { data: profile, error: findError } = await query.maybeSingle();

    let targetId = targetUserId;
    if (profile) {
      targetId = profile.user_id;

      // Update in Supabase
      await supabase
        .from('profiles')
        .update({
          is_admin: true,
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', profile.user_id);
    }

    // Also update in local marketplace store
    const state = getMarketplaceState();
    const prof = state.profiles.find(
      (p) => p.user_id === targetUserId || (targetEmail && p.email?.toLowerCase() === targetEmail.toLowerCase())
    );
    if (prof) {
      prof.is_admin = true;
      prof.verification_status = 'verified';
      prof.verified_at = new Date().toISOString();
      targetId = prof.user_id;
      saveMarketplaceState(state);
    }

    if (!profile && !prof) {
      return NextResponse.json(
        {
          error: `User not found with ${targetEmail ? `email "${targetEmail}"` : `user_id "${targetUserId}"`}. Please have the user sign up first before bootstrapping as administrator.`,
        },
        { status: 404 }
      );
    }

    // Record audit event
    await logAdminAuditEvent({
      actorId: targetId || '00000000-0000-0000-0000-000000000000',
      action: 'bootstrap_initial_admin',
      targetType: 'profile',
      targetId: targetId || 'initial-admin',
      details: {
        targetEmail: targetEmail || profile?.email || prof?.email,
        method: existingAdminCount === 0 ? 'initial_zero_admin_bootstrap' : 'secret_authenticated_bootstrap',
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: `User ${targetEmail || targetUserId} has been established as Platform Administrator.`,
      targetUserId: targetId,
      is_admin: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bootstrap operation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
