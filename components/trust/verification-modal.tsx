'use client';

import { useState, type FormEvent } from 'react';
import { ShieldCheck, Upload, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { requestStudentVerification } from '@/lib/services/verification';

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
  const [collegeName, setCollegeName] = useState(currentCollege ?? '');
  const [collegeEmail, setCollegeEmail] = useState('');
  const [docType, setDocType] = useState<'college_id_card' | 'student_email'>('student_email');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!collegeName.trim()) {
      toast.error('College name is required.');
      return;
    }

    setSubmitting(true);
    try {
      await requestStudentVerification({
        userId,
        collegeName: collegeName.trim(),
        collegeEmail: collegeEmail.trim() || undefined,
        documentType: docType,
        documentUrl: docType === 'college_id_card' ? 'https://images.unsplash.com/photo-1578852612716-854e527abf50?w=600' : undefined,
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
            <p className="text-sm text-gray-600 max-w-sm mx-auto">
              Your college verification documents have been submitted. An administrator will review your credentials within 24 hours.
            </p>
            <Button
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="mt-4 bg-[#004ac6] text-white hover:bg-[#003b9e]"
            >
              Done
            </Button>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Get Verified as a Student</h2>
                <p className="text-xs text-gray-500">
                  Build trust with buyers & sellers with an official Verified Student badge.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="college" className="text-xs font-semibold text-gray-700">
                  College / University <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="college"
                  required
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  placeholder="e.g. MIT World Peace University, Pune"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-700">Verification Method</Label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDocType('student_email')}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      docType === 'student_email'
                        ? 'border-[#004ac6] bg-[#f0f4ff]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-xs font-bold text-gray-900">College Email</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Instant domain check (.edu / .ac.in)</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocType('college_id_card')}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      docType === 'college_id_card'
                        ? 'border-[#004ac6] bg-[#f0f4ff]'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-xs font-bold text-gray-900">Student ID Card</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Upload college ID photo</p>
                  </button>
                </div>
              </div>

              {docType === 'student_email' ? (
                <div>
                  <Label htmlFor="email" className="text-xs font-semibold text-gray-700">
                    Official College Email (.edu / .ac.in)
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={collegeEmail}
                    onChange={(e) => setCollegeEmail(e.target.value)}
                    placeholder="alex.sharma@mitwpu.edu.in"
                    className="mt-1"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    We will send a confirmation verification token.
                  </p>
                </div>
              ) : (
                <div>
                  <Label className="text-xs font-semibold text-gray-700">Upload Student ID Card</Label>
                  <div className="mt-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <p className="text-xs font-medium text-gray-700">Click to attach photo or drag here</p>
                    <p className="text-[10px] text-gray-400 mt-1">JPG, PNG or PDF up to 5MB (Sample attached automatically in test mode)</p>
                  </div>
                </div>
              )}

              <div className="pt-3 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 border-gray-200 text-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#004ac6] text-white hover:bg-[#003b9e]"
                >
                  {submitting ? 'Submitting...' : 'Submit Verification'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
