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
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRequireAuth } from '@/lib/auth/use-require-auth';
import { useAuth } from '@/lib/auth/auth-context';
import {
  updateUserProfile,
  uploadProfileAvatar,
  switchActiveRole,
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
  const { session, profile, isStudentVerified, refreshProfile } = useAuth();
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

  function toggleCategory(catName: string) {
    setPreferredCategories((prev) =>
      prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName]
    );
  }

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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
      </div>
    );
  }

  const initials = fullName
    ? fullName
        .split(' ')
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'SB';

  return (
    <div className="mx-auto w-full max-w-4xl px-6 sm:px-8 lg:px-12 py-12 sm:py-16">
      {/* Editorial Header */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-neutral-200/80">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#004ac6]">
              // Campus Identity & Settings
            </span>
            {isStudentVerified && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                Verified Student
              </span>
            )}
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-neutral-950">
            Account Profile.
          </h1>
          <p className="mt-2 text-sm text-neutral-500 font-normal">
            Manage your personal identity, marketplace roles, and public portfolio.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {session?.user?.id && (
            <Link href={`/profile/${session.user.id}`} target="_blank">
              <Button
                variant="outline"
                className="h-11 rounded-xl border-neutral-300 text-xs font-bold text-neutral-800 hover:bg-neutral-50 shadow-2xs"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Public View
              </Button>
            </Link>
          )}
          <Button
            onClick={() => handleSave()}
            disabled={saving}
            className="h-11 rounded-xl bg-neutral-950 text-white hover:bg-black text-xs font-bold px-5 shadow-xs"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex gap-2 border-b border-neutral-200/80 pb-3 mb-8">
        <button
          onClick={() => setActiveTab('personal')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'personal'
              ? 'bg-neutral-950 text-white shadow-xs'
              : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          Personal Information
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'roles'
              ? 'bg-neutral-950 text-white shadow-xs'
              : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          Marketplace Roles
        </button>
        <button
          onClick={() => setActiveTab('seller')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'seller'
              ? 'bg-neutral-950 text-white shadow-xs'
              : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          Seller Specialization
        </button>
      </div>

      {/* TAB 1: PERSONAL INFORMATION */}
      {activeTab === 'personal' && (
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 sm:p-10 shadow-xs space-y-8">
          {/* Avatar Upload */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-6 border-b border-neutral-100">
            <div className="relative group">
              <Avatar className="h-20 w-20 border-2 border-neutral-200 shadow-xs">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName} />}
                <AvatarFallback className="text-lg font-black text-neutral-900 bg-neutral-100">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="h-5 w-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-950">Profile Picture</h3>
              <p className="text-xs text-neutral-500">
                Upload a professional headshot to increase trust with student clients.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="rounded-xl border-neutral-300 text-xs font-bold mt-2"
              >
                {uploadingAvatar ? 'Uploading...' : 'Choose Image'}
              </Button>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                  Full Legal Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-12 rounded-xl text-sm border-neutral-200"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="college" className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                  College / University
                </Label>
                <Input
                  id="college"
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  placeholder="MIT-WPU Pune"
                  className="h-12 rounded-xl text-sm border-neutral-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                Campus Location
              </Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Pune / Kothrud Campus"
                className="h-12 rounded-xl text-sm border-neutral-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                Short Bio / Background
              </Label>
              <Textarea
                id="bio"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Briefly introduce your academic major, engineering interests, or creative specialties..."
                className="resize-none text-sm rounded-xl border-neutral-200 leading-relaxed"
              />
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: MARKETPLACE ROLES */}
      {activeTab === 'roles' && (
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 sm:p-10 shadow-xs space-y-8">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-neutral-950">Platform Role Configuration</h3>
            <p className="text-xs text-neutral-500">
              Select whether you use SkillBridge primarily to hire peer talent, offer your skills, or both.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                id: 'buyer',
                title: 'Buyer Only',
                desc: 'Hire students for video editing, coding, design, and tutoring.',
                icon: ShoppingBag,
              },
              {
                id: 'seller',
                title: 'Seller Studio',
                desc: 'Offer your skills, create services, and receive student client requests.',
                icon: Briefcase,
              },
              {
                id: 'both',
                title: 'Buyer & Seller',
                desc: 'Full campus access to both discover services and monetize your expertise.',
                icon: Layers,
              },
            ].map((r) => {
              const Icon = r.icon;
              const isSelected = roleMode === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRoleMode(r.id as 'buyer' | 'seller' | 'both')}
                  className={`text-left p-6 rounded-2xl border transition-all ${
                    isSelected
                      ? 'border-neutral-950 bg-neutral-950 text-white shadow-sm'
                      : 'border-neutral-200 bg-[#fbfbfa] text-neutral-900 hover:border-neutral-400'
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl mb-4 ${
                    isSelected ? 'bg-neutral-800 text-white' : 'bg-white border border-neutral-200 text-neutral-900'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="text-base font-bold">{r.title}</h4>
                  <p className={`text-xs mt-1 leading-relaxed ${isSelected ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    {r.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Quick Active Context Switch */}
          {roleMode === 'both' && (
            <div className="pt-6 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-500">
                  CURRENT ACTIVE CONTEXT
                </span>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Choose which workspace layout loads by default.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleSwitchActiveRole('buyer')}
                  className={`rounded-xl text-xs font-bold ${
                    activeRoleContext === 'buyer'
                      ? 'bg-neutral-950 text-white'
                      : 'border border-neutral-300 bg-white text-neutral-800'
                  }`}
                >
                  <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
                  Buyer Workspace
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSwitchActiveRole('seller')}
                  className={`rounded-xl text-xs font-bold ${
                    activeRoleContext === 'seller'
                      ? 'bg-neutral-950 text-white'
                      : 'border border-neutral-300 bg-white text-neutral-800'
                  }`}
                >
                  <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                  Seller Workspace
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SELLER SPECIALIZATION */}
      {activeTab === 'seller' && (
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 sm:p-10 shadow-xs space-y-8">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-neutral-950">Seller Studio Profile</h3>
            <p className="text-xs text-neutral-500">
              Customize the skill tags, categories, pricing preferences, and links displayed on your services.
            </p>
          </div>

          {/* Skills Picker */}
          <div className="space-y-3">
            <Label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
              Skills & Expertise Tags
            </Label>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SKILLS.map((sk) => {
                const active = skills.includes(sk);
                return (
                  <button
                    key={sk}
                    type="button"
                    onClick={() => toggleSkill(sk)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                      active
                        ? 'bg-neutral-950 text-white shadow-xs'
                        : 'bg-[#fbfbfa] border border-neutral-200 text-neutral-600 hover:border-neutral-900'
                    }`}
                  >
                    #{sk}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2 max-w-sm">
              <Input
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomSkill();
                  }
                }}
                placeholder="Custom skill tag..."
                className="h-10 text-xs rounded-xl border-neutral-200"
              />
              <Button
                type="button"
                onClick={addCustomSkill}
                variant="outline"
                className="rounded-xl border-neutral-300 text-xs font-bold h-10 px-4"
              >
                Add
              </Button>
            </div>
          </div>

          {/* Pricing Preferences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-6 border-t border-neutral-100">
            <div className="space-y-2">
              <Label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                Typical Starting Price (₹)
              </Label>
              <Input
                type="number"
                min={50}
                value={startingPrice}
                onChange={(e) => setStartingPrice(Number(e.target.value))}
                className="h-12 rounded-xl text-sm border-neutral-200 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                Typical Hourly Consultation Rate (₹)
              </Label>
              <Input
                type="number"
                min={50}
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="h-12 rounded-xl text-sm border-neutral-200 font-mono"
              />
            </div>
          </div>

          {/* Social & Portfolio Links */}
          <div className="space-y-4 pt-6 border-t border-neutral-100">
            <Label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
              External Proof-of-Work Links
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="GitHub Profile URL"
                className="h-11 text-xs rounded-xl border-neutral-200"
              />
              <Input
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="LinkedIn Profile URL"
                className="h-11 text-xs rounded-xl border-neutral-200"
              />
              <Input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="Personal Portfolio / Blog"
                className="h-11 text-xs rounded-xl border-neutral-200"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
