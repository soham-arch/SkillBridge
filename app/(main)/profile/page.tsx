'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  User,
  GraduationCap,
  MapPin,
  Camera,
  ShoppingBag,
  Briefcase,
  Layers,
  Save,
  ExternalLink,
  Plus,
  X,
  Link as LinkIcon,
  IndianRupee,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRequireAuth } from '@/lib/auth/use-require-auth';
import { useAuth } from '@/lib/auth/auth-context';
import {
  updateUserProfile,
  uploadProfileAvatar,
  switchActiveRole,
  isBuyer,
  isSeller,
  canSell,
} from '@/lib/profiles/profiles';
import { SEED_CATEGORIES } from '@/lib/store/marketplace-store';
import type { Capability, ActiveRole, PortfolioItem, PricingPreferences, SocialLinks } from '@/types';

type ProfileTab = 'personal' | 'roles' | 'seller';

const POPULAR_SKILLS = [
  'Next.js',
  'React',
  'Python',
  'Figma',
  'UI/UX Design',
  'Video Editing',
  'Premiere Pro',
  'Math Tutoring',
  'Data Structures',
  'Academic Writing',
  'Resume Review',
  'Photography',
  'Java',
  'C++',
  'Graphic Design',
  'Content Writing',
];

export default function ProfilePage() {
  const searchParams = useSearchParams();
  const { loading: authLoading } = useRequireAuth();
  const { session, profile, isStudentVerified, isAdmin, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Form State: Personal Info
  const [fullName, setFullName] = useState('');
  const [college, setCollege] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Form State: Roles
  const [roleMode, setRoleMode] = useState<'buyer' | 'seller' | 'both'>('buyer');
  const [activeRoleContext, setActiveRoleContext] = useState<ActiveRole>('buyer');

  // Form State: Seller Specialization
  const [skills, setSkills] = useState<string[]>([]);
  const [customSkill, setCustomSkill] = useState('');
  const [preferredCategories, setPreferredCategories] = useState<string[]>([]);
  const [startingPrice, setStartingPrice] = useState(300);
  const [hourlyRate, setHourlyRate] = useState(250);
  const [isNegotiable, setIsNegotiable] = useState(true);

  // Portfolio links
  const [portfolioLinks, setPortfolioLinks] = useState<PortfolioItem[]>([]);
  const [newPortTitle, setNewPortTitle] = useState('');
  const [newPortUrl, setNewPortUrl] = useState('');

  // Social Links
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // Prepopulate form
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setCollege(profile.college || '');
      setLocation(profile.location || '');
      setBio(profile.bio || '');
      setAvatarUrl(profile.avatar_url || '');

      const hasFind = profile.capabilities?.includes('find') || profile.capabilities?.includes('buyer');
      const hasOffer = profile.capabilities?.includes('offer') || profile.capabilities?.includes('seller');
      if (hasFind && hasOffer) setRoleMode('both');
      else if (hasOffer) setRoleMode('seller');
      else setRoleMode('buyer');

      setActiveRoleContext(profile.active_role || (hasOffer && !hasFind ? 'seller' : 'buyer'));

      if (profile.skills) setSkills(profile.skills);
      if (profile.preferred_categories) setPreferredCategories(profile.preferred_categories);
      if (profile.portfolio_links) setPortfolioLinks(profile.portfolio_links);

      if (profile.pricing_preferences) {
        if (profile.pricing_preferences.starting_price) setStartingPrice(profile.pricing_preferences.starting_price);
        if (profile.pricing_preferences.hourly_rate) setHourlyRate(profile.pricing_preferences.hourly_rate);
        if (profile.pricing_preferences.negotiable !== undefined) setIsNegotiable(profile.pricing_preferences.negotiable);
      }

      if (profile.social_links) {
        if (profile.social_links.github) setGithubUrl(profile.social_links.github);
        if (profile.social_links.linkedin) setLinkedinUrl(profile.social_links.linkedin);
        if (profile.social_links.website) setWebsiteUrl(profile.social_links.website);
      }
    }
  }, [profile]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'roles' || tabParam === 'seller' || tabParam === 'personal') {
      setActiveTab(tabParam as ProfileTab);
    }
  }, [searchParams]);

  // Avatar upload
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session?.user?.id) return;

    setUploadingAvatar(true);
    try {
      toast.info('Uploading avatar to secure storage...');
      const url = await uploadProfileAvatar(session.user.id, file);
      setAvatarUrl(url);
      await refreshProfile();
      toast.success('Avatar updated successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Avatar upload failed';
      toast.error(msg);
    } finally {
      setUploadingAvatar(false);
    }
  }

  // Toggle skill
  function toggleSkill(skill: string) {
    setSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  }

  function addCustomSkill() {
    const trimmed = customSkill.trim();
    if (!trimmed) return;
    if (skills.includes(trimmed)) {
      toast.error('Skill is already added.');
      return;
    }
    setSkills((prev) => [...prev, trimmed]);
    setCustomSkill('');
  }

  // Toggle Category
  function toggleCategory(catName: string) {
    setPreferredCategories((prev) =>
      prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName]
    );
  }

  // Portfolio item management
  function addPortfolioLink() {
    if (!newPortTitle.trim() || !newPortUrl.trim()) {
      toast.error('Please enter both title and URL.');
      return;
    }
    setPortfolioLinks((prev) => [
      ...prev,
      { title: newPortTitle.trim(), url: newPortUrl.trim() },
    ]);
    setNewPortTitle('');
    setNewPortUrl('');
  }

  function removePortfolioLink(idx: number) {
    setPortfolioLinks((prev) => prev.filter((_, i) => i !== idx));
  }

  // Quick Switch Active Role
  async function handleSwitchActiveRole(newRole: ActiveRole) {
    if (!session?.user?.id) return;
    try {
      await switchActiveRole(session.user.id, newRole);
      setActiveRoleContext(newRole);
      await refreshProfile();
      toast.success(`Active mode switched to ${newRole === 'seller' ? 'Selling 💼' : 'Buying 🛒'}!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to switch role';
      toast.error(msg);
    }
  }

  // Save profile changes
  async function handleSave(e?: FormEvent) {
    if (e) e.preventDefault();
    if (!session?.user?.id) return;

    if (!fullName.trim()) {
      toast.error('Full legal name is required.');
      return;
    }

    setSaving(true);
    try {
      let capabilities: Capability[] = [];
      if (roleMode === 'buyer') capabilities = ['find', 'buyer'];
      else if (roleMode === 'seller') capabilities = ['offer', 'seller'];
      else capabilities = ['find', 'offer', 'buyer', 'seller'];

      const pricing: PricingPreferences = {
        starting_price: startingPrice,
        hourly_rate: hourlyRate,
        currency: 'INR',
        negotiable: isNegotiable,
      };

      const social: SocialLinks = {
        github: githubUrl.trim() || undefined,
        linkedin: linkedinUrl.trim() || undefined,
        website: websiteUrl.trim() || undefined,
      };

      await updateUserProfile(session.user.id, {
        full_name: fullName.trim(),
        college: college.trim() || undefined,
        location: location.trim() || undefined,
        bio: bio.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
        capabilities,
        active_role: activeRoleContext,
        skills,
        preferred_categories: preferredCategories,
        pricing_preferences: pricing,
        portfolio_links: portfolioLinks,
        social_links: social,
        seller_onboarding_completed: roleMode === 'seller' || roleMode === 'both' ? true : profile?.seller_onboarding_completed,
      });

      await refreshProfile();
      toast.success('Profile changes saved successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save changes';
      toast.error(msg);
    } finally {
      setSaving(false);
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
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Your Profile</h1>
            {isStudentVerified && (
              <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verified Student
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-600">
            Manage your personal student identity, buyer/seller capabilities, and public portfolio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {session?.user?.id && (
            <Link href={`/profile/${session.user.id}`} target="_blank">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-bold rounded-xl border-gray-200"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                View Public Profile
              </Button>
            </Link>
          )}
          <Button
            size="sm"
            onClick={() => handleSave()}
            disabled={saving}
            className="bg-[#004ac6] text-white hover:bg-[#003899] text-xs font-bold rounded-xl"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex gap-2 border-b border-gray-200 pb-3 mb-6">
        <button
          onClick={() => setActiveTab('personal')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'personal'
              ? 'bg-[#004ac6] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Personal Information
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'roles'
              ? 'bg-[#004ac6] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Roles & Active Context ({activeRoleContext.toUpperCase()})
        </button>
        <button
          onClick={() => setActiveTab('seller')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'seller'
              ? 'bg-[#004ac6] text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Seller Profile & Portfolio
        </button>
      </div>

      {/* TAB 1: Personal Information */}
      {activeTab === 'personal' && (
        <div className="space-y-6 rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm">
          {/* Avatar Upload */}
          <div className="flex flex-col sm:flex-row items-center gap-5 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div className="relative">
              <Avatar className="h-20 w-20 border-2 border-[#c3c6d7] shadow-sm">
                {avatarUrl && <AvatarImage src={avatarUrl} />}
                <AvatarFallback className="text-xl font-bold text-[#004ac6]">
                  {fullName ? fullName.slice(0, 2).toUpperCase() : 'ST'}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#004ac6] text-white shadow hover:bg-[#003899] transition-colors"
                title="Change avatar"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div className="text-center sm:text-left">
              <h4 className="text-xs font-bold text-gray-800">Profile Picture</h4>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Upload your picture to establish trust with other students on campus.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingAvatar}
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 text-xs font-bold rounded-xl h-7"
              >
                {uploadingAvatar ? 'Uploading...' : 'Upload New Photo'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="fullName" className="text-xs font-semibold text-gray-700">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs font-semibold text-gray-700">
                Email Address (Read-only)
              </Label>
              <Input
                id="email"
                value={profile?.email || session?.user?.email || ''}
                disabled
                className="text-xs rounded-xl bg-gray-50 text-gray-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="college" className="text-xs font-semibold text-gray-700">
                College / University
              </Label>
              <Input
                id="college"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="location" className="text-xs font-semibold text-gray-700">
                Campus Location
              </Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Kothrud, Pune / Hostel 3"
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="bio" className="text-xs font-semibold text-gray-700">
              Personal Bio / Headline
            </Label>
            <Textarea
              id="bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other students about your interests, study major, and campus background."
              className="text-xs rounded-xl"
            />
          </div>

          {/* Social Links */}
          <div className="space-y-3 pt-2 border-t">
            <h4 className="text-xs font-bold text-gray-800">External Links & Socials</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-[11px] text-gray-600">GitHub Profile</Label>
                <Input
                  placeholder="https://github.com/username"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="text-xs rounded-xl mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-gray-600">LinkedIn Profile</Label>
                <Input
                  placeholder="https://linkedin.com/in/username"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="text-xs rounded-xl mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-gray-600">Portfolio Website</Label>
                <Input
                  placeholder="https://yourportfolio.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="text-xs rounded-xl mt-1"
                />
              </div>
            </div>
          </div>

          {/* Confidentiality Notice */}
          <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <Lock className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <strong>Privacy Protection:</strong> Your official student ID or PRN enrollment number and verification documents are strictly private. They are kept securely encrypted for administration and are never exposed publicly.
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Roles & Permissions */}
      {activeTab === 'roles' && (
        <div className="space-y-6 rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm">
          {/* Active Context Switcher Banner */}
          <div className="bg-[#f0f4ff] p-5 rounded-2xl border border-[#004ac6]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#004ac6]">
                Current Active Mode
              </span>
              <h3 className="text-base font-extrabold text-gray-900 mt-0.5">
                You are currently in{' '}
                <span className="text-[#004ac6] underline">
                  {activeRoleContext === 'seller' ? 'Seller Mode (Offer Services)' : 'Buyer Mode (Hire Talent)'}
                </span>
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                Seamlessly toggle your active interface context between hiring peers and managing your client orders.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant={activeRoleContext === 'buyer' ? 'default' : 'outline'}
                onClick={() => handleSwitchActiveRole('buyer')}
                className={`text-xs font-bold rounded-xl h-9 ${
                  activeRoleContext === 'buyer'
                    ? 'bg-[#004ac6] text-white shadow-sm'
                    : 'border-gray-200'
                }`}
              >
                <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
                Buyer Mode
              </Button>
              <Button
                size="sm"
                variant={activeRoleContext === 'seller' ? 'default' : 'outline'}
                onClick={() => handleSwitchActiveRole('seller')}
                className={`text-xs font-bold rounded-xl h-9 ${
                  activeRoleContext === 'seller'
                    ? 'bg-[#004ac6] text-white shadow-sm'
                    : 'border-gray-200'
                }`}
              >
                <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                Seller Mode
              </Button>
            </div>
          </div>

          {/* Account Capabilities Choice */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-gray-900">Your Account Role Permissions</h4>
            <p className="text-xs text-gray-500">
              Configure which capabilities your authenticated account possesses:
            </p>

            <div className="grid grid-cols-1 gap-3">
              <div
                onClick={() => setRoleMode('both')}
                className={`cursor-pointer rounded-2xl border p-4 transition-all flex items-center justify-between ${
                  roleMode === 'both'
                    ? 'border-[#004ac6] bg-[#f0f4ff]/40 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#004ac6] text-white font-bold">
                    <Layers className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900 text-xs">Both: Buyer & Seller</h5>
                    <p className="text-[11px] text-gray-500">
                      Hire fellow students and create your own service listings to earn.
                    </p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="roleMode"
                  checked={roleMode === 'both'}
                  onChange={() => setRoleMode('both')}
                  className="text-[#004ac6]"
                />
              </div>

              <div
                onClick={() => setRoleMode('buyer')}
                className={`cursor-pointer rounded-2xl border p-4 transition-all flex items-center justify-between ${
                  roleMode === 'buyer'
                    ? 'border-[#004ac6] bg-[#f0f4ff]/40 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900 text-xs">Buyer Only</h5>
                    <p className="text-[11px] text-gray-500">
                      Browse services, hire student providers, and leave feedback.
                    </p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="roleMode"
                  checked={roleMode === 'buyer'}
                  onChange={() => setRoleMode('buyer')}
                  className="text-[#004ac6]"
                />
              </div>

              <div
                onClick={() => setRoleMode('seller')}
                className={`cursor-pointer rounded-2xl border p-4 transition-all flex items-center justify-between ${
                  roleMode === 'seller'
                    ? 'border-[#004ac6] bg-[#f0f4ff]/40 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900 text-xs">Seller Only</h5>
                    <p className="text-[11px] text-gray-500">
                      Publish listings, deliver orders, and earn into escrow.
                    </p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="roleMode"
                  checked={roleMode === 'seller'}
                  onChange={() => setRoleMode('seller')}
                  className="text-[#004ac6]"
                />
              </div>
            </div>
          </div>

          {/* Verification Status Banner */}
          <div className="rounded-2xl border p-4 bg-gray-50 flex items-center justify-between">
            <div>
              <h5 className="text-xs font-bold text-gray-800">Campus Verification Status</h5>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {isStudentVerified
                  ? 'Your student credentials are confirmed by administration. You are eligible to offer services.'
                  : 'You must verify your college ID card before publishing public service listings.'}
              </p>
            </div>
            {!isStudentVerified && (
              <Link href="/verify">
                <Button size="sm" className="bg-[#004ac6] text-white text-xs font-bold rounded-xl">
                  Verify Student ID
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Seller Profile & Portfolio */}
      {activeTab === 'seller' && (
        <div className="space-y-6 rounded-3xl border border-border bg-white p-6 sm:p-8 shadow-sm">
          <div>
            <h3 className="text-base font-bold text-gray-900">Seller Specialization & Offerings</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Highlight your technical or academic skills, showcase links, and specify your rate preferences.
            </p>
          </div>

          {/* Skills Tag Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700">Skills & Tech Stack</Label>
            <div className="flex flex-wrap gap-1.5 p-2 border rounded-xl bg-gray-50/50 max-h-36 overflow-y-auto">
              {POPULAR_SKILLS.map((s) => {
                const isSelected = skills.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSkill(s)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                      isSelected
                        ? 'bg-[#004ac6] text-white font-bold shadow-sm'
                        : 'bg-white text-gray-700 border hover:bg-gray-100'
                    }`}
                  >
                    {isSelected ? `✓ ${s}` : `+ ${s}`}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-1">
              <Input
                placeholder="Add custom skill (e.g. Docker, Blender, Calculus)"
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomSkill();
                  }
                }}
                className="text-xs rounded-xl"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addCustomSkill}
                className="text-xs font-bold rounded-xl"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </Button>
            </div>
          </div>

          {/* Service Categories */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700">
              Primary Service Categories
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SEED_CATEGORIES.map((cat) => {
                const checked = preferredCategories.includes(cat.name);
                return (
                  <div
                    key={cat.id}
                    onClick={() => toggleCategory(cat.name)}
                    className={`cursor-pointer flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-colors ${
                      checked
                        ? 'border-[#004ac6] bg-[#f0f4ff] text-[#004ac6] font-bold'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="rounded text-[#004ac6]"
                    />
                    <span>{cat.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pricing Preferences */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />
              Pricing & Rate Defaults
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-gray-600">Starting Service Price (₹)</Label>
                <Input
                  type="number"
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(Number(e.target.value))}
                  className="text-xs rounded-xl mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-gray-600">Hourly Rate (₹)</Label>
                <Input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="text-xs rounded-xl mt-1"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="profileNegotiable"
                checked={isNegotiable}
                onChange={(e) => setIsNegotiable(e.target.checked)}
                className="rounded text-[#004ac6]"
              />
              <Label htmlFor="profileNegotiable" className="text-xs text-gray-600 font-normal">
                Open to negotiation for custom student project requirements
              </Label>
            </div>
          </div>

          {/* Portfolio Links */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-gray-700">
              Portfolio Projects & External Showcases
            </Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="Showcase Title (e.g. Hackathon Finalist Project)"
                value={newPortTitle}
                onChange={(e) => setNewPortTitle(e.target.value)}
                className="text-xs rounded-xl"
              />
              <Input
                placeholder="URL (e.g. https://behance.net/gallery/123)"
                value={newPortUrl}
                onChange={(e) => setNewPortUrl(e.target.value)}
                className="text-xs rounded-xl"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addPortfolioLink}
                className="text-xs font-bold rounded-xl shrink-0"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Item
              </Button>
            </div>

            {portfolioLinks.length > 0 && (
              <div className="space-y-1.5 pt-2">
                {portfolioLinks.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-white border p-2.5 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <LinkIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="font-semibold text-gray-800">{item.title}:</span>
                      <span className="text-gray-500 truncate">{item.url}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePortfolioLink(idx)}
                      className="text-gray-400 hover:text-red-500 p-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Button Footer */}
      <div className="flex justify-end pt-6">
        <Button
          onClick={() => handleSave()}
          disabled={saving}
          className="bg-[#004ac6] text-white hover:bg-[#003899] font-bold text-xs rounded-xl px-8 h-10 shadow-sm"
        >
          <Save className="h-4 w-4 mr-1.5" />
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </div>
    </div>
  );
}
