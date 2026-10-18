import { getSupabaseClient } from '@/lib/supabase/client';
import { VerificationRequest, VerificationAuditLog, Profile } from '@/types';
import {
  sendVerificationApprovedEmail,
  sendVerificationRejectedEmail,
} from '@/lib/services/email';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export interface DocumentUploadResult {
  documentPath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Uploads a genuine college student document to private Supabase Storage.
 * Restricts access to document owner and authorized administrators only.
 * Never accepts user-supplied URLs or stock images as proof.
 */
export async function uploadStudentDocument(
  userId: string,
  file: File
): Promise<DocumentUploadResult> {
  if (!file) {
    throw new Error('Please select a valid college ID card or document file.');
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(
      `Unsupported file type (${file.type}). Please upload a JPG, PNG, WEBP, or PDF document.`
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('File exceeds the 10MB size limit. Please upload a smaller file.');
  }

  const supabase = getSupabaseClient();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${userId}/${Date.now()}-${sanitizedName}`;

  const { data, error } = await supabase.storage
    .from('verification-documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    // Check if bucket not found
    if (error.message.toLowerCase().includes('not found') || error.message.toLowerCase().includes('bucket')) {
      throw new Error(
        'Storage bucket "verification-documents" has not been configured in Supabase yet. Please execute migration 007 in Supabase SQL editor.'
      );
    }
    throw new Error(`Document upload failed: ${error.message}`);
  }

  return {
    documentPath: data.path,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
  };
}

/**
 * Creates a signed URL for an authorized admin or owner to preview the private document.
 */
export async function createDocumentSignedUrl(documentPath: string): Promise<string> {
  if (documentPath.startsWith('http://') || documentPath.startsWith('https://')) {
    return documentPath;
  }

  try {
    const supabase = getSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (token) {
      const res = await fetch('/api/admin/verifications/signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ documentPath }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.signedUrl) return json.signedUrl;
      }
    }
  } catch {
    // Fallback to direct client call below
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from('verification-documents')
    .createSignedUrl(documentPath, 300); // 5 minutes validity

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Could not generate secure document preview URL.');
  }

  return data.signedUrl;
}

/**
 * Submits student verification request, saves student ID number privately,
 * updates profile verification status to 'pending', and logs to audit trail.
 */
export async function submitStudentVerification(params: {
  userId: string;
  fullName: string;
  collegeName: string;
  collegeEmail?: string;
  studentIdNumber: string;
  documentPath: string;
  documentType: 'college_id_card' | 'student_email' | 'enrollment_cert';
}): Promise<VerificationRequest> {
  const {
    userId,
    fullName,
    collegeName,
    collegeEmail,
    studentIdNumber,
    documentPath,
    documentType,
  } = params;

  if (!fullName.trim()) throw new Error('Full legal name is required.');
  if (!collegeName.trim()) throw new Error('College/university name is required.');
  if (!studentIdNumber.trim()) throw new Error('Student ID or enrollment number is required.');
  if (!documentPath.trim()) throw new Error('College verification document must be uploaded.');

  const supabase = getSupabaseClient();

  // 1. Insert verification request
  const { data: request, error: requestError } = await supabase
    .from('verification_requests')
    .insert({
      user_id: userId,
      full_name: fullName.trim(),
      college_name: collegeName.trim(),
      college_email: collegeEmail?.trim() || null,
      student_id_number: studentIdNumber.trim(),
      document_path: documentPath,
      document_type: documentType,
      status: 'pending',
      submitted_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (requestError) {
    if (requestError.message.toLowerCase().includes('infinite recursion')) {
      throw new Error(
        'Database RLS infinite recursion detected in profiles policy. Please execute supabase/FIX_RLS_INFINITE_RECURSION.sql in your Supabase SQL Editor to apply the fix.'
      );
    }
    throw new Error(`Failed to save verification request: ${requestError.message}`);
  }

  // 2. Update profile with pending status and student ID
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      full_name: fullName.trim(),
      college: collegeName.trim(),
      student_id_number: studentIdNumber.trim(),
      verification_status: 'pending',
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (profileError) {
    console.warn('Profile update warning:', profileError.message);
  }

  // 3. Log audit event
  try {
    await supabase.from('verification_audit_log').insert({
      request_id: request.id,
      user_id: userId,
      action: 'submitted',
      actor_id: userId,
      created_at: new Date().toISOString(),
    });
  } catch (auditErr) {
    console.warn('Audit log write warning:', auditErr);
  }

  return request as VerificationRequest;
}

/**
 * Resubmits verification for a student whose previous submission was rejected.
 * Preserves the audit history while updating request to pending.
 */
export async function resubmitStudentVerification(params: {
  existingRequestId: string;
  userId: string;
  fullName: string;
  collegeName: string;
  collegeEmail?: string;
  studentIdNumber: string;
  documentPath: string;
  documentType: 'college_id_card' | 'student_email' | 'enrollment_cert';
}): Promise<VerificationRequest> {
  const {
    existingRequestId,
    userId,
    fullName,
    collegeName,
    collegeEmail,
    studentIdNumber,
    documentPath,
    documentType,
  } = params;

  const supabase = getSupabaseClient();

  // 1. Update verification request to pending
  const { data: updatedReq, error: reqError } = await supabase
    .from('verification_requests')
    .update({
      full_name: fullName.trim(),
      college_name: collegeName.trim(),
      college_email: collegeEmail?.trim() || null,
      student_id_number: studentIdNumber.trim(),
      document_path: documentPath,
      document_type: documentType,
      status: 'pending',
      admin_notes: null,
      reviewed_at: null,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', existingRequestId)
    .select('*')
    .single();

  if (reqError) {
    if (reqError.message.toLowerCase().includes('infinite recursion')) {
      throw new Error(
        'Database RLS infinite recursion detected in profiles policy. Please execute supabase/FIX_RLS_INFINITE_RECURSION.sql in your Supabase SQL Editor to apply the fix.'
      );
    }
    throw new Error(`Resubmission failed: ${reqError.message}`);
  }

  // 2. Update profile
  await supabase
    .from('profiles')
    .update({
      full_name: fullName.trim(),
      college: collegeName.trim(),
      student_id_number: studentIdNumber.trim(),
      verification_status: 'pending',
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  // 3. Record in audit log
  try {
    await supabase.from('verification_audit_log').insert({
      request_id: existingRequestId,
      user_id: userId,
      action: 'resubmitted',
      actor_id: userId,
      created_at: new Date().toISOString(),
    });
  } catch (auditErr) {
    console.warn('Audit log insert warning:', auditErr);
  }

  return updatedReq as VerificationRequest;
}

/**
 * Fetches current verification request for a user.
 */
export async function fetchUserVerificationStatus(
  userId: string
): Promise<VerificationRequest | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('verification_requests')
    .select('*')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('Could not fetch verification status from Supabase:', error.message);
    return null;
  }

  return data as VerificationRequest | null;
}

/**
 * Fetches complete verification audit trail for an account.
 */
export async function fetchVerificationAuditHistory(
  userId: string
): Promise<VerificationAuditLog[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('verification_audit_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Could not fetch audit history:', error.message);
    return [];
  }

  return (data || []) as VerificationAuditLog[];
}

/**
 * Fetches all verification requests for the admin console.
 */
export async function fetchAllVerificationsAdmin(): Promise<VerificationRequest[]> {
  try {
    const supabase = getSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (token) {
      const res = await fetch('/api/admin/verifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.verifications) return json.verifications;
      }
    }
  } catch {
    // Fall back to direct query
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('verification_requests')
    .select(`
      *,
      user:profiles!verification_requests_user_id_fkey(
        id,
        full_name,
        avatar_url,
        email,
        college
      )
    `)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.warn('Admin fetch verifications warning:', error.message);
    return [];
  }

  return (data || []) as VerificationRequest[];
}

/**
 * Admin action: Approve or reject verification request.
 * Enforces admin authorization, updates database records, appends audit log,
 * and sends real email notifications.
 */
export async function adminReviewVerification(params: {
  requestId: string;
  approve: boolean;
  notes?: string;
  reviewerId: string;
}): Promise<{ success: boolean; emailResult?: unknown }> {
  const { requestId, approve, notes, reviewerId } = params;

  try {
    const supabase = getSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (token) {
      const res = await fetch('/api/admin/verifications/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ requestId, approve, notes }),
      });
      if (res.ok) {
        const json = await res.json();
        return { success: true, emailResult: json.emailResult };
      }
    }
  } catch {
    // Fallback to direct RPC/database logic below
  }

  const supabase = getSupabaseClient();

  // Try RPC first for transactional security
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    'review_student_verification',
    {
      p_request_id: requestId,
      p_approve: approve,
      p_notes: notes || null,
    }
  );

  let targetUserId: string | null = null;
  let collegeName = 'your college';
  let studentName = 'Student';
  let studentEmail = '';

  if (rpcError) {
    // If RPC is not loaded yet, execute manual transactional update
    const { data: req, error: getReqError } = await supabase
      .from('verification_requests')
      .select('*, user:profiles!verification_requests_user_id_fkey(*)')
      .eq('id', requestId)
      .single();

    if (getReqError || !req) {
      throw new Error(`Verification request not found: ${getReqError?.message}`);
    }

    targetUserId = req.user_id;
    collegeName = req.college_name || 'your college';
    studentName = req.full_name || 'Student';
    studentEmail = req.user?.email || req.college_email || '';

    // Update verification request
    await supabase
      .from('verification_requests')
      .update({
        status: approve ? 'verified' : 'rejected',
        admin_notes: notes || null,
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    // Update profile
    await supabase
      .from('profiles')
      .update({
        verification_status: approve ? 'verified' : 'rejected',
        verified_at: approve ? new Date().toISOString() : null,
        rejection_reason: approve ? null : notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', targetUserId);

    // Add audit log
    await supabase.from('verification_audit_log').insert({
      request_id: requestId,
      user_id: targetUserId,
      action: approve ? 'approved' : 'rejected',
      admin_notes: notes || null,
      actor_id: reviewerId,
      created_at: new Date().toISOString(),
    });
  } else {
    targetUserId = rpcData?.user_id;
    // Fetch profile details for email
    if (targetUserId) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', targetUserId)
        .single();

      if (prof) {
        studentName = prof.full_name;
        studentEmail = prof.email || '';
        collegeName = prof.college || 'your college';
      }
    }
  }

  // Send real email notification
  let emailResult = null;
  if (studentEmail) {
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
  }

  // Add in-app notification
  if (targetUserId) {
    try {
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        title: approve ? 'Student Verification Approved!' : 'Verification Review Update',
        message: approve
          ? `Congratulations! Your verification for ${collegeName} has been approved. You now have full marketplace access.`
          : `Your student verification was reviewed: ${notes || 'Document could not be validated. Please resubmit.'}`,
        type: 'verification_status',
        read: false,
        link: approve ? '/dashboard' : '/verify/rejected',
        created_at: new Date().toISOString(),
      });
    } catch (notifErr) {
      console.warn('In-app notification write warning:', notifErr);
    }
  }

  return { success: true, emailResult };
}
