'use client';

import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  ArrowRight,
  GraduationCap,
  BadgeAlert,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/auth-context';
import { useRequireAuth } from '@/lib/auth/use-require-auth';
import {
  uploadStudentDocument,
  submitStudentVerification,
} from '@/lib/services/verification';

export default function VerificationSubmissionPage() {
  const router = useRouter();
  // Require authenticated + email confirmed, but NOT yet student verified
  const { session, profile, isEmailVerified, loading: authLoading } = useRequireAuth({
    requireStudentVerified: false,
  });

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [collegeName, setCollegeName] = useState(profile?.college || '');
  const [collegeEmail, setCollegeEmail] = useState('');
  const [studentIdNumber, setStudentIdNumber] = useState(profile?.student_id_number || '');
  const [docType, setDocType] = useState<'college_id_card' | 'student_email' | 'enrollment_cert'>('college_id_card');

  // File state
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB limit. Please upload a smaller file.');
      return;
    }

    setFile(selected);
    if (selected.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(selected);
    } else {
      setFilePreview(null);
    }
  }

  function handleRemoveFile() {
    setFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!session?.user?.id) {
      toast.error('Please sign in to submit verification.');
      router.push('/login');
      return;
    }

    if (!fullName.trim()) {
      toast.error('Full legal name is required.');
      return;
    }

    if (!collegeName.trim()) {
      toast.error('College/university name is required.');
      return;
    }

    if (!studentIdNumber.trim()) {
      toast.error('Student ID or enrollment number is required.');
      return;
    }

    if (!file) {
      toast.error('Please upload your college ID card or verification document.');
      return;
    }

    setSubmitting(true);
    setUploading(true);

    try {
      // 1. Upload genuine document to private storage bucket
      const uploadRes = await uploadStudentDocument(session.user.id, file);
      setUploading(false);

      // 2. Submit pending verification record
      await submitStudentVerification({
        userId: session.user.id,
        fullName: fullName.trim(),
        collegeName: collegeName.trim(),
        collegeEmail: collegeEmail.trim() || undefined,
        studentIdNumber: studentIdNumber.trim(),
        documentPath: uploadRes.documentPath,
        documentType: docType,
      });

      toast.success('College verification submitted! Awaiting administrator approval.');
      router.push('/verify/pending');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#004ac6] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      {/* Header */}
      <div className="mb-8 text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f0f4ff] px-3.5 py-1 text-xs font-bold text-[#004ac6] border border-[#004ac6]/20">
          <ShieldCheck className="h-4 w-4" />
          Step 2 of 3: College Student Verification
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Verify Your College Identity
        </h1>
        <p className="text-xs text-gray-600 max-w-md mx-auto">
          SkillBridge maintains an exclusively verified campus network. Upload your college credentials to unlock marketplace services.
        </p>
      </div>

      <Card className="rounded-2xl border border-border bg-white shadow-md">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Student Info */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                1. Student Institutional Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fullName" className="text-xs font-semibold text-gray-700">
                    Full Legal Name <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="fullName"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Alex Sharma"
                      className="h-11 rounded-xl pl-9 text-xs"
                    />
                    <User className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="college" className="text-xs font-semibold text-gray-700">
                    College / University <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="college"
                      required
                      value={collegeName}
                      onChange={(e) => setCollegeName(e.target.value)}
                      placeholder="e.g. MIT World Peace University, Pune"
                      className="h-11 rounded-xl pl-9 text-xs"
                    />
                    <GraduationCap className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="studentIdNumber" className="text-xs font-semibold text-gray-700">
                    Student ID / Enrollment Number <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="studentIdNumber"
                      required
                      value={studentIdNumber}
                      onChange={(e) => setStudentIdNumber(e.target.value)}
                      placeholder="e.g. 1032210984"
                      className="h-11 rounded-xl pl-9 text-xs"
                    />
                    <BadgeAlert className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Protected & private. Never displayed on public marketplace profile.
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="collegeEmail" className="text-xs font-semibold text-gray-700">
                    Official College Email <span className="text-gray-400">(Optional)</span>
                  </Label>
                  <Input
                    id="collegeEmail"
                    type="email"
                    value={collegeEmail}
                    onChange={(e) => setCollegeEmail(e.target.value)}
                    placeholder="student@college.edu or .ac.in"
                    className="h-11 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Document Method */}
            <div className="space-y-3 pt-2 border-t border-gray-100">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
                2. Verification Document Type
              </h2>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'college_id_card', label: 'College ID Card', desc: 'Front photo of physical student card' },
                  { id: 'enrollment_cert', label: 'Enrollment Letter', desc: 'Current term fee receipt or certificate' },
                  { id: 'student_email', label: 'Institutional Proof', desc: 'College portal screenshot or statement' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDocType(item.id as typeof docType)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      docType === item.id
                        ? 'border-[#004ac6] bg-[#f0f4ff] shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <p className={`text-xs font-bold ${docType === item.id ? 'text-[#004ac6]' : 'text-gray-900'}`}>
                      {item.label}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{item.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Document Upload */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-gray-700">
                  Upload College Proof Document <span className="text-red-500">*</span>
                </Label>
                <span className="text-[11px] text-gray-400">JPG, PNG, WEBP or PDF up to 10MB</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
                className="hidden"
                id="documentFileInput"
              />

              {!file ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-[#fbfbfd] p-8 text-center cursor-pointer hover:border-[#004ac6] hover:bg-[#f0f4ff]/40 transition-colors"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-[#004ac6] mb-3">
                    <Upload className="h-6 w-6" />
                  </div>
                  <p className="text-xs font-bold text-gray-900">
                    Click to select file or drag college ID document here
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Uploaded directly to secure, encrypted private storage.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {filePreview ? (
                      <img
                        src={filePreview}
                        alt="Document Preview"
                        className="h-16 w-16 rounded-xl object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-50 text-[#004ac6]">
                        <FileText className="h-8 w-8" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-bold text-gray-900">{file.name}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 mt-1">
                        <CheckCircle2 className="h-3 w-3" /> Ready for upload
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Privacy notice */}
            <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 text-[11px] text-gray-600 space-y-1">
              <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-[#004ac6]" />
                Student Document Privacy Guarantee
              </p>
              <p>
                Your college document is stored in a private Supabase Storage bucket with strict Row Level Security. Only you and authorized platform administrators can view this file for verification purposes. It is never exposed in public profile links or marketplace searches.
              </p>
            </div>

            <Button
              type="submit"
              disabled={submitting || !file}
              className="h-12 w-full gap-2 rounded-xl bg-[#004ac6] text-xs font-bold text-white hover:bg-[#003b9e] shadow-sm disabled:opacity-60"
            >
              {uploading
                ? 'Uploading Encrypted Document...'
                : submitting
                ? 'Submitting Verification Record...'
                : 'Submit College Verification for Admin Approval'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
