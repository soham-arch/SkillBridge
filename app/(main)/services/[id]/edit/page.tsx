'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Sparkles,
  Clock,
  Briefcase,
  UploadCloud,
  CheckCircle2,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  Globe,
  Plus,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth/auth-context';
import { useRequireAuth } from '@/lib/auth/use-require-auth';
import {
  getServiceById,
  updateService,
  deleteService,
  uploadServiceCoverImage,
} from '@/lib/services/services';
import { getCategories } from '@/lib/services/categories';
import { Reveal } from '@/components/motion/reveal';
import { editorialEase } from '@/components/motion/motion-tokens';
import type { Category, Service, ServiceStatus, ServiceType, PortfolioItem } from '@/types';

export default function EditServicePage({ params }: { params: { id: string } }) {
  const { session, user, loading: authLoading } = useRequireAuth();
  const { isAdmin } = useAuth();
  const router = useRouter();

  const [service, setService] = useState<Service | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
  const [status, setStatus] = useState<ServiceStatus>('published');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [availabilityNotes, setAvailabilityNotes] = useState('');
  const [portfolioLinks, setPortfolioLinks] = useState<PortfolioItem[]>([]);
  const [newPortTitle, setNewPortTitle] = useState('');
  const [newPortUrl, setNewPortUrl] = useState('');

  // Mode: edit or preview
  const [previewMode, setPreviewMode] = useState(false);

  // Deletion state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteBlockedError, setDeleteBlockedError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [cats, svc] = await Promise.all([
          getCategories(),
          getServiceById(params.id),
        ]);
        setCategories(cats);
        setService(svc);

        if (svc) {
          setTitle(svc.title || '');
          setDescription(svc.description || '');
          setPrice(svc.price ? String(svc.price) : '');
          setDeliveryDays(svc.delivery_days ? String(svc.delivery_days) : '3');
          setServiceType((svc.service_type as ServiceType) || 'digital');
          setLocation(svc.location || 'Online / Campus');
          setCategoryId(svc.category_id || '');
          setStatus(svc.status || 'published');
          setSkills(svc.skills || svc.tags || []);
          setCoverImageUrl(svc.cover_image_url || '');
          setAvailabilityNotes(svc.availability_notes || '');
          setPortfolioLinks(svc.portfolio_examples || []);
        }
      } catch (err) {
        console.error('Failed to load service for editing:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [params.id]);

  // Ownership verification check
  const isOwner = user && service && (service.provider_id === user.id || isAdmin);

  function handleAddSkill() {
    const trimmed = skillInput.trim();
    if (!trimmed) return;
    if (!skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
    }
    setSkillInput('');
  }

  function handleRemoveSkill(toRemove: string) {
    setSkills(skills.filter((s) => s !== toRemove));
  }

  function handleAddPortfolio() {
    if (!newPortTitle.trim() || !newPortUrl.trim()) {
      toast.error('Please enter both title and URL for the portfolio item.');
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

  async function handleAIExtractSkills() {
    if (!title.trim() && !description.trim()) {
      toast.error('Please enter a title or description first.');
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
          toast.success(`AI suggested ${data.skills.length} skills!`);
        }
      }
    } catch {
      toast.error('AI assistant unavailable, please add tags manually.');
    } finally {
      setExtractingSkills(false);
    }
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
      const msg = err instanceof Error ? err.message : 'Upload failed';
      toast.error(msg);
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!service || !user) return;

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

    setSaving(true);
    try {
      const updated = await updateService(
        service.id,
        {
          title: title.trim(),
          description: description.trim(),
          price: parsedPrice,
          delivery_days: parsedDays,
          service_type: serviceType,
          category_id: categoryId || null,
          location: location.trim(),
          status,
          skills,
          tags: skills,
          cover_image_url: coverImageUrl || null,
          availability_notes: availabilityNotes.trim() || null,
          portfolio_examples: portfolioLinks,
        },
        user.id
      );

      setService(updated);
      toast.success('Service listing updated successfully!');
      router.push('/my-services');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update service listing.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!service || !user) return;

    setIsDeleting(true);
    setDeleteBlockedError(null);
    try {
      await deleteService(service.id, user.id);
      toast.success('Listing permanently deleted.');
      router.push('/my-services');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete listing.';
      setDeleteBlockedError(msg);
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-16 animate-pulse">
        <div className="h-4 w-32 bg-neutral-200 rounded mb-8" />
        <div className="h-8 w-64 bg-neutral-200 rounded mb-4" />
        <div className="h-96 bg-neutral-200/60 rounded-3xl" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 sm:px-6 py-20 text-center">
        <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Service Not Found</h2>
        <p className="mt-1 text-xs text-neutral-500">This listing may have been deleted or moved.</p>
        <Link href="/my-services">
          <Button className="mt-4 bg-[#004ac6] text-white hover:bg-[#003da6] rounded-full text-xs font-semibold px-6">
            Back to My Services
          </Button>
        </Link>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 sm:px-6 py-20 text-center">
        <div className="rounded-3xl border border-red-200 bg-white p-10 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-neutral-900">Access Denied</h2>
          <p className="mt-2 text-xs text-neutral-600">
            You do not have permission to edit this listing. Only the owner or an administrator can modify it.
          </p>
          <Link href="/my-services">
            <Button className="mt-6 bg-[#004ac6] text-white hover:bg-[#003da6] rounded-full text-xs font-semibold px-6">
              Return to My Services
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Top Header */}
      <Reveal>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-neutral-100 pb-6">
          <div>
            <Link
              href="/my-services"
              className="group inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors mb-3"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
              Back to My Services
            </Link>
            <h1 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight">
              Edit Service Offering
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Modify scope, pricing, availability terms, and discovery tags.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewMode(!previewMode)}
              className="gap-2 border-neutral-200 text-xs font-semibold text-neutral-800 rounded-full px-4 h-9"
            >
              {previewMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {previewMode ? 'Return to Form' : 'Live Preview'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteBlockedError(null);
                setDeleteModalOpen(true);
              }}
              className="gap-1.5 border-red-200 text-xs text-red-600 hover:bg-red-50 rounded-full px-4 h-9 font-semibold"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      </Reveal>

      {/* PREVIEW MODE */}
      {previewMode ? (
        <Reveal>
          <div className="rounded-3xl border border-neutral-200 bg-white p-8 sm:p-10 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#004ac6]">
                Buyer Perspective Live Preview
              </span>
              <span
                className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full ${
                  status === 'published'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
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
              <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                {title || 'Untitled Service'}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                <span className="text-2xl font-black text-neutral-900">₹{price || '0'}</span>
                <span>·</span>
                <span className="font-medium text-neutral-700">{deliveryDays} Days Turnaround</span>
                <span>·</span>
                <span className="capitalize font-medium text-neutral-700">
                  {serviceType.replace('_', ' ')}
                </span>
                <span>·</span>
                <span className="font-medium text-neutral-700">{location}</span>
              </div>
            </div>

            <div className="border-t border-neutral-100 pt-5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-2">
                Scope & Deliverables
              </span>
              <p className="whitespace-pre-wrap text-xs text-neutral-700 leading-relaxed bg-neutral-50 p-4 rounded-2xl border border-neutral-100">
                {description || 'No description provided.'}
              </p>
            </div>

            {availabilityNotes && (
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 text-xs text-neutral-700">
                <span className="font-bold text-neutral-900 block mb-1">Availability Schedule</span>
                {availabilityNotes}
              </div>
            )}

            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-neutral-100">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700 border border-neutral-200/60"
                  >
                    #{s}
                  </span>
                ))}
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <Button
                onClick={() => setPreviewMode(false)}
                className="bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold rounded-full px-6 h-10"
              >
                Return to Editing
              </Button>
            </div>
          </div>
        </Reveal>
      ) : (
        /* EDIT FORM */
        <Reveal>
          <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-10 shadow-sm">
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {/* Title */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Service Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Modern Full-Stack Web Development in Next.js"
                  className="h-11 text-xs rounded-xl"
                />
              </div>

              {/* Description & AI Assist */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="description" className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Service Scope & Deliverables <span className="text-red-500">*</span>
                  </Label>
                  <button
                    type="button"
                    onClick={handleAIExtractSkills}
                    disabled={extractingSkills}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#004ac6] hover:underline disabled:opacity-60"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {extractingSkills ? 'Extracting tags...' : 'AI Suggest Tags'}
                  </button>
                </div>
                <Textarea
                  id="description"
                  required
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed scope, deliverables, technologies, and requirements..."
                  className="resize-none text-xs rounded-xl"
                />
              </div>

              {/* Price & Turnaround */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="price" className="text-xs font-bold uppercase tracking-wider text-neutral-700">
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
                    className="h-11 text-xs rounded-xl"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="deliveryDays" className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Turnaround Time (Days) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="deliveryDays"
                    type="number"
                    min={1}
                    max={60}
                    value={deliveryDays}
                    onChange={(e) => setDeliveryDays(e.target.value)}
                    className="h-11 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Category, Service Type, Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="category" className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Discipline
                  </Label>
                  <select
                    id="category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="h-11 rounded-xl border border-neutral-300 bg-white px-3 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#004ac6]"
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="serviceType" className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Delivery Mode
                  </Label>
                  <select
                    id="serviceType"
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value as ServiceType)}
                    className="h-11 rounded-xl border border-neutral-300 bg-white px-3 text-xs text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#004ac6]"
                  >
                    <option value="digital">Digital (Online Delivery)</option>
                    <option value="in_person">In-Person (On Campus)</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="location" className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Campus / Location Note
                  </Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Online / Pune"
                    className="h-11 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* Status Selector */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="status" className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Listing Visibility
                </Label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ServiceStatus)}
                  className="h-11 rounded-xl border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-800 focus:outline-none focus:ring-1 focus:ring-[#004ac6]"
                >
                  <option value="published">Published — Active in campus search & marketplace</option>
                  <option value="paused">Paused — Hidden from search; not taking new orders</option>
                  <option value="draft">Draft — Private to you</option>
                  <option value="archived">Archived — Inactive; historical orders preserved</option>
                </select>
              </div>

              {/* Cover Image */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Cover Image (Optional)
                </Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleCoverImageUpload}
                    disabled={uploadingImage}
                    className="h-11 text-xs rounded-xl file:mr-2 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-neutral-700"
                  />
                  {uploadingImage && <span className="text-xs text-neutral-500">Uploading...</span>}
                </div>
                {coverImageUrl && (
                  <div className="mt-2 flex items-center gap-3 rounded-2xl border border-neutral-200 p-2.5 bg-neutral-50">
                    <img
                      src={coverImageUrl}
                      alt="Cover Thumbnail"
                      className="h-12 w-16 rounded-xl object-cover"
                    />
                    <span className="truncate text-xs text-neutral-600 flex-1">{coverImageUrl}</span>
                    <button
                      type="button"
                      onClick={() => setCoverImageUrl('')}
                      className="text-xs font-semibold text-red-500 hover:underline pr-2"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Availability Notes */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="availabilityNotes" className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Availability Schedule & Turnaround Notes
                </Label>
                <Input
                  id="availabilityNotes"
                  value={availabilityNotes}
                  onChange={(e) => setAvailabilityNotes(e.target.value)}
                  placeholder="e.g. Available weekdays after 4 PM, initial consultation via campus meetup"
                  className="h-11 text-xs rounded-xl"
                />
              </div>

              {/* Skills & Tags */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Skills & Discovery Tags
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
                    placeholder="Add skill tag (e.g. Next.js, Figma, Premiere Pro)..."
                    className="h-10 text-xs rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddSkill}
                    className="text-xs rounded-full px-4 font-semibold"
                  >
                    Add
                  </Button>
                </div>

                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-800 border border-neutral-200/60"
                      >
                        #{skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="ml-1 text-neutral-400 hover:text-neutral-900"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Portfolio Examples */}
              <div className="flex flex-col gap-2 border-t border-neutral-100 pt-5">
                <Label className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                  Portfolio & Reference Links
                </Label>
                <p className="text-xs text-neutral-500">
                  Add links to GitHub repositories, Figma prototypes, or Behance cases.
                </p>

                <div className="flex flex-col sm:flex-row gap-2 mt-1">
                  <Input
                    value={newPortTitle}
                    onChange={(e) => setNewPortTitle(e.target.value)}
                    placeholder="Project Title (e.g. Campus Mobile App)"
                    className="h-10 text-xs rounded-xl flex-1"
                  />
                  <Input
                    value={newPortUrl}
                    onChange={(e) => setNewPortUrl(e.target.value)}
                    placeholder="URL (https://github.com/...)"
                    className="h-10 text-xs rounded-xl flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddPortfolio}
                    className="text-xs rounded-full px-4 font-semibold shrink-0"
                  >
                    Add Link
                  </Button>
                </div>

                {portfolioLinks.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {portfolioLinks.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl border border-neutral-200/80 bg-neutral-50/50 px-3.5 py-2 text-xs"
                      >
                        <span className="font-semibold text-neutral-800">{item.title}</span>
                        <div className="flex items-center gap-3">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#004ac6] hover:underline flex items-center gap-1 text-[11px] font-semibold"
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

              {/* Form Actions */}
              <div className="flex gap-3 pt-6 border-t border-neutral-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/my-services')}
                  className="flex-1 text-xs rounded-full h-11 font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-neutral-900 text-white hover:bg-[#004ac6] text-xs font-bold rounded-full h-11 shadow-sm transition-colors"
                >
                  {saving ? 'Saving Changes...' : 'Save & Update Listing'}
                </Button>
              </div>
            </form>
          </div>
        </Reveal>
      )}

      {/* Safe Delete Dialog */}
      <Dialog
        open={deleteModalOpen}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setDeleteModalOpen(false);
            setDeleteBlockedError(null);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl">
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold text-neutral-900">
              Delete Listing Permanently?
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-neutral-500 mt-1">
              You are about to delete &ldquo;{title}&rdquo;.
            </DialogDescription>
          </DialogHeader>

          {deleteBlockedError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 space-y-2">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                Historical Order Preservation Active
              </p>
              <p className="leading-relaxed">{deleteBlockedError}</p>
              <p className="text-[11px] text-amber-700">
                Consider archiving the listing instead to keep it hidden while preserving student buyer records.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-600 space-y-1.5">
              <p>
                <strong>Order History Safety:</strong> If this listing has any orders placed by
                students, permanent deletion is prevented to protect past records and receipts.
              </p>
            </div>
          )}

          <DialogFooter className="mt-4 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false);
                setDeleteBlockedError(null);
              }}
              className="flex-1 text-xs rounded-full font-semibold"
            >
              Cancel
            </Button>

            {deleteBlockedError ? (
              <Button
                type="button"
                onClick={async () => {
                  setStatus('archived');
                  setDeleteModalOpen(false);
                  if (service && user) {
                    await updateService(service.id, { status: 'archived' }, user.id);
                    toast.success('Listing safely archived.');
                    router.push('/my-services');
                  }
                }}
                className="flex-1 bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold rounded-full"
              >
                Archive Listing Instead
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="flex-1 bg-red-600 text-white hover:bg-red-700 text-xs font-bold rounded-full"
              >
                {isDeleting ? 'Verifying Orders...' : 'Confirm Delete'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
