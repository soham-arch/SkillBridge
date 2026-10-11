'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  GraduationCap,
  MapPin,
  Camera,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShoppingBag,
  Briefcase,
  Layers,
  Sparkles,
  Plus,
  X,
  Link as LinkIcon,
  IndianRupee,
  ShieldCheck,
  FileText,
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
  uploadPortfolioMedia,
  completeSellerOnboarding,
} from '@/lib/profiles/profiles';
import { SEED_CATEGORIES } from '@/lib/store/marketplace-store';
import type { Capability, ActiveRole, PortfolioItem, PricingPreferences } from '@/types';

type RoleChoice = 'buyer' | 'seller' | 'both';

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

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, profile, isStudentVerified, refreshProfile, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Step 1: Basic Profile
  const [fullName, setFullName] = useState('');
  const [college, setCollege] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Step 2: Role Selection
  const [roleChoice, setRoleChoice] = useState<RoleChoice>('both');

  // Step 3: Seller Specialization
  const [skills, setSkills] = useState<string[]>([]);
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [startingPrice, setStartingPrice] = useState(300);
  const [hourlyRate, setHourlyRate] = useState(250);
  const [isNegotiable, setIsNegotiable] = useState(true);

  // Portfolio items
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [newPortTitle, setNewPortTitle] = useState('');
  const [newPortUrl, setNewPortUrl] = useState('');

  // Pre-fill fields from existing profile if available
  useEffect(() => {
    if (profile) {
      if (profile.full_name) setFullName(profile.full_name);
      if (profile.college) setCollege(profile.college);
      if (profile.location) setLocation(profile.location);
      if (profile.bio) setBio(profile.bio);
      if (profile.avatar_url) setAvatarUrl(profile.avatar_url);

      const hasFind = profile.capabilities?.includes('find') || profile.capabilities?.includes('buyer');
      const hasOffer = profile.capabilities?.includes('offer') || profile.capabilities?.includes('seller');
      if (hasFind && hasOffer) setRoleChoice('both');
      else if (hasOffer) setRoleChoice('seller');
      else if (hasFind) setRoleChoice('buyer');

      if (profile.skills && profile.skills.length > 0) setSkills(profile.skills);
      if (profile.preferred_categories) setSelectedCategories(profile.preferred_categories);
      if (profile.portfolio_links) setPortfolioItems(profile.portfolio_links);
      if (profile.pricing_preferences) {
        if (profile.pricing_preferences.starting_price) setStartingPrice(profile.pricing_preferences.starting_price);
        if (profile.pricing_preferences.hourly_rate) setHourlyRate(profile.pricing_preferences.hourly_rate);
        if (profile.pricing_preferences.negotiable !== undefined) setIsNegotiable(profile.pricing_preferences.negotiable);
      }
    }
  }, [profile]);

  useEffect(() => {
    const s = searchParams.get('step');
    if (s) {
      const parsed = parseInt(s, 10);
      if (parsed >= 1 && parsed <= 4) setStep(parsed);
    }
  }, [searchParams]);

  // Handle avatar file upload
  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session?.user?.id) return;

    setUploadingAvatar(true);
    try {
      toast.info('Uploading profile picture...');
      const url = await uploadProfileAvatar(session.user.id, file);
      setAvatarUrl(url);
      toast.success('Avatar uploaded successfully!');
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
    const trimmed = customSkillInput.trim();
    if (!trimmed) return;
    if (skills.includes(trimmed)) {
      toast.error('Skill is already added.');
      return;
    }
    setSkills((prev) => [...prev, trimmed]);
    setCustomSkillInput('');
  }

  // Toggle Category
  function toggleCategory(catName: string) {
    setSelectedCategories((prev) =>
      prev.includes(catName) ? prev.filter((c) => c !== catName) : [...prev, catName]
    );
  }

  // Add Portfolio item
  function addPortfolioItem() {
    if (!newPortTitle.trim() || !newPortUrl.trim()) {
      toast.error('Please enter both title and link for the portfolio item.');
      return;
    }
    setPortfolioItems((prev) => [
      ...prev,
      { title: newPortTitle.trim(), url: newPortUrl.trim() },
    ]);
    setNewPortTitle('');
    setNewPortUrl('');
  }

  function removePortfolioItem(idx: number) {
    setPortfolioItems((prev) => prev.filter((_, i) => i !== idx));
  }

  // Navigation handlers
  function handleNext() {
    if (step === 1) {
      if (!fullName.trim()) {
        toast.error('Please enter your full name.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (roleChoice === 'buyer') {
        // Buyer does not need seller specialization step -> go directly to step 4
        setStep(4);
      } else {
        setStep(3);
      }
    } else if (step === 3) {
      if (skills.length === 0) {
        toast.error('Please select or add at least one skill to offer services.');
        return;
      }
      setStep(4);
    }
  }

  function handleBack() {
    if (step === 4 && roleChoice === 'buyer') {
      setStep(2);
    } else {
      setStep((prev) => Math.max(1, prev - 1));
    }
  }

  async function handleComplete() {
    if (!session?.user?.id) return;
    setSubmitting(true);

    try {
      let capabilities: Capability[] = [];
      let activeRole: ActiveRole = 'buyer';

      if (roleChoice === 'buyer') {
        capabilities = ['find', 'buyer'];
        activeRole = 'buyer';
      } else if (roleChoice === 'seller') {
        capabilities = ['offer', 'seller'];
        activeRole = 'seller';
      } else {
        capabilities = ['find', 'offer', 'buyer', 'seller'];
        activeRole = 'seller';
      }

      const pricing: PricingPreferences = {
        starting_price: startingPrice,
        hourly_rate: hourlyRate,
        currency: 'INR',
        negotiable: isNegotiable,
      };

      // 1. Update basic profile & onboarding flag
      await updateUserProfile(session.user.id, {
        full_name: fullName.trim(),
        college: college.trim() || undefined,
        location: location.trim() || undefined,
        bio: bio.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
        capabilities,
        active_role: activeRole,
        onboarding_completed: true,
      });

      // 2. If seller or both, save specialization
      if (roleChoice === 'seller' || roleChoice === 'both') {
        await completeSellerOnboarding(session.user.id, {
          skills,
          bio: bio.trim(),
          preferredCategories: selectedCategories,
          pricingPreferences: pricing,
          portfolioLinks: portfolioItems,
        });
      }

      await refreshProfile();
      toast.success('Onboarding complete! Welcome to the SkillBridge community 🎉');

      // 3. Direct route to appropriate workflow
      if (roleChoice === 'seller') {
        router.push('/dashboard?mode=seller');
      } else if (roleChoice === 'buyer') {
        router.push('/dashboard?mode=buyer');
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile';
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

  return (
    <div className="min-h-screen bg-[#fafafa] py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <span className="text-2xl font-black tracking-tight text-[#004ac6]">SkillBridge</span>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900">
            Welcome to Campus Marketplace Setup
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-600">
            Personalize your student identity, choose how you want to participate, and unlock peer opportunities.
          </p>

          {/* Stepper Indicator */}
          <div className="mt-6 flex items-center justify-center gap-2">
            {[1, 2, 3, 4].map((num) => {
              if (num === 3 && roleChoice === 'buyer') return null;
              const isActive = step === num;
              const isPast = step > num;
              return (
                <div key={num} className="flex items-center gap-2">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      isActive
                        ? 'bg-[#004ac6] text-white ring-4 ring-[#004ac6]/10'
                        : isPast
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="h-4 w-4" /> : num}
                  </div>
                  {num < (roleChoice === 'buyer' ? 4 : 4) && (
                    <div
                      className={`h-0.5 w-6 sm:w-10 rounded ${
                        isPast ? 'bg-emerald-600' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Card Content Container */}
        <div className="rounded-3xl border border-border bg-white p-6 sm:p-10 shadow-sm transition-all">
          {/* ========================================================================= */}
          {/* STEP 1: Basic Profile & Photo */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-lg font-bold text-gray-900">1. Basic Student Identity</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Your campus profile represents you to other students across campus.
                </p>
              </div>

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
                    title="Upload photo"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
                <div className="text-center sm:text-left">
                  <h4 className="text-xs font-bold text-gray-800">Profile Picture</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Upload a clear photo (JPG, PNG, WEBP, up to 5MB).
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 text-xs font-bold rounded-xl h-7"
                  >
                    {uploadingAvatar ? 'Uploading...' : 'Choose File'}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="fullName" className="text-xs font-semibold text-gray-700">
                    Full Legal Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Sharma"
                    className="text-xs rounded-xl"
                  />
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
                      placeholder="e.g. MIT-WPU, Pune"
                      className="text-xs rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="location" className="text-xs font-semibold text-gray-700">
                      Campus / Hostel Location
                    </Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Kothrud, Pune / Hostel 4"
                      className="text-xs rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="bio" className="text-xs font-semibold text-gray-700">
                    Headline or Bio
                  </Label>
                  <Textarea
                    id="bio"
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="e.g. 3rd-year CS student passionate about full-stack web development and UI design."
                    className="text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleNext}
                  className="bg-[#004ac6] text-white hover:bg-[#003899] font-bold text-xs rounded-xl px-6 h-10 shadow-sm"
                >
                  Continue to Role Selection
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: Choose Marketplace Role */}
          {/* ========================================================================= */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-lg font-bold text-gray-900">2. Choose Your Platform Role</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select your primary intention on campus. You can easily switch modes or activate both roles at any time.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Option: Both */}
                <div
                  onClick={() => setRoleChoice('both')}
                  className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${
                    roleChoice === 'both'
                      ? 'border-[#004ac6] bg-[#f0f4ff]/50 shadow-sm ring-2 ring-[#004ac6]/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#004ac6] text-white font-bold">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 text-sm">
                            Both: Hire & Offer Services
                          </h3>
                          <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                            Recommended
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Full campus access. Hire peers when you need help with assignments or coding, and offer your own skills to earn.
                        </p>
                      </div>
                    </div>
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                        roleChoice === 'both' ? 'border-[#004ac6] bg-[#004ac6]' : 'border-gray-300'
                      }`}
                    >
                      {roleChoice === 'both' && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>

                {/* Option: Buyer */}
                <div
                  onClick={() => setRoleChoice('buyer')}
                  className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${
                    roleChoice === 'buyer'
                      ? 'border-[#004ac6] bg-[#f0f4ff]/50 shadow-sm ring-2 ring-[#004ac6]/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">Buyer Mode (Hire Talent)</h3>
                        <p className="text-xs text-gray-600 mt-1">
                          Browse verified student freelancers, book services, hire for college assignments, web projects, and tutoring with escrow protection.
                        </p>
                      </div>
                    </div>
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                        roleChoice === 'buyer' ? 'border-[#004ac6] bg-[#004ac6]' : 'border-gray-300'
                      }`}
                    >
                      {roleChoice === 'buyer' && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>

                {/* Option: Seller */}
                <div
                  onClick={() => setRoleChoice('seller')}
                  className={`cursor-pointer rounded-2xl border-2 p-5 transition-all ${
                    roleChoice === 'seller'
                      ? 'border-[#004ac6] bg-[#f0f4ff]/50 shadow-sm ring-2 ring-[#004ac6]/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">
                        <Briefcase className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900 text-sm">
                            Seller Mode (Offer Services)
                          </h3>
                          <Badge variant="outline" className="text-[10px] text-gray-600">
                            Verified Students
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Create service listings, publish pricing, deliver digital orders to peers, and earn money into your escrow wallet.
                        </p>
                      </div>
                    </div>
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                        roleChoice === 'seller' ? 'border-[#004ac6] bg-[#004ac6]' : 'border-gray-300'
                      }`}
                    >
                      {roleChoice === 'seller' && <div className="h-2 w-2 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="text-xs font-bold rounded-xl h-10"
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  className="bg-[#004ac6] text-white hover:bg-[#003899] font-bold text-xs rounded-xl px-6 h-10 shadow-sm"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: Seller Specialization (Skills, Categories, Portfolio) */}
          {/* ========================================================================= */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-lg font-bold text-gray-900">3. Seller Specialization & Portfolio</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Set up your freelancer portfolio so campus clients can discover and hire you.
                </p>
              </div>

              {/* Skills Selector */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700">
                  Select Your Skills <span className="text-red-500">*</span>
                </Label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 border rounded-xl bg-gray-50/50">
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

                {/* Custom skill add */}
                <div className="flex gap-2 pt-1">
                  <Input
                    placeholder="Add custom skill (e.g. Flutter, SEO, CAD)"
                    value={customSkillInput}
                    onChange={(e) => setCustomSkillInput(e.target.value)}
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
                  Service Categories You Specialize In
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SEED_CATEGORIES.map((cat) => {
                    const checked = selectedCategories.includes(cat.name);
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
                  Pricing Preferences
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
                    id="negotiable"
                    checked={isNegotiable}
                    onChange={(e) => setIsNegotiable(e.target.checked)}
                    className="rounded text-[#004ac6]"
                  />
                  <Label htmlFor="negotiable" className="text-xs text-gray-600 font-normal">
                    Open to negotiation for custom student budget tasks
                  </Label>
                </div>
              </div>

              {/* Portfolio Links */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700">
                  Portfolio Showcases & Links (GitHub, Behance, Figma)
                </Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Project Title (e.g. GitHub Repository)"
                    value={newPortTitle}
                    onChange={(e) => setNewPortTitle(e.target.value)}
                    className="text-xs rounded-xl"
                  />
                  <Input
                    placeholder="URL (e.g. https://github.com/my-project)"
                    value={newPortUrl}
                    onChange={(e) => setNewPortUrl(e.target.value)}
                    className="text-xs rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addPortfolioItem}
                    className="text-xs font-bold rounded-xl shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Link
                  </Button>
                </div>

                {portfolioItems.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    {portfolioItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-white border p-2 rounded-xl text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <LinkIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="font-semibold text-gray-800">{item.title}:</span>
                          <span className="text-gray-500 truncate">{item.url}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePortfolioItem(idx)}
                          className="text-gray-400 hover:text-red-500 p-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="text-xs font-bold rounded-xl h-10"
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  className="bg-[#004ac6] text-white hover:bg-[#003899] font-bold text-xs rounded-xl px-6 h-10 shadow-sm"
                >
                  Review & Complete
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: Summary & Launch */}
          {/* ========================================================================= */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-lg font-bold text-gray-900">4. Review Your Setup</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Confirm your campus profile settings before entering your dashboard.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border border-gray-200">
                    {avatarUrl && <AvatarImage src={avatarUrl} />}
                    <AvatarFallback className="font-bold text-[#004ac6]">
                      {fullName ? fullName.slice(0, 2).toUpperCase() : 'ST'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{fullName}</h3>
                    <p className="text-xs text-gray-600">
                      {college || 'Campus not set'} • {location || 'Location not set'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge className="bg-[#004ac6] text-white text-[10px] font-bold">
                        {roleChoice === 'both'
                          ? 'Buyer & Seller'
                          : roleChoice === 'seller'
                          ? 'Seller Mode'
                          : 'Buyer Mode'}
                      </Badge>
                      {isStudentVerified ? (
                        <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                          Verified Student
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                          Pending Verification
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {bio && (
                  <p className="text-xs text-gray-600 italic bg-white p-3 rounded-xl border border-gray-100">
                    "{bio}"
                  </p>
                )}

                {(roleChoice === 'seller' || roleChoice === 'both') && (
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    <div>
                      <span className="text-[11px] font-semibold text-gray-500 uppercase block">
                        Offered Skills:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {skills.map((s) => (
                          <Badge key={s} variant="secondary" className="text-[10px]">
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-700 pt-1">
                      <span>Starting Price: <strong>₹{startingPrice}</strong></span>
                      <span>Hourly Rate: <strong>₹{hourlyRate}/hr</strong></span>
                      <span>Negotiable: <strong>{isNegotiable ? 'Yes' : 'No'}</strong></span>
                    </div>

                    {portfolioItems.length > 0 && (
                      <div className="pt-1">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase block">
                          Portfolio Items ({portfolioItems.length}):
                        </span>
                        <ul className="text-xs text-gray-600 list-disc list-inside mt-0.5">
                          {portfolioItems.map((p, i) => (
                            <li key={i}>{p.title}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={submitting}
                  className="text-xs font-bold rounded-xl h-10"
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  Edit Details
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={submitting}
                  className="bg-[#004ac6] text-white hover:bg-[#003899] font-bold text-xs rounded-xl px-8 h-10 shadow-md"
                >
                  {submitting ? 'Setting Up...' : 'Launch Dashboard 🎉'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
