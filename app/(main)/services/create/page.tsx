'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles,
  Clock,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  UploadCloud,
  Eye,
  EyeOff,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#004ac6] border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin && !isSeller) {
    return (
      <div className="mx-auto w-full max-w-xl px-6 py-16">
        <div className="rounded-2xl border border-blue-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#004ac6] text-white shadow-md">
            <Briefcase className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">Activate Seller Role First</h2>
          <p className="mt-2 text-sm text-gray-600">
            Your account is currently set to Buyer mode. Enable Seller role in your profile to start publishing student services on campus.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/profile?tab=roles">
              <Button className="bg-[#004ac6] text-white hover:bg-[#003b9e]">
                Enable Seller Mode
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">
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
      <div className="mx-auto w-full max-w-xl px-6 py-16">
        <div className="rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md">
            <Sparkles className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">Seller Profile Required</h2>
          <p className="mt-2 text-sm text-gray-600">
            Before creating your first listing, please specify your skills, categories, pricing preferences, and portfolio items so campus buyers know what you offer.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/profile?tab=seller">
              <Button className="bg-amber-600 text-white hover:bg-amber-700">
                Complete Seller Profile
              </Button>
            </Link>
            <Link href="/onboarding?step=3">
              <Button variant="outline">
                Launch Onboarding
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      {/* Heading */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href="/my-services"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#004ac6] mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to My Services
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Offer Your Skill</h1>
          <p className="mt-1 text-sm text-gray-600">
            Create a student service listing to monetize your talent on campus.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => setPreviewMode(!previewMode)}
          className="gap-2 border-gray-200 text-xs font-semibold text-gray-700"
        >
          {previewMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {previewMode ? 'Return to Edit' : 'Live Preview'}
        </Button>
      </div>

      {/* PREVIEW MODE */}
      {previewMode ? (
        <div className="rounded-2xl border-2 border-[#004ac6]/30 bg-white p-8 shadow-md space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#004ac6]">
              Buyer View Live Preview
            </span>
            <Badge
              className={`capitalize text-xs font-bold ${
                status === 'published'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {status}
            </Badge>
          </div>

          {coverImageUrl && (
            <div className="h-48 w-full overflow-hidden rounded-xl bg-gray-100">
              <img
                src={coverImageUrl}
                alt="Service Cover Preview"
                className="h-full w-full object-cover"
              />
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title || 'Untitled Service'}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span className="text-xl font-bold text-[#004ac6]">₹{price || '0'}</span>
              <span>·</span>
              <span>{deliveryDays || '3'} Days Turnaround</span>
              <span>·</span>
              <span className="capitalize">{serviceType.replace('_', ' ')}</span>
              <span>·</span>
              <span>{location}</span>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">Scope of Service</h4>
            <p className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
              {description || 'No description entered yet.'}
            </p>
          </div>

          {availabilityNotes && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-gray-700">
              <span className="font-bold text-[#004ac6] block mb-1">Availability Schedule</span>
              {availabilityNotes}
            </div>
          )}

          {skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100">
              {skills.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-[#004ac6]"
                >
                  #{s}
                </span>
              ))}
            </div>
          )}

          <div className="pt-4 flex justify-end">
            <Button
              onClick={() => setPreviewMode(false)}
              className="bg-[#004ac6] text-white hover:bg-[#003b9e] text-xs font-bold"
            >
              Back to Editing Form
            </Button>
          </div>
        </div>
      ) : (
        /* CREATE FORM */
        <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Title */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="title" className="text-sm font-semibold text-gray-900">
                Service Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Modern React & Next.js Website Development"
                className="h-12 text-sm"
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description" className="text-sm font-semibold text-gray-900">
                  Service Description <span className="text-red-500">*</span>
                </Label>
                <button
                  type="button"
                  onClick={handleAIExtractSkills}
                  disabled={extractingSkills}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#004ac6] hover:underline disabled:opacity-60"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {extractingSkills ? 'Analyzing...' : 'AI Suggest Tags'}
                </button>
              </div>
              <Textarea
                id="description"
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your service scope, what the client will receive, tools used (e.g. Figma, Next.js), and requirements..."
                className="resize-none text-sm"
              />
            </div>

            {/* Price + Turnaround */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="price" className="text-sm font-semibold text-gray-900">
                  Price (₹) <span className="text-red-500">*</span>
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
                  className="h-12 text-sm"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="deliveryDays" className="text-sm font-semibold text-gray-900">
                  Turnaround Time (Days) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="deliveryDays"
                  type="number"
                  min={1}
                  max={60}
                  value={deliveryDays}
                  onChange={(e) => setDeliveryDays(e.target.value)}
                  placeholder="3"
                  className="h-12 text-sm"
                />
              </div>
            </div>

            {/* Category, Service Type, Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="category" className="text-sm font-semibold text-gray-900">
                  Category
                </Label>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-12 rounded-lg border border-[#c3c6d7] bg-white px-3 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#004ac6]"
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
                <Label htmlFor="serviceType" className="text-sm font-semibold text-gray-900">
                  Delivery Mode
                </Label>
                <select
                  id="serviceType"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as ServiceType)}
                  className="h-12 rounded-lg border border-[#c3c6d7] bg-white px-3 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#004ac6]"
                >
                  <option value="digital">Digital (Online Delivery)</option>
                  <option value="in_person">In-Person (On Campus)</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="location" className="text-sm font-semibold text-gray-900">
                  Location Note
                </Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Online / Pune"
                  className="h-12 text-xs"
                />
              </div>
            </div>

            {/* Cover Image Upload */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold text-gray-900">Cover Image (Optional)</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleCoverImageUpload}
                  disabled={uploadingImage}
                  className="h-11 text-xs file:mr-2 file:rounded-md file:border-0 file:bg-[#f0f4ff] file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-[#004ac6]"
                />
                {uploadingImage && <span className="text-xs text-gray-500">Uploading...</span>}
              </div>
              {coverImageUrl && (
                <div className="mt-2 flex items-center gap-3 rounded-lg border border-gray-200 p-2">
                  <img
                    src={coverImageUrl}
                    alt="Cover Thumbnail"
                    className="h-12 w-16 rounded object-cover"
                  />
                  <span className="truncate text-xs text-gray-600 flex-1">{coverImageUrl}</span>
                  <button
                    type="button"
                    onClick={() => setCoverImageUrl('')}
                    className="text-xs font-semibold text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Availability Notes */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="availabilityNotes" className="text-sm font-semibold text-gray-900">
                Availability & Requirements Note
              </Label>
              <Input
                id="availabilityNotes"
                value={availabilityNotes}
                onChange={(e) => setAvailabilityNotes(e.target.value)}
                placeholder="e.g. Available weekdays after 4 PM, consultation on campus"
                className="h-12 text-xs"
              />
            </div>

            {/* Relevant Skills / Tags */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold text-gray-900">Relevant Skills & Tags</Label>
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
                  placeholder="Add a skill tag (e.g. Tailwind CSS, Python)..."
                  className="h-10 text-xs"
                />
                <Button
                  type="button"
                  onClick={handleAddSkill}
                  variant="outline"
                  className="border-gray-200 text-xs"
                >
                  Add
                </Button>
              </div>

              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#004ac6]"
                    >
                      #{skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="ml-1 text-blue-400 hover:text-blue-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Portfolio Examples */}
            <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
              <Label className="text-sm font-semibold text-gray-900">Portfolio & Past Work Examples</Label>
              <p className="text-xs text-gray-500">
                Add links to GitHub repositories, Figma previews, or Behance cases.
              </p>

              <div className="flex flex-col sm:flex-row gap-2 mt-1">
                <Input
                  value={newPortTitle}
                  onChange={(e) => setNewPortTitle(e.target.value)}
                  placeholder="Project Title (e.g. Portfolio App)"
                  className="h-10 text-xs flex-1"
                />
                <Input
                  value={newPortUrl}
                  onChange={(e) => setNewPortUrl(e.target.value)}
                  placeholder="URL (https://github.com/...)"
                  className="h-10 text-xs flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddPortfolio}
                  className="text-xs"
                >
                  Add Link
                </Button>
              </div>

              {portfolioLinks.length > 0 && (
                <div className="space-y-1.5 mt-2">
                  {portfolioLinks.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs"
                    >
                      <span className="font-semibold text-gray-800">{item.title}</span>
                      <div className="flex items-center gap-3">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#004ac6] hover:underline flex items-center gap-1 text-[11px]"
                        >
                          Visit <ExternalLink className="h-3 w-3" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemovePortfolio(idx)}
                          className="text-red-500 hover:text-red-700 text-xs font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Visibility */}
            <div className="flex flex-col gap-2 border-t border-gray-100 pt-4">
              <Label htmlFor="status" className="text-sm font-semibold text-gray-900">
                Initial Visibility
              </Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ServiceStatus)}
                className="h-12 rounded-lg border border-[#c3c6d7] bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#004ac6]"
              >
                <option value="published">Published — Visible in campus explore & discoverable</option>
                <option value="draft">Draft — Only you can see it</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1 border-gray-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-[#004ac6] text-white hover:bg-[#003b9e] font-bold"
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
