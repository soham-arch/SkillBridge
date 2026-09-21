'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRequireAuth } from '@/lib/auth/use-require-auth';
import { useAuth } from '@/lib/auth/auth-context';
import { upsertProfile } from '@/lib/profiles/profiles';
import type { Capability } from '@/types';

const CAPABILITIES: { value: Capability; label: string; desc: string }[] = [
  { value: 'find', label: 'Find Services', desc: 'I want to hire students for tasks or skills.' },
  { value: 'offer', label: 'Offer Services', desc: 'I want to list my skills and earn.' },
];

export default function ProfilePage() {
  const { loading: authLoading } = useRequireAuth();
  const { session, profile, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [college, setCollege] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [saving, setSaving] = useState(false);

  // Seed form from existing profile once loaded
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setCollege(profile.college ?? '');
      setBio(profile.bio ?? '');
      setLocation(profile.location ?? '');
      setAvatarUrl(profile.avatar_url ?? '');
      setCapabilities(profile.capabilities ?? []);
    }
  }, [profile]);

  function toggleCapability(cap: Capability) {
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session?.user?.id) return;
    if (!fullName.trim()) {
      toast.error('Full name is required.');
      return;
    }

    setSaving(true);
    try {
      await upsertProfile(session.user.id, {
        full_name: fullName.trim(),
        college: college.trim() || undefined,
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
        capabilities,
      });
      await refreshProfile();
      toast.success('Profile updated!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile.';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#004ac6] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
        <p className="mt-2 text-gray-600">Manage your personal information and preferences.</p>
      </div>

      {/* Main form card */}
      <div className="rounded-xl border border-border bg-white p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Full name */}
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

          {/* College */}
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

          {/* Bio */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="bio" className="text-sm font-medium text-gray-900">
              Bio
            </Label>
            <Textarea
              id="bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others a bit about yourself..."
              className="resize-none rounded-lg border-[#c3c6d7] bg-white px-4 py-3 text-base text-gray-900 placeholder:text-[#737686] focus-visible:ring-1 focus-visible:ring-[#004ac6]"
            />
          </div>

          {/* Location + Avatar URL */}
          <div className="grid grid-cols-2 gap-4">
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="avatarUrl" className="text-sm font-medium text-gray-900">
                Avatar URL
              </Label>
              <Input
                id="avatarUrl"
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
                className="h-[50px] rounded-lg border-[#c3c6d7] bg-white px-4 text-base text-gray-900 placeholder:text-[#737686] focus-visible:ring-1 focus-visible:ring-[#004ac6]"
              />
            </div>
          </div>

          {/* Capabilities */}
          <div className="flex flex-col gap-3">
            <Label className="text-sm font-medium text-gray-900">
              How do you want to use SkillBridge?
            </Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CAPABILITIES.map((cap) => {
                const selected = capabilities.includes(cap.value);
                return (
                  <button
                    key={cap.value}
                    type="button"
                    onClick={() => toggleCapability(cap.value)}
                    className={`flex flex-col items-start rounded-xl border-2 p-4 text-left transition-colors ${
                      selected
                        ? 'border-[#004ac6] bg-[#f0f4ff]'
                        : 'border-[#c3c6d7] bg-white hover:border-[#004ac6]/50'
                    }`}
                  >
                    <p
                      className={`text-sm font-semibold ${
                        selected ? 'text-[#004ac6]' : 'text-gray-900'
                      }`}
                    >
                      {cap.label}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">{cap.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save */}
          <Button
            type="submit"
            disabled={saving}
            className="h-[50px] bg-[#004ac6] text-white hover:bg-[#003b9e] disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </div>

      {/* Email (read-only) */}
      <div className="mt-4 rounded-xl border border-border bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Email Address
        </p>
        <p className="mt-1 text-sm text-gray-700">{session?.user?.email}</p>
        <p className="mt-1 text-xs text-gray-400">Your email address cannot be changed here.</p>
      </div>
    </div>
  );
}
