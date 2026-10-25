'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  UploadCloud,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth/auth-context';
import { useRequireAuth } from '@/lib/auth/use-require-auth';
import { createService, uploadServiceCoverImage } from '@/lib/services/services';
import { getCategories } from '@/lib/services/categories';
import type { Category, ServiceStatus, ServiceType, PortfolioItem } from '@/types';

export default function CreateServicePage() {
  const { session, user, loading: authLoading } = useRequireAuth({
    requireStudentVerified: true,
  });
  const { isSeller, canSell, isAdmin, profile } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [extractingSkills, setExtractingSkills] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('3');
  const [serviceType, setServiceType] = useState<ServiceType>('digital');
  const [location, setLocation] = useState('Online / Pune');
  const [categoryId, setCategoryId] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [status, setStatus] = useState<ServiceStatus>('published');
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [availabilityNotes, setAvailabilityNotes] = useState('');
  const [portfolioLinks, setPortfolioLinks] = useState<PortfolioItem[]>([]);
  const [newPortTitle, setNewPortTitle] = useState('');
  const [newPortUrl, setNewPortUrl] = useState('');

  // Live preview toggle
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories).catch(console.error);
  }, []);

  async function handleAIExtractSkills() {
    if (!title.trim() && !description.trim()) {
      toast.error('Please enter a title or description first to analyze.');
      return;
    }

    setExtractingSkills(true);
    try {
      const res = await fetch('/api/ai/extract-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.skills && data.skills.length > 0) {
          const combined = Array.from(new Set([...skills, ...data.skills]));
          setSkills(combined);
          toast.success(`AI suggested ${data.skills.length} skills based on your description!`);
        }
      }
    } catch {
      toast.error('AI assistant unavailable, please add skills manually.');
    } finally {
      setExtractingSkills(false);
    }
  }

  function handleAddSkill() {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (!skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
    }
    setSkillInput('');
  }

  function handleRemoveSkill(skillToRemove: string) {
    setSkills(skills.filter((s) => s !== skillToRemove));
  }

  function handleAddPortfolio() {
    if (!newPortTitle.trim() || !newPortUrl.trim()) {
      toast.error('Please enter both title and URL.');
      return;
    }
    setPortfolioLinks([
      ...portfolioLinks,
      { title: newPortTitle.trim(), url: newPortUrl.trim() },
    ]);
    setNewPortTitle('');
    setNewPortUrl('');
  }

  function handleRemovePortfolio(idx: number) {
    setPortfolioLinks(portfolioLinks.filter((_, i) => i !== idx));
  }

  async function handleCoverImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingImage(true);
    try {
      const url = await uploadServiceCoverImage(file, user.id);
      setCoverImageUrl(url);
      toast.success('Cover image uploaded successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Image upload failed';
      toast.error(msg);
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session?.user?.id) {
      toast.error('You must be signed in with a verified account to offer a service.');
      router.push('/login');
      return;
    }
    const userId = session.user.id;

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 50) {
      toast.error('Please enter a valid price (minimum ₹50).');
      return;
    }

    const parsedDays = parseInt(deliveryDays);
    if (isNaN(parsedDays) || parsedDays < 1 || parsedDays > 60) {
      toast.error('Turnaround days must be between 1 and 60.');
      return;
    }

    if (!isAdmin && (!isSeller || !canSell)) {
      toast.error('You need an active Seller role and verified student status to publish listings.');
      return;
    }
    if (!isAdmin && !profile?.seller_onboarding_completed) {
      toast.error('Please complete your seller profile details before publishing a listing.');
      return;
    }

    setSubmitting(true);
    try {
      await createService({
        provider_id: userId,
        title: title.trim(),
        description: description.trim(),
        price: parsedPrice,
        currency: 'INR',
        delivery_days: parsedDays,
        service_type: serviceType,
        location: location.trim(),
        category_id: categoryId || null,
        skills,
        tags: skills,
        status,
        cover_image_url: coverImageUrl || null,
        availability_notes: availabilityNotes.trim() || null,
        portfolio_examples: portfolioLinks,
      });

      toast.success(
        status === 'published'
          ? 'Service published! Students can now discover and order it across campus.'
          : 'Service saved as draft.'
      );
      router.push('/my-services');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create service.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin && !isSeller) {
    return (
      <div className="mx-auto w-full max-w-xl px-6 py-20">
        <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-950 text-white shadow-sm mb-4">
            <Briefcase className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-black text-neutral-950">Activate Seller Role First</h2>
          <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
            Your account is currently set to Buyer mode. Enable Seller role in your profile to start publishing student services on campus.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/profile?tab=roles">
              <Button className="rounded-xl bg-neutral-950 text-white hover:bg-black font-bold text-xs h-11 px-6">
                Enable Seller Mode
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="rounded-xl border-neutral-300 text-xs font-bold h-11 px-6">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin && !profile?.seller_onboarding_completed) {
    return (
      <div className="mx-auto w-full max-w-xl px-6 py-20">
        <div className="rounded-3xl border border-neutral-200 bg-white p-10 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm mb-4">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-black text-neutral-950">Seller Profile Required</h2>
          <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
            Before creating your first listing, please specify your skills, categories, pricing preferences, and portfolio items so campus buyers know what you offer.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/profile?tab=seller">
              <Button className="rounded-xl bg-neutral-950 text-white hover:bg-black font-bold text-xs h-11 px-6">
                Complete Seller Profile
              </Button>
            </Link>
            <Link href="/onboarding?step=3">
              <Button variant="outline" className="rounded-xl border-neutral-300 text-xs font-bold h-11 px-6">
                Launch Onboarding
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 sm:px-8 py-12 sm:py-16">
      {/* Editorial Header */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-neutral-200/80">
        <div>
          <Link
            href="/my-services"
            className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-neutral-400 hover:text-neutral-900 mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            My Services
          </Link>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-neutral-950">
            Publish New Skill.
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Set up an escrow-protected student service listing.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => setPreviewMode(!previewMode)}
          className="gap-2 border-neutral-300 rounded-xl text-xs font-bold text-neutral-800 hover:bg-neutral-50 h-10 px-4"
        >
          {previewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {previewMode ? 'Return to Editor' : 'Live Preview'}
        </Button>
      </div>

      {/* PREVIEW MODE */}
      {previewMode ? (
        <div className="rounded-3xl border border-neutral-900 bg-white p-8 sm:p-10 shadow-lg space-y-6">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#004ac6]">
              // Live Preview Mode
            </span>
            <span
              className={`rounded-full px-3 py-1 capitalize text-xs font-bold ${
                status === 'published'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              {status}
            </span>
          </div>

          {coverImageUrl && (
            <div className="h-56 w-full overflow-hidden rounded-2xl bg-neutral-100 border border-neutral-200">
              <img
                src={coverImageUrl}
                alt="Service Cover Preview"
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-950">
              {title || 'Untitled Service'}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-medium text-neutral-500">
              <span className="text-2xl font-black text-neutral-950 font-mono">₹{price || '0'}</span>
              <span>•</span>
              <span>{deliveryDays || '3'} Days Turnaround</span>
              <span>•</span>
              <span className="capitalize">{serviceType.replace('_', ' ')}</span>
              <span>•</span>
              <span>{location}</span>
            </div>
          </div>

          <div className="border-t border-neutral-100 pt-6 space-y-2">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
              // Service Scope
            </h4>
            <p className="whitespace-pre-wrap text-sm text-neutral-700 leading-relaxed">
              {description || 'No description entered yet.'}
            </p>
          </div>

          {availabilityNotes && (
            <div className="rounded-2xl border border-blue-200/80 bg-blue-50/50 p-5 text-xs text-neutral-700 space-y-1">
              <span className="font-bold text-[#004ac6] block">Availability Schedule</span>
              <p>{availabilityNotes}</p>
            </div>
          )}

          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-neutral-100">
              {skills.map((s) => (
                <span
                  key={s}
                  className="rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700"
                >
                  #{s}
                </span>
              ))}
            </div>
          )}

          <div className="pt-6 border-t border-neutral-100 flex justify-end">
            <Button
              onClick={() => setPreviewMode(false)}
              className="bg-neutral-950 text-white hover:bg-black text-xs font-bold rounded-xl h-10 px-5"
            >
              Back to Editing Form
            </Button>
          </div>
        </div>
      ) : (
        /* CREATE FORM */
        <div className="rounded-3xl border border-neutral-200 bg-white p-8 sm:p-10 shadow-xs">
          <form onSubmit={handleSubmit} className="flex flex-col gap-7">
            {/* Title */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="title" className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                Service Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Full-Stack Next.js 14 App with Auth & Supabase"
                className="h-12 text-sm rounded-xl border-neutral-200 focus-visible:border-neutral-900"
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description" className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                  Service Description <span className="text-red-500">*</span>
                </Label>
                <button
                  type="button"
                  onClick={handleAIExtractSkills}
                  disabled={extractingSkills}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#004ac6] hover:underline disabled:opacity-60"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {extractingSkills ? 'Analyzing with AI...' : 'AI Suggest Tags'}
                </button>
              </div>
              <Textarea
                id="description"
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your service scope, deliverables, technologies (e.g. Next.js, Figma, Premiere Pro), and client requirements..."
                className="resize-none text-sm rounded-xl border-neutral-200 focus-visible:border-neutral-900 leading-relaxed"
              />
            </div>

            {/* Price + Turnaround */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="price" className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                  Price (₹ INR) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="price"
                  type="number"
                  required
                  min={50}
                  step={1}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 1500"
                  className="h-12 text-sm rounded-xl border-neutral-200 focus-visible:border-neutral-900 font-mono"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="deliveryDays" className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                  Delivery Time (Days) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="deliveryDays"
                  type="number"
                  min={1}
                  max={60}
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(e.target.value)}
                  placeholder="3"
                  className="h-12 text-sm rounded-xl border-neutral-200 focus-visible:border-neutral-900 font-mono"
                />
              </div>
            </div>

            {/* Category, Delivery Mode, Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="category" className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                  Category
                </Label>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-12 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-900 focus:outline-none focus:border-neutral-900"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="serviceType" className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                  Delivery Mode
                </Label>
                <select
                  id="serviceType"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as ServiceType)}
                  className="h-12 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-900 focus:outline-none focus:border-neutral-900"
                >
                  <option value="digital">Digital (Online Delivery)</option>
                  <option value="in_person">In-Person (On Campus)</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="location" className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                  Location Note
                </Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Online / Pune"
                  className="h-12 text-xs rounded-xl border-neutral-200"
                />
              </div>
            </div>

            {/* Cover Image */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                Cover Image (Optional)
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleCoverImageUpload}
                  disabled={uploadingImage}
                  className="h-11 text-xs rounded-xl border-neutral-200 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-1 file:text-xs file:font-bold file:text-neutral-900"
                />
                {uploadingImage && <span className="text-xs text-neutral-500">Uploading...</span>}
              </div>
              {coverImageUrl && (
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-neutral-200 p-2.5">
                  <img
                    src={coverImageUrl}
                    alt="Cover Thumbnail"
                    className="h-12 w-16 rounded-xl object-cover"
                  />
                  <span className="truncate text-xs text-neutral-600 flex-1">{coverImageUrl}</span>
                  <button
                    type="button"
                    onClick={() => setCoverImageUrl('')}
                    className="text-xs font-bold text-red-500 hover:underline px-2"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Availability Notes */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="availabilityNotes" className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                Availability & Scheduling Note
              </Label>
              <Input
                id="availabilityNotes"
                value={availabilityNotes}
                onChange={(e) => setAvailabilityNotes(e.target.value)}
                placeholder="e.g. Available weekdays after 4 PM, consultation on campus"
                className="h-12 text-xs rounded-xl border-neutral-200"
              />
            </div>

            {/* Skills & Tags */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                Skill Tags
              </Label>
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  placeholder="Add a skill tag (e.g. Next.js, Python)..."
                  className="h-11 text-xs rounded-xl border-neutral-200"
                />
                <Button
                  type="button"
                  onClick={handleAddSkill}
                  variant="outline"
                  className="rounded-xl border-neutral-300 text-xs font-bold h-11 px-4"
                >
                  Add Tag
                </Button>
              </div>

              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-800"
                    >
                      #{skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-neutral-400 hover:text-neutral-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Portfolio Links */}
            <div className="flex flex-col gap-3 border-t border-neutral-100 pt-6">
              <Label className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                Portfolio Links
              </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={newPortTitle}
                  onChange={(e) => setNewPortTitle(e.target.value)}
                  placeholder="Project Title (e.g. Hackathon App)"
                  className="h-11 text-xs rounded-xl border-neutral-200 flex-1"
                />
                <Input
                  value={newPortUrl}
                  onChange={(e) => setNewPortUrl(e.target.value)}
                  placeholder="URL (https://github.com/...)"
                  className="h-11 text-xs rounded-xl border-neutral-200 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddPortfolio}
                  className="rounded-xl border-neutral-300 text-xs font-bold h-11 px-4"
                >
                  Add Link
                </Button>
              </div>

              {portfolioLinks.length > 0 && (
                <div className="space-y-2 mt-2">
                  {portfolioLinks.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-neutral-200 bg-[#fbfbfa] px-4 py-2.5 text-xs"
                    >
                      <span className="font-bold text-neutral-900">{item.title}</span>
                      <div className="flex items-center gap-3">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#004ac6] hover:underline flex items-center gap-1 font-semibold"
                        >
                          Visit <ExternalLink className="h-3 w-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemovePortfolio(idx)}
                          className="text-red-500 hover:text-red-700 font-bold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Visibility Option */}
            <div className="flex flex-col gap-2 border-t border-neutral-100 pt-6">
              <Label htmlFor="status" className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-700">
                Listing Visibility
              </Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ServiceStatus)}
                className="h-12 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-medium text-neutral-900 focus:outline-none focus:border-neutral-900"
              >
                <option value="published">Published — Discoverable across campus catalog</option>
                <option value="draft">Draft — Private to you</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4 border-t border-neutral-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1 rounded-xl border-neutral-300 text-xs font-bold h-12"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-xl bg-neutral-950 text-white hover:bg-black font-bold text-xs h-12"
              >
                {submitting ? 'Publishing...' : 'Publish Service Listing'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
