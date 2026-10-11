import { NextResponse } from 'next/server';
import { verifyAdminRequest, logAdminAuditEvent, getAdminSupabaseClient } from '@/lib/auth/server-admin';
import { getMarketplaceState, saveMarketplaceState } from '@/lib/store/marketplace-store';

export async function POST(req: Request) {
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { targetUserId, action, notes } = body;

    if (!targetUserId || !action) {
      return NextResponse.json(
        { error: 'Missing required parameters: targetUserId and action.' },
        { status: 400 }
      );
    }

    const validActions = ['suspend', 'reinstate', 'grant_admin', 'revoke_admin'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action "${action}". Allowed: ${validActions.join(', ')}.` },
        { status: 400 }
      );
    }

    const actorId = auth.user!.id;
    const supabase = getAdminSupabaseClient(auth.token);

    // Safeguard 1: Prevent self-suspension
    if (action === 'suspend' && targetUserId === actorId) {
      return NextResponse.json(
        { error: 'Action rejected: Administrators cannot suspend their own active account.' },
        { status: 400 }
      );
    }

    // Safeguard 2: Admin role management
    if (action === 'grant_admin' || action === 'revoke_admin') {
      const isPromote = action === 'grant_admin';

      // Call RPC grant_or_revoke_admin for transactional safety & minimum admin checks
      const { data: rpcData, error: rpcError } = await supabase.rpc('grant_or_revoke_admin', {
        p_target_user_id: targetUserId,
        p_is_admin: isPromote,
      });

      if (rpcError) {
        // If RPC throws an error (e.g. last admin lockout check)
        return NextResponse.json(
          { error: rpcError.message },
          { status: 400 }
        );
      }

      // Update local store as well
      const state = getMarketplaceState();
      const prof = state.profiles.find((p) => p.user_id === targetUserId);
      if (prof) {
        prof.is_admin = isPromote;
        saveMarketplaceState(state);
      }

      await logAdminAuditEvent({
        actorId,
        action: isPromote ? 'grant_admin_privileges' : 'revoke_admin_privileges',
        targetType: 'profile',
        targetId: targetUserId,
        details: { action, notes: notes || null },
        req,
      });

      return NextResponse.json({
        success: true,
        action,
        targetUserId,
        is_admin: isPromote,
      });
    }

    // Handle 'suspend' or 'reinstate'
    const newStatus = action === 'suspend' ? 'rejected' : 'verified';
    const rejectionReason = action === 'suspend' ? (notes || 'Account suspended by platform administration.') : null;

    // Update in Supabase
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        verification_status: newStatus,
        rejection_reason: rejectionReason,
        verified_at: action === 'reinstate' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', targetUserId)
      .select('*')
      .maybeSingle();

    if (updateError) {
      console.warn('Database user status update error:', updateError.message);
    }

    // Update in local store
    const state = getMarketplaceState();
    const prof = state.profiles.find((p) => p.user_id === targetUserId);
    if (prof) {
      prof.verification_status = newStatus;
      prof.rejection_reason = rejectionReason ?? undefined;
      if (action === 'reinstate') prof.verified_at = new Date().toISOString();
      saveMarketplaceState(state);
    }

    // Record in immutable audit log
    await logAdminAuditEvent({
      actorId,
      action: action === 'suspend' ? 'suspend_user_account' : 'reinstate_user_account',
      targetType: 'profile',
      targetId: targetUserId,
      details: {
        action,
        notes: notes || null,
        status: newStatus,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      action,
      targetUserId,
      profile: updatedProfile || prof,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update user status';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
