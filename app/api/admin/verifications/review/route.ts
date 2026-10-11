import { NextResponse } from 'next/server';
import { verifyAdminRequest, logAdminAuditEvent, getAdminSupabaseClient } from '@/lib/auth/server-admin';
import { getMarketplaceState, reviewVerification, saveMarketplaceState } from '@/lib/store/marketplace-store';
import {
  sendVerificationApprovedEmail,
  sendVerificationRejectedEmail,
} from '@/lib/services/email';

export async function POST(req: Request) {
  const auth = await verifyAdminRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { requestId, approve, notes } = body;

    if (!requestId || typeof approve !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required parameters: requestId and approve (boolean).' },
        { status: 400 }
      );
    }

    const reviewerId = auth.user!.id;
    const reviewerName = auth.profile?.full_name || 'Administrator';
    const supabase = getAdminSupabaseClient(auth.token);

    let targetUserId: string | null = null;
    let studentEmail = '';
    let studentName = 'Student';
    let collegeName = 'your college';

    // 1. Try Supabase review RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'review_student_verification',
      {
        p_request_id: requestId,
        p_approve: approve,
        p_notes: notes || null,
      }
    );

    if (!rpcError && rpcData?.user_id) {
      targetUserId = rpcData.user_id;
    } else {
      // Direct transactional database update
      const { data: reqData } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

      if (reqData) {
        targetUserId = reqData.user_id;
        collegeName = reqData.college_name || collegeName;
        studentName = reqData.full_name || studentName;
        studentEmail = reqData.college_email || '';

        await supabase
          .from('verification_requests')
          .update({
            status: approve ? 'verified' : 'rejected',
            admin_notes: notes || null,
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
          })
          .eq('id', requestId);

        await supabase
          .from('profiles')
          .update({
            verification_status: approve ? 'verified' : 'rejected',
            verified_at: approve ? new Date().toISOString() : null,
            rejection_reason: approve ? null : notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', targetUserId);
      }
    }

    // Also update in-memory store for consistency
    try {
      reviewVerification(requestId, approve, notes);
    } catch {
      // Store update fallback
    }

    // Fetch user details for notification if not yet known
    if (targetUserId && !studentEmail) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (prof) {
        studentEmail = prof.email || '';
        studentName = prof.full_name || studentName;
        collegeName = prof.college || collegeName;
      }
    }

    // 2. Write to immutable platform admin audit log
    await logAdminAuditEvent({
      actorId: reviewerId,
      action: approve ? 'verify_student_approved' : 'verify_student_rejected',
      targetType: 'verification_request',
      targetId: requestId,
      details: {
        targetUserId,
        approve,
        notes: notes || null,
        reviewerName,
      },
      req,
    });

    // 3. Send email notification
    let emailResult = null;
    if (studentEmail) {
      try {
        if (approve) {
          emailResult = await sendVerificationApprovedEmail({
            to: studentEmail,
            studentName,
            collegeName,
          });
        } else {
          emailResult = await sendVerificationRejectedEmail({
            to: studentEmail,
            studentName,
            collegeName,
            reason: notes || 'Your verification document could not be validated.',
          });
        }
      } catch (emailErr) {
        console.warn('Email dispatch warning:', emailErr);
      }
    }

    // 4. Send In-App Notification
    if (targetUserId) {
      try {
        await supabase.from('notifications').insert({
          user_id: targetUserId,
          title: approve ? 'Student Verification Approved! 🎓' : 'Verification Review Update ⚠️',
          message: approve
            ? `Congratulations! Your verification for ${collegeName} has been approved. You now have full marketplace access.`
            : `Your student verification was reviewed: ${notes || 'Document could not be validated. Please resubmit.'}`,
          type: 'verification_status',
          read: false,
          link: approve ? '/dashboard' : '/verify',
          dedup_key: `verification-${requestId}-${approve ? 'approved' : 'rejected'}`,
          created_at: new Date().toISOString(),
        });
      } catch (notifErr) {
        console.warn('In-app notification write warning:', notifErr);
      }
    }

    return NextResponse.json({
      success: true,
      requestId,
      status: approve ? 'verified' : 'rejected',
      emailResult,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process verification review';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
