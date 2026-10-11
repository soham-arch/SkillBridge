'use client';

import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  XCircle,
  Upload,
  FileText,
  CheckCircle2,
  RefreshCw,
  LogOut,
  History,
  Lock,
  ArrowRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/auth-context';
import { useRequireAuth } from '@/lib/auth/use-require-auth';
import {
  fetchUserVerificationStatus,
  fetchVerificationAuditHistory,
  uploadStudentDocument,
  resubmitStudentVerification,
} from '@/lib/services/verification';
import type { VerificationRequest, VerificationAuditLog } from '@/types';

export default function RejectedVerificationPage() {
  const router = useRouter();
  const { session, profile, refreshProfile, signOut, loading: authLoading } = useRequireAuth({
    requireStudentVerified: false,
  });

  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [auditLogs, setAuditLogs] = useState<VerificationAuditLog[]>([]);

  // Form State
  const [fullName, setFullName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [docType, setDocType] = useState<'college_id_card' | 'student_email' | 'enrollment_cert'>('college_id_card');

  // File State
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      if (!session?.user?.id) return;
      const [req, logs] = await Promise.all([
        fetchUserVerificationStatus(session.user.id),
        fetchVerificationAuditHistory(session.user.id),
      ]);

      setRequest(req);
      setAuditLogs(logs);

      if (profile) {
        setFullName(profile.full_name || '');
        setCollegeName(profile.college || req?.college_name || '');
        setStudentIdNumber(profile.student_id_number || req?.student_id_number || '');
      }

      if (profile?.verification_status === 'verified') {
        router.replace('/dashboard');
      } else if (profile?.verification_status === 'pending') {
        router.replace('/verify/pending');
      }
    }

    loadData();
  }, [session, profile, router]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 10 * 1024 * 1024) {
      toast.error('File exceeds 10MB limit.');
      return;
    }

    setFile(selected);
    if (selected.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setFilePreview(reader.result as string);
      reader.readAsDataURL(selected);
    } else {
      setFilePreview(null);
    }
  }

  async function handleResubmit(e: FormEvent) {
    e.preventDefault();

    if (!session?.user?.id || !request?.id) {
      toast.error('Missing session or active verification record.');
      return;
    }

    if (!file) {
      toast.error('Please upload an updated/clearer college ID document.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Upload new document
      const uploadRes = await uploadStudentDocument(session.user.id, file);

      // 2. Resubmit verification while preserving audit history
      await resubmitStudentVerification({
        existingRequestId: request.id,
        userId: session.user.id,
        fullName: fullName.trim(),
        collegeName: collegeName.trim(),
        studentIdNumber: studentIdNumber.trim(),
        documentPath: uploadRes.documentPath,
        documentType: docType,
      });

      await refreshProfile();
      toast.success('Updated credentials resubmitted for admin review!');
      router.push('/verify/pending');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Resubmission failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#004ac6] border-t-transparent" />
      </div>
    );
  }

  const rejectionNotes =
    profile?.rejection_reason ||
    request?.admin_notes ||
    'Documents provided could not be validated against university records. Please ensure your student ID card photo is clear and readable.';

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 space-y-8">
      <div className="text-center space-y-1">
        <Link href="/" className="inline-block text-3xl font-black tracking-tight text-[#004ac6]">
          SkillBridge
        </Link>
        <p className="text-xs font-semibold text-gray-500">
          Student Verification Correction & Resubmission
        </p>
      </div>

      {/* Rejection Alert Card */}
      <div className="rounded-2xl border border-red-200 bg-red-50/80 p-6 shadow-sm space-y-3">
        <div className="flex items-center gap-2.5 text-red-800">
          <XCircle className="h-5 w-5 shrink-0" />
          <h2 className="text-base font-bold">Verification Decision: Action Required</h2>
        </div>
        <p className="text-xs text-red-700 leading-relaxed">
          Your previous college verification was reviewed by an administrator and requires correction before marketplace access can be enabled.
        </p>

        <div className="rounded-xl border border-red-200 bg-white p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 block mb-1">
            Reviewer Feedback & Reason
          </span>
          <p className="text-xs text-gray-900 font-medium italic">
            "{rejectionNotes}"
          </p>
        </div>
      </div>

      {/* Resubmission Form */}
      <Card className="rounded-2xl border border-border bg-white shadow-md">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-bold text-gray-900">
            Correct Your Information & Resubmit
          </CardTitle>
          <p className="text-xs text-gray-500">
            Update your student details and attach a valid, legible college ID photo or document.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fullName" className="text-xs font-semibold text-gray-700">
                  Full Legal Name
                </Label>
                <Input
                  id="fullName"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-11 rounded-xl text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="college" className="text-xs font-semibold text-gray-700">
                  College / University
                </Label>
                <Input
                  id="college"
                  required
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  className="h-11 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="studentIdNumber" className="text-xs font-semibold text-gray-700">
                Correct Student ID / PRN
              </Label>
              <Input
                id="studentIdNumber"
                required
                value={studentIdNumber}
                onChange={(e) => setStudentIdNumber(e.target.value)}
                className="h-11 rounded-xl text-xs"
              />
            </div>

            {/* Document upload */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-gray-700">
                Upload New / Replacement ID Document <span className="text-red-500">*</span>
              </Label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {!file ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-[#fbfbfd] p-6 text-center cursor-pointer hover:border-[#004ac6] hover:bg-[#f0f4ff]/40 transition-colors"
                >
                  <Upload className="h-6 w-6 text-[#004ac6] mb-2" />
                  <p className="text-xs font-bold text-gray-900">
                    Click to attach corrected document
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    JPG, PNG, WEBP, or PDF up to 10MB
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {filePreview ? (
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="h-12 w-12 rounded-lg object-cover border"
                      />
                    ) : (
                      <FileText className="h-8 w-8 text-[#004ac6]" />
                    )}
                    <div>
                      <p className="text-xs font-bold text-gray-900">{file.name}</p>
                      <p className="text-[10px] text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setFilePreview(null);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={submitting || !file}
              className="h-11 w-full gap-2 rounded-xl bg-[#004ac6] text-xs font-bold text-white hover:bg-[#003b9e] shadow-sm disabled:opacity-60"
            >
              {submitting ? 'Uploading and Resubmitting...' : 'Resubmit for Administrator Review'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Audit History Timeline */}
      {auditLogs.length > 0 && (
        <Card className="rounded-2xl border border-border bg-white shadow-sm p-6 space-y-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-gray-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Verification Audit Trail
            </h3>
          </div>
          <div className="space-y-2.5 pt-1">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between border-l-2 border-gray-200 pl-3 py-1 text-xs"
              >
                <div>
                  <span
                    className={`inline-block font-bold uppercase text-[10px] rounded px-1.5 py-0.5 ${
                      log.action === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : log.action === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : log.action === 'resubmitted'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {log.action}
                  </span>
                  {log.admin_notes && (
                    <p className="text-[11px] text-gray-600 mt-1 italic">
                      Notes: {log.admin_notes}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-gray-400">
                  {new Date(log.created_at).toLocaleString(undefined, {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="text-center">
        <button
          type="button"
          onClick={() => signOut().then(() => router.push('/login'))}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out of Account
        </button>
      </div>
    </div>
  );
}
