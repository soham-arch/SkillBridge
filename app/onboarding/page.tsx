'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRequireAuth } from '@/lib/auth/use-require-auth';
import { useAuth } from '@/lib/auth/auth-context';
import { upsertProfile } from '@/lib/profiles/profiles';
import type { Capability } from '@/types';

const STEPS = ['Welcome', 'About You', 'Your Goals'];

const CAPABILITIES: { value: Capability; label: string; desc: string; emoji: string }[] = [
  {
    value: 'find',
    label: 'Find Services',
    desc: 'I want to hire students for tasks or skills.',
    emoji: '🔍',
  },
  {
    value: 'offer',
    label: 'Offer Services',
    desc: 'I want to list my skills and earn.',
    emoji: '💼',
  },
];

export default function OnboardingPage() {
  const { loading: authLoading } = useRequireAuth();
  const { session, refreshProfile } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [college, setCollege] = useState('');
  const [location, setLocation] = useState('');
  const [capabilities, setCapabilities] = useState<Capability[]>([]);

  function toggleCapability(cap: Capability) {
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  }

  async function handleFinish() {
    if (!session?.user?.id) return;
    if (capabilities.length === 0) {
      toast.error('Please select at least one option.');
      return;
    }

    setSubmitting(true);
    try {
      await upsertProfile(session.user.id, {
        full_name: fullName.trim(),
        college: college.trim() || undefined,
        location: location.trim() || undefined,
        capabilities,
      });
      await refreshProfile();
      toast.success('All set! Welcome to SkillBridge 🎉');
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#004ac6] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#fafafa] px-6 py-12">
      {/* Logo */}
      <div className="mb-8 text-center">
        <span className="text-2xl font-bold text-[#004ac6]">SkillBridge</span>
        <p className="mt-1 text-sm text-gray-500">Let's set up your profile</p>
      </div>

      {/* Step progress */}
      <div className="mb-8 flex items-center">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                i < step
                  ? 'bg-[#004ac6] text-white'
                  : i === step
                  ? 'border-2 border-[#004ac6] bg-white text-[#004ac6]'
                  : 'border-2 border-[#c3c6d7] bg-white text-gray-400'
              }`}
            >
              {i < step ? '✓' : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-2 h-0.5 w-10 transition-colors ${
                  i < step ? 'bg-[#004ac6]' : 'bg-[#c3c6d7]'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="w-full max-w-md rounded-xl border border-border bg-white p-8 shadow-sm">
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 text-5xl">👋</div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome to SkillBridge!</h1>
            <p className="mt-3 text-sm text-gray-600">
              Let's set up your profile in a few quick steps so you can start discovering and
              offering skills.
            </p>
            <Button
              onClick={() => setStep(1)}
              className="mt-8 h-[50px] w-full bg-[#004ac6] font-bold text-white hover:bg-[#003b9e]"
            >
              Get Started
            </Button>
          </div>
        )}

        {/* Step 1: Profile info */}
        {step === 1 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Tell us about yourself</h2>
              <p className="mt-1 text-sm text-gray-500">This will appear on your public profile.</p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="fullName" className="text-sm font-medium text-gray-900">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fullName"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="h-[50px] rounded-lg border-[#c3c6d7] bg-white px-4 text-base text-gray-900 placeholder:text-[#737686] focus-visible:ring-1 focus-visible:ring-[#004ac6]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="college" className="text-sm font-medium text-gray-900">
                College / University
              </Label>
              <Input
                id="college"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="e.g. MIT-WPU, Pune"
                className="h-[50px] rounded-lg border-[#c3c6d7] bg-white px-4 text-base text-gray-900 placeholder:text-[#737686] focus-visible:ring-1 focus-visible:ring-[#004ac6]"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="location" className="text-sm font-medium text-gray-900">
                Location
              </Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Pune, Maharashtra"
                className="h-[50px] rounded-lg border-[#c3c6d7] bg-white px-4 text-base text-gray-900 placeholder:text-[#737686] focus-visible:ring-1 focus-visible:ring-[#004ac6]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(0)}
                className="flex-1 border-[#c3c6d7] text-gray-700 hover:bg-gray-50"
              >
                Back
              </Button>
              <Button
                onClick={() => {
                  if (!fullName.trim()) {
                    toast.error('Full name is required.');
                    return;
                  }
                  setStep(2);
                }}
                className="flex-1 bg-[#004ac6] text-white hover:bg-[#003b9e]"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Capabilities */}
        {step === 2 && (
          <div className="flex flex-col gap-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">How will you use SkillBridge?</h2>
              <p className="mt-1 text-sm text-gray-500">
                Select all that apply — you can change this later.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {CAPABILITIES.map((cap) => {
                const selected = capabilities.includes(cap.value);
                return (
                  <button
                    key={cap.value}
                    type="button"
                    onClick={() => toggleCapability(cap.value)}
                    className={`flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-colors ${
                      selected
                        ? 'border-[#004ac6] bg-[#f0f4ff]'
                        : 'border-[#c3c6d7] bg-white hover:border-[#004ac6]/50'
                    }`}
                  >
                    <span className="text-2xl">{cap.emoji}</span>
                    <div className="flex-1">
                      <p
                        className={`text-sm font-semibold ${
                          selected ? 'text-[#004ac6]' : 'text-gray-900'
                        }`}
                      >
                        {cap.label}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">{cap.desc}</p>
                    </div>
                    {selected && (
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#004ac6] text-xs font-bold text-white">
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1 border-[#c3c6d7] text-gray-700 hover:bg-gray-50"
              >
                Back
              </Button>
              <Button
                onClick={handleFinish}
                disabled={submitting || capabilities.length === 0}
                className="flex-1 bg-[#004ac6] text-white hover:bg-[#003b9e] disabled:opacity-60"
              >
                {submitting ? 'Setting up...' : 'Finish Setup'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
