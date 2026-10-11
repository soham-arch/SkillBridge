'use client';

import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { ShieldCheck, Upload, CheckCircle2, X, FileText, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  uploadStudentDocument,
  submitStudentVerification,
} from '@/lib/services/verification';

interface VerificationModalProps {
  userId: string;
  currentCollege?: string | null;
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export function VerificationModal({
  userId,
  currentCollege,
  open,
  onClose,
  onSubmitted,
}: VerificationModalProps) {
  const [fullName, setFullName] = useState('');
  const [collegeName, setCollegeName] = useState(currentCollege ?? '');
  const [collegeEmail, setCollegeEmail] = useState('');
  const [studentIdNumber, setStudentIdNumber] = useState('');
  const [docType, setDocType] = useState<'college_id_card' | 'student_email' | 'enrollment_cert'>('college_id_card');

  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 10 * 1024 * 1024) {
      toast.error('File size exceeds 10MB.');
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!collegeName.trim()) {
      toast.error('College name is required.');
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
    try {
      // 1. Upload genuine document to private storage bucket
      const uploadRes = await uploadStudentDocument(userId, file);

      // 2. Submit verification request
      await submitStudentVerification({
        userId,
        fullName: fullName.trim() || 'Student',
        collegeName: collegeName.trim(),
        collegeEmail: collegeEmail.trim() || undefined,
        studentIdNumber: studentIdNumber.trim(),
        documentPath: uploadRes.documentPath,
        documentType: docType,
      });

      setSubmitted(true);
      toast.success('Verification request submitted for admin review!');
      onSubmitted?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Verification Under Review</h3>
            <p className="text-xs text-gray-600 max-w-sm mx-auto leading-relaxed">
              Your college verification document has been securely submitted. An administrator will review your credentials within 24 hours.
            </p>
            <Button
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="mt-4 bg-[#004ac6] text-white hover:bg-[#003b9e] text-xs font-bold"
            >
              Done
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Get Verified as a Student</h2>
                <p className="text-xs text-gray-500">
                  Build campus trust with an official Verified Student badge.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="modalFullName" className="text-xs font-semibold text-gray-700">
                    Full Legal Name
                  </Label>
                  <Input
                    id="modalFullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Sharma"
                    className="mt-1 h-9 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="modalCollege" className="text-xs font-semibold text-gray-700">
                    College / University <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="modalCollege"
                    required
                    value={collegeName}
                    onChange={(e) => setCollegeName(e.target.value)}
                    placeholder="e.g. MIT-WPU, Pune"
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="modalStudentId" className="text-xs font-semibold text-gray-700">
                  Student ID / PRN Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="modalStudentId"
                  required
                  value={studentIdNumber}
                  onChange={(e) => setStudentIdNumber(e.target.value)}
                  placeholder="e.g. 1032210984"
                  className="mt-1 h-9 text-xs"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Private & encrypted. Never displayed publicly on profile links.
                </p>
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">
                  Upload College ID Document <span className="text-red-500">*</span>
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
                    className="mt-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/60 p-5 text-center cursor-pointer hover:border-[#004ac6] hover:bg-[#f0f4ff]/50 transition-colors"
                  >
                    <Upload className="h-6 w-6 text-gray-400 mb-1" />
                    <p className="text-xs font-semibold text-gray-700">
                      Click to choose student ID file
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      JPG, PNG, WEBP, or PDF up to 10MB
                    </p>
                  </div>
                ) : (
                  <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50 p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-[#004ac6]" />
                      <div>
                        <p className="text-xs font-bold text-gray-900">{file.name}</p>
                        <p className="text-[10px] text-gray-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-gray-50 p-2.5 text-[10px] text-gray-500 flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-gray-400 shrink-0" />
                Uploaded to private Supabase Storage. Viewable only by authorized administrators.
              </div>

              <div className="pt-2 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 border-gray-200 text-gray-700 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !file}
                  className="flex-1 bg-[#004ac6] text-white hover:bg-[#003b9e] text-xs font-bold disabled:opacity-60"
                >
                  {submitting ? 'Uploading...' : 'Submit Verification'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
