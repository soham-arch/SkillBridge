'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
      <div className="flex flex-1 items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#004ac6] border-t-transparent" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="mx-auto w-full max-w-screen-xl px-6 py-12 text-center">
        <h2 className="text-xl font-bold text-gray-800">Service Not Found</h2>
        <p className="mt-1 text-xs text-gray-500">This listing may have been deleted or moved.</p>
        <Link href="/my-services">
          <Button className="mt-4 bg-[#004ac6] text-white">Back to My Services</Button>
        </Link>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="mx-auto w-full max-w-xl px-6 py-16 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-8 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-900">Access Denied</h2>
          <p className="mt-2 text-xs text-gray-600">
            You do not have permission to edit this listing. Only the owner or an administrator can modify it.
          </p>
          <Link href="/my-services">
            <Button className="mt-6 bg-[#004ac6] text-white hover:bg-[#003b9e]">
              Return to My Services
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      {/* Top Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/my-services"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#004ac6] mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to My Services
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Edit Service Listing</h1>
          <p className="text-xs text-gray-500 mt-1">
            Update pricing, scope, availability, turnaround, or visibility status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
            className="gap-2 border-gray-200 text-xs font-semibold text-gray-700"
          >
            {previewMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {previewMode ? 'Return to Edit' : 'Live Preview'}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDeleteBlockedError(null);
              setDeleteModalOpen(true);
            }}
            className="gap-1.5 border-red-200 text-xs text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
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
                  : 'bg-amber-50 text-amber-700 border-amber-200'
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
              <span>{deliveryDays} Days Turnaround</span>
              <span>·</span>
              <span className="capitalize">{serviceType.replace('_', ' ')}</span>
              <span>·</span>
              <span>{location}</span>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-bold uppercase text-gray-400 mb-2">Scope of Service</h4>
            <p className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
              {description || 'No description provided.'}
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
        /* EDIT FORM */
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
                placeholder="e.g. Modern Full-Stack Web Development in Next.js"
                className="h-11 text-sm"
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
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed scope, deliverables, technologies, and requirements..."
                className="resize-none text-sm"
              />
            </div>

            {/* Price & Turnaround */}
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
                  className="h-11 text-sm"
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
                  className="h-11 text-sm"
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
                  className="h-11 rounded-lg border border-[#c3c6d7] bg-white px-3 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#004ac6]"
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
                <Label htmlFor="serviceType" className="text-sm font-semibold text-gray-900">
                  Delivery Mode
                </Label>
                <select
                  id="serviceType"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as ServiceType)}
                  className="h-11 rounded-lg border border-[#c3c6d7] bg-white px-3 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#004ac6]"
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
                  className="h-11 text-xs"
                />
              </div>
            </div>

            {/* Status Selector */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="status" className="text-sm font-semibold text-gray-900">
                Visibility & Listing Status
              </Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ServiceStatus)}
                className="h-11 rounded-lg border border-[#c3c6d7] bg-white px-3 text-xs font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#004ac6]"
              >
                <option value="published">Published — Visible in campus explore & AI search</option>
                <option value="paused">Paused — Hidden from search; not taking new orders</option>
                <option value="draft">Draft — Private to you</option>
                <option value="archived">Archived — Inactive; historical orders preserved</option>
              </select>
            </div>

            {/* Cover Image */}
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

            {/* Availability Requirements */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="availabilityNotes" className="text-sm font-semibold text-gray-900">
                Availability & Requirements Note
              </Label>
              <Input
                id="availabilityNotes"
                value={availabilityNotes}
                onChange={(e) => setAvailabilityNotes(e.target.value)}
                placeholder="e.g. Available weekdays after 4 PM, initial consultation via campus meetup"
                className="h-11 text-xs"
              />
            </div>

            {/* Skills & Tags */}
            <div className="flex flex-col gap-2">
              <Label className="text-sm font-semibold text-gray-900">Skills & Discovery Tags</Label>
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
                  className="h-10 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddSkill}
                  className="text-xs"
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
                  placeholder="Project Title (e.g. E-Commerce Demo)"
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

            {/* Form Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/my-services')}
                className="flex-1 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="flex-1 bg-[#004ac6] text-white hover:bg-[#003b9e] text-xs font-bold"
              >
                {saving ? 'Saving Changes...' : 'Save & Update Listing'}
              </Button>
            </div>
          </form>
        </div>
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
        <DialogContent className="max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <DialogHeader>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold text-gray-900">
              Delete Listing Permanently?
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-gray-600 mt-1">
              You are about to delete &ldquo;{title}&rdquo;.
            </DialogDescription>
          </DialogHeader>

          {deleteBlockedError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 space-y-2">
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
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5 text-xs text-gray-600 space-y-1.5">
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
              className="flex-1 text-xs"
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
                className="flex-1 bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold"
              >
                Archive Listing Instead
              </Button>
            ) : (
              <Button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="flex-1 bg-red-600 text-white hover:bg-red-700 text-xs font-bold"
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
